'use client'

import React, { useMemo } from 'react'
import { Flame, Shield, Check } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

interface WeeklyStreakGlanceProps {
  currentStreak: number
  streakShieldsCount: number
  todayStr: string
}

export function WeeklyStreakGlance({
  currentStreak,
  streakShieldsCount,
  todayStr,
}: WeeklyStreakGlanceProps) {
  const { t } = useLanguage()

  // Generate the current week days (Mon to Sun) based on todayStr
  const weekDays = useMemo(() => {
    const today = new Date(todayStr + 'T00:00:00')
    const dayOfWeek = today.getDay() // 0 = Sun, 1 = Mon ...
    // Calculate distance to previous Monday (assuming Monday is start of week)
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

    const monday = new Date(today)
    monday.setDate(today.getDate() + distanceToMonday)

    const days = []
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)

      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const dayNum = String(d.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${dayNum}`

      const isToday = dateString === todayStr
      const isPast = dateString < todayStr
      const isFuture = dateString > todayStr

      // If user has streak > 0, past days within streak range are considered active
      const diffFromToday = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
      const isCompleted = isPast && diffFromToday > 0 && diffFromToday <= currentStreak

      days.push({
        label: dayLabels[i],
        dayNumber: d.getDate(),
        dateString,
        isToday,
        isPast,
        isFuture,
        isCompleted,
      })
    }
    return days
  }, [todayStr, currentStreak])

  return (
    <div className="relative p-5 sm:p-6 rounded-3xl bg-[#141824]/80 border border-white/10 glass-card overflow-hidden">
      {/* Subtle ambient background glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header: Streak & Shields */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.25)]">
            <Flame className="w-4 h-4 fill-orange-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              {t('dashboard.streak_glance')}
            </h3>
            <p className="text-[11px] font-bold text-orange-400">
              {currentStreak} {t('dashboard.day_streak')}
            </p>
          </div>
        </div>

        {streakShieldsCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold">
            <Shield className="w-3.5 h-3.5 fill-indigo-400/20 text-indigo-400" />
            <span>{streakShieldsCount}</span>
          </div>
        )}
      </div>

      {/* 7-Day Apple Fitness-style Pills */}
      <div className="relative z-10 grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekDays.map((day) => {
          let ringStyle = 'border-white/10 bg-white/[0.02] text-slate-400'

          if (day.isToday) {
            ringStyle =
              'border-electric-blue bg-electric-blue/20 text-white shadow-[0_0_15px_rgba(var(--accent-rgb),0.35)] ring-2 ring-electric-blue/40'
          } else if (day.isCompleted) {
            ringStyle = 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
          }

          return (
            <div
              key={day.dateString}
              className={`flex flex-col items-center justify-center py-2.5 rounded-2xl border transition-all duration-200 ${ringStyle}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                {day.label}
              </span>
              <div className="mt-1 flex items-center justify-center w-5 h-5">
                {day.isCompleted ? (
                  <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-400" />
                ) : (
                  <span className="text-xs font-black tabular-nums">{day.dayNumber}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
