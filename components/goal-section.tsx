'use client'

import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { TaskCard } from './task-card'
import { toggleTask, addTask, toggleSubtask, rescheduleTaskToTomorrow } from '@/app/actions'
import { useEconomy } from './economy-provider'
import { FocusModeOverlay } from './focus-mode-overlay'
import { Plus, Zap, Trophy, CheckCircle2 } from 'lucide-react'
import { haptics } from '@/utils/haptics'
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

export function GoalSection({
  goal,
  selectedDate,
  isEnriching,
}: {
  goal: GoalWithTasks
  selectedDate: string
  isEnriching?: boolean
}) {
  const { setTokens, setXp, setLevel, level } = useEconomy()
  const { t } = useLanguage()

  const planLanguage = goal.plan_metadata?.language || 'en'
  const isCrunchMode = goal.plan_metadata?.is_crunch_mode
  const formRef = useRef<HTMLFormElement>(null)
  const [focusTask, setFocusTask] = useState<Task | null>(null)

  const handleToggle = async (taskId: string, currentStatus: string) => {
    // Find the task to get its priority for the optimistic token delta
    const task = goal.tasks.find((t) => t.id === taskId)
    const tokenDelta = TOKEN_REWARD[task?.priority ?? 3] ?? 1
    const baseXp = task?.priority && task.priority > 0 ? task.priority * 10 + 10 : 20

    if (currentStatus === 'pending') {
      setTokens((prev) => prev + tokenDelta)
      setXp((prev) => {
        const nextXp = prev + baseXp
        const xpNeeded = level * 100
        if (nextXp >= xpNeeded) {
          setLevel((l) => l + 1)
          haptics.tier3.celebrate()
          return nextXp - xpNeeded
        }
        return nextXp
      })
    } else if (currentStatus === 'completed') {
      setTokens((prev) => Math.max(0, prev - tokenDelta))
      setXp((prev) => Math.max(0, prev - baseXp))
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
    haptics.tier2.action()
    await addTask(goal.id, formData)
    formRef.current?.reset()
  }

  // Filter tasks for the selected date
  const tasksForDate = goal.tasks.filter((t) => t.due_date === selectedDate)

  // Logic: A task is "Locked" if there are ANY pending tasks with a due_date earlier than the selectedDate
  const hasUnfinishedPredecessors = goal.tasks.some(
    (t) => t.due_date < selectedDate && t.status === 'pending'
  )

  const pendingTasks = tasksForDate.filter((t) => t.status === 'pending')
  const completedTasks = tasksForDate.filter((t) => t.status === 'completed')
  const totalCount = tasksForDate.length
  const completedCount = completedTasks.length
  const allCompleted = totalCount > 0 && completedCount === totalCount

  return (
    <div className="mb-12 px-4 sm:px-6">
      {/* Focus Mode Overlay */}
      {focusTask && (
        <FocusModeOverlay
          task={focusTask}
          goalTitle={goal.title}
          onClose={() => setFocusTask(null)}
          onOptimisticTokenUpdate={(delta) => setTokens((prev) => Math.max(0, prev + delta))}
        />
      )}

      {/* Daily Quests Header Row with Counter Badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-electric-blue" />
          <h2 className="text-xl font-bold tracking-tight text-white">
            {goal.title}
          </h2>
        </div>

        {totalCount > 0 && (
          <div
            className={`px-3 py-1 rounded-xl border text-[10px] font-black tracking-wider uppercase transition-colors ${
              allCompleted
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-electric-blue/10 border-electric-blue/20 text-electric-blue shadow-[0_0_12px_rgba(var(--accent-rgb),0.15)]'
            }`}
          >
            {completedCount} / {totalCount} {t('plan.completed')}
          </div>
        )}
      </div>

      {isCrunchMode && (
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400 italic mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          {t('plan.crunch_mode')}
        </p>
      )}

      {/* All Tasks Completed Celebration Banner */}
      {allCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/20 mb-4 shadow-[0_0_25px_rgba(245,158,11,0.15)]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>ALL DAILY SESSIONS COMPLETED!</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                You&apos;ve secured today&apos;s milestone. Great job maintaining focus and building your streak!
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Pending Tasks List */}
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
            isEnriching={isEnriching}
          />
        ))}

        {pendingTasks.length === 0 && completedTasks.length === 0 && (
          <div className="p-8 rounded-3xl border border-white/5 bg-[#141824]/30 text-center">
            <p className="text-gray-500 text-sm italic">{t('plan.no_tasks_scheduled')}</p>
          </div>
        )}
      </div>

      {/* Add Task Input Form */}
      <form
        ref={formRef}
        action={handleAddTask}
        className="flex items-center gap-3 mt-4"
        suppressHydrationWarning
      >
        <input
          name="title"
          type="text"
          placeholder={t('plan.new_task_placeholder')}
          className="flex-1 bg-[#121626]/80 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white placeholder-gray-500 focus:border-electric-blue focus:outline-none focus:ring-1 focus:ring-electric-blue transition-all"
          suppressHydrationWarning
        />
        <button
          type="submit"
          className="bg-electric-blue/10 hover:bg-electric-blue/20 border border-electric-blue/20 p-4 rounded-2xl text-electric-blue transition-colors cursor-pointer"
        >
          <Plus className="h-5 w-5" />
        </button>
      </form>

      {/* Completed Tasks List */}
      {completedTasks.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xs font-bold text-gray-500 mb-4 tracking-wider uppercase">
            {t('plan.completed')} ({completedTasks.length})
          </h3>
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

export default GoalSection
