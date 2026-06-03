'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { X, Flame, Sparkles, Trophy, Zap, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { reviewFlashcard } from '@/app/actions'
import { haptics } from '@/utils/haptics'

interface Flashcard {
    id: string
    question: string
    answer: string
}

interface BlitzMatchGameProps {
    flashcards: Flashcard[]
    onClose: () => void
    onFinished?: () => void
}

interface GridItem {
    id: string; // matches flashcard.id
    type: 'question' | 'answer';
    text: string;
    isMatched: boolean;
}

export function BlitzMatchGame({ flashcards, onClose, onFinished }: BlitzMatchGameProps) {
    const [gridItems, setGridItems] = useState<GridItem[]>([])
    const [selectedId, setSelectedId] = useState<number | null>(null) // index in gridItems
    const [mismatchedPair, setMismatchedPair] = useState<[number, number] | null>(null)
    const [timeLeft, setTimeLeft] = useState(60)
    const [gameState, setGameState] = useState<'playing' | 'victory' | 'failed'>('playing')
    const [streak, setStreak] = useState(0)
    const [isOverdrive, setIsOverdrive] = useState(false)
    const [matchedCount, setMatchedCount] = useState(0)
    const [xpAwarded, setXpAwarded] = useState(0)
    const [isPending, startTransition] = useTransition()
    const lastMatchTimeRef = useRef<number>(Date.now())
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)

    // Synthesize quick Web Audio sound effects
    const playSynthesizedChime = (type: 'match' | 'error' | 'overdrive' | 'victory') => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
            }
            const ctx = audioContextRef.current
            if (ctx.state === 'suspended') {
                ctx.resume()
            }

            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)

            const now = ctx.currentTime

            if (type === 'match') {
                osc.type = 'sine'
                osc.frequency.setValueAtTime(523.25, now) // C5
                osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15) // G5
                gain.gain.setValueAtTime(0.15, now)
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
                osc.start(now)
                osc.stop(now + 0.2)
            } else if (type === 'error') {
                osc.type = 'sawtooth'
                osc.frequency.setValueAtTime(150, now)
                osc.frequency.linearRampToValueAtTime(100, now + 0.25)
                gain.gain.setValueAtTime(0.12, now)
                gain.gain.linearRampToValueAtTime(0.01, now + 0.25)
                osc.start(now)
                osc.stop(now + 0.25)
            } else if (type === 'overdrive') {
                osc.type = 'triangle'
                osc.frequency.setValueAtTime(880, now) // A5
                osc.frequency.exponentialRampToValueAtTime(1760, now + 0.3) // A6
                gain.gain.setValueAtTime(0.2, now)
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35)
                osc.start(now)
                osc.stop(now + 0.35)
            } else if (type === 'victory') {
                // Happy arpeggio
                const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
                notes.forEach((freq, index) => {
                    const noteOsc = ctx.createOscillator()
                    const noteGain = ctx.createGain()
                    noteOsc.connect(noteGain)
                    noteGain.connect(ctx.destination)
                    noteOsc.type = 'sine'
                    noteOsc.frequency.setValueAtTime(freq, now + index * 0.08)
                    noteGain.gain.setValueAtTime(0.15, now + index * 0.08)
                    noteGain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.08 + 0.3)
                    noteOsc.start(now + index * 0.08)
                    noteOsc.stop(now + index * 0.08 + 0.35)
                })
            }
        } catch (e) {
            console.error('Audio synthesis failed:', e)
        }
    }

    // Initialize board
    useEffect(() => {
        if (!flashcards || flashcards.length === 0) return

        // Take up to 6 flashcards to make a 12-card grid (easy for phone screens)
        const gameSet = flashcards.slice(0, 6)
        const items: GridItem[] = []

        gameSet.forEach(fc => {
            items.push({ id: fc.id, type: 'question', text: fc.question, isMatched: false })
            items.push({ id: fc.id, type: 'answer', text: fc.answer, isMatched: false })
        })

        // Shuffling
        const shuffled = items.sort(() => Math.random() - 0.5)
        setGridItems(shuffled)

        // Start timer
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!)
                    setGameState('failed')
                    haptics.error()
                    playSynthesizedChime('error')
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [flashcards])

    const handleItemClick = (index: number) => {
        if (gameState !== 'playing' || gridItems[index].isMatched || mismatchedPair || index === selectedId) return

        haptics.light()

        if (selectedId === null) {
            // First card selected
            setSelectedId(index)
        } else {
            // Second card selected
            const first = gridItems[selectedId]
            const second = gridItems[index]

            if (first.id === second.id && first.type !== second.type) {
                // Correct match!
                const updated = gridItems.map((item, idx) => {
                    if (idx === selectedId || idx === index) {
                        return { ...item, isMatched: true }
                    }
                    return item
                })

                setGridItems(updated)
                setSelectedId(null)
                setMatchedCount(prev => prev + 1)
                playSynthesizedChime('match')

                // Calculate consecutive streak & overdrive triggers
                const now = Date.now()
                const elapsed = (now - lastMatchTimeRef.current) / 1000
                lastMatchTimeRef.current = now

                let nextStreak = streak + 1
                if (elapsed > 4.5) {
                    nextStreak = 1 // reset streak if took too long
                }
                setStreak(nextStreak)

                if (nextStreak >= 3 && !isOverdrive) {
                    setIsOverdrive(true)
                    playSynthesizedChime('overdrive')
                    haptics.medium()
                    setTimeout(() => setIsOverdrive(false), 5000) // 5s overdrive window
                }

                // Award XP
                const bonus = isOverdrive ? 15 : 10
                setXpAwarded(prev => prev + bonus)

                // Call backend server action in background to review flashcard
                startTransition(async () => {
                    await reviewFlashcard(first.id, 'easy')
                })

                // Check Victory
                const allDone = updated.every(item => item.isMatched)
                if (allDone) {
                    if (timerRef.current) clearInterval(timerRef.current)
                    setGameState('victory')
                    playSynthesizedChime('victory')
                    haptics.medium()
                }
            } else {
                // Failed match
                setMismatchedPair([selectedId, index])
                setStreak(0)
                setIsOverdrive(false)
                playSynthesizedChime('error')
                haptics.error()

                // Lock grid temporarily, then reset selection
                setTimeout(() => {
                    setMismatchedPair(null)
                    setSelectedId(null)
                }, 800)
            }
        }
    }

    return (
        <div className="fixed inset-0 z-[1100] bg-[#05060f]/95 backdrop-blur-2xl flex flex-col items-center justify-between p-6 select-none text-white">
            {/* Color glows */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0c0d1c] via-[#05060f] to-[#12081c] pointer-events-none" />
            
            <AnimatePresence>
                {isOverdrive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.08 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gradient-to-r from-neon-violet via-electric-blue to-soft-cyan pointer-events-none z-0 animate-pulse"
                    />
                )}
            </AnimatePresence>

            {/* Top HUD header bar */}
            <div className="relative z-10 w-full max-w-md flex items-center justify-between shrink-0 mt-safe">
                <button
                    onClick={onClose}
                    className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Blitz Match</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <Flame className={`h-4 w-4 ${isOverdrive ? 'text-orange-500 animate-bounce' : 'text-gray-600'}`} />
                        <span className={`text-sm font-black ${isOverdrive ? 'text-orange-400' : 'text-gray-400'}`}>
                            {streak} Streak
                        </span>
                    </div>
                </div>

                <div className="bg-[#121626] border border-white/5 px-4 py-2 rounded-full text-xs font-bold font-mono">
                    {timeLeft}s
                </div>
            </div>

            {/* Game States Wrapper */}
            <div className="relative z-10 w-full max-w-md flex-1 flex flex-col items-center justify-center my-6 min-h-0">
                <AnimatePresence mode="wait">
                    {gameState === 'playing' ? (
                        <motion.div
                            key="playing-grid"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="w-full grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar"
                        >
                            {gridItems.map((item, idx) => {
                                const isSelected = idx === selectedId
                                const isMismatched = mismatchedPair?.includes(idx)
                                const isMatched = item.isMatched

                                return (
                                    <motion.button
                                        key={`${item.id}-${item.type}-${idx}`}
                                        onClick={() => handleItemClick(idx)}
                                        className={`h-24 p-3 rounded-2xl border text-center flex items-center justify-center text-[10px] font-extrabold uppercase leading-relaxed transition-all active:scale-[0.98] ${
                                            isMatched
                                                ? 'opacity-0 scale-95 pointer-events-none'
                                                : isMismatched
                                                ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)] animate-shake'
                                                : isSelected
                                                ? 'bg-electric-blue/15 border-electric-blue text-electric-blue shadow-[0_0_20px_rgba(0,240,255,0.2)]'
                                                : 'bg-[#121626]/75 border-white/5 hover:border-white/10 text-white'
                                        }`}
                                        style={{
                                            borderWidth: isSelected || isMismatched ? '2px' : '1px',
                                        }}
                                        layout
                                    >
                                        <span className="line-clamp-4">{item.text}</span>
                                    </motion.button>
                                )
                            })}
                        </motion.div>
                    ) : gameState === 'victory' ? (
                        <motion.div
                            key="victory-screen"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center flex flex-col items-center gap-6"
                        >
                            <div className="h-16 w-16 bg-yellow-400/10 border-2 border-yellow-400/30 rounded-2xl flex items-center justify-center text-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.25)] animate-bounce">
                                <Trophy className="h-8 w-8" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">Match Cleared</span>
                                <h2 className="text-3xl font-black tracking-tight text-white mt-1 uppercase italic">Blitz Victory!</h2>
                            </div>
                            <p className="text-gray-400 text-xs max-w-[280px] leading-relaxed">
                                Exceptional recall speed! You matched all pairs and rescued your active deck records.
                            </p>
                            <div className="bg-[#121626] border border-white/5 rounded-3xl p-5 w-full flex justify-around">
                                <div>
                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Matched Pairs</span>
                                    <span className="text-white font-extrabold text-sm block mt-0.5">{matchedCount} Cards</span>
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Bonus Reward</span>
                                    <span className="text-yellow-400 font-extrabold text-sm block mt-0.5">+{xpAwarded} XP</span>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    onFinished?.()
                                    onClose()
                                }}
                                className="w-full py-4.5 rounded-xl bg-yellow-400 text-black font-black text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-[0_0_20px_rgba(250,204,21,0.2)]"
                            >
                                Collect Rewards
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="failed-screen"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center flex flex-col items-center gap-6"
                        >
                            <div className="h-16 w-16 bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-500">
                                <AlertCircle className="h-8 w-8" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">Time Expired</span>
                                <h2 className="text-3xl font-black tracking-tight text-white mt-1 uppercase italic">Blitz Failure</h2>
                            </div>
                            <p className="text-gray-400 text-xs max-w-[280px] leading-relaxed">
                                The timer ran out before all pairs could be matched. Practice card associations to improve recall latency.
                            </p>
                            <div className="bg-[#121626] border border-white/5 rounded-3xl p-5 w-full flex justify-around">
                                <div>
                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Completed</span>
                                    <span className="text-white font-extrabold text-sm block mt-0.5">{matchedCount} / 6 Matches</span>
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">XP Gained</span>
                                    <span className="text-rose-400 font-extrabold text-sm block mt-0.5">+{xpAwarded} XP</span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-4.5 rounded-xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-wider hover:bg-white/10 transition-all"
                            >
                                Exit Game
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom active status bar */}
            <div className="relative z-10 w-full max-w-sm shrink-0 text-center text-gray-600 text-[8px] font-mono uppercase tracking-widest pb-safe">
                {gameState === 'playing' ? (
                    isOverdrive ? (
                        <span className="text-orange-400 animate-pulse font-black">Zen Overdrive Enabled! (+5 XP Bonus)</span>
                    ) : (
                        <span>Match terms with definitions</span>
                    )
                ) : (
                    <span>Recall Battle Complete</span>
                )}
            </div>
        </div>
    )
}
