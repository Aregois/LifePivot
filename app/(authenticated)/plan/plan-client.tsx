'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { DateSelector } from '@/components/date-selector'
import { TodaysFocusHeader } from '@/components/todays-focus-header'
import { GoalSection } from '@/components/goal-section'
import { LearningPlanCreator } from '@/components/learning-plan-creator'
import { ResetPlanButton } from '@/components/reset-plan-button'
import { PlanProgressCard } from '@/components/plan-progress-card'
import { getLocalDateString } from '@/utils/date-utils'
import { 
    Calendar, Paperclip, ArrowRight, ChevronLeft, ChevronRight, 
    Plus, Lock, Crown, AlertTriangle, Library, GraduationCap,
    Settings, Map, Check, Trash2, Clock, Flame, Sparkles, CalendarDays
} from 'lucide-react'
import Link from 'next/link'
import { haptics } from '@/utils/haptics'
import { useLanguage } from '@/components/language-provider'
import { translateGoalsArray } from '@/utils/translations'
import { FileUploader } from '@/components/file-uploader'
import { motion, AnimatePresence } from 'framer-motion'
import { SubscribeModal } from '@/components/subscribe-modal'
import { PlanSettingsModal } from '@/components/plan-settings-modal'
import { toggleTask, deleteTask, updateTaskDate } from '@/app/actions'

interface PlanClientProps {
    user: any
    goals: any[] | null
    goalsError: any
    isSubscribed: boolean
    subscriptionStatus: string
}

export function PlanClient({ user, goals, goalsError, isSubscribed, subscriptionStatus }: PlanClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const urlDate = searchParams.get('date')

    const [localGoals, setLocalGoals] = useState<any[] | null>(goals)
    const [selectedDate, setSelectedDate] = useState(urlDate || getLocalDateString())
    const { t, locale } = useLanguage()
    const [materialsOpen, setMaterialsOpen] = useState<Record<string, boolean>>({})
    const [activePlanIndex, setActivePlanIndex] = useState(0)
    const [isMounted, setIsMounted] = useState(false)
    const [showSubscribeModal, setShowSubscribeModal] = useState(false)
    const [showAddPlan, setShowAddPlan] = useState(false)
    const [showUpgradeTip, setShowUpgradeTip] = useState(false)
    const [isEnriching, setIsEnriching] = useState(false)

    // Schedule & Task dates customization state
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [settingsInitialTab, setSettingsInitialTab] = useState<'schedule' | 'add_task' | 'plan_details'>('schedule')
    const [viewMode, setViewMode] = useState<'daily' | 'roadmap'>('daily')

    useEffect(() => {
        setLocalGoals(goals)
    }, [goals])

    const translatedGoals = useMemo(() => {
        return translateGoalsArray(localGoals, locale)
    }, [localGoals, locale])

    const totalGoals = translatedGoals?.length ?? 0

    // Free users only see their first (most recent) plan — excess plans are locked
    const visibleGoals = isSubscribed
        ? translatedGoals
        : translatedGoals?.slice(0, 1) ?? []

    const lockedCount = isSubscribed ? 0 : Math.max(0, totalGoals - 1)
    const isDowngraded = subscriptionStatus === 'canceled' && lockedCount > 0
    const isPastDue = subscriptionStatus === 'past_due'

    const activeGoal = visibleGoals?.[activePlanIndex] ?? null

    const toggleMaterials = (goalId: string) => {
        setMaterialsOpen(prev => ({
            ...prev,
            [goalId]: !prev[goalId]
        }))
    }

    const handleSelectDate = useCallback((date: string) => {
        setSelectedDate(date)
        router.push(`/plan?date=${date}`, { scroll: false })
    }, [router])

    useEffect(() => {
        if (urlDate) {
            setSelectedDate(urlDate)
        }
    }, [urlDate])

    // Load active plan from localStorage safely after mount to prevent hydration mismatch
    useEffect(() => {
        setIsMounted(true)
        const storedActiveId = localStorage.getItem('lifepivot_active_goal_id')
        if (storedActiveId && translatedGoals) {
            const goalsList = isSubscribed ? translatedGoals : translatedGoals.slice(0, 1)
            const idx = goalsList.findIndex((g: any) => g.id === storedActiveId)
            if (idx !== -1) {
                setActivePlanIndex(idx)
            }
        }
    }, [translatedGoals, isSubscribed])

    // Trigger background enrichment for P3 task placeholders
    useEffect(() => {
        if (!activeGoal?.id) return

        const hasPlaceholderP3 = activeGoal.tasks?.some((t: any) => 
            t.priority === 3 && 
            (t.subtasks || []).some((st: any) => 
                st.id !== 'translations' && 
                (st.title?.toLowerCase().includes('practice exercise') || st.title?.toLowerCase().includes('placeholder'))
            )
        )

        if (!hasPlaceholderP3) return

        setIsEnriching(true)

        const timeoutId = setTimeout(() => {
            setIsEnriching(false)
            console.error('Enrichment timeout: /api/plans/enrich-p3 took more than 30s')
        }, 30000)

        fetch('/api/plans/enrich-p3', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId: activeGoal.id })
        })
        .then(res => {
            if (res.ok) {
                router.refresh()
            }
        })
        .catch(err => {
            console.error('Error enriching plan tasks in background:', err)
        })
        .finally(() => {
            clearTimeout(timeoutId)
            setIsEnriching(false)
        })
    }, [activeGoal?.id, router])

    // Curriculum Roadmap Grouping
    const tasksByDate = useMemo(() => {
        if (!activeGoal?.tasks) return []
        const groups: Record<string, any[]> = {}
        const sorted = [...activeGoal.tasks].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
        
        for (const task of sorted) {
            const d = task.due_date || 'Unscheduled'
            if (!groups[d]) groups[d] = []
            groups[d].push(task)
        }

        return Object.entries(groups).map(([date, tasks], index) => ({
            date,
            dayNumber: index + 1,
            tasks,
            totalTasks: tasks.length,
            completedTasks: tasks.filter(t => t.status === 'completed').length,
            isCompleted: tasks.length > 0 && tasks.every(t => t.status === 'completed')
        }))
    }, [activeGoal?.tasks])

    const getPriorityBadge = (priority: number) => {
        switch (priority) {
            case 5:
                return { label: 'P5 Deep Mastery', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' }
            case 4:
                return { label: 'P4 Intensive', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' }
            case 3:
                return { label: 'P3 Core Practice', color: 'text-neon-violet border-neon-violet/30 bg-neon-violet/10' }
            case 2:
                return { label: 'P2 Foundation', color: 'text-electric-blue border-electric-blue/30 bg-electric-blue/10' }
            case 1:
                return { label: 'P1 Micro-Drill', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' }
            case 0:
                return { label: 'P0 Rest & Reflection', color: 'text-gray-400 border-white/10 bg-white/5' }
            default:
                return { label: `P${priority}`, color: 'text-gray-400 border-white/10 bg-white/5' }
        }
    }

    if (!user) return null

    const totalRemaining = activeGoal
        ? activeGoal.tasks.filter((t: any) => t.status === 'pending').length
        : 0

    const handleAddNewPlan = () => {
        haptics.medium()
        if (!isSubscribed && totalGoals >= 1) {
            setShowUpgradeTip(true)
            setTimeout(() => setShowUpgradeTip(false), 2500)
            return
        }
        setShowAddPlan(true)
    }

    const handlePlanNav = (dir: 'prev' | 'next') => {
        haptics.light()
        let nextIndex = activePlanIndex
        if (dir === 'prev') {
            nextIndex = Math.max(0, activePlanIndex - 1)
        } else {
            nextIndex = Math.min((visibleGoals?.length ?? 1) - 1, activePlanIndex + 1)
        }
        setActivePlanIndex(nextIndex)

        const nextGoal = visibleGoals?.[nextIndex]
        if (nextGoal) {
            localStorage.setItem('lifepivot_active_goal_id', nextGoal.id)
        }
    }

    return (
        <div className="flex flex-col gap-6 pb-48 w-full max-w-7xl mx-auto pt-4">

            {/* ── Past-due warning banner ─────────────────────────────────────── */}
            {isPastDue && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-6 flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-5 py-3.5"
                >
                    <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                    <p className="text-yellow-300 text-xs font-semibold leading-relaxed flex-1">
                        Your last payment failed. Update your card to keep Pro access.
                    </p>
                    <button
                        onClick={async () => {
                            haptics.medium()
                            const res = await fetch('/api/stripe/portal', { method: 'POST' })
                            const { url } = await res.json()
                            if (url) window.location.href = url
                        }}
                        className="shrink-0 text-[9px] font-black uppercase tracking-widest text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 rounded-xl hover:bg-yellow-500/20 transition-all"
                    >
                        Fix Now
                    </button>
                </motion.div>
            )}

            {/* ── Downgrade locked-plans banner ───────────────────────────────── */}
            {isDowngraded && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-6 flex items-center gap-3 bg-neon-violet/10 border border-neon-violet/20 rounded-2xl px-5 py-3.5"
                >
                    <Lock className="w-4 h-4 text-neon-violet shrink-0" />
                    <p className="text-gray-300 text-xs font-semibold leading-relaxed flex-1">
                        You have <span className="text-neon-violet font-black">{lockedCount} plan{lockedCount > 1 ? 's' : ''}</span> from your Pro period — resubscribe to unlock them.
                    </p>
                    <button
                        onClick={() => { haptics.medium(); setShowSubscribeModal(true) }}
                        className="shrink-0 text-[9px] font-black uppercase tracking-widest text-neon-violet border border-neon-violet/30 bg-neon-violet/10 px-3 py-1.5 rounded-xl hover:bg-neon-violet/20 transition-all"
                    >
                        Resubscribe
                    </button>
                </motion.div>
            )}

            {/* ── Mobile Portal Subnav ────────────────────────────────────────── */}
            <div className="flex justify-center px-4 sm:px-6 pt-2 mb-2 md:hidden">
                <Link
                    href="/calendar"
                    onClick={() => haptics.light()}
                    className="group w-full max-w-sm py-2.5 px-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-xl border border-white/[0.06] flex items-center justify-between hover:border-electric-blue/30 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_4px_25px_rgba(var(--accent-rgb),0.08)] active:scale-[0.98]"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)] group-hover:bg-electric-blue/25 transition-all">
                            <Calendar className="w-3.5 h-3.5 text-electric-blue" />
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-wider group-hover:text-electric-blue transition-colors">{t('nav.calendar') || 'Interactive Schedule & Calendar'}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-electric-blue group-hover:translate-x-0.5 transition-all" />
                </Link>
            </div>

            {/* ── Plan Selector Header ────────────────────────────────────────── */}
            {!goalsError && !showAddPlan && totalGoals > 0 && (
                <div className="px-4 sm:px-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between bg-[#141824]/80 border border-white/[0.06] rounded-[1.8rem] p-4 md:px-5 md:py-4 shadow-lg gap-3 md:gap-4">
                        {/* Plan nav arrows + label + Quick Plan Actions */}
                        <div className="flex items-center justify-between md:justify-start gap-3 w-full md:w-auto min-w-0">
                            <button
                                onClick={() => handlePlanNav('prev')}
                                disabled={activePlanIndex === 0}
                                className="w-8 h-8 rounded-xl bg-white/5 border border-white/[0.06] flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 active:scale-90 shrink-0"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <div className="flex flex-col min-w-0 text-center md:text-left flex-1">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] truncate">
                                    Learning Plan {activePlanIndex + 1} of {visibleGoals?.length ?? 0}
                                    {lockedCount > 0 && <span className="text-neon-violet ml-1.5">+{lockedCount} locked</span>}
                                </span>
                                <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
                                    <span className="text-sm font-black text-white truncate max-w-[220px] sm:max-w-[340px]">
                                        {activeGoal?.title ?? '—'}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => handlePlanNav('next')}
                                disabled={activePlanIndex >= (visibleGoals?.length ?? 1) - 1}
                                className="w-8 h-8 rounded-xl bg-white/5 border border-white/[0.06] flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 active:scale-90 shrink-0"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Task Dates, Add Task & Plan Details Actions */}
                        <div className="shrink-0 flex items-center justify-center md:justify-end gap-2 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-white/5 flex-wrap">
                            {/* Manage Dates & Schedule Button */}
                            <button
                                id="active-plan-dates-btn"
                                onClick={() => {
                                    haptics.light()
                                    setSettingsInitialTab('schedule')
                                    setShowSettingsModal(true)
                                }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 bg-white/[0.04] border border-white/[0.08] text-gray-300 hover:text-white hover:border-white/20"
                                title="Change Task Dates & Shift Schedule"
                            >
                                <CalendarDays className="w-3.5 h-3.5 text-electric-blue" />
                                <span>Task Dates</span>
                            </button>

                            {/* Add Custom Task Button */}
                            <button
                                id="active-plan-add-task-btn"
                                onClick={() => {
                                    haptics.light()
                                    setSettingsInitialTab('add_task')
                                    setShowSettingsModal(true)
                                }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 bg-electric-blue/10 border border-electric-blue/25 text-electric-blue hover:bg-electric-blue/20"
                                title="Add Custom Task to Active Plan"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Task</span>
                            </button>

                            {/* Plan Details / Settings */}
                            <button
                                id="active-plan-details-btn"
                                onClick={() => {
                                    haptics.light()
                                    setSettingsInitialTab('plan_details')
                                    setShowSettingsModal(true)
                                }}
                                className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 bg-white/[0.02] border border-white/[0.06] text-gray-400 hover:text-white"
                                title="Rename or Delete Plan"
                            >
                                <Settings className="w-3.5 h-3.5" />
                            </button>

                            <Link
                                href="/plans"
                                onClick={() => haptics.light()}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white hover:border-white/20"
                            >
                                <Library className="w-3.5 h-3.5 text-electric-blue" />
                                <span className="hidden sm:inline">My Plans</span>
                            </Link>

                            <button
                                id="add-new-plan-btn"
                                onClick={handleAddNewPlan}
                                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                                    isSubscribed
                                        ? 'bg-electric-blue/10 border border-electric-blue/20 text-electric-blue hover:bg-electric-blue/20'
                                        : 'bg-white/[0.03] border border-white/[0.06] text-gray-500 hover:border-neon-violet/20 hover:text-neon-violet'
                                }`}
                            >
                                {isSubscribed ? <Plus className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3" />}
                                <span>New Plan</span>
                            </button>

                            <Link
                                href="/plan/pro-curriculum"
                                onClick={() => haptics.light()}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 bg-[#BD00FF]/5 border border-[#BD00FF]/15 text-[#BD00FF]/70 hover:text-[#BD00FF] hover:bg-[#BD00FF]/10 hover:border-[#BD00FF]/25 whitespace-nowrap"
                                title="Professional Curriculum Builder"
                            >
                                <GraduationCap className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Pro Builder</span>
                            </Link>

                            {/* Upgrade tooltip */}
                            <AnimatePresence>
                                {showUpgradeTip && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                        className="absolute right-0 top-full mt-2 w-56 bg-[#1a1f35] border border-neon-violet/20 rounded-2xl p-3.5 z-50 shadow-2xl"
                                    >
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <Crown className="w-3.5 h-3.5 text-neon-violet" />
                                            <span className="text-[10px] font-black text-neon-violet uppercase tracking-widest">Pro Only</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 leading-relaxed mb-3">
                                            Free plan is limited to 1 learning plan. Upgrade to unlock unlimited plans.
                                        </p>
                                        <button
                                            onClick={() => { setShowUpgradeTip(false); setShowSubscribeModal(true) }}
                                            className="w-full text-[9px] font-black uppercase tracking-widest bg-gradient-to-r from-neon-violet to-electric-blue text-white py-2 rounded-xl"
                                        >
                                            Go Pro →
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            )}

            {/* ── View Mode Switcher: Daily Focus vs Curriculum Roadmap ────────── */}
            {!goalsError && !showAddPlan && activeGoal && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6">
                    <div className="inline-flex p-1 rounded-2xl bg-[#141824]/90 border border-white/[0.08] backdrop-blur-xl shadow-lg w-full sm:w-auto">
                        <button
                            onClick={() => {
                                haptics.light()
                                setViewMode('daily')
                            }}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                viewMode === 'daily'
                                    ? 'bg-electric-blue text-white shadow-[0_0_15px_rgba(var(--accent-rgb),0.35)]'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Daily Focus</span>
                        </button>
                        <button
                            onClick={() => {
                                haptics.light()
                                setViewMode('roadmap')
                            }}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                viewMode === 'roadmap'
                                    ? 'bg-gradient-to-r from-neon-violet to-electric-blue text-white shadow-[0_0_15px_rgba(189,0,255,0.35)]'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <Map className="w-3.5 h-3.5" />
                            <span>Curriculum Roadmap</span>
                            {activeGoal?.tasks && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                                    viewMode === 'roadmap' ? 'bg-black/40 text-white' : 'bg-white/10 text-gray-400'
                                }`}>
                                    {activeGoal.tasks.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {viewMode === 'daily' ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400 px-2 sm:px-0">
                            <span className="font-semibold">{t('plan.sessions_remaining').replace('{count}', totalRemaining.toString())}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-2 sm:px-0">
                            <button
                                onClick={() => {
                                    haptics.light()
                                    setSettingsInitialTab('schedule')
                                    setShowSettingsModal(true)
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                            >
                                <CalendarDays className="w-3.5 h-3.5 text-electric-blue" />
                                <span>Change Dates / Shift</span>
                            </button>
                            <button
                                onClick={() => {
                                    haptics.light()
                                    setSettingsInitialTab('add_task')
                                    setShowSettingsModal(true)
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-electric-blue/10 border border-electric-blue/20 text-electric-blue hover:bg-electric-blue/20 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Task</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Inline Add Plan Creator ─────────────────────────────────────── */}
            <AnimatePresence>
                {showAddPlan && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-6 overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black text-white">Create New Plan</h2>
                            <button
                                onClick={() => { haptics.light(); setShowAddPlan(false) }}
                                className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                        <LearningPlanCreator />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="px-4 sm:px-6 space-y-6 pt-2">
                {goalsError && (
                    <div className="p-8 rounded-[2.5rem] border border-red-500/20 bg-[#141217] text-center shadow-[0_0_40px_rgba(239,68,68,0.05)] relative overflow-hidden">
                        <h3 className="text-xl font-bold text-red-400 mb-3">Database Out of Sync</h3>
                        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                            Your Supabase API hasn't recognized the new data structure yet.
                        </p>
                        <div className="text-xs font-mono bg-black/50 p-4 rounded-2xl text-left text-red-300 border border-red-500/10 break-words mb-8">
                            {goalsError.message || JSON.stringify(goalsError)}
                        </div>
                        <p className="text-xs text-gray-500 uppercase tracking-[0.2em] font-black mb-4">Fix Connection</p>
                        <div className="relative text-[11px] font-mono bg-black/60 p-4 rounded-2xl text-electric-blue border border-electric-blue/20 select-all">
                            NOTIFY pgrst, 'reload schema';
                        </div>
                        <p className="mt-4 text-[10px] text-gray-500 italic">Run this in your SQL Editor.</p>
                    </div>
                )}

                {/* No plans at all — show creator */}
                {!goalsError && !showAddPlan && (!translatedGoals || translatedGoals.length === 0) && (
                    <div className="mt-8 max-w-2xl mx-auto">
                        <LearningPlanCreator />
                        <div className="mt-4 flex justify-center">
                            <Link
                                href="/plan/pro-curriculum"
                                onClick={() => haptics.light()}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#BD00FF]/70 hover:text-[#BD00FF] border border-[#BD00FF]/10 hover:border-[#BD00FF]/25 bg-[#BD00FF]/5 hover:bg-[#BD00FF]/10 transition-all active:scale-95"
                            >
                                <GraduationCap className="w-3.5 h-3.5" />
                                🎓 Professional Curriculum Builder
                            </Link>
                        </div>
                    </div>
                )}

                {/* Active plan content */}
                {!goalsError && !showAddPlan && activeGoal && (
                    <>
                        {/* ── View Mode: DAILY FOCUS ───────────────────────────── */}
                        {viewMode === 'daily' ? (
                            <div className="flex flex-col xl:flex-row gap-8 w-full items-start">
                                {/* Left Column (main): Date Selector + Task List */}
                                <div className="flex-1 min-w-0 w-full space-y-6">
                                    <DateSelector
                                        selectedDate={selectedDate}
                                        onSelectDate={handleSelectDate}
                                    />
                                    <div className="bg-[#141824]/60 border border-white/5 p-6 rounded-[2.5rem] glass-card">
                                        <GoalSection
                                            goal={activeGoal as any}
                                            selectedDate={selectedDate}
                                            isEnriching={isEnriching}
                                        />
                                    </div>
                                </div>
                                {/* Right Column (sidebar): Plan Overview + Study Materials */}
                                <div className="w-full xl:w-[400px] shrink-0 xl:sticky xl:top-24 space-y-6">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-1 hidden xl:block">Plan Overview</p>
                                    <PlanProgressCard
                                        goalTitle={activeGoal.title}
                                        createdAt={activeGoal.created_at}
                                        durationDays={activeGoal.duration_days}
                                        tasks={activeGoal.tasks}
                                    />
                                    {/* Study Materials Section */}
                                    <div className="bg-[#141824]/60 border border-white/5 p-6 rounded-[2.5rem] glass-card">
                                        <button
                                            onClick={() => { haptics.light(); toggleMaterials(activeGoal.id) }}
                                            className="flex items-center gap-2 w-full text-left"
                                        >
                                            <Paperclip className="w-4 h-4 text-electric-blue" />
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Study Materials</span>
                                            <span className="ml-auto text-[10px] text-gray-500">{materialsOpen[activeGoal.id] ? '▲' : '▼'}</span>
                                        </button>
                                        <AnimatePresence>
                                            {materialsOpen[activeGoal.id] && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <FileUploader planId={activeGoal.id} maxFiles={5} />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* ── View Mode: CURRICULUM ROADMAP ─────────────────── */
                            <div className="space-y-6">
                                {/* Roadmap Overview Banner */}
                                <div className="p-6 rounded-[2.5rem] bg-[#141824]/80 border border-white/10 glass-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Map className="w-5 h-5 text-neon-violet" />
                                            <h3 className="text-xl font-black text-white">Curriculum Roadmap</h3>
                                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-neon-violet/15 border border-neon-violet/30 text-neon-violet font-bold">
                                                {tasksByDate.length} Days
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Full progression overview for <strong className="text-white">{activeGoal.title}</strong>. Change any task's date or click to focus.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <button
                                            onClick={() => {
                                                haptics.light()
                                                setSettingsInitialTab('schedule')
                                                setShowSettingsModal(true)
                                            }}
                                            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                                        >
                                            <CalendarDays className="w-4 h-4 text-electric-blue" />
                                            <span>Manage Dates</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                haptics.light()
                                                setSettingsInitialTab('add_task')
                                                setShowSettingsModal(true)
                                            }}
                                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-electric-blue/15 border border-electric-blue/30 text-electric-blue hover:bg-electric-blue/25 text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Add Task</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Days Roadmap Timeline */}
                                <div className="space-y-4">
                                    {tasksByDate.length === 0 ? (
                                        <div className="p-12 rounded-[2.5rem] bg-[#141824]/40 border border-white/5 text-center">
                                            <p className="text-gray-400 text-sm mb-4">No tasks found in this curriculum yet.</p>
                                            <button
                                                onClick={() => {
                                                    haptics.light()
                                                    setSettingsInitialTab('add_task')
                                                    setShowSettingsModal(true)
                                                }}
                                                className="px-5 py-2.5 rounded-2xl bg-electric-blue text-white text-xs font-black uppercase tracking-wider shadow-lg active:scale-95"
                                            >
                                                + Add First Task
                                            </button>
                                        </div>
                                    ) : (
                                        tasksByDate.map((group) => {
                                            const isSelected = group.date === selectedDate
                                            return (
                                                <motion.div
                                                    key={group.date}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`p-6 rounded-[2rem] border transition-all ${
                                                        isSelected
                                                            ? 'bg-[#151a2d]/90 border-electric-blue/40 shadow-[0_0_30px_rgba(var(--accent-rgb),0.1)]'
                                                            : 'bg-[#141824]/60 border-white/5 hover:border-white/10'
                                                    }`}
                                                >
                                                    {/* Day Header */}
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/5">
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-electric-blue">
                                                                Day {group.dayNumber}
                                                            </span>
                                                            <span className="text-sm font-black text-white">
                                                                {group.date}
                                                            </span>
                                                            {isSelected && (
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-electric-blue bg-electric-blue/10 px-2 py-0.5 rounded-lg border border-electric-blue/20">
                                                                    Active In Focus
                                                                </span>
                                                            )}
                                                            {group.isCompleted && (
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                                                    ✓ All Completed
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-3 self-end sm:self-auto">
                                                            <span className="text-xs text-gray-400">
                                                                {group.completedTasks} / {group.totalTasks} Done
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    haptics.light()
                                                                    handleSelectDate(group.date)
                                                                    setViewMode('daily')
                                                                }}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                                                            >
                                                                <span>Focus Day</span>
                                                                <ArrowRight className="w-3 h-3 text-electric-blue" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Day Tasks List with Direct Date Rescheduling */}
                                                    <div className="space-y-2.5">
                                                        {group.tasks.map((task: any) => {
                                                            const priorityInfo = getPriorityBadge(task.priority ?? 3)
                                                            const isDone = task.status === 'completed'
                                                            return (
                                                                <div
                                                                    key={task.id}
                                                                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                                                                        isDone
                                                                            ? 'bg-black/20 border-white/[0.03] opacity-60'
                                                                            : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                        <button
                                                                            onClick={async () => {
                                                                                haptics.medium()
                                                                                const nextStatus = isDone ? 'pending' : 'completed'
                                                                                setLocalGoals(prev => prev ? prev.map(g => {
                                                                                    if (g.id !== activeGoal.id) return g
                                                                                    return {
                                                                                        ...g,
                                                                                        tasks: (g.tasks || []).map((t: any) => 
                                                                                            t.id === task.id ? { ...t, status: nextStatus } : t
                                                                                        )
                                                                                    }
                                                                                }) : prev)
                                                                                await toggleTask(task.id, task.status)
                                                                                router.refresh()
                                                                            }}
                                                                            className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                                                                                isDone
                                                                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                                                                    : 'bg-white/5 border-white/15 text-transparent hover:border-white/30'
                                                                            }`}
                                                                        >
                                                                            <Check className="w-3.5 h-3.5" />
                                                                        </button>

                                                                        <div className="min-w-0 flex-1">
                                                                            <p className={`text-xs font-bold truncate ${
                                                                                isDone ? 'line-through text-gray-500' : 'text-white'
                                                                            }`}>
                                                                                {task.title}
                                                                            </p>
                                                                            {task.subtasks && task.subtasks.length > 0 && (
                                                                                <span className="text-[10px] text-gray-500">
                                                                                    {task.subtasks.filter((s: any) => s.completed).length} / {task.subtasks.length} subtasks
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap justify-end">
                                                                        {/* Inline Date Changer */}
                                                                        <input
                                                                            type="date"
                                                                            value={task.due_date || ''}
                                                                            onChange={async (e) => {
                                                                                const newD = e.target.value
                                                                                if (!newD) return
                                                                                haptics.light()
                                                                                setLocalGoals(prev => prev ? prev.map(g => {
                                                                                    if (g.id !== activeGoal.id) return g
                                                                                    return {
                                                                                        ...g,
                                                                                        tasks: (g.tasks || []).map((t: any) =>
                                                                                            t.id === task.id ? { ...t, due_date: newD } : t
                                                                                        )
                                                                                    }
                                                                                }) : prev)
                                                                                await updateTaskDate(task.id, newD)
                                                                                router.refresh()
                                                                            }}
                                                                            className="bg-black/40 border border-white/10 hover:border-electric-blue/40 text-gray-300 text-[10px] rounded-xl px-2 py-1 focus:outline-none focus:border-electric-blue cursor-pointer"
                                                                            title="Change task date"
                                                                        />

                                                                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${priorityInfo.color}`}>
                                                                            {priorityInfo.label}
                                                                        </span>
                                                                        {task.duration_mins && (
                                                                            <span className="text-[10px] text-gray-500 hidden sm:inline">
                                                                                {task.duration_mins}m
                                                                            </span>
                                                                        )}
                                                                        <button
                                                                            onClick={async () => {
                                                                                haptics.medium()
                                                                                setLocalGoals(prev => prev ? prev.map(g => {
                                                                                    if (g.id !== activeGoal.id) return g
                                                                                    return {
                                                                                        ...g,
                                                                                        tasks: (g.tasks || []).filter((t: any) => t.id !== task.id)
                                                                                    }
                                                                                }) : prev)
                                                                                await deleteTask(task.id)
                                                                                router.refresh()
                                                                            }}
                                                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                                                                            title="Delete Task"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Reset plan (only when there's an active plan visible) */}
                {!goalsError && !showAddPlan && activeGoal && (
                    <div className="pt-12 pb-8 border-t border-white/5 flex flex-col items-center mt-8">
                        <p className="text-xs text-gray-500 mb-4 uppercase tracking-widest font-bold">{t('profile.danger')}</p>
                        <ResetPlanButton />
                    </div>
                )}
            </div>

            {/* ── Active Plan Customization & Schedule Modal ──────────────────── */}
            <PlanSettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                goal={activeGoal}
                initialTab={settingsInitialTab}
                onTaskDateUpdated={(taskId, newDate) => {
                    setLocalGoals(prev => prev ? prev.map(g => {
                        if (g.id !== activeGoal?.id) return g
                        return {
                            ...g,
                            tasks: (g.tasks || []).map((t: any) =>
                                t.id === taskId ? { ...t, due_date: newDate } : t
                            )
                        }
                    }) : prev)
                    router.refresh()
                }}
                onScheduleShifted={(daysShift) => {
                    const todayStr = getLocalDateString()
                    setLocalGoals(prev => prev ? prev.map(g => {
                        if (g.id !== activeGoal?.id) return g
                        return {
                            ...g,
                            tasks: (g.tasks || []).map((t: any) => {
                                if (!t.due_date || t.due_date < todayStr) return t
                                const d = new Date(t.due_date + 'T00:00:00')
                                d.setDate(d.getDate() + daysShift)
                                return { ...t, due_date: getLocalDateString(d) }
                            })
                        }
                    }) : prev)
                    router.refresh()
                }}
                onPlanUpdated={(updated) => {
                    setLocalGoals(prev => prev ? prev.map(g => g.id === activeGoal?.id ? { ...g, ...updated } : g) : prev)
                    router.refresh()
                }}
                onTaskAdded={(newTask) => {
                    setLocalGoals(prev => prev ? prev.map(g => {
                        if (g.id !== activeGoal?.id) return g
                        return { ...g, tasks: [...(g.tasks || []), newTask] }
                    }) : prev)
                    router.refresh()
                }}
                onPlanDeleted={(deletedId) => {
                    setLocalGoals(prev => prev ? prev.filter(g => g.id !== deletedId) : prev)
                    setActivePlanIndex(0)
                    router.refresh()
                }}
            />

            {/* Subscribe Modal */}
            <SubscribeModal
                isOpen={showSubscribeModal}
                onClose={() => setShowSubscribeModal(false)}
                isAlreadySubscribed={isSubscribed}
            />
        </div>
    )
}
