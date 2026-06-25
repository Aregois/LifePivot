'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Compass, Search, Flame, Star, Coins, Calendar, BookOpen, Clock, ArrowRight, CheckCircle2, ChevronRight, X, Loader2 } from 'lucide-react'
import { useEconomy } from './economy-provider'
import { useLanguage } from './language-provider'
import { haptics } from '@/utils/haptics'
import { motion, AnimatePresence } from 'framer-motion'

interface Plan {
    id: string
    title: string
    duration_days: number
    level: string
    goal_intent: string
    commitment_hours_per_week: number
    is_public: boolean
    rating: number
    created_at: string
    profiles: {
        id: string
        role: string
        linkedin_url: string | null
    }
    plan_metadata: {
        token_cost?: number
        sprint_walls?: any[]
        category?: string
    }
}

interface MarketplaceClientProps {
    user: any
    initialProfile: any
}

export function MarketplaceClient({ user, initialProfile }: MarketplaceClientProps) {
    const router = useRouter()
    const { t } = useLanguage()
    const { tokens, setTokens } = useEconomy()
    const [isPending, startTransition] = useTransition()

    const [plans, setPlans] = useState<Plan[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedLevel, setSelectedLevel] = useState<string>('All')
    const [sortBy, setSortBy] = useState<'created_at' | 'rating'>('created_at')
    const [loading, setLoading] = useState(true)

    // Detailed Drawer Modal State
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
    const [userRating, setUserRating] = useState<number>(0)
    const [submittingRating, setSubmittingRating] = useState(false)
    const [ratingSuccess, setRatingSuccess] = useState(false)
    const [importSuccess, setImportSuccess] = useState(false)
    const [importError, setImportError] = useState<string | null>(null)

    const fetchPlans = async () => {
        try {
            const res = await fetch(`/api/plans/discover?sortBy=${sortBy}&order=desc`)
            const data = await res.json()
            if (data.success) {
                setPlans(data.plans || [])
            }
        } catch (err) {
            console.error('Error fetching plans:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPlans()
    }, [sortBy])

    const handleImportPlan = (plan: Plan) => {
        const cost = Number(plan.plan_metadata?.token_cost || 0)
        if (cost > 0 && tokens < cost) {
            haptics.error()
            setImportError('Insufficient tokens to purchase this plan!')
            setTimeout(() => setImportError(null), 3000)
            return
        }

        haptics.medium()
        setImportError(null)
        startTransition(async () => {
            try {
                const res = await fetch('/api/plans/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ goalId: plan.id })
                })
                const data = await res.json()
                if (data.success) {
                    haptics.medium()
                    setImportSuccess(true)
                    if (cost > 0) {
                        setTokens(prev => Math.max(0, prev - cost))
                    }
                    setTimeout(() => {
                        setImportSuccess(false)
                        setSelectedPlan(null)
                        router.push('/plan')
                    }, 2000)
                } else {
                    haptics.error()
                    setImportError(data.error || 'Failed to clone syllabus')
                }
            } catch (err) {
                console.error(err)
                setImportError('An error occurred during cloning')
            }
        })
    }

    const handleRatePlan = async (ratingVal: number) => {
        if (!selectedPlan) return
        haptics.light()
        setUserRating(ratingVal)
        setSubmittingRating(true)
        try {
            const res = await fetch(`/api/plans/${selectedPlan.id}/rate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: ratingVal })
            })
            const data = await res.json()
            if (data.success) {
                haptics.medium()
                setRatingSuccess(true)
                // Refresh local copy of rating
                setSelectedPlan(prev => prev ? { ...prev, rating: data.rating } : null)
                fetchPlans()
                setTimeout(() => setRatingSuccess(false), 3000)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setSubmittingRating(false)
        }
    }

    const filteredPlans = plans.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesLevel = selectedLevel === 'All' || p.level === selectedLevel
        return matchesSearch && matchesLevel
    })

    return (
        <div className="flex flex-col gap-6 py-6 px-4 md:px-8 w-full max-w-7xl mx-auto pt-4 pb-32">
            
            {/* Header block */}
            <div className="mb-4">
                <h1 className="text-3xl font-black text-white leading-tight">Plan Marketplace</h1>
                <p className="text-gray-400 text-xs mt-1">Discover, clone, and rate curated syllabuses designed by peer pathseekers.</p>
            </div>

            {/* Filter controls row */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#141824] p-4 rounded-3xl border border-white/5 shadow-md w-full">
                
                {/* Search Bar input */}
                <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search syllabuses..."
                        className="w-full bg-[#0B0D17]/80 border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-electric-blue transition-colors font-medium"
                    />
                </div>

                {/* Level / Difficulty Filter control */}
                <div className="flex gap-1 bg-[#0B0D17] p-1 rounded-2xl border border-white/5 w-full md:w-auto overflow-x-auto">
                    {['All', 'Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                        <button
                            key={lvl}
                            onClick={() => { haptics.light(); setSelectedLevel(lvl) }}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                selectedLevel === lvl
                                    ? 'bg-electric-blue/15 text-electric-blue border border-electric-blue/10'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {lvl}
                        </button>
                    ))}
                </div>

                {/* Sort Order Selector tab */}
                <div className="flex gap-1 bg-[#0B0D17] p-1 rounded-2xl border border-white/5 w-full md:w-auto shrink-0">
                    <button
                        onClick={() => { haptics.light(); setSortBy('created_at') }}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                            sortBy === 'created_at'
                                ? 'bg-electric-blue/15 text-electric-blue border border-electric-blue/10'
                                : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        Newest
                    </button>
                    <button
                        onClick={() => { haptics.light(); setSortBy('rating') }}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                            sortBy === 'rating'
                                ? 'bg-electric-blue/15 text-electric-blue border border-electric-blue/10'
                                : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        Top Rated
                    </button>
                </div>
            </div>

            {/* Content Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 text-electric-blue animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredPlans.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-[#141824]/40 border border-white/5 rounded-[2.5rem] p-6">
                            <Compass className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-white font-extrabold text-sm uppercase tracking-wider">No Plans Discovered</h3>
                            <p className="text-gray-400 text-xs mt-1.5 leading-relaxed max-w-sm mx-auto">
                                No public study blueprints match your query. Clear search parameters and check again.
                            </p>
                        </div>
                    ) : (
                        filteredPlans.map(plan => {
                            const cost = Number(plan.plan_metadata?.token_cost || 0)
                            return (
                                <div
                                    key={plan.id}
                                    onClick={() => { haptics.light(); setSelectedPlan(plan) }}
                                    className="bg-[#141824] border border-white/5 hover:border-white/10 p-6 rounded-[2.5rem] flex flex-col justify-between h-56 cursor-pointer hover:scale-[1.01] transition-all group relative overflow-hidden shadow-lg"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-electric-blue/5 rounded-full blur-[35px] pointer-events-none group-hover:bg-electric-blue/10 transition-all" />
                                    
                                    <div>
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <span className="text-[9px] font-black text-electric-blue bg-electric-blue/15 border border-electric-blue/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                                                {plan.level}
                                            </span>
                                            {cost > 0 ? (
                                                <div className="flex items-center gap-1 text-[10px] font-black text-yellow-500 bg-yellow-500/10 border border-yellow-500/25 px-2.5 py-0.5 rounded-full select-none uppercase">
                                                    <Coins className="w-3.5 h-3.5" />
                                                    {cost}
                                                </div>
                                            ) : (
                                                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                                                    Free
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-white font-black text-base tracking-tight leading-snug group-hover:text-electric-blue transition-colors line-clamp-2 pr-6">
                                            {plan.title}
                                        </h3>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-1.5 my-3">
                                            <div className="flex items-center gap-0.5 text-yellow-500">
                                                <Star className="w-3.5 h-3.5 fill-yellow-500/40" />
                                                <span className="text-[11px] font-extrabold text-white mt-0.5">{plan.rating}</span>
                                            </div>
                                            <span className="text-gray-600 text-[10px]">•</span>
                                            <span className="text-gray-400 text-[10px] font-extrabold uppercase tracking-wide">{plan.duration_days} Days</span>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                            <span className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest truncate max-w-[120px]">
                                                By {plan.profiles?.id === user.id ? 'You' : `Creator-${plan.profiles?.id.slice(0, 5)}`}
                                            </span>
                                            <div className="flex items-center gap-1 text-electric-blue font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                                View Blueprint <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {/* Plan Specs Drawer Modal */}
            <AnimatePresence>
                {selectedPlan && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-[#0B0D17]/85 backdrop-blur-md">
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="relative w-full max-w-xl rounded-[2.5rem] bg-[#141824] border border-white/10 p-8 shadow-2xl flex flex-col gap-6"
                        >
                            {/* Close button */}
                            <button
                                onClick={() => { haptics.light(); setSelectedPlan(null) }}
                                className="absolute right-6 top-6 w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-90"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="flex flex-col gap-2 border-b border-white/5 pb-4 pr-10">
                                <span className="text-[9px] font-black text-electric-blue bg-electric-blue/10 border border-electric-blue/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider w-fit">
                                    {selectedPlan.level} Course Syllabus
                                </span>
                                <h3 className="text-xl font-black text-white leading-tight uppercase tracking-tight mt-1">{selectedPlan.title}</h3>
                            </div>

                            {importSuccess ? (
                                <div className="py-12 text-center space-y-3">
                                    <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                    <h4 className="text-white font-black text-base uppercase">Syllabus Cloned</h4>
                                    <p className="text-gray-400 text-xs leading-relaxed max-w-xs mx-auto">
                                        The plan curriculum structure has been imported into your calendar scheduler. Redirecting...
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {/* specs card info */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-[#0B0D17]/40 border border-white/5 p-4 rounded-2xl flex flex-col gap-1 items-center justify-center">
                                            <Calendar className="w-4 h-4 text-electric-blue" />
                                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Duration</span>
                                            <span className="text-xs font-black text-white mt-0.5">{selectedPlan.duration_days} Days</span>
                                        </div>
                                        <div className="bg-[#0B0D17]/40 border border-white/5 p-4 rounded-2xl flex flex-col gap-1 items-center justify-center">
                                            <Clock className="w-4 h-4 text-electric-blue" />
                                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Weekly</span>
                                            <span className="text-xs font-black text-white mt-0.5">{selectedPlan.commitment_hours_per_week || 14} Hrs</span>
                                        </div>
                                        <div className="bg-[#0B0D17]/40 border border-white/5 p-4 rounded-2xl flex flex-col gap-1 items-center justify-center">
                                            <BookOpen className="w-4 h-4 text-electric-blue" />
                                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Intent</span>
                                            <span className="text-xs font-black text-white mt-0.5 truncate max-w-[100px]">{selectedPlan.goal_intent}</span>
                                        </div>
                                    </div>

                                    {/* Star Rating Form */}
                                    <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                                            <span>Syllabus Review Rating</span>
                                            <span className="text-yellow-500 font-extrabold">{selectedPlan.rating} / 5.0</span>
                                        </h4>
                                        <div className="flex gap-2 items-center">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button
                                                    key={star}
                                                    onClick={() => handleRatePlan(star)}
                                                    disabled={submittingRating}
                                                    className="p-1 transition-transform hover:scale-115 active:scale-90"
                                                >
                                                    <Star
                                                        className={`w-6 h-6 ${
                                                            star <= (userRating || Math.round(selectedPlan.rating))
                                                                ? 'text-yellow-500 fill-yellow-500'
                                                                : 'text-gray-600 hover:text-yellow-500'
                                                        }`}
                                                    />
                                                </button>
                                            ))}
                                            {ratingSuccess && (
                                                <span className="text-[10px] font-bold text-emerald-400 ml-2 animate-pulse">Rating Submitted!</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Import Details description */}
                                    {importError && (
                                        <p className="text-[10px] text-red-400 font-bold text-center bg-red-500/5 py-2 border border-red-500/10 rounded-xl">
                                            {importError}
                                        </p>
                                    )}

                                    <div className="flex gap-3 mt-2">
                                        <button
                                            onClick={() => { haptics.light(); setSelectedPlan(null) }}
                                            className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] tracking-widest uppercase hover:bg-white/10 transition-all"
                                        >
                                            Dismiss
                                        </button>
                                        
                                        <button
                                            onClick={() => handleImportPlan(selectedPlan)}
                                            disabled={isPending}
                                            className="flex-1 py-4 rounded-2xl bg-electric-blue text-black hover:scale-[1.02] active:scale-95 transition-all font-black text-[10px] tracking-widest uppercase shadow-[0_0_20px_rgba(0,240,255,0.25)] flex items-center justify-center gap-1.5"
                                        >
                                            {isPending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : selectedPlan.plan_metadata?.token_cost ? (
                                                <>
                                                    Purchase & Import • <Coins className="w-3.5 h-3.5 inline text-black" /> {selectedPlan.plan_metadata.token_cost}
                                                </>
                                            ) : (
                                                'Clone Syllabus (Free)'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
