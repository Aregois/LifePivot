'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Calendar, Plus, Trash2, X, Check, Clock, 
    Loader2, AlertTriangle, Layers, Search, 
    ArrowRightLeft, Sparkles, Settings
} from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { useLanguage } from '@/components/language-provider'
import { 
    updatePlanSettings, 
    addCustomPlanTask, 
    deleteTask, 
    deletePlan,
    updateTaskDate,
    shiftPlanSchedule
} from '@/app/actions'
import { createClient } from '@/utils/supabase/client'
import { getLocalDateString } from '@/utils/date-utils'

interface Goal {
    id: string
    title: string
    duration_days: number
    level?: string
    goal_intent?: string
    created_at?: string
    tasks?: any[]
}

interface PlanSettingsModalProps {
    isOpen: boolean
    onClose: () => void
    goal: Goal | null
    initialTab?: 'schedule' | 'add_task' | 'plan_details'
    onPlanUpdated?: (updated: Partial<Goal>) => void
    onTaskAdded?: (newTask: any) => void
    onTaskDateUpdated?: (taskId: string, newDate: string) => void
    onScheduleShifted?: (daysShift: number) => void
    onPlanDeleted?: (goalId: string) => void
}

type TabKey = 'schedule' | 'add_task' | 'plan_details'

export function PlanSettingsModal({
    isOpen,
    onClose,
    goal,
    initialTab = 'schedule',
    onPlanUpdated,
    onTaskAdded,
    onTaskDateUpdated,
    onScheduleShifted,
    onPlanDeleted
}: PlanSettingsModalProps) {
    const { t } = useLanguage()
    const [activeTab, setActiveTab] = useState<TabKey>(initialTab)

    // ── Tab 1: Tasks Schedule State ──────────────────────────────────────────
    const [planTasks, setPlanTasks] = useState<any[]>([])
    const [isLoadingTasks, setIsLoadingTasks] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all')
    const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
    const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

    // Global Shift Tool State
    const [shiftDaysInput, setShiftDaysInput] = useState<number>(7)
    const [isShifting, setIsShifting] = useState(false)
    const [shiftSuccess, setShiftSuccess] = useState<string | null>(null)
    const [showShiftTool, setShowShiftTool] = useState(false)

    // ── Tab 2: Add Task Form State ───────────────────────────────────────────
    const [taskTitle, setTaskTitle] = useState('')
    const [taskPriority, setTaskPriority] = useState<number>(3)
    const [taskDuration, setTaskDuration] = useState<number>(45)
    const [taskDueDate, setTaskDueDate] = useState(getLocalDateString())
    const [subtaskInput, setSubtaskInput] = useState('')
    const [subtasks, setSubtasks] = useState<string[]>([])
    const [isAddingTask, setIsAddingTask] = useState(false)
    const [taskSuccess, setTaskSuccess] = useState(false)

    // ── Tab 3: Plan Details State ───────────────────────────────────────────
    const [title, setTitle] = useState('')
    const [isSavingTitle, setIsSavingTitle] = useState(false)
    const [titleSuccess, setTitleSuccess] = useState(false)
    const [confirmDeletePlan, setConfirmDeletePlan] = useState(false)
    const [isDeletingPlan, setIsDeletingPlan] = useState(false)

    // Sync state when active goal changes
    useEffect(() => {
        if (goal) {
            setTitle(goal.title || '')
            setTaskDueDate(getLocalDateString())
            setConfirmDeletePlan(false)
            setShiftSuccess(null)
            fetchPlanTasks(goal.id)
        }
    }, [goal])

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab)
        }
    }, [isOpen, initialTab])

    const fetchPlanTasks = async (goalId: string) => {
        setIsLoadingTasks(true)
        try {
            const supabase = createClient()
            const { data } = await supabase
                .from('tasks')
                .select('id, title, priority, due_date, status, duration_mins, subtasks')
                .eq('goal_id', goalId)
                .order('due_date', { ascending: true })
            if (data) {
                setPlanTasks(data)
            }
        } catch (err) {
            console.error('Error fetching plan tasks:', err)
        } finally {
            setIsLoadingTasks(false)
        }
    }

    // Filter tasks
    const filteredTasks = useMemo(() => {
        return planTasks.filter(task => {
            const matchesSearch = !searchQuery.trim() || 
                task.title?.toLowerCase().includes(searchQuery.toLowerCase().trim())
            const matchesStatus = filterStatus === 'all' 
                ? true 
                : task.status === filterStatus
            return matchesSearch && matchesStatus
        })
    }, [planTasks, searchQuery, filterStatus])

    if (!isOpen || !goal) return null

    // ── Handle Task Date Change ──────────────────────────────────────────────
    const handleTaskDateChange = async (taskId: string, newDate: string) => {
        if (!newDate) return
        setUpdatingTaskId(taskId)
        haptics.light()

        // Optimistic UI update
        setPlanTasks(prev => prev.map(t => t.id === taskId ? { ...t, due_date: newDate } : t))
        onTaskDateUpdated?.(taskId, newDate)

        try {
            const res = await updateTaskDate(taskId, newDate)
            if (res.success) {
                haptics.success()
            }
        } catch (err) {
            console.error('Failed to update task date:', err)
        } finally {
            setUpdatingTaskId(null)
        }
    }

    const handleQuickDateChange = async (taskId: string, offsetDays: number) => {
        const d = new Date()
        d.setDate(d.getDate() + offsetDays)
        const dateStr = getLocalDateString(d)
        await handleTaskDateChange(taskId, dateStr)
    }

    // ── Handle Shift Curriculum Schedule ────────────────────────────────────
    const handleApplyShift = async (days: number) => {
        if (!days || isNaN(days)) return
        setIsShifting(true)
        haptics.medium()

        const todayStr = getLocalDateString()

        // Optimistic UI update: shift all tasks on or after today
        setPlanTasks(prev => prev.map(t => {
            if (!t.due_date || t.due_date < todayStr) return t
            const d = new Date(t.due_date + 'T00:00:00')
            d.setDate(d.getDate() + days)
            return { ...t, due_date: getLocalDateString(d) }
        }))
        onScheduleShifted?.(days)

        try {
            const res = await shiftPlanSchedule(goal.id, todayStr, days)
            if (res.success) {
                haptics.success()
                setShiftSuccess(`Successfully shifted ${res.count} tasks by ${days > 0 ? '+' : ''}${days} days!`)
                setTimeout(() => setShiftSuccess(null), 4000)
            }
        } catch (err) {
            console.error('Failed to shift schedule:', err)
        } finally {
            setIsShifting(false)
        }
    }

    // ── Handle Subtask Checklist in Add Task ─────────────────────────────────
    const handleAddSubtask = () => {
        if (!subtaskInput.trim()) return
        haptics.light()
        setSubtasks(prev => [...prev, subtaskInput.trim()])
        setSubtaskInput('')
    }

    const handleRemoveSubtask = (index: number) => {
        haptics.light()
        setSubtasks(prev => prev.filter((_, i) => i !== index))
    }

    // ── Handle Submit Custom Task ───────────────────────────────────────────
    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!taskTitle.trim()) return
        setIsAddingTask(true)
        haptics.medium()

        try {
            const res = await addCustomPlanTask({
                goalId: goal.id,
                title: taskTitle.trim(),
                priority: taskPriority,
                durationMins: taskDuration,
                dueDate: taskDueDate,
                subtasks
            })

            if (res.success && res.task) {
                haptics.success()
                setTaskSuccess(true)
                setTaskTitle('')
                setSubtasks([])
                setSubtaskInput('')
                setTimeout(() => setTaskSuccess(false), 3000)
                setPlanTasks(prev => [...prev, res.task])
                onTaskAdded?.(res.task)
            }
        } catch (err) {
            console.error('Error creating custom task:', err)
        } finally {
            setIsAddingTask(false)
        }
    }

    // ── Handle Delete Single Task ───────────────────────────────────────────
    const handleDeleteTaskItem = async (taskId: string) => {
        setDeletingTaskId(taskId)
        haptics.medium()
        try {
            const res = await deleteTask(taskId)
            if (res.success) {
                haptics.success()
                setPlanTasks(prev => prev.filter(t => t.id !== taskId))
            }
        } catch (err) {
            console.error('Error deleting task:', err)
        } finally {
            setDeletingTaskId(null)
        }
    }

    // ── Handle Save Plan Name ────────────────────────────────────────────────
    const handleSaveTitle = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return
        setIsSavingTitle(true)
        haptics.medium()

        try {
            const res = await updatePlanSettings(goal.id, { title: title.trim() })
            if (res.success) {
                haptics.success()
                setTitleSuccess(true)
                setTimeout(() => setTitleSuccess(false), 3000)
                onPlanUpdated?.({ title: title.trim() })
            }
        } catch (err) {
            console.error('Error saving plan name:', err)
        } finally {
            setIsSavingTitle(false)
        }
    }

    // ── Handle Delete Entire Plan ───────────────────────────────────────────
    const handleDeleteEntirePlan = async () => {
        setIsDeletingPlan(true)
        haptics.heavy()
        try {
            const res = await deletePlan(goal.id)
            if (res.success) {
                haptics.success()
                onPlanDeleted?.(goal.id)
                onClose()
            }
        } catch (err) {
            console.error('Error deleting plan:', err)
        } finally {
            setIsDeletingPlan(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-[#050508]/85 backdrop-blur-xl select-none overflow-y-auto">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-electric-blue/10 rounded-full blur-[140px]" />
                <div className="absolute bottom-[20%] right-[20%] w-[350px] h-[350px] bg-neon-violet/10 rounded-full blur-[140px]" />
            </div>

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="relative w-full max-w-2xl rounded-[2.5rem] bg-[#121118]/95 border border-white/10 p-6 sm:p-8 shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col gap-6 max-h-[92vh] overflow-hidden"
            >
                {/* ── Top Header ────────────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-electric-blue/15 border border-electric-blue/30 flex items-center justify-center text-electric-blue shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)]">
                            <Calendar className="w-5 h-5 text-electric-blue" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-electric-blue">
                                    Curriculum Schedule & Tasks
                                </span>
                                <span className="text-[9px] font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                    {planTasks.length} Total Tasks
                                </span>
                            </div>
                            <h2 className="text-lg sm:text-xl font-extrabold text-white truncate max-w-sm sm:max-w-md uppercase tracking-tight mt-0.5">
                                {goal.title}
                            </h2>
                        </div>
                    </div>

                    <button
                        onClick={() => { haptics.light(); onClose() }}
                        className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ── Segmented Navigation Tabs ──────────────────────────────── */}
                <div className="flex items-center gap-2 bg-[#0A0B10] p-1.5 rounded-2xl border border-white/5">
                    <button
                        type="button"
                        onClick={() => { haptics.light(); setActiveTab('schedule') }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'schedule'
                                ? 'bg-electric-blue text-black shadow-md font-black'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Tasks & Dates ({planTasks.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { haptics.light(); setActiveTab('add_task') }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'add_task'
                                ? 'bg-electric-blue text-black shadow-md font-black'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Task</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { haptics.light(); setActiveTab('plan_details') }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'plan_details'
                                ? 'bg-electric-blue text-black shadow-md font-black'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Plan Details</span>
                    </button>
                </div>

                {/* ── Tab Panels (Scrollable) ────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                    {/* ── TAB 1: Tasks & Schedule Management ──────────────────── */}
                    {activeTab === 'schedule' && (
                        <div className="space-y-4">
                            {/* Extend or Shift Schedule Tool Accordion / Toggle */}
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ArrowRightLeft className="w-4 h-4 text-neon-violet" />
                                        <span className="text-xs font-black text-white uppercase tracking-wider">
                                            Extend or Shift Schedule
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowShiftTool(!showShiftTool)}
                                        className="text-[10px] font-black uppercase tracking-wider text-electric-blue hover:underline"
                                    >
                                        {showShiftTool ? 'Hide' : 'Extend Plan / Shift Dates'}
                                    </button>
                                </div>

                                {showShiftTool && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="space-y-3 pt-2 border-t border-white/5"
                                    >
                                        <p className="text-[11px] text-gray-400 leading-relaxed">
                                            Need to extend your plan (e.g. from 30 to 60 days) or took a break? Shift all upcoming tasks forward across the curriculum:
                                        </p>
                                        
                                        {/* Quick Presets */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {[
                                                { label: '+1 Day', days: 1 },
                                                { label: '+3 Days', days: 3 },
                                                { label: '+1 Week', days: 7 },
                                                { label: '+2 Weeks', days: 14 },
                                                { label: '+30 Days (Extend)', days: 30 }
                                            ].map(preset => (
                                                <button
                                                    key={preset.days}
                                                    type="button"
                                                    disabled={isShifting}
                                                    onClick={() => handleApplyShift(preset.days)}
                                                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-electric-blue/15 border border-white/10 hover:border-electric-blue/30 text-gray-300 hover:text-electric-blue text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Custom input */}
                                        <div className="flex items-center gap-2 pt-1">
                                            <input
                                                type="number"
                                                value={shiftDaysInput}
                                                onChange={(e) => setShiftDaysInput(parseInt(e.target.value) || 0)}
                                                placeholder="Days"
                                                className="w-20 bg-[#0A0B10] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-electric-blue text-center font-bold"
                                            />
                                            <button
                                                type="button"
                                                disabled={isShifting || !shiftDaysInput}
                                                onClick={() => handleApplyShift(shiftDaysInput)}
                                                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-neon-violet to-electric-blue text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                {isShifting ? 'Shifting...' : `Shift Upcoming by ${shiftDaysInput} Days`}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {shiftSuccess && (
                                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
                                        <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                                        <span>{shiftSuccess}</span>
                                    </div>
                                )}
                            </div>

                            {/* Search and Filter Row */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                                <div className="relative flex-1">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search tasks..."
                                        className="w-full bg-[#0A0B10] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-electric-blue"
                                    />
                                </div>
                                <div className="inline-flex p-1 rounded-xl bg-[#0A0B10] border border-white/5 text-[10px] font-bold">
                                    {(['all', 'pending', 'completed'] as const).map(st => (
                                        <button
                                            key={st}
                                            type="button"
                                            onClick={() => setFilterStatus(st)}
                                            className={`px-2.5 py-1 rounded-lg uppercase tracking-wider transition-colors ${
                                                filterStatus === st 
                                                    ? 'bg-white/10 text-white font-black' 
                                                    : 'text-gray-500 hover:text-gray-300'
                                            }`}
                                        >
                                            {st}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tasks List */}
                            {isLoadingTasks ? (
                                <div className="flex items-center justify-center py-12 text-gray-500">
                                    <Loader2 className="w-6 h-6 animate-spin text-electric-blue" />
                                </div>
                            ) : filteredTasks.length === 0 ? (
                                <div className="text-center py-12 border border-white/5 rounded-2xl bg-white/[0.01]">
                                    <Calendar className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                                    <p className="text-gray-400 text-xs font-semibold">No tasks matched your filter.</p>
                                </div>
                            ) : (
                                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                                    {filteredTasks.map((t) => (
                                        <div
                                            key={t.id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${
                                                    t.priority >= 4 
                                                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' 
                                                        : 'bg-electric-blue/15 text-electric-blue border border-electric-blue/20'
                                                }`}>
                                                    P{t.priority}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className={`text-xs font-bold truncate ${
                                                        t.status === 'completed' ? 'line-through text-gray-500' : 'text-white'
                                                    }`}>
                                                        {t.title}
                                                    </h4>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                                                        <span>{t.duration_mins || 45}m</span>
                                                        {t.subtasks?.length > 0 && (
                                                            <>
                                                                <span>·</span>
                                                                <span>{t.subtasks.filter((st: any) => st.completed).length}/{t.subtasks.length} subtasks</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Interactive Date Changer + Quick Reschedule Buttons */}
                                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap justify-end">
                                                {/* Date Picker Input */}
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="date"
                                                        value={t.due_date || ''}
                                                        onChange={(e) => handleTaskDateChange(t.id, e.target.value)}
                                                        className="bg-[#0A0B10] border border-white/10 hover:border-electric-blue/50 text-white text-[11px] font-medium rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-electric-blue cursor-pointer transition-colors"
                                                        title="Pick exact due date"
                                                    />
                                                    {updatingTaskId === t.id && (
                                                        <div className="absolute inset-0 bg-black/70 rounded-xl flex items-center justify-center">
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-electric-blue" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Quick Reschedule Shortcuts */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickDateChange(t.id, 0)}
                                                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-400 hover:text-white transition-colors"
                                                    title="Move to Today"
                                                >
                                                    Today
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickDateChange(t.id, 1)}
                                                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-400 hover:text-white transition-colors"
                                                    title="Move to Tomorrow"
                                                >
                                                    +1d
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickDateChange(t.id, 7)}
                                                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-400 hover:text-white transition-colors"
                                                    title="Move +1 Week"
                                                >
                                                    +7d
                                                </button>

                                                {/* Delete Task */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteTaskItem(t.id)}
                                                    disabled={deletingTaskId === t.id}
                                                    className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                                                    title="Delete task"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB 2: Add Custom Task ──────────────────────────────── */}
                    {activeTab === 'add_task' && (
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            {/* Task Title */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    Task / Topic Title
                                </label>
                                <input
                                    type="text"
                                    value={taskTitle}
                                    onChange={(e) => setTaskTitle(e.target.value)}
                                    placeholder="e.g., Code Multi-Head Self-Attention Layer"
                                    required
                                    className="w-full bg-[#0A0B10] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-electric-blue transition-colors font-medium"
                                />
                            </div>

                            {/* Priority Selector (P1 to P5) */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                        Priority Tier
                                    </label>
                                    <span className="text-[10px] font-bold text-amber-400">
                                        {taskPriority === 5 ? '+3 Tokens (Deep Theory)' : taskPriority === 4 ? '+2 Tokens (Hard Sprint)' : '+1 Token'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {[1, 2, 3, 4, 5].map((p) => {
                                        const labels = ['Exercise', 'Reading', 'Standard', 'Deep Focus', 'Mastery']
                                        return (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => { haptics.light(); setTaskPriority(p) }}
                                                className={`py-2 px-1 rounded-xl text-center border transition-all cursor-pointer ${
                                                    taskPriority === p
                                                        ? 'bg-electric-blue text-black border-electric-blue font-black shadow-md'
                                                        : 'bg-white/[0.02] border-white/5 text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                <div className="text-xs font-black">P{p}</div>
                                                <div className="text-[8px] uppercase tracking-tighter truncate opacity-80">{labels[p - 1]}</div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Due Date & Estimated Duration */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        value={taskDueDate}
                                        onChange={(e) => setTaskDueDate(e.target.value)}
                                        className="w-full bg-[#0A0B10] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-electric-blue cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                        Estimated Duration (Mins)
                                    </label>
                                    <div className="flex gap-1.5">
                                        {[15, 30, 45, 60, 90].map((mins) => (
                                            <button
                                                key={mins}
                                                type="button"
                                                onClick={() => { haptics.light(); setTaskDuration(mins) }}
                                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                                    taskDuration === mins
                                                        ? 'bg-white/20 border-white text-white font-black'
                                                        : 'bg-white/[0.02] border-white/5 text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                {mins}m
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Subtask Checklist Input */}
                            <div className="space-y-2 pt-2 border-t border-white/5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center justify-between">
                                    <span>Subtask Checklist</span>
                                    <span className="text-[9px] text-gray-500 font-normal">Optional bite-sized steps</span>
                                </label>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={subtaskInput}
                                        onChange={(e) => setSubtaskInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                handleAddSubtask()
                                            }
                                        }}
                                        placeholder="Add a subtask step..."
                                        className="flex-1 bg-[#0A0B10] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-electric-blue transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddSubtask}
                                        className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>

                                {subtasks.length > 0 && (
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                        {subtasks.map((st, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-300"
                                            >
                                                <span className="truncate pr-2">{idx + 1}. {st}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveSubtask(idx)}
                                                    className="text-gray-500 hover:text-rose-400 p-1"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {taskSuccess && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                                    <Check className="w-4 h-4 shrink-0" />
                                    <span>Task successfully added to this curriculum!</span>
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={isAddingTask}
                                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-neon-violet to-electric-blue text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 mt-2"
                            >
                                {isAddingTask ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Adding Task...</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 stroke-[3]" />
                                        <span>Add Task to Curriculum</span>
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* ── TAB 3: Plan Name & Danger Zone ──────────────────────── */}
                    {activeTab === 'plan_details' && (
                        <div className="space-y-6">
                            {/* Rename Plan Name */}
                            <form onSubmit={handleSaveTitle} className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    Plan Topic / Title
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Master Full-Stack Web Architecture"
                                    required
                                    className="w-full bg-[#0A0B10] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-electric-blue transition-colors font-medium"
                                />

                                {titleSuccess && (
                                    <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Plan title updated!</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSavingTitle}
                                    className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-black text-xs uppercase tracking-wider transition-all"
                                >
                                    {isSavingTitle ? 'Saving...' : 'Update Plan Title'}
                                </button>
                            </form>

                            {/* Danger Zone */}
                            <div className="pt-4 border-t border-white/5 space-y-2">
                                <div className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                                    Danger Zone
                                </div>

                                {!confirmDeletePlan ? (
                                    <button
                                        type="button"
                                        onClick={() => { haptics.medium(); setConfirmDeletePlan(true) }}
                                        className="w-full py-2.5 px-4 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete This Plan</span>
                                    </button>
                                ) : (
                                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                                        <div className="flex items-start gap-2.5 text-xs text-rose-300">
                                            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                                            <span>Are you sure? This will permanently delete this plan and all associated tasks.</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDeletePlan(false)}
                                                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDeleteEntirePlan}
                                                disabled={isDeletingPlan}
                                                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-black text-white uppercase tracking-wider transition-colors disabled:opacity-50"
                                            >
                                                {isDeletingPlan ? 'Deleting...' : 'Yes, Delete'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
