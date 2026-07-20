'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { haptics } from '@/utils/haptics'
import { ArrowRight, Loader2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface OnboardingState {
    goal: string
    level: string
    dailyTime: string
    style: string
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center gap-2 mb-8">
            {Array.from({ length: total }).map((_, i) => (
                <div key={i} className="relative flex-1 h-1 rounded-full bg-white/[0.07] overflow-hidden">
                    {i < current && (
                        <motion.div
                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-electric-blue to-neon-violet"
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                    )}
                    {i === current - 1 && (
                        <motion.div
                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-electric-blue to-neon-violet"
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                    )}
                </div>
            ))}
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap ml-1">
                {current} / {total}
            </span>
        </div>
    )
}

// ─── Choice Card ──────────────────────────────────────────────────────────────
function ChoiceCard({
    emoji,
    label,
    sub,
    selected,
    onSelect,
}: {
    emoji: string
    label: string
    sub: string
    selected: boolean
    onSelect: () => void
}) {
    return (
        <button
            type="button"
            onClick={() => { haptics.light(); onSelect() }}
            className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all active:scale-[0.98] min-h-[64px]
                ${selected
                    ? 'border-electric-blue/60 bg-electric-blue/10 shadow-[0_0_16px_rgba(var(--accent-rgb),0.12)]'
                    : 'border-white/[0.08] bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.04]'
                }`}
        >
            <span className="text-2xl shrink-0 w-8 text-center">{emoji}</span>
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${selected ? 'text-white' : 'text-gray-200'}`}>{label}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>
            </div>
            <div className={`shrink-0 h-4 w-4 rounded-full border transition-all ${selected ? 'border-electric-blue bg-electric-blue shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]' : 'border-white/20'}`}>
                {selected && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="h-full w-full rounded-full bg-electric-blue flex items-center justify-center"
                    >
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </motion.div>
                )}
            </div>
        </button>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [saving, setSaving] = useState(false)
    const [checking, setChecking] = useState(true)
    const [answers, setAnswers] = useState<OnboardingState>({
        goal: '',
        level: '',
        dailyTime: '',
        style: '',
    })

    // ── Guard: skip onboarding if already completed ──────────────────────────
    useEffect(() => {
        const check = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.replace('/login'); return }

            const { data: profile } = await supabase
                .from('profiles')
                .select('onboarding_completed')
                .eq('id', user.id)
                .single()

            if (profile?.onboarding_completed === true) {
                router.replace('/')
            } else {
                setChecking(false)
            }
        }
        check()
    }, [router])

    if (checking) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-black/50">
                <Loader2 className="w-6 h-6 animate-spin text-electric-blue" />
            </div>
        )
    }

    // ── Slide directions ─────────────────────────────────────────────────────
    const slideVariants = {
        enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
        center: { opacity: 1, x: 0 },
        exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
    }

    const [slideDir, setSlideDir] = useState(1)

    const goNext = () => { setSlideDir(1); setStep(s => s + 1) }
    const goBack = () => { setSlideDir(-1); setStep(s => s - 1) }

    const canContinue = (): boolean => {
        if (step === 1) return answers.goal.trim().length >= 3
        if (step === 2) return !!answers.level
        if (step === 3) return !!answers.dailyTime
        if (step === 4) return !!answers.style
        return false
    }

    // ── Save & navigate to generating screen ────────────────────────────────
    const handleFinish = async () => {
        if (!canContinue()) return
        haptics.medium()
        setSaving(true)

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.replace('/login'); return }

            const { error } = await supabase
                .from('profiles')
                .update({
                    onboarding_goal: answers.goal.trim(),
                    onboarding_level: answers.level,
                    onboarding_daily_time: answers.dailyTime,
                    onboarding_style: answers.style,
                    onboarding_completed: true,
                })
                .eq('id', user.id)

            if (error) {
                console.error('Failed to save onboarding:', error)
                setSaving(false)
                return
            }

            router.push('/onboarding/generating')
        } catch (e) {
            console.error(e)
            setSaving(false)
        }
    }

    const TOTAL = 4

    return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-black/50 p-4">

            {/* Ambient glow */}
            <div className="pointer-events-none absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-violet opacity-15 blur-[120px]" />
            <div className="pointer-events-none absolute top-1/3 left-1/2 h-56 w-56 -translate-x-1/3 rounded-full bg-electric-blue opacity-15 blur-[90px]" />

            <div className="glass-card relative z-10 w-full max-w-md rounded-2xl p-7 shadow-2xl">

                <StepIndicator current={step} total={TOTAL} />

                <AnimatePresence mode="wait" custom={slideDir}>
                    {/* ── STEP 1: Learning goal ── */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            custom={slideDir}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.28, ease: 'easeInOut' }}
                            className="flex flex-col gap-5"
                        >
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1.5">What do you want to learn?</h2>
                                <p className="text-xs text-gray-500 leading-relaxed">Be specific — the more detail, the better your plan</p>
                            </div>
                            <textarea
                                id="onboarding-goal"
                                value={answers.goal}
                                onChange={e => setAnswers(a => ({ ...a, goal: e.target.value }))}
                                placeholder="e.g. Python, Spanish, Guitar..."
                                rows={3}
                                className="glass w-full rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-500 focus:border-electric-blue focus:outline-none focus:ring-1 focus:ring-electric-blue transition-all resize-none"
                            />
                            {answers.goal.trim().length > 0 && answers.goal.trim().length < 3 && (
                                <p className="text-[11px] text-red-400 -mt-2 ml-1">Please be a bit more specific (min. 3 characters).</p>
                            )}
                        </motion.div>
                    )}

                    {/* ── STEP 2: Level ── */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            custom={slideDir}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.28, ease: 'easeInOut' }}
                            className="flex flex-col gap-4"
                        >
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1.5">What is your current level?</h2>
                                <p className="text-xs text-gray-500 leading-relaxed">We&apos;ll calibrate the difficulty of your plan</p>
                            </div>
                            <div className="flex flex-col gap-3">
                                {[
                                    { emoji: '🌱', label: 'Beginner', sub: 'Starting from scratch' },
                                    { emoji: '📈', label: 'Intermediate', sub: 'I know the basics' },
                                    { emoji: '🔥', label: 'Advanced', sub: 'I want to go deeper' },
                                ].map(opt => (
                                    <ChoiceCard
                                        key={opt.label}
                                        emoji={opt.emoji}
                                        label={opt.label}
                                        sub={opt.sub}
                                        selected={answers.level === opt.label}
                                        onSelect={() => setAnswers(a => ({ ...a, level: opt.label }))}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP 3: Daily time ── */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            custom={slideDir}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.28, ease: 'easeInOut' }}
                            className="flex flex-col gap-4"
                        >
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1.5">How much time can you study per day?</h2>
                                <p className="text-xs text-gray-500 leading-relaxed">We&apos;ll structure sessions around your schedule</p>
                            </div>
                            <div className="flex flex-col gap-3">
                                {[
                                    { emoji: '⚡', label: '15–30 min', sub: 'Quick sessions' },
                                    { emoji: '📚', label: '30–60 min', sub: 'Focused learning' },
                                    { emoji: '🚀', label: '1–2 hours', sub: 'Serious progress' },
                                    { emoji: '💪', label: '2+ hours', sub: 'Full commitment' },
                                ].map(opt => (
                                    <ChoiceCard
                                        key={opt.label}
                                        emoji={opt.emoji}
                                        label={opt.label}
                                        sub={opt.sub}
                                        selected={answers.dailyTime === opt.label}
                                        onSelect={() => setAnswers(a => ({ ...a, dailyTime: opt.label }))}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP 4: Learning style ── */}
                    {step === 4 && (
                        <motion.div
                            key="step4"
                            custom={slideDir}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.28, ease: 'easeInOut' }}
                            className="flex flex-col gap-4"
                        >
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1.5">How do you learn best?</h2>
                                <p className="text-xs text-gray-500 leading-relaxed">Your plan will emphasise your preferred style</p>
                            </div>
                            <div className="flex flex-col gap-3">
                                {[
                                    { emoji: '👁️', label: 'Visual', sub: 'Diagrams and examples' },
                                    { emoji: '📖', label: 'Reading', sub: 'Text and explanations' },
                                    { emoji: '🛠️', label: 'Practice', sub: 'Doing and building' },
                                ].map(opt => (
                                    <ChoiceCard
                                        key={opt.label}
                                        emoji={opt.emoji}
                                        label={opt.label}
                                        sub={opt.sub}
                                        selected={answers.style === opt.label}
                                        onSelect={() => setAnswers(a => ({ ...a, style: opt.label }))}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Navigation ── */}
                <div className="mt-7 flex items-center gap-3">
                    {step > 1 && (
                        <button
                            type="button"
                            onClick={goBack}
                            className="flex items-center justify-center h-11 w-11 rounded-xl border border-white/10 bg-white/[0.03] text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-all active:scale-95 shrink-0"
                            aria-label="Go back"
                        >
                            <span className="text-sm font-black">←</span>
                        </button>
                    )}

                    <button
                        type="button"
                        id={`onboarding-continue-step-${step}`}
                        disabled={!canContinue() || saving}
                        onClick={step < TOTAL ? () => { haptics.medium(); goNext() } : handleFinish}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-electric-blue/20 to-neon-violet/20 border border-electric-blue/20 px-4 py-3.5 text-xs font-black text-white uppercase tracking-widest transition-all hover:from-electric-blue/30 hover:to-neon-violet/30 hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <span>{step < TOTAL ? 'Continue' : 'Build My Plan'}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
