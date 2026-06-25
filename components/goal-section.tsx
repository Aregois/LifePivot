'use client'

import { TaskCard } from './task-card'
import { toggleTask, addTask, toggleSubtask, rescheduleTaskToTomorrow } from '@/app/actions'
import { useEconomy } from './economy-provider'
import { FocusModeOverlay } from './focus-mode-overlay'
import { Plus } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import type { Task } from '@/utils/types'
import { useLanguage } from './language-provider'

const TOKEN_REWARD: Record<number, number> = {
    0: 0,
    1: 1,
    2: 1,
    3: 1,
    4: 2,
    5: 3,
}

interface GoalWithTasks {
    id: string
    title: string
    tasks: Task[]
    plan_metadata?: {
        is_crunch_mode?: boolean
        language?: string
    }
}

export function GoalSection({ goal, selectedDate }: { goal: GoalWithTasks, selectedDate: string }) {
    const { setTokens, setXp, setLevel, level } = useEconomy()
    const { t, locale } = useLanguage()
    
    const planLanguage = goal.plan_metadata?.language || 'en'

    const isCrunchMode = goal.plan_metadata?.is_crunch_mode
    const formRef = useRef<HTMLFormElement>(null)
    const [focusTask, setFocusTask] = useState<Task | null>(null)

    const handleToggle = async (taskId: string, currentStatus: string) => {
        // Find the task to get its priority for the optimistic token delta
        const task = goal.tasks.find(t => t.id === taskId)
        const tokenDelta = TOKEN_REWARD[task?.priority ?? 3] ?? 1
        const baseXp = task?.priority && task.priority > 0 ? (task.priority * 10 + 10) : 0

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
        } else if (currentStatus === 'completed') {
            setTokens(prev => Math.max(0, prev - tokenDelta))
            setXp(prev => Math.max(0, prev - baseXp))
        }

        await toggleTask(taskId, currentStatus)
    }

    const handleSubtaskCheck = async (taskId: string, subtaskId: string, completed: boolean) => {
        await toggleSubtask(taskId, subtaskId, completed)
    }

    const handleReschedule = async (taskId: string) => {
        await rescheduleTaskToTomorrow(taskId)
    }

    const handleAddTask = async (formData: FormData) => {
        await addTask(goal.id, formData)
        formRef.current?.reset()
    }

    // Filter tasks for the selected date
    const tasksForDate = goal.tasks.filter(t => t.due_date === selectedDate)

    // Logic: A task is "Locked" if there are ANY pending tasks with a due_date earlier than the selectedDate
    // This enforces sequential completion day by day.
    const hasUnfinishedPredecessors = goal.tasks.some(
        t => t.due_date < selectedDate && t.status === 'pending'
    )

    const pendingTasks = tasksForDate.filter(t => t.status === 'pending')
    const completedTasks = tasksForDate.filter(t => t.status === 'completed')

    return (
        <div className="mb-12">
            {/* Focus Mode Overlay */}
            {focusTask && (
                <FocusModeOverlay
                    task={focusTask}
                    goalTitle={goal.title}
                    onClose={() => setFocusTask(null)}
                    onOptimisticTokenUpdate={(delta) => setTokens(prev => Math.max(0, prev + delta))}
                />
            )}

            <h2 className="text-xl font-bold tracking-tight text-white mb-2">
                {goal.title}
            </h2>
            {isCrunchMode && (
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400 italic mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    {t('plan.crunch_mode')}
                </p>
            )}

            <div className="flex flex-col mb-6">
                {pendingTasks.map((task, index) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onCheck={handleToggle}
                        onSubtaskCheck={handleSubtaskCheck}
                        onFocus={setFocusTask}
                        onReschedule={handleReschedule}
                        index={index}
                        isLocked={hasUnfinishedPredecessors}
                        isCrunch={isCrunchMode}
                        planLanguage={planLanguage}
                    />
                ))}

                {pendingTasks.length === 0 && completedTasks.length === 0 && (
                    <div className="p-8 rounded-3xl border border-white/5 bg-[#141824]/30 text-center">
                        <p className="text-gray-500 text-sm italic">{t('plan.no_tasks_scheduled')}</p>
                    </div>
                )}
            </div>

            <form ref={formRef} action={handleAddTask} className="flex items-center gap-3 mt-4" suppressHydrationWarning>
                <input
                    name="title"
                    type="text"
                    placeholder={t('plan.new_task_placeholder')}
                    className="flex-1 bg-[#121626]/80 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white placeholder-gray-500 focus:border-electric-blue focus:outline-none focus:ring-1 focus:ring-electric-blue transition-all"
                    suppressHydrationWarning
                />
                <button
                    type="submit"
                    className="bg-electric-blue/10 hover:bg-electric-blue/20 border border-electric-blue/20 p-4 rounded-2xl text-electric-blue transition-colors"
                >
                    <Plus className="h-5 w-5" />
                </button>
            </form>

            {completedTasks.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-xs font-bold text-gray-500 mb-4 tracking-wider uppercase">{t('plan.completed')}</h3>
                    <div className="flex flex-col opacity-60">
                        {completedTasks.map((task, index) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onCheck={handleToggle}
                                onSubtaskCheck={handleSubtaskCheck}
                                index={index + pendingTasks.length}
                                isLocked={false}
                                planLanguage={planLanguage}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
