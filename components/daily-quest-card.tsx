'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Play, Clock, Sparkles, ChevronDown, ListChecks, Zap } from 'lucide-react'
import { haptics } from '@/utils/haptics'
import type { Task } from '@/utils/types'
import { useLanguage } from '@/components/language-provider'

interface DailyQuestCardProps {
  task: Task
  onToggle: (taskId: string, currentStatus: string) => void
  onFocus: (task: Task) => void
  index: number
}

const PRIORITY_THEMES: Record<number, { border: string; glow: string; label: string; text: string; bg: string }> = {
  0: { border: 'border-l-soft-cyan', glow: 'rgba(125, 245, 255, 0.2)', label: 'Void / Rest', text: 'text-soft-cyan', bg: 'bg-soft-cyan/10' },
  1: { border: 'border-l-slate-400', glow: 'rgba(148, 163, 184, 0.2)', label: 'Foundation', text: 'text-slate-300', bg: 'bg-slate-400/10' },
  2: { border: 'border-l-sky-400', glow: 'rgba(56, 189, 248, 0.2)', label: 'Concept', text: 'text-sky-400', bg: 'bg-sky-400/10' },
  3: { border: 'border-l-amber-400', glow: 'rgba(251, 191, 36, 0.25)', label: 'Application', text: 'text-amber-400', bg: 'bg-amber-400/10' },
  4: { border: 'border-l-orange-500', glow: 'rgba(249, 115, 22, 0.25)', label: 'Challenging', text: 'text-orange-400', bg: 'bg-orange-500/10' },
  5: { border: 'border-l-rose-500', glow: 'rgba(244, 63, 94, 0.3)', label: 'Deep Theory', text: 'text-rose-400', bg: 'bg-rose-500/10' },
}

const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  MATH: { bg: 'bg-electric-blue/10', text: 'text-electric-blue', border: 'border-electric-blue/25' },
  SCIENCE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25' },
  TECH: { bg: 'bg-cyan-400/10', text: 'text-cyan-300', border: 'border-cyan-400/25' },
  HISTORY: { bg: 'bg-neon-violet/10', text: 'text-neon-violet', border: 'border-neon-violet/25' },
  ARTS: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/25' },
  GENERAL: { bg: 'bg-white/5', text: 'text-slate-300', border: 'border-white/10' },
}

export function DailyQuestCard({ task, onToggle, onFocus, index }: DailyQuestCardProps) {
  const { t } = useLanguage()
  const isDone = task.status === 'completed'
  const isVoid = task.priority === 0
  const [subtasksOpen, setSubtasksOpen] = useState(false)
  const [showXpFloater, setShowXpFloater] = useState(false)

  const priorityLevel = (task.priority ?? 3) as number
  const theme = PRIORITY_THEMES[priorityLevel] || PRIORITY_THEMES[3]
  const subjectKey = (task.subject || 'GENERAL').toUpperCase()
  const subjectStyle = SUBJECT_COLORS[subjectKey] || SUBJECT_COLORS.GENERAL

  const xpReward = task.priority && task.priority > 0 ? task.priority * 10 + 10 : 20
  const duration = task.duration_mins || 25
  const subtasks = task.subtasks || []
  const hasSubtasks = subtasks.length > 0
  const completedSubtasks = subtasks.filter((s) => s.completed).length

  const handleCheckClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isDone) {
      haptics.tier3.celebrate()
      setShowXpFloater(true)
      setTimeout(() => setShowXpFloater(false), 1200)
    } else {
      haptics.tier1.tick()
    }
    onToggle(task.id, task.status)
  }

  const handleFocusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    haptics.tier2.action()
    onFocus(task)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.3) }}
      className={`group relative rounded-2xl border transition-all duration-300 overflow-hidden ${
        isDone
          ? 'bg-[#121624]/40 border-white/5 opacity-70'
          : 'bg-[#151928]/85 border-white/10 hover:border-electric-blue/40 shadow-[0_8px_24px_rgba(0,0,0,0.35)]'
      }`}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: isDone ? 'rgba(255,255,255,0.1)' : undefined,
      }}
    >
      {/* Subtle Glow when pending */}
      {!isDone && (
        <div
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
          style={{ background: theme.glow }}
        />
      )}

      {/* Floating XP Celebratory Badge */}
      <AnimatePresence>
        {showXpFloater && (
          <motion.div
            initial={{ opacity: 1, y: 0, scale: 0.8 }}
            animate={{ opacity: 0, y: -40, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute left-6 top-1 z-30 pointer-events-none flex items-center gap-1 font-black text-sm text-electric-blue bg-electric-blue/20 px-3 py-1 rounded-full border border-electric-blue/40 shadow-lg backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5 fill-electric-blue" />
            <span>+{xpReward} XP</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 sm:p-5 flex items-start gap-3.5">
        {/* Interactive Checkbox Button (44px min touch target) */}
        <button
          type="button"
          onClick={handleCheckClick}
          aria-label={isDone ? 'Mark as incomplete' : 'Mark as complete'}
          className="relative shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 mt-0.5 active:scale-90"
        >
          <div
            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
              isDone
                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : 'border-slate-500 bg-[#0B0D17]/80 hover:border-electric-blue hover:bg-[#0B0D17]'
            }`}
          >
            {isDone && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
          </div>
        </button>

        {/* Quest Info */}
        <div className="flex-1 min-w-0">
          {/* Header Row: Subject & Priority Tag */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {task.subject && (
              <span
                className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${subjectStyle.bg} ${subjectStyle.text} ${subjectStyle.border}`}
              >
                {task.subject}
              </span>
            )}
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${theme.bg} ${theme.text} border-white/5`}
            >
              {theme.label}
            </span>
          </div>

          {/* Title */}
          <h4
            className={`text-sm sm:text-base font-bold leading-snug transition-colors line-clamp-2 ${
              isDone ? 'text-slate-400 line-through decoration-slate-500' : 'text-white group-hover:text-electric-blue'
            }`}
          >
            {task.title || t('dashboard.focus_session')}
          </h4>

          {/* Meta row: Time, XP, and subtasks info */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-semibold text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{duration}m</span>
            </span>

            {!isDone && (
              <span className="flex items-center gap-1 text-electric-blue font-bold">
                <Zap className="w-3 h-3 fill-electric-blue" />
                <span>+{xpReward} XP</span>
              </span>
            )}

            {hasSubtasks && (
              <button
                type="button"
                onClick={() => setSubtasksOpen(!subtasksOpen)}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                <ListChecks className="w-3 h-3" />
                <span>
                  {completedSubtasks}/{subtasks.length}
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${subtasksOpen ? 'rotate-180' : ''}`}
                />
              </button>
            )}
          </div>
        </div>

        {/* Action Button: Start Focus Mode (Direct 1-tap) */}
        {!isDone && !isVoid && (
          <button
            type="button"
            onClick={handleFocusClick}
            aria-label={`Start Focus Session for ${task.title}`}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-electric-blue/15 hover:bg-electric-blue/25 border border-electric-blue/30 text-electric-blue text-xs font-black uppercase tracking-wider active:scale-95 transition-all shadow-[0_0_12px_rgba(var(--accent-rgb),0.15)] hover:shadow-[0_0_18px_rgba(var(--accent-rgb),0.3)]"
          >
            <Play className="w-3 h-3 fill-electric-blue" />
            <span className="hidden sm:inline">{t('dashboard.start_focus')}</span>
          </button>
        )}
      </div>

      {/* Expandable Subtasks Checklist Preview */}
      <AnimatePresence>
        {subtasksOpen && hasSubtasks && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/5 bg-[#0A0D18]/70 px-4 sm:px-6 py-3 space-y-2"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {t('dashboard.subtasks')}
            </p>
            <div className="space-y-1.5">
              {subtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2 text-xs">
                  <span
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                      st.completed
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'border-slate-600 bg-white/5'
                    }`}
                  >
                    {st.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                  <span
                    className={`truncate ${
                      st.completed ? 'text-slate-400 line-through' : 'text-slate-200'
                    }`}
                  >
                    {st.title}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
