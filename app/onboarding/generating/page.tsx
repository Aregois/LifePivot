'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { haptics } from '@/utils/haptics'
import { RefreshCw, SkipForward } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { translateTaskTitle } from '@/utils/translations'

// ─── Animated TextTicker ──────────────────────────────────────────────────────
interface TextTickerProps {
    isReady: boolean
    isError: boolean
}

function TextTicker({ isReady, isError }: TextTickerProps) {
    const { t } = useLanguage()
    const tickerMessages = [
        t('creator.generating'),
        t('onboarding.generating_sub'),
        t('creator.commitment_desc'),
    ]
    const [index, setIndex] = useState(0)

    useEffect(() => {
        if (isReady || isError) return
        const interval = setInterval(() => {
            setIndex(i => (i + 1) % tickerMessages.length)
        }, 2200)
        return () => clearInterval(interval)
    }, [isReady, isError, tickerMessages.length])

    const getMessage = () => {
        if (isError) return t('common.error')
        if (isReady) return t('common.ready')
        return tickerMessages[index]
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
                    className="text-sm text-gray-400 font-medium text-center truncate max-w-xs"
                >
                    {getMessage()}
                </motion.p>
            </AnimatePresence>
        </div>
    )
}

// ─── Task priority styling helper ──────────────────────────────────────────────
function getPriorityStyles(priority: number, t: (k: string) => string) {
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
                text: t('plan.void_day') || 'Rest day'
            }
    }
}

interface StreamTask {
    id: string
    day: number
    title: string
    priority: number
    subject: string
}

type PageState = 'streaming' | 'ready' | 'error'

export default function GeneratingPage() {
    const router = useRouter()
    const { t, locale } = useLanguage()

    const [pageState, setPageState] = useState<PageState>('streaming')
    const [visibleTasks, setVisibleTasks] = useState<StreamTask[]>([])
    const [progress, setProgress] = useState(0)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const abortRef = useRef<AbortController | null>(null)
    const hasStartedRef = useRef(false)

    const startStream = useCallback(async () => {
        setPageState('streaming')
        setVisibleTasks([])
        setProgress(0)
        setErrorMsg(null)

        if (abortRef.current) abortRef.current.abort()
        abortRef.current = new AbortController()

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.replace('/login'); return }

            const { data: profile } = await supabase
                .from('profiles')
                .select('onboarding_goal, onboarding_level, onboarding_daily_time, onboarding_style')
                .eq('id', user.id)
                .single()

            const goal = profile?.onboarding_goal || 'Master Web Development'
            const level = profile?.onboarding_level || 'Beginner'
            const dailyTime = profile?.onboarding_daily_time || '1 Hour'
            const style = profile?.onboarding_style || 'Coding'

            const res = await fetch('/api/plan/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal, level, dailyTime, style, userId: user.id }),
                signal: abortRef.current.signal,
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.error || 'Failed to initialize curriculum stream.')
            }

            const reader = res.body?.getReader()
            if (!reader) throw new Error('Response body is not readable.')

            const decoder = new TextDecoder()
            let buffer = ''
            let taskCount = 0

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.replace('data: ', ''))

                            if (data.type === 'TASK') {
                                taskCount++
                                const newTask: StreamTask = {
                                    id: `${data.task.day}-${data.task.title}`,
                                    day: data.task.day,
                                    title: data.task.title,
                                    priority: data.task.priority,
                                    subject: data.task.subject,
                                }
                                setVisibleTasks(prev => [...prev.slice(-3), newTask])
                                setProgress(Math.min(95, Math.round((taskCount / 30) * 100)))
                                haptics.light()
                            } else if (data.type === 'DONE') {
                                setProgress(100)
                                setPageState('ready')
                                haptics.medium()
                                setTimeout(() => {
                                    router.push('/')
                                }, 1500)
                                return
                            } else if (data.type === 'ERROR') {
                                throw new Error(data.error || 'Plan generation failed.')
                            }
                        } catch (parseErr: any) {
                            if (parseErr.name !== 'AbortError') {
                                console.warn('Stream chunk parse error:', parseErr)
                            }
                        }
                    }
                }
            }

            setProgress(100)
            setPageState('ready')
            setTimeout(() => {
                router.push('/')
            }, 1500)
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('Plan generation failed:', err)
                setErrorMsg(err.message || 'Plan generation was interrupted.')
                setPageState('error')
                haptics.error()
            }
        }
    }, [router])

    useEffect(() => {
        if (!hasStartedRef.current) {
            hasStartedRef.current = true
            startStream()
        }
        return () => {
            if (abortRef.current) abortRef.current.abort()
        }
    }, [startStream])

    return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-black/50 p-4">

            {/* Ambient glow */}
            <div className="pointer-events-none absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-violet opacity-15 blur-[120px]" />
            <div className="pointer-events-none absolute top-1/3 left-1/2 h-56 w-56 -translate-x-1/3 rounded-full bg-electric-blue opacity-15 blur-[90px]" />

            <AnimatePresence mode="wait">
                {pageState !== 'error' ? (
                    <motion.div
                        key="streaming-card"
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        className="relative z-10 glass-card rounded-2xl p-7 w-full max-w-sm flex flex-col items-center text-center gap-6 border border-white/5 bg-[#141824]/80"
                    >
                        {/* Header */}
                        <div>
                            <h2 className="title-glow text-xl font-bold tracking-tight text-white mb-1">
                                {t('onboarding.generating_title')}
                            </h2>
                            <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black">
                                {t('auth.subtitle')}
                            </p>
                        </div>

                        {/* Ticker message */}
                        <TextTicker isReady={pageState === 'ready'} isError={false} />

                        {/* Thin progress bar */}
                        <div className="w-full max-w-xs mx-auto h-1 rounded-full bg-white/[0.07] overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-electric-blue to-neon-violet transition-all duration-150 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {/* Label */}
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest select-none">
                            {pageState === 'ready' ? t('common.done') : t('creator.generating')}
                        </p>

                        {/* Tasks Stream Area */}
                        <div className="w-full flex flex-col gap-2.5 min-h-[290px] h-[290px] justify-end overflow-hidden py-1 relative">
                            <AnimatePresence initial={false} mode="popLayout">
                                {visibleTasks.map((taskItem) => {
                                    const styles = getPriorityStyles(taskItem.priority, t)
                                    const localizedTitle = translateTaskTitle(taskItem.title, locale)
                                    return (
                                        <motion.div
                                            layout
                                            key={taskItem.id}
                                            initial={{ opacity: 0, x: -30 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, y: -45 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                            className="flex items-center gap-3.5 w-full p-3.5 rounded-xl bg-[#141824]/60 border border-white/[0.06] text-left shrink-0 glass-card"
                                        >
                                            {/* Colored priority dot */}
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${styles.dot}`} />

                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-white truncate">{localizedTitle}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${styles.badge}`}>
                                                        {styles.text}
                                                    </span>
                                                </div>
                                            </div>

                                            <span className="text-[10px] text-gray-500 font-black tracking-widest uppercase shrink-0">
                                                {t('dashboard.day')} {taskItem.day}
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
                                <p className="text-sm font-bold text-white">{t('common.error')}</p>
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
                                {t('plan_import.btn_retry')}
                            </button>
                            <button
                                id="generating-skip-btn"
                                onClick={() => { haptics.light(); router.push('/') }}
                                className="flex items-center justify-center gap-2 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all active:scale-[0.98] min-h-[44px]"
                            >
                                <SkipForward className="w-3.5 h-3.5" />
                                {t('common.skip') || 'Skip'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
