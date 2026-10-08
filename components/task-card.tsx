'use client'

import React, { useState, useEffect } from 'react'
import {
  CheckCircle2,
  Clock,
  Target,
  ChevronDown,
  Diamond,
  CheckSquare,
  Square,
  Zap,
  Circle,
  Calendar,
  Lock,
} from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from 'framer-motion'
import type { Task, Subtask } from '@/utils/types'
import { useLanguage } from './language-provider'

const GEM_REWARD: Record<number, number> = { 0: 0, 1: 1, 2: 1, 3: 1, 4: 2, 5: 3 }

interface TaskCardProps {
  task: Task
  onCheck: (id: string, currentStatus: string) => void
  onSubtaskCheck?: (taskId: string, subtaskId: string, completed: boolean) => void
  onFocus?: (task: Task) => void
  onReschedule?: (id: string) => void
  index: number
  isLocked?: boolean
  isCrunch?: boolean
  planLanguage?: string
  isEnriching?: boolean
}

export function TaskCard({
  task,
  onCheck,
  onSubtaskCheck,
  onFocus,
  onReschedule,
  index: _index,
  isLocked,
  isCrunch,
  planLanguage: _planLanguage,
  isEnriching,
}: TaskCardProps) {
  const { t } = useLanguage()
  const isCompleted = task.status === 'completed'
  const isVoid = task.priority === 0
  const [subtasksOpen, setSubtasksOpen] = useState(false)
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(task.subtasks ?? [])
  const [isDismissed, setIsDismissed] = useState(false)
  const [thresholdCrossed, setThresholdCrossed] = useState<'left' | 'right' | null>(null)
  const [showXpFeedback, setShowXpFeedback] = useState(false)

  useEffect(() => {
    setLocalSubtasks(task.subtasks ?? [])
  }, [task.subtasks])

  const hasSubtasks = localSubtasks.length > 0
  const completedSubtasks = localSubtasks.filter((s) => s.completed).length
  const gemReward = GEM_REWARD[task.priority] ?? 1
  const baseXp = task.priority && task.priority > 0 ? task.priority * 10 + 10 : 20

  // Drag motion value and visual transforms
  const x = useMotionValue(0)
  const SWIPE_THRESHOLD = 70
  const rescheduleOpacity = useTransform(x, [-SWIPE_THRESHOLD / 2, 0], [1, 0])
  const completeOpacity = useTransform(x, [0, SWIPE_THRESHOLD / 2], [0, 1])
  const rescheduleScale = useTransform(x, [-SWIPE_THRESHOLD, 0], [1.15, 0.8])
  const completeScale = useTransform(x, [0, SWIPE_THRESHOLD], [0.8, 1.15])

  const handleDrag = (_event: unknown, info: PanInfo) => {
    const currentX = info.offset.x
    if (currentX > SWIPE_THRESHOLD) {
      if (thresholdCrossed !== 'right') {
        haptics.tier1.tick() // dynamic tick when locked in
        setThresholdCrossed('right')
      }
    } else if (currentX < -SWIPE_THRESHOLD) {
      if (thresholdCrossed !== 'left') {
        if (!isCompleted && !isVoid) {
          haptics.tier1.tick() // dynamic tick when locked in
          setThresholdCrossed('left')
        }
      }
    } else {
      if (thresholdCrossed !== null) {
        setThresholdCrossed(null)
      }
    }
  }

  const handleDragEnd = async (_event: unknown, info: PanInfo) => {
    const dragOffset = info.offset.x

    if (dragOffset > SWIPE_THRESHOLD) {
      haptics.tier3.celebrate()
      setShowXpFeedback(true)
      setIsDismissed(true)
      setTimeout(() => {
        onCheck(task.id, task.status)
      }, 250)
    } else if (dragOffset < -SWIPE_THRESHOLD) {
      if (!isCompleted && !isVoid) {
        haptics.tier2.action()
        setIsDismissed(true)
        setTimeout(() => {
          onReschedule?.(task.id)
        }, 250)
      }
    }
    setThresholdCrossed(null)
  }

  const subjectColor: Record<string, string> = {
    MATH: 'bg-electric-blue/10 text-electric-blue border-electric-blue/20',
    HISTORY: 'bg-neon-violet/10 text-neon-violet border-neon-violet/20',
    SCIENCE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    TECH: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    ARTS: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    GENERAL: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }
  const sc = subjectColor[task.subject ?? 'GENERAL'] ?? subjectColor.GENERAL

  const priorityBorder: Record<number, string> = {
    0: 'border-l-soft-cyan',
    1: 'border-l-gray-600',
    2: 'border-l-blue-500',
    3: 'border-l-yellow-500',
    4: 'border-l-orange-500',
    5: 'border-l-rose-500',
  }
  const priorityText: Record<number, string> = {
    0: 'text-soft-cyan',
    1: 'text-gray-500',
    2: 'text-blue-400',
    3: 'text-yellow-500',
    4: 'text-orange-500',
    5: 'text-rose-500',
  }
  const priorityLabel: Record<number, string> = {
    0: 'VOID',
    1: 'P1',
    2: 'P2',
    3: 'P3',
    4: 'P4',
    5: 'P5',
  }

  const handleSubtaskToggle = (subtask: Subtask) => {
    if (isCompleted) return
    haptics.tier1.tick()
    const newCompleted = !subtask.completed
    setLocalSubtasks((prev) =>
      prev.map((s) => (s.id === subtask.id ? { ...s, completed: newCompleted } : s))
    )
    onSubtaskCheck?.(task.id, subtask.id, newCompleted)
  }

  const handleCheckTrigger = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (isLocked) {
      haptics.tier4.lock()
      return
    }

    if (!isCompleted && !isVoid) {
      haptics.tier3.celebrate()
      setShowXpFeedback(true)
      setTimeout(() => {
        onCheck(task.id, task.status)
      }, 700)
    } else {
      haptics.tier1.tick()
      onCheck(task.id, task.status)
    }
  }

  const cardBase = `rounded-2xl border-l-4 border border-white/5 transition-all duration-200 overflow-hidden ${
    priorityBorder[task.priority] ?? 'border-l-gray-600'
  }`
  const cardBg = isVoid
    ? 'bg-soft-cyan/5'
    : isCompleted
    ? 'bg-[#141824] opacity-50'
    : isCrunch
    ? 'bg-orange-500/5 border-orange-500/10'
    : 'bg-[#141824]'

  const canDrag = !isCompleted && !isLocked && !isVoid

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          layout
          initial={{ opacity: 1, height: 'auto' }}
          exit={{
            opacity: 0,
            height: 0,
            marginBottom: 0,
            transition: { height: { duration: 0.2 }, opacity: { duration: 0.15 } },
          }}
          className="relative overflow-hidden mb-3 select-none rounded-2xl"
        >
          {/* Floating XP Dopamine Feedback */}
          {showXpFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.8 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: -50,
                scale: [0.8, 1.25, 1.25, 0.9],
              }}
              transition={{ duration: 0.85, ease: 'easeOut' }}
              className="absolute left-1/2 -translate-x-1/2 top-3 z-50 text-electric-blue font-black text-xl drop-shadow-[0_0_15px_rgba(var(--accent-rgb),0.9)] pointer-events-none"
            >
              +{baseXp} XP
            </motion.div>
          )}

          {/* ── ACTION BACKDROP LAYER ── */}
          {canDrag && (
            <div className="absolute inset-0 rounded-2xl flex items-center justify-between overflow-hidden pointer-events-none z-0">
              {/* Drag Right Reveal: Complete (Emerald Green) */}
              <motion.div
                style={{ opacity: completeOpacity }}
                className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-emerald-500 to-green-600 flex items-center pl-6 text-white"
              >
                <motion.div
                  style={{
                    scale: completeScale,
                    filter:
                      thresholdCrossed === 'right'
                        ? 'drop-shadow(0 0 8px rgba(255,255,255,0.6))'
                        : 'none',
                  }}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-xs font-black uppercase tracking-widest">
                    {t('task_card.swipe_complete')}
                  </span>
                </motion.div>
              </motion.div>

              {/* Drag Left Reveal: Tomorrow (Amber) */}
              <motion.div
                style={{ opacity: rescheduleOpacity }}
                className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-amber-500 to-orange-600 flex items-center justify-end pr-6 text-white"
              >
                <motion.div
                  style={{
                    scale: rescheduleScale,
                    filter:
                      thresholdCrossed === 'left'
                        ? 'drop-shadow(0 0 8px rgba(255,255,255,0.6))'
                        : 'none',
                  }}
                  className="flex items-center gap-2"
                >
                  <span className="text-xs font-black uppercase tracking-widest">
                    {t('task_card.swipe_tomorrow')}
                  </span>
                  <Calendar className="h-5 w-5" />
                </motion.div>
              </motion.div>
            </div>
          )}

          {/* ── DRAGGABLE CARD CONTENT ── */}
          <motion.div
            drag={canDrag ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.75, right: 0.75 }}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            style={{ x }}
            className={`relative z-10 ${cardBase} ${cardBg} ${
              canDrag ? 'cursor-grab active:cursor-grabbing touch-pan-y' : ''
            }`}
          >
            {/* ── CARD BODY ── */}
            <div className="p-4">
              {/* Row 1: Subject + Duration + Priority + Gem / Locked */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${sc}`}
                >
                  {task.subject ?? 'GENERAL'}
                </span>
                <div className="flex items-center gap-1 text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span className="text-[11px] font-medium">{task.duration_mins ?? 30}m</span>
                </div>
                <div className="flex-1" />

                {isLocked ? (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-500">
                    <Lock className="h-3 w-3 text-gray-500" />
                    <span className="text-[10px] font-black uppercase">{t('tasks.locked')}</span>
                  </div>
                ) : (
                  <>
                    <span
                      className={`text-[11px] font-black uppercase ${
                        priorityText[task.priority] ?? 'text-gray-500'
                      }`}
                    >
                      {priorityLabel[task.priority]}
                    </span>
                    {!isVoid && (
                      <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-electric-blue/5 border border-electric-blue/15 shadow-[0_0_8px_rgba(var(--accent-rgb),0.1)]">
                        <Diamond className="h-2.5 w-2.5 text-electric-blue fill-electric-blue/30" />
                        <span className="text-[11px] font-black text-electric-blue">
                          +{gemReward}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Row 2: Task title */}
              <p
                className={`text-base font-bold leading-snug ${
                  isCompleted ? 'text-gray-500 line-through' : 'text-white'
                }`}
              >
                {task.title}
              </p>

              {task.priority === 3 && isEnriching && (
                <p className="text-[10px] text-electric-blue font-bold uppercase tracking-wider mt-1 animate-pulse flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-electric-blue animate-pulse" />
                  Enriching your plan...
                </p>
              )}

              {task.pivoted_count > 0 && (
                <p className="text-[11px] text-rose-400 font-bold uppercase tracking-wider mt-1">
                  {t('task_card.pivoted_count').replace('{count}', String(task.pivoted_count))}
                </p>
              )}

              {/* Subtask progress bar (when collapsed) */}
              {hasSubtasks && !subtasksOpen && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-electric-blue/60 rounded-full transition-all duration-500"
                      style={{
                        width: `${(completedSubtasks / localSubtasks.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-gray-500 font-bold tabular-nums">
                    {completedSubtasks}/{localSubtasks.length}
                  </span>
                </div>
              )}
            </div>

            {/* ── ACTION ROW ── */}
            {!isCompleted && !isVoid && !isLocked && (
              <div className="flex items-center gap-2 px-4 pb-4 pt-0">
                {/* Focus button */}
                {onFocus && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      haptics.tier2.action()
                      onFocus(task)
                    }}
                    className="flex-1 py-2.5 rounded-2xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
                  >
                    <Target className="h-4 w-4 text-electric-blue" />
                    <span className="text-xs font-bold text-electric-blue">
                      {t('task_card.btn_focus')}
                    </span>
                  </button>
                )}

                {/* Subtask toggle */}
                {hasSubtasks && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      haptics.tier1.light()
                      setSubtasksOpen((p) => !p)
                    }}
                    className="flex-1 py-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
                  >
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${
                        subtasksOpen ? 'rotate-180' : ''
                      }`}
                    />
                    <span className="text-xs font-bold text-gray-400">
                      {t('task_card.btn_subtasks')}
                    </span>
                  </button>
                )}

                {/* Mark done button (backup tap area) */}
                <button
                  onClick={handleCheckTrigger}
                  className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center active:scale-95 transition-transform shrink-0 cursor-pointer"
                  aria-label={t('task_card.btn_mark_completed')}
                >
                  <Circle className="h-5 w-5 text-gray-500 hover:text-white transition-colors" />
                </button>
              </div>
            )}

            {/* Completed status row */}
            {isCompleted && (
              <div className="flex items-center justify-between px-4 pb-3">
                <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">
                  {t('task_card.status_completed')}
                </span>
                <button
                  onClick={handleCheckTrigger}
                  className="active:scale-95 transition-transform cursor-pointer p-1"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                </button>
              </div>
            )}

            {/* VOID day label */}
            {isVoid && (
              <div className="px-4 pb-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-soft-cyan animate-pulse" />
                <span className="text-xs text-soft-cyan font-bold">
                  {t('task_card.status_void')}
                </span>
              </div>
            )}

            {/* ── SUBTASK LIST (collapsible) ── */}
            {hasSubtasks && subtasksOpen && (
              <div className="mx-4 mb-4 rounded-2xl bg-[#0f1220] border border-white/5 overflow-hidden">
                {localSubtasks.map((subtask, i) => (
                  <button
                    key={subtask.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSubtaskToggle(subtask)
                    }}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 active:bg-white/5 cursor-pointer ${
                      i < localSubtasks.length - 1 ? 'border-b border-white/5' : ''
                    }`}
                  >
                    {subtask.completed ? (
                      <CheckSquare className="h-4 w-4 text-electric-blue flex-shrink-0 mt-0.5 shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span
                      className={`text-sm font-medium leading-snug ${
                        subtask.completed ? 'line-through text-gray-500' : 'text-gray-300'
                      }`}
                    >
                      {subtask.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default TaskCard
