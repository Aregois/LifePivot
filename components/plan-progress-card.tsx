'use client'

import { useMemo } from 'react'
import { getLocalDateString } from '@/utils/date-utils'
import { Flame, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Task } from '@/utils/types'
import { useLanguage } from './language-provider'

interface PlanProgressCardProps {
    goalTitle: string
    createdAt: string
    durationDays: number
    tasks: Task[]
}

export function PlanProgressCard({ goalTitle, createdAt, durationDays, tasks }: PlanProgressCardProps) {
    const { t } = useLanguage()
    const stats = useMemo(() => {
        const todayStr = getLocalDateString()
        const startDate = new Date(createdAt)
        startDate.setHours(0, 0, 0, 0)
        const today = new Date(todayStr + 'T00:00:00')

        // Current day (1-indexed, clamped to plan duration)
        const diffMs = today.getTime() - startDate.getTime()
        const rawCurrentDay = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
        const currentDay = Math.max(1, Math.min(rawCurrentDay, durationDays))

        // Task-based completion
        const totalTasks = tasks.filter(t => t.task_type !== 'void').length
        const completedTasks = tasks.filter(t => t.status === 'completed' && t.task_type !== 'void').length
        const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        // Day-based timeline progress
        const timelinePercent = Math.round((currentDay / durationDays) * 100)

        // Streak: count consecutive completed days going backward from yesterday
        // (today's tasks may still be in progress, so we start from yesterday)
        const allDates = [...new Set(tasks.map(t => t.due_date))].sort().reverse()
        let streak = 0
        for (const date of allDates) {
            if (date >= todayStr) continue // Skip today and future
            const dayTasks = tasks.filter(t => t.due_date === date && t.task_type !== 'void')
            if (dayTasks.length === 0) continue // Skip void-only days
            const allDone = dayTasks.every(t => t.status === 'completed')
            if (allDone) {
                streak++
            } else {
                break // Streak broken
            }
        }

        // Today's progress
        const todayTasks = tasks.filter(t => t.due_date === todayStr && t.task_type !== 'void')
        const todayCompleted = todayTasks.filter(t => t.status === 'completed').length
        const todayTotal = todayTasks.length

        // Status determination
        const overdueTasks = tasks.filter(t => t.due_date < todayStr && t.status === 'pending').length
        let status: 'ahead' | 'on-track' | 'behind' | 'critical'
        if (overdueTasks > 5) status = 'critical'
        else if (overdueTasks > 0) status = 'behind'
        else if (completionPercent > timelinePercent + 5) status = 'ahead'
        else status = 'on-track'

        // Days remaining
        const daysRemaining = Math.max(0, durationDays - currentDay)

        return {
            currentDay,
            completedTasks,
            totalTasks,
            completionPercent,
            timelinePercent,
            streak,
            todayCompleted,
            todayTotal,
            status,
            daysRemaining,
        }
    }, [createdAt, durationDays, tasks])

    // Circular progress config
    const radius = 28
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (stats.completionPercent / 100) * circumference

    const statusConfig = {
        'ahead': { label: t('plan.ahead_of_schedule'), color: 'text-emerald-400', dot: 'bg-emerald-400', glow: 'shadow-[0_0_8px_rgba(52,211,153,0.8)]', Icon: TrendingUp },
        'on-track': { label: t('plan.on_track'), color: 'text-green-500', dot: 'bg-green-500', glow: 'shadow-[0_0_8px_rgba(34,197,94,0.8)]', Icon: Minus },
        'behind': { label: t('plan.falling_behind'), color: 'text-amber-400', dot: 'bg-amber-400', glow: 'shadow-[0_0_8px_rgba(251,191,36,0.8)]', Icon: TrendingDown },
        'critical': { label: t('plan.critical_debt'), color: 'text-red-500', dot: 'bg-red-500', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.8)]', Icon: TrendingDown },
    }

    const currentStatus = statusConfig[stats.status]
    const StatusIcon = currentStatus.Icon

    return (
        <div className="relative glass-card rounded-3xl p-6 overflow-hidden mb-6 border border-white/5 bg-[#121626]/80">
            {/* Background glow — color shifts with status */}
            <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/4 pointer-events-none ${stats.status === 'critical' ? 'bg-red-500/10' :
                stats.status === 'behind' ? 'bg-amber-500/10' :
                    'bg-electric-blue/10'
                }`} />

            <div className="relative z-10 flex flex-col gap-4">
                {/* Top Tag */}
                <div className="flex items-center justify-between">
                    <div className="rounded-full bg-[#0D1C36] px-3 py-1 text-[10px] font-black tracking-[0.15em] text-electric-blue border border-electric-blue/20 uppercase max-w-[200px] truncate">
                        {goalTitle}
                    </div>

                    {/* Streak Badge */}
                    {stats.streak > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                            <Flame className="h-3.5 w-3.5 text-orange-400 fill-orange-400/40" />
                            <span className="text-[10px] font-black text-orange-400 tracking-wider">
                                {t('plan.streak').replace('{streak}', stats.streak.toString())}
                            </span>
                        </div>
                    )}
                </div>

                {/* Main Stats Row */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <h2 className="text-4xl font-extrabold text-white tracking-tight">
                            {t('plan.day_count').replace('{day}', stats.currentDay.toString())} <span className="text-xl text-gray-500 font-medium">/ {durationDays}</span>
                        </h2>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                            {stats.daysRemaining === 0 ? t('plan.final_day') : t('plan.days_remaining').replace('{count}', stats.daysRemaining.toString())}
                        </p>
                    </div>

                    {/* Circular Progress */}
                    <div className="relative flex items-center justify-center w-[72px] h-[72px]">
                        <svg className="w-full h-full transform -rotate-90" role="progressbar" aria-valuenow={stats.completionPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Plan progress">
                            {/* Background circle */}
                            <circle
                                className="text-white/5"
                                strokeWidth="4"
                                stroke="currentColor"
                                fill="transparent"
                                r={radius}
                                cx="36"
                                cy="36"
                            />
                            {/* Progress circle */}
                            <circle
                                className={`drop-shadow-[0_0_5px_rgba(var(--accent-rgb),0.5)] transition-all duration-1000 ease-out ${stats.status === 'critical' ? 'text-red-500' :
                                    stats.status === 'behind' ? 'text-amber-400' :
                                        'text-electric-blue'
                                    }`}
                                strokeWidth="4"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r={radius}
                                cx="36"
                                cy="36"
                            />
                        </svg>
                        <span className="absolute text-sm font-bold text-white">{stats.completionPercent}%</span>
                    </div>
                </div>

                {/* Today's micro-progress */}
                {stats.todayTotal > 0 && (
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest shrink-0">{t('plan.today')}</span>
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-electric-blue to-soft-cyan rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${stats.todayTotal > 0 ? Math.round((stats.todayCompleted / stats.todayTotal) * 100) : 0}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 tabular-nums shrink-0">
                            {stats.todayCompleted}/{stats.todayTotal}
                        </span>
                    </div>
                )}

                {/* Overall Progress Bar */}
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${stats.status === 'critical' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' :
                            stats.status === 'behind' ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]' :
                                'bg-electric-blue shadow-[0_0_10px_rgba(var(--accent-rgb),0.8)]'
                            }`}
                        style={{ width: `${stats.completionPercent}%` }}
                    />
                </div>

                {/* Bottom Stats Row */}
                <div className="flex items-center justify-between">
                    {/* Status indicator */}
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${currentStatus.dot} ${currentStatus.glow}`} />
                        <StatusIcon className={`h-3.5 w-3.5 ${currentStatus.color}`} />
                        <span className={`text-xs font-medium ${currentStatus.color}`}>{currentStatus.label}</span>
                    </div>

                    {/* Task counter */}
                    <span className="text-[10px] font-bold text-gray-500 tabular-nums tracking-wider">
                        {t('plan.tasks_count').replace('{completed}', stats.completedTasks.toString()).replace('{total}', stats.totalTasks.toString())}
                    </span>
                </div>
            </div>
        </div>
    )
}
