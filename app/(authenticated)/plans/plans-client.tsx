'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
    Search, Plus, Lock, CheckCircle2, ChevronRight, 
    Sparkles, Library, Layers, Target, Play, X, Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { haptics } from '@/utils/haptics'
import { useLanguage } from '@/components/language-provider'
import { useEconomy } from '@/components/economy-provider'
import { LearningPlanCreator } from '@/components/learning-plan-creator'
import { SubscribeModal } from '@/components/subscribe-modal'
import { translateGoalsArray } from '@/utils/translations'

interface Goal {
    id: string
    title: string
    duration_days: number
    level: string
    goal_intent: string
    created_at: string
    tasks: {
        id: string
        status: string
        task_type: string
    }[]
}

interface PlansClientProps {
    user: any
    goals: Goal[]
    goalsError: any
    isSubscribed: boolean
    subscriptionStatus: string
}

export function PlansClient({ user, goals, goalsError, isSubscribed, subscriptionStatus }: PlansClientProps) {
    const router = useRouter()
    const { t, locale } = useLanguage()
    const { setTokens } = useEconomy()

    const [searchQuery, setSearchQuery] = useState('')
    const [filterIntent, setFilterIntent] = useState<string>('ALL')
    const [activeGoalId, setActiveGoalId] = useState<string | null>(null)
    const [isMounted, setIsMounted] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showSubscribeModal, setShowSubscribeModal] = useState(false)

    // Load active plan from localStorage safely after mount to prevent hydration mismatch
    useEffect(() => {
        setIsMounted(true)
        const storedActiveId = localStorage.getItem('lifepivot_active_goal_id')
        if (storedActiveId) {
            setActiveGoalId(storedActiveId)
        } else if (goals.length > 0) {
            // Default to the first (latest) plan and persist
            const defaultId = goals[0].id
            setActiveGoalId(defaultId)
            localStorage.setItem('lifepivot_active_goal_id', defaultId)
        }
    }, [goals])

    // Translate goals client-side
    const translatedGoals = useMemo(() => {
        return translateGoalsArray(goals, locale) || []
    }, [goals, locale])

    // Compute plan list and status
    const processedGoals = useMemo(() => {
        return translatedGoals.map((goal, index) => {
            const realTasks = goal.tasks?.filter((t: any) => t.task_type !== 'void') || []
            const total = realTasks.length
            const completed = realTasks.filter((t: any) => t.status === 'completed').length
            const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0
            
            // Under free tier, only the most recently created plan (index 0) is unlocked. All others are locked.
            const isPlanLocked = !isSubscribed && index > 0

            return {
                ...goal,
                totalTasks: total,
                completedTasks: completed,
                progress: progressPercent,
                isLocked: isPlanLocked
            }
        })
    }, [translatedGoals, isSubscribed])

    // Search and Filter
    const filteredGoals = useMemo(() => {
        return processedGoals.filter(goal => {
            const matchesSearch = goal.title.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesFilter = filterIntent === 'ALL' || goal.goal_intent === filterIntent
            return matchesSearch && matchesFilter
        })
    }, [processedGoals, searchQuery, filterIntent])

    const handleSelectActivePlan = (goalId: string, isLocked: boolean) => {
        haptics.medium()
        if (isLocked) {
            setShowSubscribeModal(true)
            return
        }
        setActiveGoalId(goalId)
        localStorage.setItem('lifepivot_active_goal_id', goalId)
        router.push('/plan')
    }

    if (!user) return null

    return (
        <div className="flex flex-col gap-6 pb-48 w-full max-w-7xl mx-auto pt-6 px-4 md:px-8 select-none">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-electric-blue to-neon-violet flex items-center justify-center border border-white/10 text-white shadow-[0_0_15px_rgba(var(--accent-rgb),0.25)]">
                            <Library className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-[10px] font-black text-electric-blue uppercase tracking-widest">Syllabus Registry</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1.5 uppercase title-glow">
                        My Learning Plans
                    </h1>
                    <p className="text-gray-400 text-xs mt-1">
                        Select an active focus syllabus, review stats, or forge a new curriculum.
                    </p>
                </div>

                <button
                    onClick={() => { haptics.medium(); setShowCreateModal(true) }}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-neon-violet to-electric-blue text-white font-black text-[11px] tracking-widest uppercase shadow-[0_0_20px_rgba(var(--accent-rgb),0.25)] hover:scale-[1.02] active:scale-95 transition-all self-start md:self-auto"
                >
                    <Plus className="w-4 h-4" />
                    Forge New Plan
                </button>
            </div>

            {/* Filter / Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-[#141824]/60 border border-white/5 p-4 rounded-3xl backdrop-blur-xl">
                {/* Search input */}
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search plans by name..."
                        className="w-full bg-[#0B0D17]/80 border border-white/[0.06] rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-electric-blue transition-colors font-medium"
                    />
                </div>

                {/* Filter buttons */}
                <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    {['ALL', 'Level Up', 'Exam', 'Intro'].map((intent) => (
                        <button
                            key={intent}
                            onClick={() => { haptics.light(); setFilterIntent(intent) }}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shrink-0 border ${
                                filterIntent === intent
                                    ? 'bg-electric-blue/15 border-electric-blue/35 text-electric-blue shadow-[0_0_12px_rgba(var(--accent-rgb),0.1)]'
                                    : 'bg-white/[0.02] border-white/5 text-gray-400 hover:text-white hover:bg-white/[0.04]'
                            }`}
                        >
                            {intent === 'ALL' ? 'All Schemes' : intent}
                        </button>
                    ))}
                </div>
            </div>

            {/* Locked tier notification banner for non-pro users */}
            {!isSubscribed && processedGoals.length > 1 && (
                <div className="flex items-center gap-3 bg-neon-violet/10 border border-neon-violet/20 rounded-2xl px-5 py-3.5">
                    <Lock className="w-4 h-4 text-neon-violet shrink-0" />
                    <p className="text-gray-300 text-xs font-semibold leading-relaxed flex-1">
                        You have <span className="text-neon-violet font-black">{processedGoals.length - 1} plans</span> locked under the free tier. Upgrade to Solo Power to unlock unlimited active plans.
                    </p>
                    <button
                        onClick={() => { haptics.medium(); setShowSubscribeModal(true) }}
                        className="shrink-0 text-[9px] font-black uppercase tracking-widest text-neon-violet border border-neon-violet/30 bg-neon-violet/10 px-3.5 py-2 rounded-xl hover:bg-neon-violet/20 transition-all"
                    >
                        Go Pro
                    </button>
                </div>
            )}

            {/* Plans Grid */}
            {goalsError ? (
                <div className="p-8 rounded-3xl border border-red-500/20 bg-red-500/5 text-center text-red-400">
                    Failed to load learning plans. Please reload the page.
                </div>
            ) : filteredGoals.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-12 border border-white/5 rounded-3xl bg-white/[0.01]">
                    <Layers className="w-12 h-12 text-gray-600 mb-3" />
                    <h3 className="text-white font-bold text-base">No learning plans found</h3>
                    <p className="text-gray-500 text-xs mt-1 max-w-sm">
                        Create a plan to get started on your customized study sessions.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGoals.map((goal) => {
                        const isActive = isMounted && activeGoalId === goal.id
                        const isLocked = goal.isLocked

                        return (
                            <motion.div
                                key={goal.id}
                                layout
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`relative flex flex-col p-6 rounded-[2.2rem] bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-xl border transition-all duration-300 overflow-hidden ${
                                    isActive
                                        ? 'border-electric-blue shadow-[0_0_20px_rgba(var(--accent-rgb),0.12)]'
                                        : isLocked
                                        ? 'border-white/5 opacity-55'
                                        : 'border-white/5 hover:border-white/10 hover:shadow-lg'
                                }`}
                            >
                                {/* Active marker overlay */}
                                {isActive && (
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-electric-blue/10 rounded-full blur-[20px] pointer-events-none" />
                                )}

                                {/* Lock Overlay for Free tier */}
                                {isLocked && (
                                    <div className="absolute inset-0 bg-[#0B0D17]/40 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all">
                                        <div 
                                            onClick={() => { haptics.medium(); setShowSubscribeModal(true) }}
                                            className="cursor-pointer bg-[#141824] border border-neon-violet/30 px-4 py-3 rounded-2xl flex items-center gap-2 text-neon-violet hover:bg-neon-violet/10 transition-colors shadow-2xl active:scale-95"
                                        >
                                            <Lock className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Upgrade to Unlock</span>
                                        </div>
                                    </div>
                                )}

                                {/* Header info */}
                                <div className="flex justify-between items-start gap-4 mb-4">
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                                goal.goal_intent === 'Exam' 
                                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                                                    : goal.goal_intent === 'Level Up'
                                                    ? 'bg-electric-blue/10 text-electric-blue border border-electric-blue/20'
                                                    : 'bg-neon-violet/10 text-neon-violet border border-neon-violet/20'
                                            }`}>
                                                {goal.goal_intent}
                                            </span>
                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">
                                                {goal.level}
                                            </span>
                                        </div>
                                        <h3 className="text-base font-extrabold text-white truncate mt-2 uppercase tracking-wide">
                                            {goal.title}
                                        </h3>
                                    </div>

                                    {/* Action button: Set Active */}
                                    {isActive ? (
                                        <span className="flex items-center gap-1 text-electric-blue text-[9px] font-black uppercase tracking-widest bg-electric-blue/10 border border-electric-blue/20 px-2.5 py-1 rounded-xl shrink-0">
                                            <CheckCircle2 className="w-3 h-3 text-electric-blue" />
                                            Active
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handleSelectActivePlan(goal.id, !!isLocked)}
                                            className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest bg-white/5 border border-white/10 hover:border-white/20 hover:text-white px-2.5 py-1 rounded-xl transition-all shrink-0 active:scale-90"
                                        >
                                            <Play className="w-2.5 h-2.5" />
                                            Activate
                                        </button>
                                    )}
                                </div>

                                {/* Stats Section */}
                                <div className="space-y-3 mt-auto border-t border-white/5 pt-4">
                                    {/* Progress label */}
                                    <div className="flex justify-between items-baseline text-[9px] font-black text-gray-500 uppercase tracking-wider">
                                        <span>Progress Details</span>
                                        <span className="text-white font-bold">{goal.progress}%</span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full h-1.5 bg-[#1C2033]/50 rounded-full overflow-hidden border border-white/5">
                                        <div 
                                            className="h-full bg-gradient-to-r from-electric-blue to-neon-violet transition-all duration-500 rounded-full"
                                            style={{ width: `${goal.progress}%` }}
                                        />
                                    </div>

                                    {/* Progress counts */}
                                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-semibold pt-1">
                                        <span className="flex items-center gap-1">
                                            <Target className="w-3.5 h-3.5 text-electric-blue" />
                                            {goal.completedTasks} / {goal.totalTasks} Tasks
                                        </span>
                                        <span className="text-gray-500 font-medium">
                                            {goal.duration_days} Days Plan
                                        </span>
                                    </div>
                                </div>

                                {/* Navigate to plan details link */}
                                <button
                                    onClick={() => handleSelectActivePlan(goal.id, !!isLocked)}
                                    className="mt-4 flex items-center justify-between w-full p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] text-[10px] font-bold text-gray-400 hover:text-white transition-all uppercase tracking-widest"
                                >
                                    <span>Open Study Domain</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-electric-blue" />
                                </button>
                            </motion.div>
                        )
                    })}
                </div>
            )}

            {/* Slide-over Drawer / Modal for LearningPlanCreator */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-[#0B0D17]/85 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            className="relative w-full max-w-3xl rounded-[2.5rem] bg-[#141824] border border-white/10 p-6 md:p-8 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
                        >
                            {/* Close button */}
                            <button
                                onClick={() => { haptics.light(); setShowCreateModal(false) }}
                                className="absolute right-6 top-6 w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-90 z-50"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Creator component */}
                            <div className="mt-4">
                                <LearningPlanCreator />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Subscribe Modal */}
            <SubscribeModal
                isOpen={showSubscribeModal}
                onClose={() => setShowSubscribeModal(false)}
                isAlreadySubscribed={isSubscribed}
            />
        </div>
    )
}
