'use client'

import React from 'react'
import Link from 'next/link'
import { Calendar, Play, MessageSquareQuote, BrainCircuit, ArrowUpRight } from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { useLanguage } from '@/components/language-provider'
import { useEconomy } from '@/components/economy-provider'
import type { Task } from '@/utils/types'

interface QuickActionGridProps {
  currentDay?: number
  nextTask?: Task | null
  goalTitle?: string
}

export function QuickActionGrid({
  currentDay,
  nextTask,
  goalTitle = "Today's Focus",
}: QuickActionGridProps) {
  const { t } = useLanguage()
  const { setShowMobileChat, setGlobalFocusTask } = useEconomy()

  const handleStartFocus = () => {
    haptics.tier2.action()
    if (nextTask) {
      setGlobalFocusTask(nextTask, goalTitle)
    } else {
      // Create a gentle dummy focus session if no task is scheduled
      const genericTask: Task = {
        id: 'generic_focus',
        goal_id: 'default',
        user_id: 'user',
        title: 'Deep Mindful Study Session',
        duration_mins: 25,
        due_date: new Date().toISOString().split('T')[0],
        priority: 2,
        task_type: 'task',
        status: 'pending',
        pivoted_count: 0,
        subtasks: [],
      }
      setGlobalFocusTask(genericTask, goalTitle)
    }
  }

  const handleOpenTutor = () => {
    haptics.tier1.tick()
    setShowMobileChat(true)
  }

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-[#141824]/80 border border-white/10 glass-card">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
          {t('dashboard.quick_actions')}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 1. Review Plan / Full Roadmap */}
        <Link
          href="/plan"
          onClick={() => haptics.light()}
          className="group relative p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-electric-blue/30 transition-all active:scale-[0.97] flex flex-col justify-between overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-electric-blue/15 border border-electric-blue/25 flex items-center justify-center text-electric-blue group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-electric-blue group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-electric-blue transition-colors">
              {t('dashboard.explore_roadmap')}
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              {currentDay ? `${t('dashboard.day')} ${currentDay}` : t('dashboard.no_plan')}
            </p>
          </div>
        </Link>

        {/* 2. Quick Focus Session (1-Tap direct overlay launch) */}
        <button
          type="button"
          onClick={handleStartFocus}
          className="group relative p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-emerald-500/30 transition-all active:scale-[0.97] flex flex-col justify-between text-left overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <Play className="w-4 h-4 fill-emerald-400" />
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
              {t('dashboard.quick_start_focus')}
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
              {nextTask ? `${nextTask.duration_mins || 25}m session` : '25m timer'}
            </p>
          </div>
        </button>

        {/* 3. Ask Socratic Tutor */}
        <button
          type="button"
          onClick={handleOpenTutor}
          className="group relative p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-neon-violet/30 transition-all active:scale-[0.97] flex flex-col justify-between text-left overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-neon-violet/15 border border-neon-violet/25 flex items-center justify-center text-neon-violet group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(189,0,255,0.2)]">
              <MessageSquareQuote className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-neon-violet transition-colors">
              {t('dashboard.ask_tutor')}
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Dialectic AI
            </p>
          </div>
        </button>

        {/* 4. Active Recall Micro-Drill */}
        <Link
          href="/plan"
          onClick={() => haptics.light()}
          className="group relative p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-amber-400/30 transition-all active:scale-[0.97] flex flex-col justify-between overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
              {t('dashboard.micro_drill')}
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              3-min quiz
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
