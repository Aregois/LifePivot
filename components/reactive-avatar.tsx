'use client'

import { useState, useEffect, useTransition } from 'react'
import { useEconomy } from './economy-provider'
import { createClient } from '@/utils/supabase/client'
import { AvatarIcon } from './avatar-icons'
import { Flame, ShieldAlert, Sparkles, Diamond, AlertCircle, HelpCircle, X, Check, Loader2 } from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { awardStreakShieldServer, reviewFlashcard } from '@/app/actions'
import { motion, AnimatePresence } from 'framer-motion'

type CompanionMood = 'focused' | 'nervous' | 'fallen'

interface Flashcard {
    id: string
    question: string
    answer: string
}

export function ReactiveAvatar() {
    const { avatarId, lives, setGems } = useEconomy()
    const [mood, setMood] = useState<CompanionMood>('focused')
    const [overdueCount, setOverdueCount] = useState(0)
    const [mounted, setMounted] = useState(false)
    const [showChallenge, setShowChallenge] = useState(false)
    const [challengeCard, setChallengeCard] = useState<Flashcard | null>(null)
    const [isFlipped, setIsFlipped] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [challengeError, setChallengeError] = useState<string | null>(null)
    const [challengeFinished, setChallengeFinished] = useState(false)
    const [challengeResult, setChallengeResult] = useState<'won' | 'lost' | null>(null)
    const [rewardMessage, setRewardMessage] = useState<string>('')

    // Acceleration/Tilt simulation on hover
    const [rotateX, setRotateX] = useState(0)
    const [rotateY, setRotateY] = useState(0)

    useEffect(() => {
        setMounted(true)
        checkMood()
    }, [lives])

    const checkMood = async () => {
        const supabase = createClient()
        const todayStr = new Date().toISOString().split('T')[0]

        // Fetch overdue tasks
        const { data: overdue } = await supabase
            .from('tasks')
            .select('id')
            .eq('status', 'pending')
            .neq('task_type', 'void')
            .lt('due_date', todayStr)

        const count = overdue?.length ?? 0
        setOverdueCount(count)

        if (lives === 0) {
            setMood('fallen')
        } else if (count > 0) {
            setMood('nervous')
        } else {
            setMood('focused')
        }
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const card = e.currentTarget
        const box = card.getBoundingClientRect()
        const x = e.clientX - box.left - box.width / 2
        const y = e.clientY - box.top - box.height / 2
        setRotateX(-y / 4)
        setRotateY(x / 4)
    }

    const handleMouseLeave = () => {
        setRotateX(0)
        setRotateY(0)
    }

    const startQuickSaveChallenge = async () => {
        haptics.medium()
        setChallengeError(null)
        setChallengeFinished(false)
        setChallengeResult(null)
        setIsFlipped(false)

        const supabase = createClient()
        // Get a random flashcard from user library
        const { data: cards, error } = await supabase
            .from('flashcards')
            .select('id, question, answer')
            .limit(1)

        if (error || !cards || cards.length === 0) {
            setChallengeError('Create some flashcards first to enable Quick Save challenges!')
            setShowChallenge(true)
            return
        }

        setChallengeCard(cards[0] as Flashcard)
        setShowChallenge(true)
    }

    const handleSwipe = (rating: 'easy' | 'hard') => {
        if (!challengeCard) return
        haptics.medium()
        setIsFlipped(false)

        startTransition(async () => {
            // Record flashcard review
            await reviewFlashcard(challengeCard.id, rating)

            if (rating === 'easy') {
                // Award a Streak Shield!
                const res = await awardStreakShieldServer()
                if (res.success) {
                    setChallengeResult('won')
                    setRewardMessage('1 Streak Shield Equipped! 🛡️')
                } else if (res.error === 'SHIELDS_FULL') {
                    // Award 5 gems fallback if shields are full
                    setGems(prev => prev + 5)
                    setChallengeResult('won')
                    setRewardMessage('Shields full! Awarded 5 Gems instead. 💎')
                } else {
                    setChallengeError(res.error ?? 'Failed to award shield')
                }
            } else {
                setChallengeResult('lost')
            }
            setChallengeFinished(true)
        })
    }

    if (!mounted) return null

    // Determine visual tokens matching the mood
    let haloColor = 'border-electric-blue/40 shadow-[0_0_20px_rgba(0,240,255,0.2)]'
    let moodBadge = 'Focused'
    let moodBadgeColor = 'text-electric-blue bg-electric-blue/10 border-electric-blue/20'
    let tooltip = 'Click companion to review status.'

    if (mood === 'nervous') {
        haloColor = 'border-orange-500/50 shadow-[0_0_25px_rgba(249,115,22,0.4)] animate-pulse'
        moodBadge = 'Nervous'
        moodBadgeColor = 'text-orange-400 bg-orange-500/10 border-orange-500/20'
        tooltip = 'PENDING OVERDUE TASKS! Click to start Quick Save Challenge.'
    } else if (mood === 'fallen') {
        haloColor = 'border-rose-500/50 shadow-[0_0_25px_rgba(239,68,68,0.4)]'
        moodBadge = 'Exhausted'
        moodBadgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20'
        tooltip = '0 Lives remaining. Complete tasks to restore heart balance.'
    }

    return (
        <div className="flex flex-col items-center gap-3">
            {/* Parallax Interactive Widget */}
            <motion.div
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={() => {
                    if (mood === 'nervous') {
                        startQuickSaveChallenge()
                    } else {
                        haptics.light()
                    }
                }}
                style={{
                    transformStyle: 'preserve-3d',
                    rotateX: rotateX,
                    rotateY: rotateY,
                }}
                className={`relative w-20 h-20 rounded-full border-2 bg-[#0B0D17] flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all duration-150 ${haloColor}`}
            >
                <div className="w-[72px] h-[72px] rounded-full overflow-hidden z-10">
                    <AvatarIcon id={avatarId} />
                </div>

                {/* Sparkling dots on Zen mood */}
                {mood === 'focused' && (
                    <div className="absolute inset-0 pointer-events-none z-0">
                        <Sparkles className="h-4 w-4 text-electric-blue absolute -top-1 -right-1 animate-pulse" />
                    </div>
                )}

                {/* Overdue Alert icon overlay */}
                {mood === 'nervous' && (
                    <div className="absolute -top-1 -right-1 bg-orange-500 border border-black h-5 w-5 rounded-full flex items-center justify-center z-25 shadow-[0_0_10px_rgba(249,115,22,0.6)]">
                        <span className="text-[10px] font-black text-black">{overdueCount}</span>
                    </div>
                )}
            </motion.div>

            {/* Mood Badge indicator */}
            <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border select-none ${moodBadgeColor}`}>
                {moodBadge}
            </span>

            {/* Quick Save Challenge Modal Overlay */}
            <AnimatePresence>
                {showChallenge && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-gradient-to-br from-[#121626] to-[#080a12] border border-white/10 rounded-[2.5rem] max-w-sm w-full p-6 shadow-2xl relative overflow-hidden flex flex-col gap-5 text-center"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-[30px] pointer-events-none" />
                            
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="h-5 w-5 text-orange-400" />
                                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Quick Save Challenge</h3>
                                </div>
                                <button
                                    onClick={() => { haptics.light(); setShowChallenge(false) }}
                                    className="h-7 w-7 rounded-full bg-white/5 flex items-center justify-center text-gray-400"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Challenge content */}
                            {challengeError ? (
                                <div className="py-6 space-y-4">
                                    <AlertCircle className="h-10 w-10 text-orange-400 mx-auto" />
                                    <p className="text-gray-300 text-xs font-medium leading-relaxed">
                                        {challengeError}
                                    </p>
                                    <button
                                        onClick={() => setShowChallenge(false)}
                                        className="px-6 py-2.5 bg-white text-black text-xs font-black uppercase rounded-xl"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            ) : challengeFinished ? (
                                <div className="py-4 flex flex-col items-center gap-4">
                                    {challengeResult === 'won' ? (
                                        <>
                                            <div className="h-14 w-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-bounce">
                                                <Check className="h-7 w-7" />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-extrabold text-sm">Challenge Cleared!</h4>
                                                <p className="text-emerald-400 text-xs font-black mt-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
                                                    {rewardMessage}
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="h-14 w-14 rounded-full bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center text-red-400">
                                                <X className="h-7 w-7" />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-extrabold text-sm">Challenge Failed</h4>
                                                <p className="text-gray-400 text-xs mt-1">
                                                    You missed the answer. Keep practicing flashcards to prepare for the next rescue check!
                                                </p>
                                            </div>
                                        </>
                                    )}
                                    <button
                                        onClick={() => setShowChallenge(false)}
                                        className="w-full mt-2 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white hover:bg-white/10"
                                    >
                                        Close
                                    </button>
                                </div>
                            ) : (
                                /* Active Card swipe challenge view */
                                <div className="flex flex-col gap-4">
                                    <p className="text-gray-400 text-[10px] uppercase font-black tracking-widest leading-relaxed">
                                        Answer this card correctly to rescue your streak shields!
                                    </p>

                                    {/* 3D Flippable Card */}
                                    <div 
                                        onClick={() => { haptics.light(); setIsFlipped(f => !f) }}
                                        className={`w-full h-44 rounded-3xl border border-white/5 p-5 flex flex-col justify-between items-center text-center cursor-pointer select-none relative transition-all duration-300 ${
                                            isFlipped ? 'bg-[#181c30] border-orange-500/20' : 'bg-[#121626]'
                                        }`}
                                    >
                                        <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest">
                                            Active Recall Card
                                        </div>
                                        <div className="flex-1 flex items-center justify-center text-sm font-extrabold text-white px-2">
                                            {!isFlipped ? challengeCard?.question : challengeCard?.answer}
                                        </div>
                                        <div className="text-[8px] text-electric-blue font-black uppercase tracking-widest animate-pulse">
                                            {isFlipped ? 'Tap to see Question' : 'Tap to Reveal Answer'}
                                        </div>
                                    </div>

                                    {/* Confirm buttons */}
                                    <div className="flex items-center justify-center gap-4 w-full mt-2">
                                        <button
                                            onClick={() => handleSwipe('hard')}
                                            disabled={isPending}
                                            className="flex-1 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 font-black text-xs uppercase"
                                        >
                                            Struggled
                                        </button>
                                        <button
                                            onClick={() => handleSwipe('easy')}
                                            disabled={isPending}
                                            className="flex-1 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 font-black text-xs uppercase shadow-md animate-pulse"
                                        >
                                            Got it!
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
