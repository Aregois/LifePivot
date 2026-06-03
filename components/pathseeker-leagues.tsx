'use client'

import { useState, useEffect } from 'react'
import { Trophy, ArrowUp, ArrowDown, Sparkles, Diamond, Flame, ShieldAlert } from 'lucide-react'
import { useEconomy } from './economy-provider'
import { haptics } from '@/utils/haptics'
import { AvatarIcon } from './avatar-icons'

interface Competitor {
    name: string
    xp: number
    avatarId: string
    frameId: string
    title: string
    isUser?: boolean
}

const LEAGUE_NAMES = ['Bronze', 'Silver', 'Chrono', 'Astral', 'Zenith']
const LEAGUE_COLORS = {
    'Bronze': 'from-amber-600 to-amber-800 text-amber-500',
    'Silver': 'from-slate-400 to-slate-600 text-slate-300',
    'Chrono': 'from-cyan-500 to-blue-600 text-cyan-400',
    'Astral': 'from-indigo-500 to-purple-600 text-indigo-400',
    'Zenith': 'from-yellow-400 to-amber-500 text-yellow-400'
}

const FIRST_NAMES = ['Astro', 'Quantum', 'Pixel', 'Void', 'Nebula', 'Chrono', 'Solar', 'Lunar', 'Stoic', 'Echo', 'Neon', 'Feynman']
const LAST_NAMES = ['Scholar', 'Seeker', 'Sage', 'Walker', 'Catalyst', 'Runner', 'Alchemist', 'Navigator', 'Nomad', 'Oracle']

export function PathseekerLeagues() {
    const { xp, level, avatarId } = useEconomy()
    const [mounted, setMounted] = useState(false)
    const [currentLeague, setCurrentLeague] = useState('Bronze')
    const [cohort, setCohort] = useState<Competitor[]>([])
    const [daysRemaining, setDaysRemaining] = useState(3)

    // Compute user's cumulative XP inside the league (e.g. baseline XP in league + current level/xp)
    const userCumulativeXP = (level - 1) * 100 + xp

    useEffect(() => {
        setMounted(true)
        loadLeagues()
    }, [])

    useEffect(() => {
        if (!mounted || cohort.length === 0) return
        
        // Update user's XP in the cohort dynamically as they gain XP
        setCohort(prev => {
            const updated = prev.map(c => c.isUser ? { ...c, xp: userCumulativeXP } : c)
            return updated.sort((a, b) => b.xp - a.xp)
        })
    }, [userCumulativeXP, mounted])

    const loadLeagues = () => {
        if (typeof window === 'undefined') return
        
        const storedLeague = localStorage.getItem('lifepivot_current_league') || 'Bronze'
        setCurrentLeague(storedLeague)

        const storedCohort = localStorage.getItem('lifepivot_league_cohort')
        const storedTime = localStorage.getItem('lifepivot_league_start_time')
        
        let initialCohort: Competitor[] = []
        let startTime = Date.now()

        if (storedCohort && storedTime) {
            try {
                initialCohort = JSON.parse(storedCohort)
                startTime = Number(storedTime)
            } catch (e) {
                console.error('Failed to parse league cohort', e)
            }
        }

        // Calculate days remaining (7-day league cycle)
        const elapsedDays = (Date.now() - startTime) / (1000 * 60 * 60 * 24)
        const remaining = Math.max(0, 7 - elapsedDays)
        setDaysRemaining(Math.ceil(remaining))

        // If cycle completes, trigger end-of-league resolutions
        if (elapsedDays >= 7) {
            resolveLeagueEnd(initialCohort, storedLeague)
            return
        }

        if (initialCohort.length === 0) {
            // Generate a fresh weekly cohort of 29 competitors
            const generated: Competitor[] = []
            
            // Opponent XP range based on user level
            const userBaseXP = userCumulativeXP
            
            for (let i = 0; i < 29; i++) {
                const name = `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]}${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`
                const randomAvatar = `avatar_owl` // Standard fallback avatar icon
                const frameList = ['frame_standard', 'frame_neon', 'frame_sunset', 'frame_cosmic']
                const titleList = ['Scholar', 'Alchemist', 'Navigator', 'Focus Legend']
                
                // Competitor XP is generated around the user's base XP to make it competitive
                const opponentXP = Math.max(0, Math.floor(userBaseXP + (Math.random() * 800 - 400)))

                generated.push({
                    name,
                    xp: opponentXP,
                    avatarId: randomAvatar,
                    frameId: frameList[Math.floor(Math.random() * frameList.length)],
                    title: titleList[Math.floor(Math.random() * titleList.length)]
                })
            }

            // Append user
            generated.push({
                name: 'You',
                xp: userCumulativeXP,
                avatarId: avatarId,
                frameId: 'frame_standard',
                title: 'Pathseeker',
                isUser: true
            })

            const sorted = generated.sort((a, b) => b.xp - a.xp)
            setCohort(sorted)
            localStorage.setItem('lifepivot_league_cohort', JSON.stringify(sorted))
            localStorage.setItem('lifepivot_league_start_time', String(Date.now()))
        } else {
            // Simulate progression of other competitors slowly on load
            const simulated = initialCohort.map(c => {
                if (c.isUser) return { ...c, xp: userCumulativeXP }
                // Add a small random increment of XP
                const timeDiffHours = (Date.now() - startTime) / (1000 * 60 * 60)
                const addedXp = Math.floor(Math.random() * 5 * timeDiffHours)
                return { ...c, xp: c.xp + addedXp }
            })
            const sorted = simulated.sort((a, b) => b.xp - a.xp)
            setCohort(sorted)
            localStorage.setItem('lifepivot_league_cohort', JSON.stringify(sorted))
        }
    }

    const resolveLeagueEnd = (currentCohort: Competitor[], leagueName: string) => {
        haptics.medium()
        const userIndex = currentCohort.findIndex(c => c.isUser)
        const rank = userIndex + 1

        let nextLeague = leagueName
        let promotionMsg = ''

        if (rank <= 5) {
            // Promoted!
            const leagueIdx = LEAGUE_NAMES.indexOf(leagueName)
            if (leagueIdx < LEAGUE_NAMES.length - 1) {
                nextLeague = LEAGUE_NAMES[leagueIdx + 1]
                promotionMsg = `Congratulations! You placed Rank ${rank} and were PROMOTED to the ${nextLeague} League! 🚀`
            } else {
                promotionMsg = `Incredible! You won the champion league Zenith! 🏆`
            }
        } else if (rank >= 25) {
            // Demoted
            const leagueIdx = LEAGUE_NAMES.indexOf(leagueName)
            if (leagueIdx > 0) {
                nextLeague = LEAGUE_NAMES[leagueIdx - 1]
                promotionMsg = `You placed Rank ${rank} and were demoted to the ${nextLeague} League. Keep focusing to get back up!`
            }
        } else {
            promotionMsg = `You placed Rank ${rank} and maintained your spot in the ${leagueName} League.`
        }

        alert(promotionMsg) // Fallback alert box

        localStorage.setItem('lifepivot_current_league', nextLeague)
        localStorage.removeItem('lifepivot_league_cohort')
        localStorage.removeItem('lifepivot_league_start_time')
        loadLeagues()
    }

    if (!mounted) return null

    const userRank = cohort.findIndex(c => c.isUser) + 1

    return (
        <div className="flex flex-col gap-6 animate-fade-in select-none">
            {/* League Header Card */}
            <div className={`bg-gradient-to-br ${LEAGUE_COLORS[currentLeague as keyof typeof LEAGUE_COLORS] || LEAGUE_COLORS['Bronze']} border border-white/10 p-6 rounded-[2.5rem] relative overflow-hidden shadow-2xl flex flex-col gap-3.5`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] pointer-events-none" />
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-10 w-10 bg-white/15 border border-white/20 rounded-2xl flex items-center justify-center">
                            <Trophy className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/70">Competitive Leagues</span>
                            <h3 className="text-xl font-black text-white leading-tight">{currentLeague} League</h3>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <span className="text-[9px] font-black text-white/50 uppercase tracking-widest block">Ends In</span>
                        <span className="text-white font-black text-lg block mt-0.5">{daysRemaining} days</span>
                    </div>
                </div>

                <div className="bg-black/20 border border-white/5 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold text-white/80">
                    <span>Your Placement: Rank {userRank} of 30</span>
                    <span className="flex items-center gap-1">
                        {userRank <= 5 ? (
                            <>
                                <ArrowUp className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-extrabold uppercase text-[10px]">Promotion Zone</span>
                            </>
                        ) : userRank >= 25 ? (
                            <>
                                <ArrowDown className="h-3.5 w-3.5 text-red-400" />
                                <span className="text-red-400 font-extrabold uppercase text-[10px]">Demotion Zone</span>
                            </>
                        ) : (
                            <span className="text-gray-400 uppercase text-[10px]">Safe Zone</span>
                        )}
                    </span>
                </div>
            </div>

            {/* Competitors List */}
            <div className="bg-[#141824] border border-white/5 p-4 rounded-[2.5rem] shadow-xl flex flex-col gap-3">
                <div className="flex items-center justify-between text-gray-500 text-[10px] font-black uppercase tracking-wider px-2 pb-2 border-b border-white/5">
                    <span>Rank / Pathseeker</span>
                    <span>Weekly XP</span>
                </div>

                <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1 no-scrollbar pb-1">
                    {cohort.map((competitor, index) => {
                        const rank = index + 1
                        const isUser = competitor.isUser
                        
                        // Promotion/Demotion Boundaries
                        const isPromoBoundary = rank === 5
                        const isDemoBoundary = rank === 24

                        return (
                            <div key={`${competitor.name}-${index}`} className="flex flex-col gap-2">
                                <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                                    isUser 
                                        ? 'bg-electric-blue/10 border-electric-blue/30 shadow-[0_0_12px_rgba(0,240,255,0.1)]' 
                                        : 'bg-[#0B0D17] border-white/5'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        {/* Rank Badge */}
                                        <div className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                                            rank === 1 
                                                ? 'bg-yellow-400 text-black shadow-md' 
                                                : rank === 2 
                                                    ? 'bg-slate-300 text-black' 
                                                    : rank === 3 
                                                        ? 'bg-amber-600 text-white' 
                                                        : 'text-gray-500'
                                        }`}>
                                            {rank}
                                        </div>

                                        {/* Avatar Mini Icon */}
                                        <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                                            <AvatarIcon id={isUser ? avatarId : competitor.avatarId} className="w-full h-full" />
                                        </div>

                                        {/* Competitor Details */}
                                        <div className="min-w-0">
                                            <p className={`text-xs font-extrabold truncate ${isUser ? 'text-electric-blue' : 'text-white'}`}>
                                                {isUser ? 'You' : competitor.name}
                                            </p>
                                            <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5 truncate">
                                                {competitor.title}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Score */}
                                    <div className="text-right shrink-0">
                                        <span className={`text-xs font-black font-mono ${isUser ? 'text-electric-blue' : 'text-gray-300'}`}>
                                            {competitor.xp} XP
                                        </span>
                                    </div>
                                </div>

                                {/* Glowing Zone Separators */}
                                {isPromoBoundary && (
                                    <div className="flex items-center gap-2 py-0.5 px-1.5 shrink-0 select-none">
                                        <div className="h-[1px] flex-1 bg-emerald-500/25" />
                                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Promotion Zone Limit</span>
                                        <div className="h-[1px] flex-1 bg-emerald-500/25" />
                                    </div>
                                )}

                                {isDemoBoundary && (
                                    <div className="flex items-center gap-2 py-0.5 px-1.5 shrink-0 select-none">
                                        <div className="h-[1px] flex-1 bg-red-500/25" />
                                        <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">Demotion Zone Limit</span>
                                        <div className="h-[1px] flex-1 bg-red-500/25" />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
