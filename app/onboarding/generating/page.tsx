'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { haptics } from '@/utils/haptics'
import { RefreshCw, SkipForward } from 'lucide-react'

// ─── Ticker messages ──────────────────────────────────────────────────────────
const TICKER_MESSAGES = [
    'Analyzing your goal...',
    'Structuring your 30 days...',
    'Balancing difficulty tiers...',
    'Adding recovery days...',
    'Almost ready...',
]

// ─── Animated TextTicker ──────────────────────────────────────────────────────
interface TextTickerProps {
    isReady: boolean
    isError: boolean
}

function TextTicker({ isReady, isError }: TextTickerProps) {
    const [index, setIndex] = useState(0)

    useEffect(() => {
        if (isReady || isError) return
        const interval = setInterval(() => {
            setIndex(i => (i + 1) % TICKER_MESSAGES.length)
        }, 1800)
        return () => clearInterval(interval)
    }, [isReady, isError])

    const getMessage = () => {
        if (isError) return 'Generation failed'
        if (isReady) return 'Your plan is ready'
        return TICKER_MESSAGES[index]
    }

    return (
        <div className="h-6 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
                <motion.p
                    key={getMessage()}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className="text-sm text-gray-400 font-medium text-center"
                >
                    {getMessage()}
                </motion.p>
            </AnimatePresence>
        </div>
    )
}

// ─── Task priority styling helper ──────────────────────────────────────────────
function getPriorityStyles(priority: number) {
    switch (priority) {
        case 5:
            return {
                dot: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]',
                badge: 'bg-red-500/10 text-red-400 border border-red-500/20',
                text: 'P5 - Deep Theory'
            }
        case 4:
            return {
                dot: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]',
                badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                text: 'P4 - Hard Application'
            }
        case 3:
            return {
                dot: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]',
                badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                text: 'P3 - Standard'
            }
        case 2:
            return {
                dot: 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]',
                badge: 'bg-green-500/10 text-green-400 border border-green-500/20',
                text: 'P2 - Theory Overview'
            }
        case 1:
            return {
                dot: 'bg-gray-500 shadow-[0_0_10px_rgba(107,114,128,0.5)]',
                badge: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
                text: 'P1 - Exercises'
            }
        case 0:
        default:
            return {
                dot: 'bg-gray-600 shadow-[0_0_5px_rgba(156,163,175,0.3)]',
                badge: 'bg-gray-800 text-gray-400 border border-gray-700/50',
                text: 'Rest day'
            }
    }
}

// ─── Streamed Task interface ───────────────────────────────────────────────────
interface StreamedTask {
    id: string
    title: string
    priority: number
    day: number
    estimated_mins: number
}

// ─── Page component ────────────────────────────────────────────────────────────
type PageState = 'generating' | 'ready' | 'error'

export default function GeneratingPage() {
    const router = useRouter()
    const [pageState, setPageState] = useState<PageState>('generating')
    const [errorMsg, setErrorMsg] = useState('')
    const [progress, setProgress] = useState(0)
    const [visibleTasks, setVisibleTasks] = useState<StreamedTask[]>([])
    const abortControllerRef = useRef<AbortController | null>(null)
    const hasFired = useRef(false)

    // Progress bar auto increment (0% to 95% over ~12s)
    useEffect(() => {
        if (pageState !== 'generating') return
        const startTime = Date.now()
        const duration = 12000 // 12 seconds
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime
            const ratio = Math.min(elapsed / duration, 1)
            const currentProgress = ratio * 95
            setProgress(prev => {
                if (prev >= 95) return prev
                return currentProgress
            })
        }, 100)
        return () => clearInterval(interval)
    }, [pageState])

    const startStream = useCallback(async () => {
        setPageState('generating')
        setErrorMsg('')
        setProgress(0)
        setVisibleTasks([])

        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        const abortController = new AbortController()
        abortControllerRef.current = abortController

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.replace('/login')
                return
            }

            // Fetch the onboarding profile data
            const { data: profile } = await supabase
                .from('profiles')
                .select('onboarding_goal, onboarding_level, onboarding_daily_time, onboarding_style')
                .eq('id', user.id)
                .single()

            if (!profile?.onboarding_goal) {
                router.replace('/')
                return
            }

            const res = await fetch('/api/plans/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goal: profile.onboarding_goal,
                    level: profile.onboarding_level,
                    dailyTime: profile.onboarding_daily_time,
                    style: profile.onboarding_style,
                    userId: user.id
                }),
                signal: abortController.signal
            })

            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error || `Server error ${res.status}`)
            }

            const reader = res.body?.getReader()
            if (!reader) {
                throw new Error('Readable stream not supported')
            }

            const decoder = new TextDecoder()
            let buffer = ''
            let planId = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    const trimmedLine = line.trim()
                    if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue

                    const payload = trimmedLine.slice(6).trim()
                    if (payload === '[DONE]') {
                        haptics.medium()
                        setProgress(100)
                        setPageState('ready')
                        
                        // Wait 800ms, then navigate to /plan
                        setTimeout(() => {
                            router.push('/plan')
                        }, 800)
                        return
                    }

                    try {
                        const data = JSON.parse(payload)
                        if (data.error) {
                            throw new Error(data.error)
                        }

                        if (data.planId) {
                            planId = data.planId
                        } else {
                            // Valid task object streamed in
                            const newTask: StreamedTask = {
                                id: Math.random().toString(36).substring(2, 9),
                                title: data.title,
                                priority: data.priority,
                                day: data.day,
                                estimated_mins: data.estimated_mins
                            }
                            
                            setVisibleTasks(prev => {
                                const next = [...prev, newTask]
                                if (next.length > 4) {
                                    return next.slice(next.length - 4)
                                }
                                return next
                            })
                            haptics.light()
                        }
                    } catch (e: any) {
                        if (e.message?.includes('failed') || e.message?.includes('Generation')) {
                            throw e
                        }
                    }
                }
            }

        } catch (err: any) {
            if (err.name === 'AbortError') return
            console.error('Plan generation failed:', err)
            setErrorMsg(err.message || 'Something went wrong.')
            setPageState('error')
        }
    }, [router])

    useEffect(() => {
        if (hasFired.current) return
        hasFired.current = true
        startStream()

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [startStream])

    return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-black/50 p-6 relative overflow-hidden">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-violet opacity-20 blur-[120px]" />
            <div className="pointer-events-none absolute top-1/3 left-1/2 h-56 w-56 -translate-x-1/3 rounded-full bg-electric-blue opacity-20 blur-[90px]" />

            {/* Logo: L I F E P I V O T (small, letter-spaced, muted) */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-60">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] select-none">L I F E P I V O T</span>
            </div>

            <AnimatePresence mode="wait">
                {pageState !== 'error' ? (
                    <motion.div
                        key="generating-ui"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm mt-8"
                    >
                        {/* Ticker message */}
                        <TextTicker isReady={pageState === 'ready'} isError={false} />

                        {/* Thin progress bar */}
                        <div className="w-full max-w-xs mx-auto h-1 rounded-full bg-white/[0.07] overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-electric-blue to-neon-violet transition-all duration-150 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {/* Label: small muted text */}
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest select-none">
                            {pageState === 'ready' ? 'Done' : 'Your plan is being built'}
                        </p>

                        {/* Tasks Stream Area (maximum 4 cards visible at once) */}
                        <div className="w-full flex flex-col gap-2.5 min-h-[290px] h-[290px] justify-end overflow-hidden py-1 relative">
                            <AnimatePresence initial={false} mode="popLayout">
                                {visibleTasks.map((t) => {
                                    const styles = getPriorityStyles(t.priority)
                                    return (
                                        <motion.div
                                            layout
                                            key={t.id}
                                            initial={{ opacity: 0, x: -30 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, y: -45 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                            className="flex items-center gap-3.5 w-full p-3.5 rounded-xl bg-[#141824]/60 border border-white/[0.06] text-left shrink-0 glass-card"
                                        >
                                            {/* Colored priority dot */}
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${styles.dot}`} />

                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-white truncate">{t.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${styles.badge}`}>
                                                        {styles.text}
                                                    </span>
                                                </div>
                                            </div>

                                            <span className="text-[10px] text-gray-500 font-black tracking-widest uppercase shrink-0">
                                                Day {t.day}
                                            </span>
                                        </motion.div>
                                    )
                                })}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="error-card"
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        className="relative z-10 glass-card rounded-2xl p-7 w-full max-w-sm flex flex-col gap-5 border border-white/5 bg-[#141824]/80"
                    >
                        {/* Error title */}
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0">
                                <span className="text-red-400 font-black text-lg">!</span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">Generation failed</p>
                                <p className="text-xs text-gray-500 mt-0.5">Something went wrong building your plan.</p>
                            </div>
                        </div>

                        {errorMsg && (
                            <p className="text-[11px] text-red-400/80 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2.5 font-mono break-words">
                                {errorMsg}
                            </p>
                        )}

                        <div className="flex flex-col gap-3">
                            <button
                                id="generating-retry-btn"
                                onClick={() => { haptics.medium(); startStream() }}
                                className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-electric-blue/20 to-neon-violet/20 border border-electric-blue/20 px-4 py-3.5 text-xs font-black text-white uppercase tracking-widest hover:from-electric-blue/30 hover:to-neon-violet/30 transition-all active:scale-[0.98] min-h-[44px]"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Try Again
                            </button>
                            <button
                                id="generating-skip-btn"
                                onClick={() => { haptics.light(); router.push('/dashboard') }}
                                className="flex items-center justify-center gap-2 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all active:scale-[0.98] min-h-[44px]"
                            >
                                <SkipForward className="w-3.5 h-3.5" />
                                Skip for now
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
