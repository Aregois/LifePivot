'use client'

import { useState, useEffect, useTransition } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { AlertCircle, RefreshCw, Check, X } from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { fetchRecallPitItems, reviewFlashcard, recoverTokensFromRecallPit, rescueOverdueTask } from '@/app/actions'
import { useEconomy } from './economy-provider'
import { BlitzMatchGame } from './blitz-match-game'
import { useLanguage } from './language-provider'

interface RecallItem {
    id: string
    type: 'flashcard' | 'task'
    title: string
    details: string
    original: any
}

export function RecallPit() {
    const { setTokens, tokens } = useEconomy()
    const { t } = useLanguage()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [items, setItems] = useState<RecallItem[]>([])
    const [currentIdx, setCurrentIdx] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [sessionCleared, setSessionCleared] = useState(0)
    const [rewardEarned, setRewardEarned] = useState<'tokens' | null>(null)
    
    // States for Blitz Match Game integration
    const [rawFlashcards, setRawFlashcards] = useState<any[]>([])
    const [showBlitzGame, setShowBlitzGame] = useState(false)

    useEffect(() => {
        loadRecallItems()
    }, [])

    const loadRecallItems = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetchRecallPitItems()
            if (res.error) {
                setError(res.error)
                return
            }

            setRawFlashcards(res.flashcards || [])
            const formatted: RecallItem[] = []
            
            // Format Box 1 Flashcards
            if (res.flashcards) {
                res.flashcards.forEach((c: any) => {
                    formatted.push({
                        id: c.id,
                        type: 'flashcard',
                        title: 'Review Flashcard',
                        details: c.question,
                        original: c
                    })
                })
            }

            // Format Overdue Tasks
            if (res.overdueTasks) {
                res.overdueTasks.forEach((t: any) => {
                    formatted.push({
                        id: t.id,
                        type: 'task',
                        title: 'Overdue Task Rescue',
                        details: t.title,
                        original: t
                    })
                })
            }

            // Shuffle items to mix cards and tasks
            setItems(formatted.sort(() => Math.random() - 0.5))
            setCurrentIdx(0)
            setIsFlipped(false)
            setSessionCleared(0)
            setRewardEarned(null)
        } catch (e: any) {
            setError(e.message || 'Failed to fetch items')
        } finally {
            setLoading(false)
        }
    }

    const handleSwipe = (rating: 'easy' | 'hard') => {
        if (currentIdx >= items.length) return
        const item = items[currentIdx]

        haptics.medium()
        setIsFlipped(false)

        startTransition(async () => {
            if (item.type === 'flashcard') {
                await reviewFlashcard(item.id, rating)
            } else {
                if (rating === 'easy') {
                    await rescueOverdueTask(item.id)
                }
            }

            const clearedCount = sessionCleared + (rating === 'easy' ? 1 : 0)
            setSessionCleared(clearedCount)

            // Trigger reward milestones every 3 cleared items
            if (rating === 'easy' && clearedCount > 0 && clearedCount % 3 === 0) {
                const res = await recoverTokensFromRecallPit()
                if (res.success) {
                    setTokens(res.newTokens ?? (tokens + 2))
                    setRewardEarned('tokens')
                    haptics.medium()
                }
                setTimeout(() => setRewardEarned(null), 3000)
            }

            setTimeout(() => {
                setCurrentIdx(prev => prev + 1)
            }, 300)
        })
    }

    // Motion gestures
    const x = useMotionValue(0)
    const rotate = useTransform(x, [-150, 150], [-15, 15])
    const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5])
    const cardGlow = useTransform(x, [-100, 0, 100], [
        'rgba(239,68,68,0.15)', // Red glow
        'rgba(255,255,255,0.05)',
        'rgba(52,211,153,0.15)'  // Emerald glow
    ])

    const handleDragEnd = (event: any, info: any) => {
        const threshold = 100
        if (info.offset.x < -threshold) {
            handleSwipe('hard')
        } else if (info.offset.x > threshold) {
            handleSwipe('easy')
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <RefreshCw className="h-8 w-8 text-electric-blue animate-spin mb-3" />
                <p className="text-gray-500 text-xs">{t('recall_pit.loading')}</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                <p className="text-sm font-bold text-white">{t('recall_pit.failed')}</p>
                <p className="text-xs text-gray-400 mt-1">{error}</p>
                <button onClick={loadRecallItems} className="mt-4 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white">
                    {t('recall_pit.try_again')}
                </button>
            </div>
        )
    }

    const activeCount = items.length - currentIdx

    if (activeCount <= 0) {
        return (
            <div className="bg-[#141824] border border-white/5 p-8 rounded-[2.5rem] text-center shadow-xl relative overflow-hidden flex flex-col items-center gap-6 animate-fade-in select-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px] pointer-events-none" />
                <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center rounded-2xl">
                    <Check className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-white">{t('recall_pit.clean_title')}</h3>
                    <p className="text-xs text-gray-400 mt-2 max-w-xs leading-relaxed">
                        {t('recall_pit.clean_desc')}
                    </p>
                </div>
                <button
                    onClick={loadRecallItems}
                    className="px-6 py-3 bg-[#1C2033] hover:bg-[#232942] border border-white/5 rounded-xl text-xs text-white font-bold transition-all active:scale-95"
                >
                    {t('recall_pit.recheck')}
                </button>
            </div>
        )
    }

    const currentItem = items[currentIdx]

    return (
        <div className="flex flex-col gap-6 items-center w-full py-2 select-none relative">
            {showBlitzGame && rawFlashcards.length > 0 && (
                <BlitzMatchGame 
                    flashcards={rawFlashcards}
                    onClose={() => {
                        setShowBlitzGame(false)
                        loadRecallItems()
                    }}
                />
            )}
            {/* HUD Reward Popups */}
            <AnimatePresence>
                {rewardEarned && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.8 }}
                        className="absolute -top-12 z-50 bg-emerald-500 text-black px-4 py-2.5 rounded-full font-black text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                    >
                        Tokens Awarded! 🪙
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Session Header */}
            <div className="w-full flex items-center justify-between px-2">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    {currentItem.type === 'flashcard' ? t('recall_pit.title_fc') : t('recall_pit.title_task')} ({currentIdx + 1} of {items.length})
                </span>
                <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                    {t('recall_pit.cleared_label').replace('{count}', String(sessionCleared))}
                </span>
            </div>

            {/* Blitz Match Trigger Button */}
            {rawFlashcards.length >= 4 && (
                <button
                    onClick={() => { haptics.medium(); setShowBlitzGame(true) }}
                    className="w-full max-w-[320px] py-4 rounded-[1.5rem] bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-black font-black text-xs uppercase tracking-widest hover:opacity-95 active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2"
                >
                    {t('recall_pit.launch_blitz')}
                </button>
            )}

            {/* 3D Drag Card */}
            <div className="relative w-full h-[320px] flex items-center justify-center my-2 perspective-1000">
                <motion.div
                    style={{ x, rotate, opacity, backgroundColor: cardGlow }}
                    drag={true}
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.6}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                        if (currentItem.type === 'flashcard') {
                            haptics.light()
                            setIsFlipped(f => !f)
                        }
                    }}
                    className={`w-full max-w-[320px] h-full rounded-[2.5rem] border border-white/10 p-6 flex flex-col justify-between items-center text-center cursor-grab active:cursor-grabbing relative transition-colors duration-300 shadow-2xl overflow-hidden preserve-3d ${
                        isFlipped ? 'bg-[#181c30]' : 'bg-[#121626]'
                    }`}
                >
                    {/* Glow background */}
                    <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,rgba(var(--accent-rgb),0.08),transparent_70%)]" />

                    {/* Top label */}
                    <div className="flex items-center gap-1.5 text-[9px] font-black tracking-widest text-gray-500 uppercase">
                        {currentItem.type === 'flashcard' ? t('recall_pit.fc_label') : t('recall_pit.task_label')}
                    </div>

                    {/* Body */}
                    <div className="flex-1 flex flex-col justify-center px-2">
                        <AnimatePresence mode="wait">
                            {currentItem.type === 'task' ? (
                                <motion.div
                                    key="task"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex flex-col gap-2 items-center"
                                >
                                    <span className="text-xs text-gray-500 uppercase tracking-widest font-black">{t('recall_pit.overdue_item')}</span>
                                    <p className="text-base font-extrabold text-white leading-snug">
                                        {currentItem.details}
                                    </p>
                                    <span className="text-[9px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full mt-2">
                                        {t('recall_pit.action_required')}
                                    </span>
                                </motion.div>
                            ) : !isFlipped ? (
                                <motion.div
                                    key="question"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-base font-extrabold text-white leading-relaxed"
                                >
                                    {currentItem.details}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="answer"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-sm font-semibold text-gray-300 leading-relaxed"
                                >
                                    {currentItem.original.answer}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer cue */}
                    <div className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] pointer-events-none">
                        {currentItem.type === 'task' ? (
                            <span className="text-orange-400/80">{t('recall_pit.swipe_right_cue')}</span>
                        ) : isFlipped ? (
                            t('recall_pit.tap_question')
                        ) : (
                            t('recall_pit.tap_answer')
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Swipe Buttons */}
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

            {/* Instruction tooltip */}
            <div className="text-center max-w-[240px] mt-2">
                <p className="text-[10px] text-gray-500 leading-relaxed uppercase tracking-wider">
                    {t('recall_pit.instruction')}
                </p>
                <p className="text-[9px] text-gray-600 mt-1">
                    {t('recall_pit.milestone')}
                </p>
            </div>
        </div>
    )
}
