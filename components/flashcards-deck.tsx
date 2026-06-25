'use client'

import { useState, useEffect, useTransition } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { BookOpen, Sparkles, AlertCircle, RefreshCw, Check, X, Coins, Star } from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { fetchFlashcards, reviewFlashcard } from '@/app/actions'
import { useEconomy } from './economy-provider'
import { useLanguage } from './language-provider'

interface Flashcard {
    id: string
    question: string
    answer: string
    leitner_box: number
    next_review: string
    created_at: string
}

export function FlashcardsDeck() {
    const { setTokens, setXp, setLevel } = useEconomy()
    const { locale, t } = useLanguage()
    const [flashcards, setFlashcards] = useState<Flashcard[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([])
    const [currentIdx, setCurrentIdx] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)
    const [reviewFinished, setReviewFinished] = useState(false)
    
    // Stats for current session
    const [sessionXP, setSessionXP] = useState(0)
    const [sessionTokens, setSessionTokens] = useState(0)

    useEffect(() => {
        loadCards()
    }, [])

    const loadCards = async () => {
        setLoading(true)
        setError(null)
        const result = await fetchFlashcards()
        setLoading(false)
        if (result && 'error' in result && result.error) {
            setError(result.error)
            return
        }
        if (result && 'flashcards' in result && result.flashcards) {
            setFlashcards(result.flashcards)
        }
    }

    const startReview = (mode: 'due' | 'all') => {
        haptics.medium()
        const now = new Date()
        const queue = flashcards.filter(c => {
            if (mode === 'all') return true
            return new Date(c.next_review) <= now
        })
        setReviewQueue(queue)
        setCurrentIdx(0)
        setIsFlipped(false)
        setReviewFinished(false)
        setSessionXP(0)
        setSessionTokens(0)
    }

    const handleSwipe = (rating: 'easy' | 'hard') => {
        if (currentIdx >= reviewQueue.length) return
        const card = reviewQueue[currentIdx]

        haptics.medium()
        setIsFlipped(false)

        startTransition(async () => {
            const res = await reviewFlashcard(card.id, rating)
            if (res && 'success' in res && res.success) {
                setSessionXP(prev => prev + (res.xpAwarded ?? 10))
                setSessionTokens(prev => prev + (res.tokensAwarded ?? 1))
                setTokens(prev => prev + (res.tokensAwarded ?? 1))
                
                // Update local list state
                setFlashcards(prev => prev.map(c => c.id === card.id ? { ...c, leitner_box: res.nextBox!, next_review: res.nextReview! } : c))
                
                if (res.leveledUp) {
                    setLevel(res.newLevel!)
                }
            }
            
            // Advance index after dynamic animation Delay
            setTimeout(() => {
                if (currentIdx + 1 >= reviewQueue.length) {
                    setReviewFinished(true)
                } else {
                    setCurrentIdx(prev => prev + 1)
                }
            }, 300)
        })
    }

    // Drag Motion Values for Native Plus feel
    const x = useMotionValue(0)
    const rotate = useTransform(x, [-150, 150], [-15, 15])
    const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5])
    const cardColorGlow = useTransform(x, [-100, 0, 100], [
        'rgba(239,68,68,0.15)', // red glow for hard
        'rgba(255,255,255,0.05)',
        'rgba(16,185,129,0.15)' // green glow for easy
    ])

    const handleDragEnd = (event: any, info: any) => {
        const threshold = 100
        if (info.offset.x < -threshold) {
            handleSwipe('hard')
        } else if (info.offset.x > threshold) {
            handleSwipe('easy')
        }
    }

    const dueCount = flashcards.filter(c => new Date(c.next_review) <= new Date()).length

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <RefreshCw className="h-8 w-8 text-electric-blue animate-spin shadow-[0_0_15px_rgba(0,240,255,0.2)] mb-3" />
                <p className="text-gray-500 text-xs">{t('flashcards.accessing')}</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                <p className="text-sm font-bold text-white">{t('flashcards.access_failed')}</p>
                <p className="text-xs text-gray-400 mt-1">{error}</p>
                <button onClick={loadCards} className="mt-4 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white">
                    {t('flashcards.try_again')}
                </button>
            </div>
        )
    }

    // REVIEW SESSION RUNNING
    if (reviewQueue.length > 0 && !reviewFinished) {
        const currentCard = reviewQueue[currentIdx]
        const progress = Math.round((currentIdx / reviewQueue.length) * 100)

        return (
            <div className="flex flex-col gap-6 items-center w-full py-2 animate-fade-in select-none">
                {/* Session Header / Progress bar */}
                <div className="w-full flex items-center justify-between px-2">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        {t('flashcards.review_progress').replace('{current}', (currentIdx + 1).toString()).replace('{total}', reviewQueue.length.toString())}
                    </span>
                    <button 
                        onClick={() => { haptics.light(); setReviewQueue([]) }} 
                        className="text-[10px] text-gray-500 hover:text-gray-300 font-bold uppercase tracking-wider"
                    >
                        {t('flashcards.exit')}
                    </button>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-electric-blue shadow-[0_0_8px_rgba(0,240,255,0.5)] transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* 3D Flippable Card Stack Container */}
                <div className="relative w-full h-[320px] flex items-center justify-center my-4 perspective-1000">
                    <motion.div
                        style={{ x, rotate, opacity, backgroundColor: cardColorGlow }}
                        drag={true}
                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                        dragElastic={0.6}
                        onDragEnd={handleDragEnd}
                        onClick={() => { haptics.light(); setIsFlipped(f => !f) }}
                        className={`w-full max-w-[320px] h-full rounded-[2.5rem] border border-white/10 p-6 flex flex-col justify-between items-center text-center cursor-grab active:cursor-grabbing relative transition-colors duration-300 shadow-2xl overflow-hidden preserve-3d ${
                            isFlipped ? 'bg-[#181c30]' : 'bg-[#121626]'
                        }`}
                    >
                        {/* Background Glow Ring */}
                        <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.08),transparent_70%)]" />

                        {/* Top Indicator */}
                        <div className="flex items-center gap-1.5 text-[9px] font-black tracking-widest text-gray-500 uppercase">
                            <BookOpen className="h-3 w-3 text-electric-blue" />
                            <span>{t('flashcards.box_num').replace('{box}', currentCard.leitner_box.toString())}</span>
                        </div>

                        {/* Question / Answer (flip logic) */}
                        <div className="flex-1 flex flex-col justify-center px-4">
                            <AnimatePresence mode="wait">
                                {!isFlipped ? (
                                    <motion.div
                                        key="question"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="text-base font-extrabold text-white leading-relaxed"
                                    >
                                        {currentCard.question}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="answer"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="text-sm font-semibold text-gray-300 leading-relaxed"
                                    >
                                        {currentCard.answer}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Bottom action label */}
                        <div className="text-[9px] text-electric-blue font-black uppercase tracking-[0.2em] animate-pulse pointer-events-none">
                            {isFlipped ? t('flashcards.tap_question') : t('flashcards.tap_reveal')}
                        </div>
                    </motion.div>
                </div>

                {/* Left/Right Action Buttons */}
                <div className="flex items-center justify-center gap-6 w-full mt-2">
                    <button
                        onClick={() => handleSwipe('hard')}
                        disabled={isPending}
                        className="h-16 w-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/20 active:scale-90 transition-all shadow-lg"
                    >
                        <X className="h-7 w-7" />
                    </button>
                    <button
                        onClick={() => handleSwipe('easy')}
                        disabled={isPending}
                        className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 active:scale-90 transition-all shadow-lg"
                    >
                        <Check className="h-7 w-7" />
                    </button>
                </div>

                {/* Instructions */}
                <div className="text-center max-w-[200px] mt-4">
                    <p className="text-[10px] text-gray-500 leading-relaxed uppercase tracking-wider">
                        {t('flashcards.swipe_prefix')}<span className="text-red-500 font-bold">{t('flashcards.hard')}</span>{t('flashcards.swipe_mid')}<span className="text-emerald-400 font-bold">{t('flashcards.easy')}</span>.
                    </p>
                </div>
            </div>
        )
    }

    // REVIEW SESSION COMPLETE
    if (reviewFinished) {
        return (
            <div className="bg-gradient-to-br from-[#1A1F36] to-[#0B0D17] border border-white/5 p-8 rounded-[2.5rem] text-center shadow-2xl relative overflow-hidden flex flex-col items-center gap-6 animate-fade-in select-none">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none w-32 h-32">
                    <Sparkles className="w-full h-full text-electric-blue" />
                </div>
                
                <div className="h-20 w-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center animate-bounce">
                    <Star className="h-10 w-10 text-emerald-400 fill-emerald-400/20" />
                </div>

                <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-wider">{t('flashcards.complete_title')}</h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">{t('flashcards.complete_desc')}</p>
                </div>

                {/* Rewards Panel */}
                <div className="flex gap-4 w-full justify-center">
                    <div className="bg-[#141824] border border-white/5 px-4 py-3 rounded-2xl flex flex-col items-center min-w-[90px]">
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{t('flashcards.xp_gained')}</span>
                        <span className="text-sm font-extrabold text-white mt-1">+{sessionXP} XP</span>
                    </div>
                    <div className="bg-[#141824] border border-white/5 px-4 py-3 rounded-2xl flex flex-col items-center min-w-[90px]">
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Tokens</span>
                        <span className="text-sm font-extrabold text-electric-blue mt-1 flex items-center gap-0.5">
                            <Coins className="h-3 w-3 fill-electric-blue/20" />
                            +{sessionTokens}
                        </span>
                    </div>
                </div>

                <button
                    onClick={() => { haptics.medium(); loadCards(); setReviewQueue([]) }}
                    className="w-full py-4 rounded-2xl bg-electric-blue text-black font-black uppercase tracking-widest text-xs hover:scale-103 active:scale-97 shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-transform"
                >
                    {t('flashcards.return_btn')}
                </button>
            </div>
        )
    }

    // FLASHCARD LIBRARY VIEW
    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            {/* Summary card */}
            <div className="bg-[#141824] border border-white/5 p-6 rounded-[2.5rem] flex items-center justify-between shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-electric-blue/5 rounded-full blur-[40px] pointer-events-none" />
                <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('flashcards.status_title')}</h3>
                    <p className="text-2xl font-black text-white mt-1 tabular-nums">
                        {t('flashcards.due_count').replace('{count}', dueCount.toString())}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">{t('flashcards.library_size').replace('{count}', flashcards.length.toString())}</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-electric-blue" />
                </div>
            </div>

            {/* Launch Actions */}
            <div className="flex flex-col gap-3">
                <button
                    onClick={() => startReview('due')}
                    disabled={dueCount === 0}
                    className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-200 ${
                        dueCount > 0
                            ? 'bg-electric-blue text-black hover:scale-103 active:scale-97 shadow-[0_0_20px_rgba(0,240,255,0.25)]'
                            : 'bg-white/5 border border-white/5 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    {t('flashcards.review_due_btn').replace('{count}', dueCount.toString())}
                </button>
                
                <button
                    onClick={() => startReview('all')}
                    disabled={flashcards.length === 0}
                    className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-200 ${
                        flashcards.length > 0
                            ? 'bg-[#1C2033]/60 border border-white/10 text-white hover:bg-[#1C2033] active:scale-97'
                            : 'bg-white/5 border border-white/5 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    {t('flashcards.review_all_btn').replace('{count}', flashcards.length.toString())}
                </button>
            </div>

            {/* List / Inventory representation */}
            <div className="bg-[#141824] border border-white/5 p-5 lg:p-8 rounded-[2.5rem] shadow-lg">
                <h4 className="text-xs lg:text-sm font-black uppercase tracking-wider text-gray-400 mb-4 lg:mb-6">{t('flashcards.inventory_title')}</h4>
                {flashcards.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-gray-500 text-xs italic">{t('flashcards.empty_title')}</p>
                        <p className="text-[10px] text-gray-600 mt-2 max-w-[200px] mx-auto leading-normal">
                            {t('flashcards.empty_desc')}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 max-h-[300px] lg:max-h-[500px] overflow-y-auto pr-1 no-scrollbar pb-2">
                        {flashcards.map(card => {
                            const isDue = new Date(card.next_review) <= new Date()
                            return (
                                <div key={card.id} className="p-4 lg:p-5 bg-[#0c0e17] border border-white/5 rounded-2xl flex flex-col justify-between gap-3 text-left group hover:border-white/10 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs lg:text-sm font-extrabold text-white leading-relaxed line-clamp-3">{card.question}</p>
                                    </div>
                                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-wider bg-white/5 text-gray-500 border border-white/5 px-2 py-0.5 rounded-full shrink-0">
                                                {t('flashcards.box_num').replace('{box}', card.leitner_box.toString())}
                                            </span>
                                            {isDue ? (
                                                <span className="text-[8px] lg:text-[9px] font-black text-amber-500 uppercase tracking-widest">{t('flashcards.due_label')}</span>
                                            ) : (
                                                <span className="text-[8px] lg:text-[9px] font-black text-gray-600 uppercase tracking-widest tabular-nums">
                                                    {new Date(card.next_review).toLocaleDateString(locale, {month: 'short', day: 'numeric'})}
                                                </span>
                                            )}
                                        </div>
                                        <div className="h-2 w-2 lg:h-2.5 lg:w-2.5 rounded-full bg-electric-blue shadow-[0_0_8px_rgba(0,240,255,0.7)]" />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
