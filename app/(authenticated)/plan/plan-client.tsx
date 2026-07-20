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
import { Users, Compass, Paperclip, ArrowRight, ChevronLeft, ChevronRight, Plus, Lock, Crown, AlertTriangle, Library, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { haptics } from '@/utils/haptics'
import { useLanguage } from '@/components/language-provider'
import { translateGoalsArray } from '@/utils/translations'
import { FileUploader } from '@/components/file-uploader'
import { motion, AnimatePresence } from 'framer-motion'
import { SubscribeModal } from '@/components/subscribe-modal'

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

    const [selectedDate, setSelectedDate] = useState(urlDate || getLocalDateString())
    const { t, locale } = useLanguage()
    const [materialsOpen, setMaterialsOpen] = useState<Record<string, boolean>>({})
    const [activePlanIndex, setActivePlanIndex] = useState(0)
    const [isMounted, setIsMounted] = useState(false)
    const [showSubscribeModal, setShowSubscribeModal] = useState(false)
    const [showAddPlan, setShowAddPlan] = useState(false)
    const [showUpgradeTip, setShowUpgradeTip] = useState(false)
    const [isEnriching, setIsEnriching] = useState(false)

    const translatedGoals = useMemo(() => {
        return translateGoalsArray(goals, locale)
    }, [goals, locale])

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
            // Free tier users can only access index 0, so clamp or verify
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

        // Check if there are any P3 tasks that need enrichment (generic placeholders)
        const hasPlaceholderP3 = activeGoal.tasks?.some((t: any) => 
            t.priority === 3 && 
            (t.subtasks || []).some((st: any) => 
                st.id !== 'translations' && 
                (st.title?.toLowerCase().includes('practice exercise') || st.title?.toLowerCase().includes('placeholder'))
            )
        )

        if (!hasPlaceholderP3) return

        setIsEnriching(true)

        // Set a 30-second timeout safety trigger to remove shimmer
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
            <div className="flex justify-center gap-3 px-6 pt-2 mb-2 md:hidden">
                <Link
                    href="/workspaces"
                    onClick={() => haptics.light()}
                    className="group w-[144px] py-2.5 px-3 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-xl border border-white/[0.06] flex items-center justify-between hover:border-electric-blue/30 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_4px_25px_rgba(var(--accent-rgb),0.08)] active:scale-[0.98]"
                >
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)] group-hover:bg-electric-blue/25 transition-all">
                            <Users className="w-4 h-4 text-electric-blue" />
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-wider group-hover:text-electric-blue transition-colors">{t('nav.cohorts') || 'Cohorts'}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-electric-blue group-hover:translate-x-0.5 transition-all" />
                </Link>
                <Link
                    href="/marketplace"
                    onClick={() => haptics.light()}
                    className="group w-[144px] py-2.5 px-3 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-xl border border-white/[0.06] flex items-center justify-between hover:border-electric-blue/30 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_4px_25px_rgba(var(--accent-rgb),0.08)] active:scale-[0.98]"
                >
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)] group-hover:bg-electric-blue/25 transition-all">
                            <Compass className="w-4 h-4 text-electric-blue" />
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-wider group-hover:text-electric-blue transition-colors">{t('nav.marketplace') || 'Marketplace'}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-electric-blue group-hover:translate-x-0.5 transition-all" />
                </Link>
            </div>

            {/* ── Plan Selector Header ────────────────────────────────────────── */}
            {!goalsError && !showAddPlan && totalGoals > 0 && (
                <div className="px-6">
                    <div className="flex items-center justify-between bg-[#141824]/80 border border-white/[0.06] rounded-[1.8rem] px-5 py-4 shadow-lg gap-4">
                        {/* Plan nav arrows + label */}
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                onClick={() => handlePlanNav('prev')}
                                disabled={activePlanIndex === 0}
                                className="w-8 h-8 rounded-xl bg-white/5 border border-white/[0.06] flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 active:scale-90 shrink-0"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <div className="flex flex-col min-w-0">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">
                                    Learning Plan {activePlanIndex + 1} of {visibleGoals?.length ?? 0}
                                    {lockedCount > 0 && <span className="text-neon-violet ml-1.5">+{lockedCount} locked</span>}
                                </span>
                                <span className="text-sm font-black text-white truncate">
                                    {activeGoal?.title ?? '—'}
                                </span>
                            </div>

                            <button
                                onClick={() => handlePlanNav('next')}
                                disabled={activePlanIndex >= (visibleGoals?.length ?? 1) - 1}
                                className="w-8 h-8 rounded-xl bg-white/5 border border-white/[0.06] flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 active:scale-90 shrink-0"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Add New Plan button */}
                        <div className="relative shrink-0 flex gap-2">
                            <Link
                                href="/plans"
                                onClick={() => haptics.light()}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white hover:border-white/20"
                            >
                                <Library className="w-3.5 h-3.5 text-electric-blue" />
                                My Plans
                            </Link>

                            <button
                                id="add-new-plan-btn"
                                onClick={handleAddNewPlan}
                                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                                    isSubscribed
                                        ? 'bg-electric-blue/10 border border-electric-blue/20 text-electric-blue hover:bg-electric-blue/20'
                                        : 'bg-white/[0.03] border border-white/[0.06] text-gray-500 hover:border-neon-violet/20 hover:text-neon-violet'
                                }`}
                            >
                                {isSubscribed ? <Plus className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3" />}
                                Add Plan
                            </button>

                            {/* Pro Curriculum Builder secondary entry point */}
                            <Link
                                href="/plan/pro-curriculum"
                                onClick={() => haptics.light()}
                                className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 bg-[#BD00FF]/5 border border-[#BD00FF]/15 text-[#BD00FF]/70 hover:text-[#BD00FF] hover:bg-[#BD00FF]/10 hover:border-[#BD00FF]/25 whitespace-nowrap"
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

            {/* ── View header ─────────────────────────────────────────────────── */}
            {!goalsError && !showAddPlan && activeGoal && (
                <div className="flex items-center px-6 pb-2 pt-2 border-t border-white/[0.04]">
                    <div className="flex flex-col">
                        <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                            {t('plan.todays_focus')}
                        </h2>
                        <span className="text-sm text-gray-400 mt-1">
                            {t('plan.sessions_remaining').replace('{count}', totalRemaining.toString())}
                        </span>
                    </div>
                </div>
            )}

            <div className="px-6 space-y-6 pt-2">
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
                        {/* Secondary Pro Builder entry */}
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
                    <div className="flex flex-col xl:flex-row gap-8 w-full items-start">
                        {/* Left Column (main): Date Selector + Task List */}
                        <div className="flex-1 min-w-0 w-full space-y-6">
                            {/* Date Selector */}
                            <DateSelector
                                selectedDate={selectedDate}
                                onSelectDate={handleSelectDate}
                            />
                            {/* Goal Section / Tasks */}
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
                            {/* Plan Overview label */}
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
                )}

                {/* Reset plan (only when there's an active plan visible) */}
                {!goalsError && !showAddPlan && activeGoal && (
                    <div className="pt-12 pb-8 border-t border-white/5 flex flex-col items-center mt-8">
                        <p className="text-xs text-gray-500 mb-4 uppercase tracking-widest font-bold">{t('profile.danger')}</p>
                        <ResetPlanButton />
                    </div>
                )}
            </div>

            {/* Subscribe Modal */}
            <SubscribeModal
                isOpen={showSubscribeModal}
                onClose={() => setShowSubscribeModal(false)}
                isAlreadySubscribed={isSubscribed}
            />
        </div>
    )
}
