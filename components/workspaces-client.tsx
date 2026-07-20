'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Compass, Coins, Lock, Plus, ArrowRight, GraduationCap, CheckCircle, Loader2 } from 'lucide-react'
import { useEconomy } from './economy-provider'
import { useLanguage } from './language-provider'
import { haptics } from '@/utils/haptics'
import { motion, AnimatePresence } from 'framer-motion'

interface Workspace {
    id: string
    name: string
    creator_id: string
    is_premium: boolean
    token_cost: number
    created_at: string
    isJoined: boolean
    isCreator: boolean
}

interface WorkspacesClientProps {
    user: any
    initialProfile: any
}

export function WorkspacesClient({ user, initialProfile }: WorkspacesClientProps) {
    const router = useRouter()
    const { t } = useLanguage()
    const { tokens, setTokens } = useEconomy()
    const [activeTab, setActiveTab] = useState<'joined' | 'discover'>('joined')
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState(initialProfile)
    const [isPending, startTransition] = useTransition()

    // Tutor Onboarding Form State
    const [linkedinUrl, setLinkedinUrl] = useState('')
    const [onboardingSuccess, setOnboardingSuccess] = useState(false)
    const [onboardingError, setOnboardingError] = useState<string | null>(null)

    // Create Cohort Form State
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newCohortName, setNewCohortName] = useState('')
    const [isPremium, setIsPremium] = useState(false)
    const [tokenCost, setTokenCost] = useState(10)
    const [createError, setCreateError] = useState<string | null>(null)

    const fetchWorkspaces = async () => {
        try {
            const res = await fetch('/api/workspaces')
            const data = await res.json()
            if (data.success) {
                setWorkspaces(data.workspaces || [])
            }
        } catch (err) {
            console.error('Error fetching workspaces:', err)
        } finally {
            setLoading(false)
        }
    };

    useEffect(() => {
        fetchWorkspaces()
    }, [])

    const handleJoinCohort = async (ws: Workspace) => {
        if (ws.is_premium && tokens < ws.token_cost) {
            haptics.error()
            alert('Insufficient tokens to join this premium cohort!')
            return
        }

        haptics.medium()
        startTransition(async () => {
            try {
                const res = await fetch('/api/workspaces/join', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workspaceId: ws.id })
                })
                const data = await res.json()
                if (data.success) {
                    haptics.medium()
                    if (ws.is_premium) {
                        setTokens(prev => Math.max(0, prev - ws.token_cost))
                    }
                    // Refresh workspaces
                    await fetchWorkspaces()
                } else {
                    haptics.error()
                    alert(data.error || 'Failed to join cohort')
                }
            } catch (err) {
                console.error(err)
                alert('An error occurred while joining the cohort')
            }
        })
    }

    const handleBecomeTutor = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!linkedinUrl.trim()) {
            setOnboardingError('LinkedIn URL is required')
            return
        }

        haptics.medium()
        setOnboardingError(null)
        startTransition(async () => {
            try {
                const res = await fetch('/api/profile/role', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: 'tutor', linkedinUrl })
                })
                const data = await res.json()
                if (data.success) {
                    haptics.medium()
                    setProfile(data.profile)
                    setOnboardingSuccess(true)
                } else {
                    haptics.error()
                    setOnboardingError(data.error || 'Failed to update status')
                }
            } catch (err) {
                console.error(err)
                setOnboardingError('Failed to process request')
            }
        })
    }

    const handleCreateCohort = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCohortName.trim()) {
            setCreateError('Cohort name is required')
            return
        }

        haptics.medium()
        setCreateError(null)
        startTransition(async () => {
            try {
                const res = await fetch('/api/workspaces', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: newCohortName,
                        isPremium,
                        tokenCost: isPremium ? tokenCost : 0
                    })
                })
                const data = await res.json()
                if (data.success) {
                    haptics.medium()
                    setShowCreateModal(false)
                    setNewCohortName('')
                    setIsPremium(false)
                    setTokenCost(10)
                    await fetchWorkspaces()
                } else {
                    haptics.error()
                    setCreateError(data.error || 'Failed to create cohort')
                }
            } catch (err) {
                console.error(err)
                setCreateError('Failed to process creation')
            }
        })
    }

    const joinedCohorts = workspaces.filter(w => w.isJoined)
    const discoverableCohorts = workspaces.filter(w => !w.isJoined)

    return (
        <div className="flex flex-col gap-6 py-6 px-4 md:px-8 w-full max-w-7xl mx-auto pt-4 pb-32">
            
            {/* Header Title */}
            <div className="mb-4">
                <h1 className="text-3xl font-black text-white leading-tight">Study Cohorts</h1>
                <p className="text-gray-400 text-xs mt-1">Study together, pool metrics, and receive tutor-guided paths.</p>
            </div>

            {/* Split Screen Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Left Columns (2/3): Dashboard Workspace & Lists */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Tab Navigation Segment Control */}
                    <div className="bg-[#141824] p-1.5 rounded-2xl border border-white/5 flex gap-1 shadow-md w-full sm:w-fit">
                        <button
                            onClick={() => { haptics.light(); setActiveTab('joined') }}
                            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider ${
                                activeTab === 'joined'
                                    ? 'bg-electric-blue/15 text-electric-blue border border-electric-blue/20'
                                    : 'text-gray-500 hover:text-gray-300 border border-transparent'
                            }`}
                        >
                            <Users className="w-4 h-4" />
                            Joined Cohorts
                        </button>
                        <button
                            onClick={() => { haptics.light(); setActiveTab('discover') }}
                            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider ${
                                activeTab === 'discover'
                                    ? 'bg-electric-blue/15 text-electric-blue border border-electric-blue/20'
                                    : 'text-gray-500 hover:text-gray-300 border border-transparent'
                            }`}
                        >
                            <Compass className="w-4 h-4" />
                            Discover Cohorts
                        </button>
                    </div>

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-electric-blue animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {activeTab === 'joined' ? (
                                joinedCohorts.length === 0 ? (
                                    <div className="col-span-full py-16 text-center bg-[#141824]/40 border border-white/5 rounded-[2.5rem] p-6">
                                        <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                                        <h3 className="text-white font-extrabold text-sm uppercase tracking-wider">No Enrolled Cohorts</h3>
                                        <p className="text-gray-400 text-xs mt-1.5 leading-relaxed max-w-sm mx-auto">
                                            Join active cohorts in the discover tab, or ask your tutor for a join invite.
                                        </p>
                                    </div>
                                ) : (
                                    joinedCohorts.map(ws => (
                                        <div
                                            key={ws.id}
                                            onClick={() => { haptics.light(); router.push(`/workspaces/${ws.id}`) }}
                                            className="bg-[#141824] border border-white/5 hover:border-white/10 p-6 rounded-[2.2rem] flex flex-col justify-between h-44 cursor-pointer hover:scale-[1.01] transition-all group shadow-md"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/30 flex items-center justify-center border border-indigo-500/20 text-indigo-400 font-black uppercase shadow-inner">
                                                        {ws.name.slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-white font-black text-sm tracking-tight group-hover:text-electric-blue transition-colors">{ws.name}</h3>
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Active Member</p>
                                                    </div>
                                                </div>
                                                {ws.is_premium && (
                                                    <span className="text-[9px] font-black text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full select-none uppercase">
                                                        Premium
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                                                    {ws.isCreator ? 'Your Cohort' : 'Student Hub'}
                                                </span>
                                                <div className="flex items-center gap-1 text-electric-blue font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                                    Enter Portal <ArrowRight className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )
                            ) : (
                                discoverableCohorts.length === 0 ? (
                                    <div className="col-span-full py-16 text-center bg-[#141824]/40 border border-white/5 rounded-[2.5rem] p-6">
                                        <Compass className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                                        <h3 className="text-white font-extrabold text-sm uppercase tracking-wider">No Discoverable Cohorts</h3>
                                        <p className="text-gray-400 text-xs mt-1.5 leading-relaxed max-w-sm mx-auto">
                                            All available cohorts have been joined. Check back later for new offerings.
                                        </p>
                                    </div>
                                ) : (
                                    discoverableCohorts.map(ws => (
                                        <div
                                            key={ws.id}
                                            className="bg-[#141824] border border-white/5 p-6 rounded-[2.2rem] flex flex-col justify-between h-44 transition-all shadow-md hover:border-white/10"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-600/30 flex items-center justify-center border border-teal-500/20 text-teal-400 font-black uppercase shadow-inner">
                                                        {ws.name.slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-white font-black text-sm tracking-tight">{ws.name}</h3>
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Open Syllabus</p>
                                                    </div>
                                                </div>
                                                {ws.is_premium && (
                                                    <div className="flex items-center gap-1 text-[9px] font-black text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 rounded-full select-none uppercase">
                                                        <Coins className="w-3.5 h-3.5" />
                                                        {ws.token_cost}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                                                    Entry Gate
                                                </span>
                                                <button
                                                    onClick={() => handleJoinCohort(ws)}
                                                    disabled={isPending}
                                                    className="px-4 py-2 rounded-xl bg-electric-blue hover:scale-105 active:scale-95 text-black font-black text-[10px] tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(var(--accent-rgb),0.25)] flex items-center gap-1"
                                                >
                                                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Join Cohort'}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column (1/3): Tutor Console / Verification */}
                <div className="lg:col-span-1 space-y-6">
                    {profile.role === 'tutor' ? (
                        /* Tutor Console Card */
                        <div className="bg-gradient-to-tr from-[#141829] to-[#1F2338] border border-white/5 p-6 rounded-[2.5rem] shadow-xl flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center rounded-2xl text-electric-blue">
                                    <GraduationCap className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-extrabold text-sm uppercase tracking-wider">Tutor Console</h3>
                                    <p className="text-gray-400 text-[10px] font-medium">Verified Cohort Administrator</p>
                                </div>
                            </div>
                            
                            <p className="text-xs text-gray-400 leading-relaxed font-medium">
                                Build study classrooms, set entry token limits, and inject custom study tasks directly into student progress boards.
                            </p>

                            <button
                                onClick={() => { haptics.medium(); setShowCreateModal(true) }}
                                className="w-full py-3.5 rounded-2xl bg-electric-blue text-black hover:scale-[1.02] active:scale-95 transition-all font-black text-[10px] tracking-widest uppercase shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)] flex items-center justify-center gap-1.5"
                            >
                                <Plus className="w-4 h-4 stroke-[3]" />
                                Create Cohort
                            </button>
                        </div>
                    ) : (
                        /* Tutor Onboarding Form */
                        <div className="bg-gradient-to-tr from-[#121421] to-[#1E1736] border border-white/5 p-6 rounded-[2.5rem] shadow-xl flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-neon-violet/10 border border-neon-violet/20 flex items-center justify-center rounded-2xl text-neon-violet">
                                    <GraduationCap className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-extrabold text-sm uppercase tracking-wider">Teach Cohorts</h3>
                                    <p className="text-gray-400 text-[10px] font-medium">Become a Cohort Tutor</p>
                                </div>
                            </div>

                            {onboardingSuccess ? (
                                <div className="py-4 text-center space-y-2">
                                    <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                                    <h4 className="text-white font-black text-sm uppercase">Tutor Status Active</h4>
                                    <p className="text-gray-400 text-xs">
                                        Congratulations! Your profile has been updated to Tutor status. Refreshing console.
                                    </p>
                                    <button
                                        onClick={() => { router.refresh(); window.location.reload() }}
                                        className="mt-3 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all"
                                    >
                                        Access Tutor Panel
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleBecomeTutor} className="flex flex-col gap-4">
                                    <p className="text-xs text-gray-400 leading-relaxed font-medium">
                                        Submit your professional LinkedIn profile to unlock human tutoring controls and syllabus creation capabilities.
                                    </p>
                                    
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">LinkedIn Profile URL</label>
                                        <input
                                            type="url"
                                            required
                                            value={linkedinUrl}
                                            onChange={(e) => setLinkedinUrl(e.target.value)}
                                            placeholder="https://linkedin.com/in/username"
                                            className="w-full bg-[#0B0D17]/80 border border-white/[0.06] rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-electric-blue transition-colors font-medium"
                                        />
                                    </div>

                                    {onboardingError && (
                                        <p className="text-[10px] text-red-400 font-bold text-center bg-red-500/5 py-2 border border-red-500/10 rounded-xl">
                                            {onboardingError}
                                        </p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isPending}
                                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-neon-violet to-[#7C3AED] text-white hover:scale-[1.02] active:scale-95 transition-all font-black text-[10px] tracking-widest uppercase shadow-[0_0_20px_rgba(var(--violet-rgb),0.25)] flex items-center justify-center gap-1.5"
                                    >
                                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Request Verification'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Cohort Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-[#0B0D17]/80 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-md rounded-[2.5rem] bg-[#141824] border border-white/10 p-8 shadow-2xl flex flex-col gap-6"
                        >
                            <div className="flex flex-col gap-1.5">
                                <h3 className="text-lg font-black text-white uppercase tracking-wider italic">Establish Study Cohort</h3>
                                <p className="text-xs text-gray-400 leading-relaxed font-medium">
                                    Publish a shared workspace where students can align calendar milestones.
                                </p>
                            </div>

                            <form onSubmit={handleCreateCohort} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Cohort Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newCohortName}
                                        onChange={(e) => setNewCohortName(e.target.value)}
                                        placeholder="e.g. CS101 Algorithmic Thinking"
                                        className="w-full bg-[#0B0D17]/80 border border-white/[0.06] rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-electric-blue transition-colors font-medium"
                                    />
                                </div>

                                <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-4 rounded-2xl mt-1.5">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-black text-white uppercase tracking-wider">Premium Access</span>
                                        <span className="text-[9px] text-gray-500">Require tokens to join the cohort</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isPremium}
                                        onChange={(e) => setIsPremium(e.target.checked)}
                                        className="h-4.5 w-4.5 rounded-lg border-white/15 bg-black accent-electric-blue text-electric-blue cursor-pointer focus:ring-0"
                                    />
                                </div>

                                {isPremium && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Required Tokens Entry Fee</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                max="1000"
                                                value={tokenCost}
                                                onChange={(e) => setTokenCost(Number(e.target.value))}
                                                className="w-full bg-[#0B0D17]/80 border border-white/[0.06] rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-electric-blue transition-colors font-medium"
                                            />
                                            <Coins className="w-4 h-4 text-yellow-500 absolute left-3.5 top-3.5" />
                                        </div>
                                    </div>
                                )}

                                {createError && (
                                    <p className="text-[10px] text-red-400 font-bold text-center bg-red-500/5 py-2 border border-red-500/10 rounded-xl">
                                        {createError}
                                    </p>
                                )}

                                <div className="flex gap-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => { haptics.light(); setShowCreateModal(false) }}
                                        className="flex-1 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] tracking-widest uppercase hover:bg-white/10 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isPending}
                                        className="flex-1 py-3.5 rounded-2xl bg-electric-blue text-black hover:scale-[1.02] active:scale-95 transition-all font-black text-[10px] tracking-widest uppercase shadow-[0_0_20px_rgba(var(--accent-rgb),0.25)] flex items-center justify-center gap-1"
                                    >
                                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Establish'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
