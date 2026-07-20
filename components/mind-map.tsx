'use client'

import { useState, useEffect, useMemo, useRef, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    X, Play, RotateCcw, CheckCircle2, Circle, Calendar, Zap, 
    Compass, Minimize2, Maximize2, CheckSquare, Square,
    Compass as CompassIcon, Flame, Diamond,
    Calculator, FlaskConical, Code2, Palette, Scroll, Sparkles
} from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { toggleTask, toggleSubtask, rescheduleTaskToTomorrow } from '@/app/actions'
import { FocusModeOverlay } from './focus-mode-overlay'
import type { Task, Subtask } from '@/utils/types'
import { useLanguage } from './language-provider'

// Core configurations
const CANVAS_SIZE = 2000
const CENTER = CANVAS_SIZE / 2
const R1 = 185 // Radius for Day nodes
const R2 = 360 // Radius for Task leaf nodes

// Helper to resolve Lucide Icon for subjects
function getSubjectIcon(subject: string | undefined | null) {
    const sub = (subject || 'GENERAL').toUpperCase()
    if (sub.includes('MATH')) return Calculator
    if (sub.includes('SCI') || sub.includes('PHYS') || sub.includes('CHEM') || sub.includes('BIOL')) return FlaskConical
    if (sub.includes('TECH') || sub.includes('CODE') || sub.includes('COMP') || sub.includes('DEV')) return Code2
    if (sub.includes('ART') || sub.includes('DESIGN') || sub.includes('DRAW') || sub.includes('PAINT')) return Palette
    if (sub.includes('HIST') || sub.includes('SOC') || sub.includes('GEO') || sub.includes('CIV')) return Scroll
    return Sparkles
}

// Helper to resolve CSS color hex for subjects
function getSubjectColor(subject: string | undefined | null) {
    const sub = (subject || 'GENERAL').toUpperCase()
    if (sub.includes('MATH')) return '#00f0ff' // electric-blue
    if (sub.includes('SCI') || sub.includes('PHYS') || sub.includes('CHEM') || sub.includes('BIOL')) return '#4ade80' // green-400
    if (sub.includes('TECH') || sub.includes('CODE') || sub.includes('COMP') || sub.includes('DEV')) return '#22d3ee' // cyan-400
    if (sub.includes('ART') || sub.includes('DESIGN') || sub.includes('DRAW') || sub.includes('PAINT')) return '#f472b6' // pink-400
    if (sub.includes('HIST') || sub.includes('SOC') || sub.includes('GEO') || sub.includes('CIV')) return '#bf5af2' // neon-violet
    return '#94a3b8' // slate-400
}

interface MindMapProps {
    goal: {
        id: string
        title: string
        created_at: string
        duration_days: number
        tasks: Task[]
        plan_metadata?: {
            is_crunch_mode?: boolean
        }
    }
    onOptimisticTokenUpdate?: (delta: number) => void
}

export function MindMap({ goal, onOptimisticTokenUpdate }: MindMapProps) {
    const { t } = useLanguage()
    const [selectedWeek, setSelectedWeek] = useState(1)
    const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set())
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [zoom, setZoom] = useState(0.85)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [focusTask, setFocusTask] = useState<Task | null>(null)
    const [isPending, startTransition] = useTransition()
    const [mounted, setMounted] = useState(false)
    const [isDesktop, setIsDesktop] = useState(false)
    const [mapViewMode, setMapViewMode] = useState<'canvas' | 'timeline'>('timeline')

    useEffect(() => {
        setMounted(true)
        const desktop = window.innerWidth >= 768
        setIsDesktop(desktop)
        setMapViewMode(desktop ? 'canvas' : 'timeline')
        const handleResize = () => setIsDesktop(window.innerWidth >= 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // High-end Features State
    const [showMiniMap, setShowMiniMap] = useState(true)
    const [nodeOffsets, setNodeOffsets] = useState<Record<string, { x: number; y: number }>>({})
    const [viewportSize, setViewportSize] = useState({ width: 350, height: 400 })
    const [isMiniMapDragging, setIsMiniMapDragging] = useState(false)

    // Touch gesture and drag references
    const touchStartDistRef = useRef<number | null>(null)
    const touchStartZoomRef = useRef<number>(0.85)
    const viewportRef = useRef<HTMLDivElement>(null)
    const zoomRef = useRef(zoom)
    const offsetsRef = useRef(nodeOffsets)
    const dragStartRef = useRef<{ nodeId: string; x: number; y: number; startX: number; startY: number } | null>(null)
    const wasDraggedRef = useRef(false)
    const isDraggingNodeRef = useRef(false)

    // Local optimistic task states for immediate UI updates
    const [localTasks, setLocalTasks] = useState<Task[]>(goal.tasks || [])

    // Sync local tasks if goal.tasks changes
    useEffect(() => {
        setLocalTasks(goal.tasks || [])
    }, [goal.tasks])

    // Calculate total weeks in the plan
    const totalWeeks = useMemo(() => Math.ceil(goal.duration_days / 7), [goal.duration_days])

    // Auto-select current active week on mount based on start date
    useEffect(() => {
        const start = new Date(goal.created_at)
        start.setHours(0, 0, 0, 0)
        const today = new Date()
        const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        const currentWeek = Math.max(1, Math.min(Math.floor(diffDays / 7) + 1, totalWeeks))
        setSelectedWeek(currentWeek)
    }, [goal.created_at, totalWeeks])

    // Sync refs to avoid stale closure scopes in listeners
    useEffect(() => {
        zoomRef.current = zoom
    }, [zoom])

    useEffect(() => {
        offsetsRef.current = nodeOffsets
    }, [nodeOffsets])

    // Load custom offsets from LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem(`lifepivot_map_offsets_${goal.id}`)
        if (saved) {
            try {
                setNodeOffsets(JSON.parse(saved))
            } catch (e) {
                console.error('Failed to parse offsets', e)
            }
        }
    }, [goal.id])

    // Track viewport element resizing for Mini-Map boundary box
    useEffect(() => {
        const updateSize = () => {
            if (viewportRef.current) {
                setViewportSize({
                    width: viewportRef.current.clientWidth,
                    height: viewportRef.current.clientHeight
                })
            }
        }
        updateSize()
        window.addEventListener('resize', updateSize)
        return () => window.removeEventListener('resize', updateSize)
    }, [])


    // Global listener for node dragging (updates coordinate offsets and persists)
    useEffect(() => {
        const handleMove = (e: PointerEvent | MouseEvent | TouchEvent) => {
            if (!dragStartRef.current) return
            const { nodeId, startX, startY } = dragStartRef.current
            const client = 'touches' in e ? (e as TouchEvent).touches[0] : (e as MouseEvent)
            
            // Check drag threshold (5px) before starting actual drag
            if (!isDraggingNodeRef.current) {
                const distFromStart = Math.sqrt(
                    Math.pow(client.clientX - startX, 2) +
                    Math.pow(client.clientY - startY, 2)
                )
                if (distFromStart < 5) return
                isDraggingNodeRef.current = true
                wasDraggedRef.current = true
            }

            const dx = (client.clientX - dragStartRef.current.x) / zoomRef.current
            const dy = (client.clientY - dragStartRef.current.y) / zoomRef.current

            setNodeOffsets(prev => {
                const cur = prev[nodeId] || { x: 0, y: 0 }
                return {
                    ...prev,
                    [nodeId]: { x: cur.x + dx, y: cur.y + dy }
                }
            })

            dragStartRef.current = {
                ...dragStartRef.current,
                x: client.clientX,
                y: client.clientY
            }
        }

        const handleEnd = () => {
            if (dragStartRef.current) {
                dragStartRef.current = null
                isDraggingNodeRef.current = false
                localStorage.setItem(`lifepivot_map_offsets_${goal.id}`, JSON.stringify(offsetsRef.current))
            }
        }

        window.addEventListener('pointermove', handleMove, { passive: true })
        window.addEventListener('pointerup', handleEnd)
        window.addEventListener('touchmove', handleMove, { passive: false })
        window.addEventListener('touchend', handleEnd)

        return () => {
            window.removeEventListener('pointermove', handleMove)
            window.removeEventListener('pointerup', handleEnd)
            window.removeEventListener('touchmove', handleMove)
            window.removeEventListener('touchend', handleEnd)
        }
    }, [goal.id])

    // Pinch-to-zoom touch gesture listener
    useEffect(() => {
        const viewport = viewportRef.current
        if (!viewport) return

        const handleTouchStartRaw = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault() // Block browser pinch zoom sheet
                const t1 = e.touches[0]
                const t2 = e.touches[1]
                const dist = Math.sqrt(
                    Math.pow(t1.clientX - t2.clientX, 2) +
                    Math.pow(t1.clientY - t2.clientY, 2)
                )
                touchStartDistRef.current = dist
                touchStartZoomRef.current = zoomRef.current
            }
        }

        const handleTouchMoveRaw = (e: TouchEvent) => {
            if (e.touches.length === 2 && touchStartDistRef.current !== null) {
                e.preventDefault() // Block browser pinch zoom sheet
                const t1 = e.touches[0]
                const t2 = e.touches[1]
                const dist = Math.sqrt(
                    Math.pow(t1.clientX - t2.clientX, 2) +
                    Math.pow(t1.clientY - t2.clientY, 2)
                )
                const scaleFactor = dist / touchStartDistRef.current
                const newZoom = Math.max(0.4, Math.min(2.0, touchStartZoomRef.current * scaleFactor))
                setZoom(newZoom)
            }
        }

        const handleTouchEndRaw = () => {
            touchStartDistRef.current = null
        }

        viewport.addEventListener('touchstart', handleTouchStartRaw, { passive: false })
        viewport.addEventListener('touchmove', handleTouchMoveRaw, { passive: false })
        viewport.addEventListener('touchend', handleTouchEndRaw)

        return () => {
            viewport.removeEventListener('touchstart', handleTouchStartRaw)
            viewport.removeEventListener('touchmove', handleTouchMoveRaw)
            viewport.removeEventListener('touchend', handleTouchEndRaw)
        }
    }, [])

    // Helper functions for dates grouping
    const getWeekNumber = (dueDateStr: string, createdAtStr: string) => {
        const start = new Date(createdAtStr)
        start.setHours(0, 0, 0, 0)
        const due = new Date(dueDateStr)
        const diffDays = Math.floor((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        return Math.max(1, Math.floor(diffDays / 7) + 1)
    }

    const getDayNumber = (dueDateStr: string, createdAtStr: string) => {
        const start = new Date(createdAtStr)
        start.setHours(0, 0, 0, 0)
        const due = new Date(dueDateStr)
        const diffDays = Math.floor((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays + 1
    }

    // Branch nodes grouping calculation (Filter tasks to selected week, group by day number)
    const branchesData = useMemo(() => {
        const groups: Record<string, Task[]> = {}

        localTasks.forEach(task => {
            const weekNum = getWeekNumber(task.due_date, goal.created_at)
            if (weekNum === selectedWeek) {
                const dayNum = getDayNumber(task.due_date, goal.created_at)
                const dayLabel = `Day ${dayNum}`
                if (!groups[dayLabel]) groups[dayLabel] = []
                groups[dayLabel].push(task)
            }
        })

        // Sort days chronologically (e.g., Day 8, Day 10...)
        const sortedEntries = Object.entries(groups).sort((a, b) => {
            const numA = parseInt(a[0].replace('Day ', ''))
            const numB = parseInt(b[0].replace('Day ', ''))
            return numA - numB
        })

        return sortedEntries.map(([name, tasks]) => {
            const completedCount = tasks.filter(t => t.status === 'completed').length
            const totalCount = tasks.length
            return {
                id: name,
                name,
                tasks,
                completedCount,
                totalCount
            }
        })
    }, [localTasks, selectedWeek, goal.created_at])

    // Expand all branches in the selected week automatically by default when branches update
    useEffect(() => {
        const branches = new Set<string>()
        branchesData.forEach(b => branches.add(b.id))
        setExpandedBranches(branches)
    }, [branchesData])

    // Dynamic Focus Recommendation Engine: "The Oracle's Beacon"
    const recommendedTaskId = useMemo(() => {
        const pending = localTasks.filter(t => t.status === 'pending' && t.task_type !== 'void')
        if (pending.length === 0) return null

        // Sort chronologically by due date, then by highest priority first
        const sorted = [...pending].sort((a, b) => {
            if (a.due_date !== b.due_date) {
                return a.due_date.localeCompare(b.due_date)
            }
            return b.priority - a.priority
        })

        return sorted[0].id
    }, [localTasks])

    // Layout engine: calculate dynamic radial positions (standard positions + custom offsets)
    const layout = useMemo(() => {
        const nodes: any[] = []
        const links: any[] = []
        const numBranches = branchesData.length

        // Root central node
        nodes.push({
            id: 'root',
            type: 'root',
            x: CENTER,
            y: CENTER,
            title: goal.title,
            subtitle: t('mind_map.week_overview').replace('{week}', String(selectedWeek))
        })

        branchesData.forEach((branch, idx) => {
            // Position branch node (Day node) in Ring 1
            const theta = (2 * Math.PI * idx) / numBranches - Math.PI / 2
            const branchOffset = nodeOffsets[branch.id] || { x: 0, y: 0 }
            const branchX = CENTER + R1 * Math.cos(theta) + branchOffset.x
            const branchY = CENTER + R1 * Math.sin(theta) + branchOffset.y

            nodes.push({
                id: branch.id,
                type: 'branch',
                x: branchX,
                y: branchY,
                name: branch.name,
                completed: branch.completedCount,
                total: branch.totalCount,
                isExpanded: expandedBranches.has(branch.id)
            })

            // Link from Root to Branch (using quadratic bezier bending outwards)
            const midX = (CENTER + branchX) / 2
            const midY = (CENTER + branchY) / 2
            const dx = branchX - CENTER
            const dy = branchY - CENTER
            const dist = Math.sqrt(dx*dx + dy*dy) || 1
            const offset = 30
            const perpX = -dy / dist * offset
            const perpY = dx / dist * offset

            links.push({
                id: `link-root-${branch.id}`,
                x1: CENTER,
                y1: CENTER,
                cx: midX + perpX,
                cy: midY + perpY,
                x2: branchX,
                y2: branchY,
                type: 'root-branch'
            })

            // Position leaves (tasks) if expanded
            if (expandedBranches.has(branch.id)) {
                const tasks = branch.tasks
                const numTasks = tasks.length
                const spreadAngle = Math.min((2 * Math.PI / numBranches) * 0.85, 1.2) // Angular limit

                tasks.forEach((task, tIdx) => {
                    let taskTheta = theta
                    if (numTasks > 1) {
                        taskTheta = theta - spreadAngle / 2 + (tIdx * spreadAngle) / (numTasks - 1)
                    }

                    // Alternate task radii to prevent node overlap in dense day schedules
                    const radiusStagger = numTasks > 3 ? (tIdx % 2 === 0 ? 0 : 45) : 0
                    const taskRadius = R2 + radiusStagger
                    
                    const taskOffset = nodeOffsets[task.id] || { x: 0, y: 0 }
                    const taskX = CENTER + taskRadius * Math.cos(taskTheta) + taskOffset.x
                    const taskY = CENTER + taskRadius * Math.sin(taskTheta) + taskOffset.y

                    nodes.push({
                        id: task.id,
                        type: 'task',
                        x: taskX,
                        y: taskY,
                        task
                    })

                    // Bezier bend connection from branch node to task node
                    const subMidX = (branchX + taskX) / 2
                    const subMidY = (branchY + taskY) / 2
                    const subDx = taskX - branchX
                    const subDy = taskY - branchY
                    const subDist = Math.sqrt(subDx*subDx + subDy*subDy) || 1
                    const subOffset = 15
                    const subPerpX = -subDy / subDist * subOffset
                    const subPerpY = subDx / subDist * subOffset

                    links.push({
                        id: `link-${branch.id}-${task.id}`,
                        x1: branchX,
                        y1: branchY,
                        cx: subMidX + subPerpX,
                        cy: subMidY + subPerpY,
                        x2: taskX,
                        y2: taskY,
                        type: 'branch-task',
                        status: task.status
                    })
                })
            }
        })

        return { nodes, links }
    }, [branchesData, expandedBranches, goal.title, selectedWeek, nodeOffsets])

    // Auto-center canvas on content after layout computation
    useEffect(() => {
        if (layout.nodes.length <= 1) return
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
        layout.nodes.forEach(n => {
            if (n.x < minX) minX = n.x
            if (n.x > maxX) maxX = n.x
            if (n.y < minY) minY = n.y
            if (n.y > maxY) maxY = n.y
        })
        const contentCenterX = (minX + maxX) / 2
        const contentCenterY = (minY + maxY) / 2
        setPan({
            x: (CENTER - contentCenterX) * zoom,
            y: (CENTER - contentCenterY) * zoom
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedWeek])

    // Dependency / Prerequisite links calculations (Prereqs: P1-P3 connect to Targets: P4-P5 on same day)
    const dependencyLinksList = useMemo(() => {
        const depLinks: any[] = []
        
        // Build coordinate map lookup
        const coordMap = new Map<string, { x: number; y: number }>()
        layout.nodes.forEach(n => {
            if (n.type === 'task') {
                coordMap.set(n.id, { x: n.x, y: n.y })
            }
        })
        
        branchesData.forEach(branch => {
            if (!expandedBranches.has(branch.id)) return
            
            const tasks = branch.tasks
            const prereqs = tasks.filter(t => t.priority >= 1 && t.priority <= 3 && t.task_type !== 'void')
            const targets = tasks.filter(t => t.priority >= 4 && t.priority <= 5 && t.task_type !== 'void')
            
            prereqs.forEach(pre => {
                targets.forEach(tar => {
                    const startCoord = coordMap.get(pre.id)
                    const endCoord = coordMap.get(tar.id)
                    
                    if (startCoord && endCoord) {
                        const midX = (startCoord.x + endCoord.x) / 2
                        const midY = (startCoord.y + endCoord.y) / 2
                        const dx = endCoord.x - startCoord.x
                        const dy = endCoord.y - startCoord.y
                        const dist = Math.sqrt(dx*dx + dy*dy) || 1
                        const offset = 14
                        const perpX = -dy / dist * offset
                        const perpY = dx / dist * offset
                        
                        depLinks.push({
                            id: `dep-${pre.id}-${tar.id}`,
                            x1: startCoord.x,
                            y1: startCoord.y,
                            cx: midX + perpX,
                            cy: midY + perpY,
                            x2: endCoord.x,
                            y2: endCoord.y
                        })
                    }
                })
            })
        })
        
        return depLinks
    }, [branchesData, expandedBranches, layout.nodes])

    // Viewport calculations for Mini-Map Picture-in-Picture
    const viewportWidthMini = useMemo(() => {
        return (viewportSize.width / zoom) * 0.06
    }, [viewportSize.width, zoom])

    const viewportHeightMini = useMemo(() => {
        return (viewportSize.height / zoom) * 0.06
    }, [viewportSize.height, zoom])

    const viewportLeftMini = useMemo(() => {
        const cxLeft = 1000 - (pan.x + viewportSize.width / 2) / zoom
        return cxLeft * 0.06
    }, [pan.x, viewportSize.width, zoom])

    const viewportTopMini = useMemo(() => {
        const cyTop = 1000 - (pan.y + viewportSize.height / 2) / zoom
        return cyTop * 0.06
    }, [pan.y, viewportSize.height, zoom])

    // Mini Map jump to click coordinate
    const jumpToMiniMapPos = (clientX: number, clientY: number) => {
        const miniMapEl = document.getElementById('minimap-hud')
        if (!miniMapEl) return
        const rect = miniMapEl.getBoundingClientRect()
        const mx = Math.max(0, Math.min(120, clientX - rect.left))
        const my = Math.max(0, Math.min(120, clientY - rect.top))
        
        const targetCx = mx / 0.06
        const targetCy = my / 0.06
        
        setPan({
            x: (1000 - targetCx) * zoomRef.current,
            y: (1000 - targetCy) * zoomRef.current
        })
    }

    const handleMiniMapMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation()
        setIsMiniMapDragging(true)
        const client = 'touches' in e ? e.touches[0] : e
        jumpToMiniMapPos(client.clientX, client.clientY)
    }

    const handleMiniMapDrag = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isMiniMapDragging) return
        e.stopPropagation()
        const client = 'touches' in e ? e.touches[0] : e
        jumpToMiniMapPos(client.clientX, client.clientY)
    }

    useEffect(() => {
        const handleMouseUpGlobal = () => {
            setIsMiniMapDragging(false)
        }
        window.addEventListener('mouseup', handleMouseUpGlobal)
        window.addEventListener('touchend', handleMouseUpGlobal)
        return () => {
            window.removeEventListener('mouseup', handleMouseUpGlobal)
            window.removeEventListener('touchend', handleMouseUpGlobal)
        }
    }, [])

    // Toggle expanding a branch day folder
    const toggleBranch = (branchId: string) => {
        haptics.light()
        setExpandedBranches(prev => {
            const next = new Set(prev)
            if (next.has(branchId)) next.delete(branchId)
            else next.add(branchId)
            return next
        })
    }

    // Panning & zooming commands
    const zoomIn = () => { haptics.light(); setZoom(z => Math.min(2.0, z + 0.15)) }
    const zoomOut = () => { haptics.light(); setZoom(z => Math.max(0.4, z - 0.15)) }
    const resetView = () => { haptics.medium(); setZoom(0.85); setPan({ x: 0, y: 0 }) }
    const resetPositions = () => {
        haptics.medium()
        setNodeOffsets({})
        localStorage.removeItem(`lifepivot_map_offsets_${goal.id}`)
    }

    const priorityColors: Record<number, string> = {
        0: '#06b6d4', // Void day (cyan)
        1: '#64748b', // Exercise (gray)
        2: '#3b82f6', // Overview (blue)
        3: '#eab308', // Standard (yellow)
        4: '#f97316', // Hard (orange)
        5: '#ef4444'  // Deep theory (red)
    }

    // Toggle Task Status (Pending vs Completed) - Server synced
    const handleTaskToggle = async (task: Task) => {
        haptics.medium()
        const newStatus = task.status === 'completed' ? 'pending' : 'completed'
        
        // Optimistic UI update
        setLocalTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
        if (selectedTask && selectedTask.id === task.id) {
            setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null)
        }

        // Base reward token calculation
        const tokenReward: Record<number, number> = { 0: 0, 1: 1, 2: 1, 3: 1, 4: 2, 5: 3 }
        const tokenDelta = tokenReward[task.priority] ?? 1
        if (newStatus === 'completed' && onOptimisticTokenUpdate) {
            onOptimisticTokenUpdate(tokenDelta)
        } else if (newStatus === 'pending' && onOptimisticTokenUpdate) {
            onOptimisticTokenUpdate(-tokenDelta)
        }

        startTransition(async () => {
            await toggleTask(task.id, task.status)
        })
    }

    // Check Subtask - Server synced
    const handleSubtaskCheck = async (task: Task, subtaskId: string, currentCompleted: boolean) => {
        haptics.light()
        const nextCompleted = !currentCompleted

        // Optimistic UI update
        setLocalTasks(prev => prev.map(t => {
            if (t.id === task.id) {
                const sub = (t.subtasks || []).map(st => st.id === subtaskId ? { ...st, completed: nextCompleted } : st)
                return { ...t, subtasks: sub }
            }
            return t
        }))

        if (selectedTask && selectedTask.id === task.id) {
            setSelectedTask(prev => {
                if (!prev) return null
                const sub = (prev.subtasks || []).map(st => st.id === subtaskId ? { ...st, completed: nextCompleted } : st)
                return { ...prev, subtasks: sub }
            })
        }

        startTransition(async () => {
            await toggleSubtask(task.id, subtaskId, nextCompleted)
        })
    }

    // Reschedule Task - Server synced
    const handleReschedule = async (task: Task) => {
        haptics.medium()
        
        // Calculate tomorrow's local date
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0]

        // Optimistic UI update
        setLocalTasks(prev => prev.map(t => t.id === task.id ? { ...t, due_date: tomorrowStr } : t))
        setSelectedTask(null)

        startTransition(async () => {
            await rescheduleTaskToTomorrow(task.id)
        })
    }

    return (
        <div className="flex flex-col gap-4 w-full h-full relative overflow-hidden">
            {/* Horizontal Week Navigation Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0 max-w-full">
                {Array.from({ length: totalWeeks }).map((_, i) => {
                    const w = i + 1
                    const isActive = selectedWeek === w
                    return (
                        <button
                            key={w}
                            onClick={() => { haptics.light(); setSelectedWeek(w) }}
                            className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border shrink-0 active:scale-95 ${
                                isActive 
                                    ? 'bg-electric-blue/15 border-electric-blue/30 text-electric-blue shadow-[0_0_15px_rgba(var(--accent-rgb),0.15)]' 
                                    : 'bg-black/20 border-white/5 text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {t('mind_map.week_nav').replace('{week}', String(w))}
                        </button>
                    )
                })}
            </div>

            {/* Compact Overflow-safe Control Pill */}
            <div className="flex items-center justify-between bg-[#141824] px-4 py-2.5 rounded-[1.6rem] border border-white/5 shadow-xl select-none shrink-0 w-full">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate mr-2">
                    {t('mind_map.roadmap').replace('{week}', String(selectedWeek))}
                </span>

                <div className="flex bg-black/35 p-0.5 rounded-xl border border-white/5 shrink-0 mr-2 select-none">
                    <button
                        onClick={() => { haptics.light(); setMapViewMode('canvas') }}
                        className={`px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${mapViewMode === 'canvas' ? 'bg-electric-blue/15 text-electric-blue border border-electric-blue/15 shadow-[0_0_8px_rgba(var(--accent-rgb),0.1)]' : 'text-gray-500 border-transparent hover:text-gray-400'}`}
                    >
                        {t('plan.map_view')}
                    </button>
                    <button
                        onClick={() => { haptics.light(); setMapViewMode('timeline') }}
                        className={`px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${mapViewMode === 'timeline' ? 'bg-electric-blue/15 text-electric-blue border border-electric-blue/15 shadow-[0_0_8px_rgba(var(--accent-rgb),0.1)]' : 'text-gray-500 border-transparent hover:text-gray-400'}`}
                    >
                        {t('plan.list_view')}
                    </button>
                </div>
                
                {/* Visual Tool Zoom Panel (Fits inside box) */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {Object.keys(nodeOffsets).length > 0 && (
                        <button 
                            onClick={resetPositions} 
                            className="h-8.5 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 active:scale-90 transition-transform text-[9px] font-black uppercase tracking-wider"
                            title={t('mind_map.reset_layout_tooltip')}
                        >
                            {t('mind_map.reset_layout')}
                        </button>
                    )}
                    <button 
                        onClick={zoomOut} 
                        className="h-8.5 w-8.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 active:scale-90 transition-transform"
                        title={t('mind_map.zoom_out_tooltip')}
                    >
                        <Minimize2 className="h-3.5 w-3.5" />
                    </button>
                    <button 
                        onClick={zoomIn} 
                        className="h-8.5 w-8.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 active:scale-90 transition-transform"
                        title={t('mind_map.zoom_in_tooltip')}
                    >
                        <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                    <button 
                        onClick={resetView} 
                        className="h-8.5 w-8.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 active:scale-90 transition-transform"
                        title={t('mind_map.reset_view_tooltip')}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Mind Map Canvas or Timeline Fallback */}
            {mapViewMode === 'canvas' ? (
                <div 
                    ref={viewportRef}
                    className="relative w-full flex-1 min-h-0 bg-[#070912] border border-white/5 rounded-3xl overflow-hidden select-none shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]"
                >
                    {/* Visual Grid Lines Backdrop */}
                    <div className="absolute inset-0 bg-[radial-gradient(#141829_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

                    {/* Safety check: if week is empty */}
                    {branchesData.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[#070912]/80 backdrop-blur-sm z-30 select-none">
                            <span className="text-4xl mb-3">🏝️</span>
                            <h4 className="text-sm font-black text-white uppercase tracking-wider">{t('mind_map.rest_week_title')}</h4>
                            <p className="text-xs text-gray-500 max-w-[200px] mt-1 leading-relaxed">{t('mind_map.rest_week_desc').replace('{week}', String(selectedWeek))}</p>
                        </div>
                    )}

                    {/* Animated Canvas */}
                    <motion.div
                        drag
                        dragMomentum={true}
                        dragTransition={{ bounceStiffness: 400, bounceDamping: 24 }}
                        className="absolute w-[2000px] h-[2000px] flex items-center justify-center origin-center cursor-grab active:cursor-grabbing"
                        style={{ 
                            scale: zoom, 
                            x: pan.x, 
                            y: pan.y,
                            left: 'calc(50% - 1000px)',
                            top: 'calc(50% - 1000px)',
                            touchAction: 'none'
                        }}
                        onWheel={(e) => {
                            e.preventDefault()
                            const delta = -e.deltaY * 0.001
                            setZoom(prev => Math.max(0.4, Math.min(2.0, prev + delta)))
                        }}
                        onDrag={(_, info) => {
                            setPan(prev => ({ x: prev.x + info.delta.x, y: prev.y + info.delta.y }))
                        }}
                    >
                        <svg className="w-[2000px] h-[2000px] absolute inset-0 overflow-visible pointer-events-none z-0">
                            <defs>
                                <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="var(--color-electric-blue)" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="var(--color-neon-violet)" stopOpacity="0.1" />
                                </linearGradient>
                                <linearGradient id="doneGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                                    <stop offset="100%" stopColor="#047857" stopOpacity="0.1" />
                                </linearGradient>
                                <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="4" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                                <style>{`
                                    @keyframes flow-dashed {
                                        to {
                                            stroke-dashoffset: -20;
                                        }
                                    }
                                    .animate-flow-done {
                                        stroke-dasharray: 8, 4;
                                        animation: flow-dashed 0.8s linear infinite;
                                    }
                                    .animate-flow-pending {
                                        stroke-dasharray: 6, 6;
                                        animation: flow-dashed 3s linear infinite;
                                        opacity: 0.35;
                                    }
                                    @keyframes svg-pulse {
                                        0% {
                                            r: 22px;
                                            opacity: 0.8;
                                            stroke-width: 1.5px;
                                        }
                                        100% {
                                            r: 38px;
                                            opacity: 0;
                                            stroke-width: 0.5px;
                                        }
                                    }
                                    .animate-pulse-ring {
                                        animation: svg-pulse 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
                                    }
                                `}</style>
                            </defs>

                            {/* Rendering Connecting Links */}
                            {layout.links.map(link => {
                                const isTaskCompleted = link.status === 'completed'
                                const strokeColor = isTaskCompleted ? 'url(#doneGradient)' : 'url(#glowGradient)'
                                const strokeWidth = link.type === 'root-branch' ? '3' : '1.5'
                                const flowClass = isTaskCompleted ? 'animate-flow-done' : 'animate-flow-pending'

                                return (
                                    <path
                                        key={link.id}
                                        d={`M ${link.x1} ${link.y1} Q ${link.cx} ${link.cy} ${link.x2} ${link.y2}`}
                                        fill="none"
                                        stroke={strokeColor}
                                        strokeWidth={strokeWidth}
                                        className={`${flowClass} transition-all duration-300`}
                                        style={{ pointerEvents: 'auto' }}
                                    />
                                )
                            })}

                            {/* Rendering Dependency Links (Prerequisites) */}
                            {dependencyLinksList.map(link => (
                                <path
                                    key={link.id}
                                    d={`M ${link.x1} ${link.y1} Q ${link.cx} ${link.cy} ${link.x2} ${link.y2}`}
                                    fill="none"
                                    stroke="#c084fc"
                                    strokeWidth="1"
                                    strokeDasharray="3,3"
                                    className="opacity-25 hover:opacity-85 transition-opacity"
                                    style={{ pointerEvents: 'auto' }}
                                />
                            ))}

                            {/* Pulsing Sonar Halo circles for Recommended Oracle Targets */}
                            {layout.nodes.map(node => {
                                if (node.type === 'task' && node.task.id === recommendedTaskId && node.task.status !== 'completed') {
                                    return (
                                        <circle
                                            key={`pulse-${node.id}`}
                                            cx={node.x}
                                            cy={node.y}
                                            r="26"
                                            fill="none"
                                            stroke="#00ffff"
                                            className="animate-pulse-ring pointer-events-none"
                                        />
                                    )
                                }
                                return null
                            })}
                        </svg>

                        {/* Rendering Interactive HTML Nodes */}
                        <div className="absolute inset-0 w-[2000px] h-[2000px] pointer-events-none z-10">
                            {layout.nodes.map(node => {
                                if (node.type === 'root') {
                                    return (
                                        <div
                                            key={node.id}
                                            className="absolute pointer-events-auto"
                                            style={{ 
                                                left: node.x, 
                                                top: node.y, 
                                                transform: 'translate(-50%, -50%)' 
                                            }}
                                        >
                                            <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-b from-[#131728]/95 to-[#0b0c16]/95 border-2 border-electric-blue text-center shadow-[0_0_30px_rgba(var(--accent-rgb),0.25)] min-w-[200px] max-w-[260px] backdrop-blur-xl">
                                                <CompassIcon className="w-6 h-6 text-electric-blue mb-1 animate-pulse" />
                                                <h3 className="text-white text-xs font-black tracking-tight leading-tight line-clamp-2 uppercase">{node.title}</h3>
                                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1.5 bg-white/5 px-2 py-0.5 rounded-full">{node.subtitle}</span>
                                            </div>
                                        </div>
                                    )
                                }

                                if (node.type === 'branch') {
                                    const isExpanded = node.isExpanded
                                    const isDayCompleted = node.completed === node.total && node.total > 0

                                    return (
                                        <button
                                            key={node.id}
                                            onClick={() => { if (wasDraggedRef.current) { wasDraggedRef.current = false; return; } toggleBranch(node.id) }}
                                            ref={(el) => {
                                                if (el && !el.dataset.hasDragListener) {
                                                    el.dataset.hasDragListener = 'true'
                                                    const onStart = (e: PointerEvent) => {
                                                        e.stopPropagation()
                                                        wasDraggedRef.current = false
                                                        isDraggingNodeRef.current = false
                                                        dragStartRef.current = {
                                                            nodeId: node.id,
                                                            x: e.clientX,
                                                            y: e.clientY,
                                                            startX: e.clientX,
                                                            startY: e.clientY
                                                        }
                                                    }
                                                    el.addEventListener('pointerdown', onStart as EventListener)
                                                }
                                            }}
                                            className="absolute pointer-events-auto cursor-grab active:cursor-grabbing select-none"
                                            style={{ 
                                                left: node.x, 
                                                top: node.y, 
                                                transform: 'translate(-50%, -50%)' 
                                            }}
                                        >
                                            <motion.div
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className={`flex flex-col items-center justify-center px-4 py-2.5 rounded-xl border bg-black/70 border-white/10 backdrop-blur-lg transition-all shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)] relative`}
                                            >
                                                {/* Completed Streak Flame Icon */}
                                                {isDayCompleted && (
                                                    <div className="absolute -top-3 -right-2 bg-orange-500/10 border border-orange-500/30 p-1 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.4)] animate-bounce">
                                                        <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500/30" />
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-2 h-2 rounded-full ${node.completed === node.total ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-electric-blue shadow-[0_0_8px_#00f0ff]'}`} />
                                                    <span className={`text-[10px] font-black tracking-wider uppercase text-white`}>
                                                        {t('plan.day_count').replace('{day}', node.name.replace('Day ', ''))}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                                    <span>{node.completed}/{node.total}</span>
                                                    <span className="opacity-40">•</span>
                                                    <span>{isExpanded ? t('mind_map.collapse') : t('mind_map.expand')}</span>
                                                </div>
                                            </motion.div>
                                        </button>
                                    )
                                }

                                if (node.type === 'task') {
                                    const task: Task = node.task
                                    const isCompleted = task.status === 'completed'
                                    const isVoid = task.task_type === 'void'
                                    
                                    // Memory Decay: completed tasks older than 3 days decay
                                    const isDecayed = isCompleted && (() => {
                                        const taskDate = new Date(task.due_date + 'T00:00:00')
                                        const diffTime = new Date().getTime() - taskDate.getTime()
                                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
                                        return diffDays >= 3
                                    })()

                                    const borderCol = priorityColors[task.priority] || '#ffffff'
                                    const isSelected = selectedTask?.id === task.id
                                    const hasCatalystGems = (task.priority === 4 || task.priority === 5) && !isCompleted

                                    return (
                                        <button
                                            key={node.id}
                                            onClick={() => { if (wasDraggedRef.current) { wasDraggedRef.current = false; return; } haptics.light(); setSelectedTask(task) }}
                                            ref={(el) => {
                                                if (el && !el.dataset.hasDragListener) {
                                                    el.dataset.hasDragListener = 'true'
                                                    const onStart = (e: PointerEvent) => {
                                                        e.stopPropagation()
                                                        wasDraggedRef.current = false
                                                        isDraggingNodeRef.current = false
                                                        dragStartRef.current = {
                                                            nodeId: node.id,
                                                            x: e.clientX,
                                                            y: e.clientY,
                                                            startX: e.clientX,
                                                            startY: e.clientY
                                                        }
                                                    }
                                                    el.addEventListener('pointerdown', onStart as EventListener)
                                                }
                                            }}
                                            className="absolute pointer-events-auto cursor-grab active:cursor-grabbing select-none group"
                                            style={{ 
                                                left: node.x, 
                                                top: node.y, 
                                                transform: 'translate(-50%, -50%)' 
                                            }}
                                        >
                                            <motion.div
                                                whileHover={{ scale: 1.15 }}
                                                whileTap={{ scale: 0.9 }}
                                                className={`h-11 w-11 rounded-full flex items-center justify-center bg-[#0e111a] border-2 shadow-lg transition-all relative ${
                                                    isSelected ? 'ring-4 ring-electric-blue/40 scale-110' : ''
                                                } ${isDecayed ? 'opacity-60' : ''}`}
                                                style={{ 
                                                    borderColor: isDecayed
                                                        ? '#f59e0b'
                                                        : isCompleted 
                                                            ? '#10b981' 
                                                            : borderCol,
                                                    boxShadow: isDecayed
                                                        ? '0 0 15px rgba(245,158,11,0.6)'
                                                        : isCompleted 
                                                            ? '0 0 15px rgba(16,185,129,0.3)' 
                                                            : `0 0 15px ${borderCol}33`
                                                }}
                                            >
                                                {isCompleted ? (
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                                ) : isVoid ? (
                                                    <Zap className="h-4 w-4 text-[#06b6d4]" />
                                                ) : (() => {
                                                    const SubjectIcon = getSubjectIcon(task.subject)
                                                    const subColor = getSubjectColor(task.subject)
                                                    return (
                                                        <SubjectIcon 
                                                            className="h-4 w-4" 
                                                            style={{ color: subColor }} 
                                                        />
                                                    )
                                                })()}

                                                {/* Micro target ping for Oracle's Beacon recommendation */}
                                                {task.id === recommendedTaskId && !isCompleted && (
                                                    <span className="absolute -top-1 -left-1 flex h-3 w-3">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                                                    </span>
                                                )}

                                                {/* Catalyst Double Gems Badge Overlay */}
                                                {hasCatalystGems && (
                                                    <span className="absolute -bottom-1 -right-1 bg-amber-500 border border-amber-400 rounded-full p-0.5 shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                                                        <Diamond className="w-2.5 h-2.5 text-white fill-white" />
                                                    </span>
                                                )}

                                                {/* Micro Tooltip with truncated title */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 border border-white/10 px-2 py-0.5 rounded text-[8px] font-bold text-white whitespace-nowrap pointer-events-none uppercase tracking-wider">
                                                    {task.title}
                                                </div>
                                            </motion.div>
                                        </button>
                                    )
                                }

                                return null
                            })}
                        </div>
                    </motion.div>

                    {/* Picture-in-Picture Mini-Map HUD Preview Container */}
                    <div className="absolute bottom-4 left-4 p-2 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md z-30 select-none shadow-[0_4px_20px_rgba(0,0,0,0.5)] hidden sm:flex flex-col gap-1.5 pointer-events-auto">
                        <div className="flex items-center justify-between text-[8px] font-black uppercase text-gray-400 tracking-wider w-[120px]">
                            <span>{t('mind_map.map_hud')}</span>
                            <button 
                                onClick={() => { haptics.light(); setShowMiniMap(!showMiniMap) }}
                                className="text-electric-blue hover:text-white transition-colors"
                            >
                                {showMiniMap ? t('mind_map.hide') : t('mind_map.show')}
                            </button>
                        </div>

                        {showMiniMap && (
                            <div 
                                id="minimap-hud"
                                onMouseDown={handleMiniMapMouseDown}
                                onMouseMove={handleMiniMapDrag}
                                onTouchStart={handleMiniMapMouseDown}
                                onTouchMove={handleMiniMapDrag}
                                className="relative w-[120px] h-[120px] bg-[#070912]/90 border border-white/5 rounded-lg overflow-hidden cursor-crosshair"
                            >
                                {/* Mini dots for nodes */}
                                {layout.nodes.map(n => {
                                    const mx = n.x * 0.06
                                    const my = n.y * 0.06
                                    
                                    let dotColor = '#3b82f6'
                                    let dotSize = 2
                                    
                                    if (n.type === 'root') {
                                        dotColor = '#00ffff'
                                        dotSize = 3
                                    } else if (n.type === 'branch') {
                                        dotColor = '#ffffff'
                                        dotSize = 2.5
                                    } else if (n.type === 'task') {
                                        dotColor = n.task.status === 'completed' ? '#10b981' : (priorityColors[n.task.priority] || '#3b82f6')
                                        dotSize = 2
                                    }

                                    return (
                                        <div
                                            key={`dot-${n.id}`}
                                            className="absolute rounded-full transform -translate-x-1/2 -translate-y-1/2"
                                            style={{
                                                left: mx,
                                                top: my,
                                                width: dotSize * 2,
                                                height: dotSize * 2,
                                                backgroundColor: dotColor,
                                                boxShadow: n.type === 'root' ? '0 0 4px #00ffff' : undefined
                                            }}
                                        />
                                    )
                                })}

                                {/* Viewport Boundary Box */}
                                <div
                                    className="absolute border border-electric-blue/75 bg-electric-blue/10 rounded-sm shadow-[0_0_8px_rgba(var(--accent-rgb),0.2)] pointer-events-none"
                                    style={{
                                        left: Math.max(0, Math.min(120, viewportLeftMini)),
                                        top: Math.max(0, Math.min(120, viewportTopMini)),
                                        width: Math.max(10, Math.min(120, viewportWidthMini)),
                                        height: Math.max(10, Math.min(120, viewportHeightMini))
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Legend and stats panel */}
                    <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-md p-3.5 rounded-2xl border border-white/5 pointer-events-none hidden sm:flex flex-col gap-1 items-start text-[8px] font-bold text-gray-500 tracking-wider uppercase select-none z-20">
                        <span className="text-[9px] text-white font-black mb-1">{t('mind_map.legend')}</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>{t('mind_map.legend_completed')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                            <span>{t('mind_map.p5_label')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                            <span>{t('mind_map.p4_label')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#eab308]" />
                            <span>{t('mind_map.p3_label')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
                            <span>{t('mind_map.p2_label')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#64748b]" />
                            <span>{t('mind_map.p1_label')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]" />
                            <span>{t('mind_map.p0_label')}</span>
                        </div>
                    </div>
                </div>
            ) : (
                /* Timeline Fallback View for Native Feel */
                <div className="w-full flex-1 min-h-0 overflow-y-auto pr-1 no-scrollbar flex flex-col gap-6 bg-[#070912] border border-white/5 rounded-3xl p-6 relative shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
                    {/* Visual Grid Lines Backdrop */}
                    <div className="absolute inset-0 bg-[radial-gradient(#141829_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-20 pointer-events-none rounded-3xl" />

                    {branchesData.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[#070912]/80 backdrop-blur-sm z-10 select-none rounded-3xl">
                            <span className="text-4xl mb-3">🏝️</span>
                            <h4 className="text-sm font-black text-white uppercase tracking-wider">{t('mind_map.rest_week_title')}</h4>
                            <p className="text-xs text-gray-500 max-w-[200px] mt-1 leading-relaxed">{t('mind_map.rest_week_desc').replace('{week}', String(selectedWeek))}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6 relative z-10">
                            {branchesData.map((branch) => {
                                const isDayCompleted = branch.completedCount === branch.totalCount && branch.totalCount > 0
                                return (
                                    <div key={branch.id} className="flex flex-col gap-3 relative pl-6 border-l border-dashed border-white/10 ml-3 last:border-l-0">
                                        {/* Day node / indicator on the line */}
                                        <div className="absolute -left-[9.5px] top-1.5 flex items-center justify-center">
                                            <div className={`w-4 h-4 rounded-full border-2 bg-[#070912] flex items-center justify-center transition-all ${
                                                isDayCompleted 
                                                    ? 'border-emerald-500 shadow-[0_0_8px_#10b981]' 
                                                    : 'border-electric-blue shadow-[0_0_8px_#00f0ff]'
                                            }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${isDayCompleted ? 'bg-emerald-500' : 'bg-electric-blue'}`} />
                                            </div>
                                        </div>

                                        {/* Day Title & Info */}
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                                                    {t('plan.day_count').replace('{day}', branch.name.replace('Day ', ''))}
                                                </h4>
                                                {isDayCompleted && (
                                                    <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500/20 animate-pulse" />
                                                )}
                                            </div>
                                            <span className="text-[9px] font-bold text-gray-500 tracking-wider">
                                                {t('mind_map.completed_count').replace('{completed}', String(branch.completedCount)).replace('{total}', String(branch.totalCount))}
                                            </span>
                                        </div>

                                        {/* Day's Tasks */}
                                        <div className="flex flex-col gap-2.5">
                                            {branch.tasks.map((task) => {
                                                const isCompleted = task.status === 'completed'
                                                const isVoid = task.task_type === 'void'
                                                const borderCol = priorityColors[task.priority] || '#ffffff'
                                                const hasCatalystGems = (task.priority === 4 || task.priority === 5) && !isCompleted
                                                const SubjectIcon = getSubjectIcon(task.subject)
                                                const subColor = getSubjectColor(task.subject)

                                                return (
                                                    <div
                                                        key={task.id}
                                                        onClick={() => { haptics.light(); setSelectedTask(task) }}
                                                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer bg-gradient-to-r ${
                                                            isCompleted 
                                                                ? 'from-emerald-500/[0.02] to-transparent border-emerald-500/10 hover:border-emerald-500/20' 
                                                                : 'from-white/[0.02] to-transparent border-white/5 hover:border-white/15'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            {/* Checkbox button */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleTaskToggle(task)
                                                                }}
                                                                className="flex items-center justify-center p-1 rounded-full text-gray-600 hover:text-white transition-colors cursor-pointer bg-transparent border-0"
                                                            >
                                                                {isCompleted ? (
                                                                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                                                ) : (
                                                                    <Circle className="h-5 w-5 text-gray-600 hover:text-electric-blue transition-colors" />
                                                                )}
                                                            </button>

                                                            {/* Icon / Task Type */}
                                                            <div 
                                                                className="h-8 w-8 rounded-full flex items-center justify-center bg-black/40 border shrink-0"
                                                                style={{ 
                                                                    borderColor: isCompleted ? '#10b981' : borderCol,
                                                                    boxShadow: isCompleted ? '0 0 8px rgba(16,185,129,0.1)' : `0 0 8px ${borderCol}15`
                                                                }}
                                                            >
                                                                {isCompleted ? (
                                                                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                                                ) : isVoid ? (
                                                                    <Zap className="h-4 w-4 text-[#06b6d4]" />
                                                                ) : (
                                                                    <SubjectIcon className="h-4 w-4" style={{ color: subColor }} />
                                                                )}
                                                            </div>

                                                            {/* Task Text & Badges */}
                                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">
                                                                        {task.subject || t('mind_map.general_subject')}
                                                                    </span>
                                                                    <span 
                                                                        className="text-[8px] font-black uppercase tracking-widest"
                                                                        style={{ color: borderCol }}
                                                                    >
                                                                        {task.priority === 5 ? 'P5' :
                                                                         task.priority === 4 ? 'P4' :
                                                                         task.priority === 3 ? 'P3' :
                                                                         task.priority === 2 ? 'P2' :
                                                                         task.priority === 1 ? 'P1' : 'P0'}
                                                                    </span>
                                                                    {hasCatalystGems && (
                                                                        <span className="flex items-center gap-0.5 bg-amber-500/10 border border-amber-500/20 rounded px-1 text-[7px] font-black text-amber-400">
                                                                            <Diamond className="w-2.5 h-2.5 fill-amber-400/20" />
                                                                            {t('focus.bonus_gems')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <h5 className={`text-xs font-black truncate text-white leading-tight ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                                                                    {task.title}
                                                                </h5>
                                                            </div>
                                                        </div>

                                                        {/* Action controls (Focus button or status) */}
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {!isCompleted && !isVoid && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        haptics.medium()
                                                                        setFocusTask(task)
                                                                    }}
                                                                    className="h-7 px-3 rounded-lg bg-electric-blue text-black text-[9px] font-black uppercase tracking-wider flex items-center gap-1 hover:scale-105 active:scale-95 transition-transform cursor-pointer border-0"
                                                                >
                                                                    <Play className="w-2.5 h-2.5 fill-black" />
                                                                    {t('task_card.btn_focus')}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Responsive task details sheet / centered modal overlay */}
            {mounted && createPortal(
                <AnimatePresence>
                    {selectedTask && (
                        <div className="fixed inset-0 z-[400] flex items-end justify-center md:items-center p-4">
                            {/* Backdrop overlay */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.7 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSelectedTask(null)}
                                className="absolute inset-0 bg-black/75 backdrop-blur-sm z-0"
                            />

                            {/* Panel Container */}
                            <motion.div
                                initial={isDesktop ? { scale: 0.95, opacity: 0 } : { y: '100%' }}
                                animate={isDesktop ? { scale: 1, opacity: 1 } : { y: 0 }}
                                exit={isDesktop ? { scale: 0.95, opacity: 0 } : { y: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 320 }}
                                drag={isDesktop ? false : "y"}
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={{ top: 0.1, bottom: 0.75 }}
                                onDragEnd={(e, info) => {
                                    if (!isDesktop && info.offset.y > 140) {
                                        setSelectedTask(null)
                                    }
                                }}
                                className="relative z-10 w-full max-w-md md:max-w-xl bg-gradient-to-b from-[#141829] to-[#0c0e17] border border-white/10 rounded-t-3xl md:rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] select-none pointer-events-auto overflow-hidden flex flex-col max-h-[85vh]"
                                style={isDesktop ? {} : { paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
                            >
                                {/* Top Glow Accent (Desktop only) */}
                                {isDesktop && <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-electric-blue via-neon-violet to-electric-blue opacity-80 blur-[0.5px]"></div>}

                                {/* Deep Ambient background glows */}
                                <div className="absolute -top-24 -left-24 w-52 h-52 bg-electric-blue/10 rounded-full blur-[60px] pointer-events-none"></div>
                                <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-neon-violet/10 rounded-full blur-[60px] pointer-events-none"></div>

                                {/* Drag handle (mobile only) */}
                                <div className="w-12 h-1.5 bg-white/15 rounded-full mx-auto mb-5 cursor-grab active:cursor-grabbing md:hidden" />

                                {/* Header details */}
                                <div className="flex items-start justify-between gap-4 mb-5 relative z-10">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-electric-blue uppercase tracking-widest bg-electric-blue/10 px-2.5 py-0.5 rounded">
                                                {(() => {
                                                    const SubjectIcon = getSubjectIcon(selectedTask.subject)
                                                    return <SubjectIcon className="h-3 w-3" />
                                                })()}
                                                {selectedTask.subject || t('mind_map.general_subject')}
                                            </span>
                                            <span className={`text-[9px] font-black uppercase tracking-widest bg-white/5 px-2.5 py-0.5 rounded ${
                                                selectedTask.priority === 5 ? 'text-red-400 border border-red-500/20' :
                                                selectedTask.priority === 4 ? 'text-orange-400 border border-orange-500/20' :
                                                selectedTask.priority === 3 ? 'text-yellow-400 border border-yellow-500/20' :
                                                selectedTask.priority === 2 ? 'text-blue-400 border border-blue-500/20' :
                                                selectedTask.priority === 1 ? 'text-gray-400 border border-white/5' : 'text-cyan-400 border border-cyan-500/20'
                                            }`}>
                                                {selectedTask.priority === 5 ? t('mind_map.p5_label') :
                                                 selectedTask.priority === 4 ? t('mind_map.p4_label') :
                                                 selectedTask.priority === 3 ? t('mind_map.p3_label') :
                                                 selectedTask.priority === 2 ? t('mind_map.p2_label') :
                                                 selectedTask.priority === 1 ? t('mind_map.p1_label') : t('mind_map.p0_label')}
                                            </span>
                                        </div>
                                        <h3 className="text-white text-base font-black leading-tight mt-1">
                                            {selectedTask.title}
                                        </h3>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                                            {t('mind_map.due').replace('{date}', selectedTask.due_date)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedTask(null)}
                                        className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
                                    >
                                        <X className="h-4 w-4 text-gray-400" />
                                    </button>
                                </div>

                                {/* Subtask Section */}
                                {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                                    <div className="mb-6 bg-black/35 p-4 rounded-2xl border border-white/5 relative z-10">
                                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2.5">{t('task_card.btn_subtasks')}</h4>
                                        <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
                                            {selectedTask.subtasks.map((st) => (
                                                <button
                                                    key={st.id}
                                                    onClick={() => handleSubtaskCheck(selectedTask, st.id, st.completed)}
                                                    className="w-full flex items-start gap-3 p-3 rounded-xl text-left bg-black/25 border border-white/5 hover:border-electric-blue/30 transition-all hover:bg-black/45 group"
                                                >
                                                    {st.completed ? (
                                                        <CheckSquare className="h-4 w-4 text-electric-blue shrink-0 mt-0.5" />
                                                    ) : (
                                                        <Square className="h-4 w-4 text-gray-600 group-hover:text-electric-blue/50 shrink-0 mt-0.5 transition-colors" />
                                                    )}
                                                    <span className={`text-xs ${st.completed ? 'line-through text-gray-600' : 'text-gray-300'}`}>
                                                        {st.title}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Task Action Grid */}
                                <div className="flex flex-col gap-3 relative z-10">
                                    {selectedTask.status !== 'completed' && selectedTask.task_type !== 'void' && (
                                        <button
                                            onClick={() => { haptics.medium(); setFocusTask(selectedTask) }}
                                            className="w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest bg-electric-blue text-black flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--accent-rgb),0.5)] active:scale-98 transition-all hover:scale-[1.01]"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-black" />
                                            {t('mind_map.launch_focus')}
                                        </button>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handleTaskToggle(selectedTask)}
                                            className={`py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 border transition-all duration-200 ${
                                                selectedTask.status === 'completed'
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)] col-span-2'
                                                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
                                            }`}
                                        >
                                            {selectedTask.status === 'completed' ? (
                                                <>
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    {t('task_card.status_completed')}
                                                </>
                                            ) : (
                                                <>
                                                    <Circle className="w-3.5 h-3.5" />
                                                    {t('task_card.btn_mark_completed')}
                                                </>
                                            )}
                                        </button>

                                        {selectedTask.status !== 'completed' && (
                                            <button
                                                onClick={() => handleReschedule(selectedTask)}
                                                className="py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <Calendar className="w-3.5 h-3.5" />
                                                {t('mind_map.delay_day')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Launch Focus overlay if selected */}
            {focusTask && (
                <FocusModeOverlay
                    task={focusTask}
                    goalTitle={goal.title}
                    onClose={() => setFocusTask(null)}
                    onOptimisticTokenUpdate={(delta) => {
                        if (onOptimisticTokenUpdate) onOptimisticTokenUpdate(delta)
                    }}
                    onTaskUpdate={(updatedTask) => {
                        setLocalTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t))
                    }}
                />
            )}
        </div>
    )
}
