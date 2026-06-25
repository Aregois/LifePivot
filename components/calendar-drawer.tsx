'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { X, Calendar } from 'lucide-react'
import { TaskCard } from './task-card'
import { FocusModeOverlay } from './focus-mode-overlay'
import { toggleTask, toggleSubtask, rescheduleTaskToTomorrow } from '@/app/actions'
import { useEconomy } from './economy-provider'
import type { Task } from '@/utils/types'
import { haptics } from '@/utils/haptics'
import { useLanguage } from './language-provider'

const TOKEN_REWARD: Record<number, number> = { 0: 0, 1: 1, 2: 1, 3: 1, 4: 2, 5: 3 }

interface CalendarDrawerProps {
    isOpen: boolean
    onClose: () => void
    dateStr: string
    tasks: Task[]
    onTasksUpdate?: (updatedTasks: Task[]) => void
}

export function CalendarDrawer({ isOpen, onClose, dateStr, tasks, onTasksUpdate }: CalendarDrawerProps) {
    const { setTokens, setXp, setLevel, level } = useEconomy()
    const { t, locale } = useLanguage()
    const [focusTask, setFocusTask] = useState<Task | null>(null)
    const [localTasks, setLocalTasks] = useState<Task[]>(tasks)
    const [isDesktop, setIsDesktop] = useState(false)

    useEffect(() => {
        setIsDesktop(window.innerWidth >= 1024)
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Re-sync local state when tasks prop changes
    useEffect(() => {
        setLocalTasks(tasks)
    }, [tasks])

    const handleToggle = async (taskId: string, currentStatus: string) => {
        const task = localTasks.find(t => t.id === taskId)
        const tokenDelta = TOKEN_REWARD[task?.priority ?? 3] ?? 1
        const baseXp = task?.priority && task.priority > 0 ? (task.priority * 10 + 10) : 0

        haptics.medium()
        
        // Optimistic state updates
        const updated = localTasks.map(t => 
            t.id === taskId 
                ? { ...t, status: currentStatus === 'pending' ? 'completed' : 'pending' as any } 
                : t
        )
        setLocalTasks(updated)
        onTasksUpdate?.(updated)

        if (currentStatus === 'pending') {
            setTokens(prev => prev + tokenDelta)
            setXp(prev => {
                let nextXp = prev + baseXp
                let xpNeeded = level * 100
                if (nextXp >= xpNeeded) {
                    setLevel(l => l + 1)
                    return nextXp - xpNeeded
                }
                return nextXp
            })
        } else {
            setTokens(prev => Math.max(0, prev - tokenDelta))
            setXp(prev => Math.max(0, prev - baseXp))
        }

        await toggleTask(taskId, currentStatus)
    }

    const handleSubtaskCheck = async (taskId: string, subtaskId: string, completed: boolean) => {
        const updated = localTasks.map(t => {
            if (t.id === taskId) {
                const updatedSubtasks = (t.subtasks ?? []).map(st => 
                    st.id === subtaskId ? { ...st, completed } : st
                )
                return { ...t, subtasks: updatedSubtasks }
            }
            return t
        })
        setLocalTasks(updated)
        onTasksUpdate?.(updated)
        await toggleSubtask(taskId, subtaskId, completed)
    }

    const handleReschedule = async (taskId: string) => {
        haptics.medium()
        const updated = localTasks.filter(t => t.id !== taskId)
        setLocalTasks(updated)
        onTasksUpdate?.(updated)
        await rescheduleTaskToTomorrow(taskId)
    }

    const handleFocusTaskUpdate = (updatedTask: Task) => {
        const updated = localTasks.map(t => t.id === updatedTask.id ? updatedTask : t)
        setLocalTasks(updated)
        onTasksUpdate?.(updated)
    }

    // Format date beautifully
    const formattedDate = () => {
        try {
            const date = new Date(dateStr + 'T00:00:00')
            return date.toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' })
        } catch (e) {
            return dateStr
        }
    }

    return (
        <>
            {/* Focus Mode Overlay Integration */}
            {focusTask && (
                <FocusModeOverlay
                    task={focusTask}
                    goalTitle={(focusTask as any).learning_goals?.title ?? t('dashboard.focus_session')}
                    onClose={() => setFocusTask(null)}
                    onOptimisticTokenUpdate={(delta) => setTokens(prev => Math.max(0, prev + delta))}
                    onTaskUpdate={handleFocusTaskUpdate}
                />
            )}

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[200] flex items-end justify-center md:items-center p-0 md:p-4">
                        
                        {/* Backdrop overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { haptics.light(); onClose() }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0"
                        />

                        {/* Slide up sheet / Centered Modal */}
                        <motion.div
                            initial={isDesktop ? { scale: 0.95, opacity: 0 } : { y: '100%' }}
                            animate={isDesktop ? { scale: 1, opacity: 1 } : { y: 0 }}
                            exit={isDesktop ? { scale: 0.95, opacity: 0 } : { y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                            drag={isDesktop ? false : 'y'}
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={0.3}
                            onDragEnd={(_, info: PanInfo) => { 
                                if (info.offset.y > 80 || info.velocity.y > 400) {
                                    onClose() 
                                }
                            }}
                            className="relative w-full max-w-md md:max-w-xl bg-[#0c0e17] border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 shadow-[0_-15px_30px_rgba(0,0,0,0.5)] md:shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-10 flex flex-col max-h-[85vh] overflow-hidden"
                            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
                        >
                            {/* Drag handle (mobile only) */}
                            <div className="mx-auto w-12 h-1 bg-white/10 rounded-full mb-4 shrink-0 md:hidden" />

                            {/* Header */}
                            <div className="flex items-center justify-between mb-6 shrink-0">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-electric-blue" />
                                    <h3 className="text-lg font-black text-white">{formattedDate()}</h3>
                                </div>
                                <button
                                    onClick={() => { haptics.light(); onClose() }}
                                    className="h-8 w-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center active:scale-90 transition-transform"
                                >
                                    <X className="h-4 w-4 text-gray-500" />
                                </button>
                            </div>

                            {/* Tasks List */}
                            <div className="flex-1 overflow-y-auto pr-1 pb-4">
                                {localTasks.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500 text-xs italic">
                                        {t('plan.no_tasks_scheduled')}
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        {localTasks.map((task, i) => (
                                            <TaskCard
                                                key={task.id}
                                                task={task}
                                                onCheck={handleToggle}
                                                onSubtaskCheck={handleSubtaskCheck}
                                                onFocus={setFocusTask}
                                                onReschedule={handleReschedule}
                                                index={i}
                                                isLocked={false}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}
