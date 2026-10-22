'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Sparkles, Trophy, Zap, ArrowRight, ArrowLeft, 
    CheckCircle2, ShieldAlert, Check, Flame, X, 
    School, ArrowLeftRight, Palette, Rocket, AlertCircle, Coins
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { haptics } from '@/utils/haptics'
import { useLanguage } from './language-provider'

type AccentKey = 'cyan' | 'violet' | 'emerald' | 'amber'

export function OnboardingTour() {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const [step, setStep] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const { t } = useLanguage()

    // ── Interactive Demos States ───────────────────────────────────────────
    // Step 0: Daily Quests Checklist demo
    const [demoSubtaskDone, setDemoSubtaskDone] = useState(false)
    const [showXpBanner, setShowXpBanner] = useState(false)

    // Step 1: Socratic AI Micro-drill demo
    const [drillAnswer, setDrillAnswer] = useState<number | null>(null)

    // Step 2: Pivot Slide demo
    const [pivotSlid, setPivotSlid] = useState(false)

    // Step 3: Live Theme Accent demo
    const [activeAccent, setActiveAccent] = useState<AccentKey>('cyan')

    const TOTAL_STEPS = 5

    useEffect(() => {
        setMounted(true)
        const completed = localStorage.getItem('lifepivot_onboarding_completed')
        if (completed !== 'true') {
            setIsOpen(true)
        }

        // Listen for reset events immediately
        const handleCheckOnboarding = () => {
            setStep(0)
            setDemoSubtaskDone(false)
            setDrillAnswer(null)
            setPivotSlid(false)
            setIsOpen(true)
        }
        window.addEventListener('lifepivot_onboarding_completed_changed', handleCheckOnboarding)
        window.addEventListener('lifepivot_open_tour', handleCheckOnboarding)

        return () => {
            window.removeEventListener('lifepivot_onboarding_completed_changed', handleCheckOnboarding)
            window.removeEventListener('lifepivot_open_tour', handleCheckOnboarding)
        }
    }, [isOpen])

    const handleNext = () => {
        haptics.medium()
        if (step < TOTAL_STEPS - 1) {
            setStep(prev => prev + 1)
        } else {
            handleComplete()
        }
    }

    const handleBack = () => {
        haptics.light()
        if (step > 0) {
            setStep(prev => prev - 1)
        }
    }

    const handleSkip = () => {
        haptics.light()
        handleComplete()
    }

    const handleComplete = () => {
        localStorage.setItem('lifepivot_onboarding_completed', 'true')
        setIsOpen(false)
    }

    const handleLaunchPlan = () => {
        haptics.success()
        handleComplete()
        router.push('/onboarding')
    }

    // Demo toggles
    const handleToggleDemoSubtask = () => {
        const nextState = !demoSubtaskDone
        setDemoSubtaskDone(nextState)
        if (nextState) {
            haptics.celebrate()
            setShowXpBanner(true)
            setTimeout(() => setShowXpBanner(false), 3500)
        } else {
            haptics.toggle()
            setShowXpBanner(false)
        }
    }

    const handleSelectDrill = (optionIdx: number) => {
        setDrillAnswer(optionIdx)
        if (optionIdx === 1) {
            haptics.success()
        } else {
            haptics.error()
        }
    }

    const handlePerformPivot = () => {
        setPivotSlid(true)
        haptics.success()
    }

    const handleSelectAccent = (colorKey: AccentKey) => {
        haptics.light()
        setActiveAccent(colorKey)
    }

    if (!mounted || !isOpen) return null

    // Accent styling configuration
    const accentColors: Record<AccentKey, { primary: string; glow: string; text: string; bgSoft: string }> = {
        cyan: { primary: '#00F0FF', glow: 'rgba(6, 182, 212, 0.25)', text: 'text-cyan-400', bgSoft: 'rgba(0, 240, 255, 0.12)' },
        violet: { primary: '#BD00FF', glow: 'rgba(189, 0, 255, 0.25)', text: 'text-purple-400', bgSoft: 'rgba(189, 0, 255, 0.12)' },
        emerald: { primary: '#10B981', glow: 'rgba(16, 185, 129, 0.25)', text: 'text-emerald-400', bgSoft: 'rgba(16, 185, 129, 0.12)' },
        amber: { primary: '#F59E0B', glow: 'rgba(245, 158, 11, 0.25)', text: 'text-amber-400', bgSoft: 'rgba(245, 158, 11, 0.12)' },
    }

    const currentAccent = accentColors[activeAccent]

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-[#050508]/85 backdrop-blur-2xl select-none overflow-y-auto">
            {/* Dynamic Ambient Sliding Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div 
                    className="absolute top-[20%] left-[20%] w-[400px] h-[400px] rounded-full blur-[140px] transition-colors duration-700 pointer-events-none"
                    style={{ backgroundColor: currentAccent.glow }}
                />
                <div 
                    className="absolute bottom-[20%] right-[20%] w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none"
                />
            </div>

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                transition={{ type: "spring", damping: 26, stiffness: 320 }}
                className="relative w-full max-w-lg rounded-[2.25rem] bg-[#121118]/95 border border-white/10 p-6 sm:p-8 shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col justify-between min-h-[540px] overflow-hidden"
            >
                {/* Dynamic Radial Glow Filter */}
                <div 
                    className="absolute inset-0 opacity-25 pointer-events-none transition-all duration-700 blur-[60px]"
                    style={{ background: `radial-gradient(circle at center, ${currentAccent.glow}, transparent 70%)` }}
                />

                {/* ── Top Header: Story Segmented Progress Bar & Skip ───────────── */}
                <div className="relative z-10 w-full mb-6">
                    {/* Story bars */}
                    <div className="flex gap-2 w-full mb-4">
                        {Array.from({ length: TOTAL_STEPS }).map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                    idx <= step ? 'bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.6)]' : 'bg-white/10'
                                }`} 
                            />
                        ))}
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
                                Step {step + 1} of {TOTAL_STEPS}
                            </span>
                        </div>

                        <button
                            onClick={handleSkip}
                            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full border border-white/5 cursor-pointer"
                        >
                            <span>Skip Tour</span>
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* ── Step Content & Interactive Sandboxes ──────────────────────── */}
                <div className="relative z-10 my-auto py-2">
                    <AnimatePresence mode="wait">
                        {/* STEP 0: Interactive Daily Quests */}
                        {step === 0 && (
                            <motion.div
                                key="step-0"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col items-center text-center gap-4"
                            >
                                <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
                                    <Zap className="h-7 w-7" />
                                </div>

                                <div className="space-y-1.5">
                                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                        Bite-Sized Daily Quests
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">
                                        Turn overwhelming goals into daily micro-sprints. Try clicking the incomplete subtask below!
                                    </p>
                                </div>

                                {/* Interactive Mini Task Card */}
                                <div className="w-full text-left rounded-2xl bg-white/[0.03] border border-cyan-400/30 p-4 mt-2 shadow-inner">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-400/15 border border-cyan-400/20 text-[9px] font-black uppercase tracking-wider text-cyan-400">
                                            <Flame className="w-3 h-3 text-cyan-400" />
                                            <span>P4 High Impact</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-amber-400 tracking-wide">
                                            +150 XP · 1 TOKEN
                                        </span>
                                    </div>

                                    <h4 className="text-sm font-bold text-white mb-0.5">
                                        Machine Learning: Backpropagation Calculus
                                    </h4>
                                    <p className="text-[11px] text-gray-400 mb-3">
                                        25m Deep Work Sprint
                                    </p>

                                    {/* Progress track */}
                                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-3">
                                        <div 
                                            className="h-full bg-cyan-400 transition-all duration-500 rounded-full"
                                            style={{ width: demoSubtaskDone ? '100%' : '50%' }}
                                        />
                                    </div>

                                    {/* Subtasks */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] text-xs text-gray-400 line-through">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                            <span>Derive computational graph nodes</span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleToggleDemoSubtask}
                                            className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer text-left ${
                                                demoSubtaskDone 
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                                                    : 'bg-white/[0.04] border-cyan-400/40 text-gray-200 hover:border-cyan-400'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                    demoSubtaskDone ? 'border-emerald-400 bg-emerald-400 text-black' : 'border-cyan-400'
                                                }`}>
                                                    {demoSubtaskDone && <Check className="w-3 h-3 stroke-[3]" />}
                                                </div>
                                                <span className={demoSubtaskDone ? 'line-through text-gray-400' : ''}>
                                                    Calculate gradient vector step
                                                </span>
                                            </div>

                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                                demoSubtaskDone ? 'bg-emerald-500/20 text-emerald-300' : 'bg-cyan-500/20 text-cyan-300 animate-pulse'
                                            }`}>
                                                {demoSubtaskDone ? 'Completed' : 'Click to test'}
                                            </span>
                                        </button>
                                    </div>

                                    {/* XP floating badge */}
                                    {showXpBanner && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 5 }} 
                                            animate={{ opacity: 1, y: 0 }} 
                                            className="mt-3 flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold"
                                        >
                                            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                                            <span>+50 XP & 1 Token awarded! Streak multiplier active.</span>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 1: Interactive Socratic Micro-Drill */}
                        {step === 1 && (
                            <motion.div
                                key="step-1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col items-center text-center gap-4"
                            >
                                <div className="h-14 w-14 rounded-2xl bg-purple-500/10 border border-purple-400/30 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/10">
                                    <School className="h-7 w-7" />
                                </div>

                                <div className="space-y-1.5">
                                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                        Socratic Active Recall
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">
                                        No passive reading. LifePivot uses Socratic AI micro-drills to test intuition and anchor long-term retention.
                                    </p>
                                </div>

                                {/* Socratic Drill Sandbox */}
                                <div className="w-full text-left rounded-2xl bg-white/[0.03] border border-purple-400/30 p-4 mt-2">
                                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-purple-400">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>AI Checkpoint Drill</span>
                                    </div>

                                    <p className="text-xs sm:text-sm font-semibold text-gray-200 mb-3 leading-snug">
                                        "Why is active recall 300% more effective than passive re-reading?"
                                    </p>

                                    <div className="space-y-2">
                                        {/* Option A (Distractor) */}
                                        <button
                                            type="button"
                                            onClick={() => handleSelectDrill(0)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                                                drillAnswer === 0 
                                                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' 
                                                    : 'bg-white/[0.03] border-white/10 text-gray-300 hover:border-white/20'
                                            }`}
                                        >
                                            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">
                                                A
                                            </span>
                                            <span className="flex-1">It requires less mental effort and finishes faster.</span>
                                        </button>

                                        {/* Option B (Correct) */}
                                        <button
                                            type="button"
                                            onClick={() => handleSelectDrill(1)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                                                drillAnswer === 1 
                                                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' 
                                                    : 'bg-white/[0.03] border-white/10 text-gray-300 hover:border-white/20'
                                            }`}
                                        >
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                                drillAnswer === 1 ? 'bg-emerald-500 text-black' : 'bg-white/10'
                                            }`}>
                                                B
                                            </span>
                                            <span className="flex-1">Retrieval forces neural pathways to reinforce memory traces.</span>
                                        </button>
                                    </div>

                                    {/* Feedback note */}
                                    {drillAnswer === 1 && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                                            <span>Spot on! Testing yourself prevents the illusion of competence.</span>
                                        </motion.div>
                                    )}
                                    {drillAnswer === 0 && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                                            <span>Passive reviewing creates false familiarity. Try Option B!</span>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: Guilt-Free Pivot Slide */}
                        {step === 2 && (
                            <motion.div
                                key="step-2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col items-center text-center gap-4"
                            >
                                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                                    <ShieldAlert className="h-7 w-7" />
                                </div>

                                <div className="space-y-1.5">
                                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                        Zero-Guilt Pivot Slide
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">
                                        Life happens. When schedules break, the Pivot Engine automatically floats overdue tasks into scheduled Void Days so your streak is never destroyed.
                                    </p>
                                </div>

                                {/* Pivot Sandbox */}
                                <div className={`w-full text-left rounded-2xl bg-white/[0.03] border p-4 mt-2 transition-colors ${
                                    pivotSlid ? 'border-emerald-500/40' : 'border-amber-400/30'
                                }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                            pivotSlid ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                        }`}>
                                            <span>{pivotSlid ? '✓ Realigned to Void Day' : 'Missed Yesterday'}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                                            <Flame className="w-3 h-3 text-amber-400" />
                                            <span>5-Day Streak Active</span>
                                        </div>
                                    </div>

                                    <h4 className="text-sm font-bold text-white mb-1">
                                        Neuroscience: Synaptic Plasticity
                                    </h4>
                                    <p className="text-xs text-gray-400 mb-3">
                                        {pivotSlid 
                                            ? 'Successfully moved to Sunday rest buffer. Zero penalty, momentum preserved.' 
                                            : 'Scheduled for yesterday. Click below to slide without breaking your streak.'}
                                    </p>

                                    {!pivotSlid ? (
                                        <button
                                            type="button"
                                            onClick={handlePerformPivot}
                                            className="w-full py-2.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                                        >
                                            <ArrowLeftRight className="w-4 h-4" />
                                            <span>Slide to Sunday Void Day</span>
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                            <span>Streak Protected! Void Days eliminate study guilt and burnout.</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: Reactive Themes & Personal Progression */}
                        {step === 3 && (
                            <motion.div
                                key="step-3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col items-center text-center gap-4"
                            >
                                <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
                                    <Palette className="h-7 w-7" />
                                </div>

                                <div className="space-y-1.5">
                                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                        Reactive Themes & Ranks
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">
                                        Level up from Pathseeker to Grandmaster. Try clicking the color palettes below to see the UI adapt in real-time:
                                    </p>
                                </div>

                                {/* Theme & Rank Sandbox */}
                                <div className="w-full text-left rounded-2xl bg-white/[0.03] border border-white/10 p-4 mt-2">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 text-center">
                                        Live Theme Accent Switcher
                                    </div>

                                    <div className="grid grid-cols-4 gap-2 mb-4">
                                        <button
                                            type="button"
                                            onClick={() => handleSelectAccent('cyan')}
                                            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                                                activeAccent === 'cyan' ? 'border-cyan-400 bg-cyan-400/15' : 'border-white/10 bg-white/5 hover:border-white/20'
                                            }`}
                                        >
                                            <span className="w-5 h-5 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00f0ff]" />
                                            <span className="text-[10px] font-bold text-white">Cyan</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleSelectAccent('violet')}
                                            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                                                activeAccent === 'violet' ? 'border-purple-400 bg-purple-400/15' : 'border-white/10 bg-white/5 hover:border-white/20'
                                            }`}
                                        >
                                            <span className="w-5 h-5 rounded-full bg-[#BD00FF] shadow-[0_0_8px_#bd00ff]" />
                                            <span className="text-[10px] font-bold text-white">Violet</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleSelectAccent('emerald')}
                                            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                                                activeAccent === 'emerald' ? 'border-emerald-400 bg-emerald-400/15' : 'border-white/10 bg-white/5 hover:border-white/20'
                                            }`}
                                        >
                                            <span className="w-5 h-5 rounded-full bg-[#10B981] shadow-[0_0_8px_#10b981]" />
                                            <span className="text-[10px] font-bold text-white">Emerald</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleSelectAccent('amber')}
                                            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                                                activeAccent === 'amber' ? 'border-amber-400 bg-amber-400/15' : 'border-white/10 bg-white/5 hover:border-white/20'
                                            }`}
                                        >
                                            <span className="w-5 h-5 rounded-full bg-[#F59E0B] shadow-[0_0_8px_#f59e0b]" />
                                            <span className="text-[10px] font-bold text-white">Sunset</span>
                                        </button>
                                    </div>

                                    {/* Progression preview */}
                                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-1.5 text-xs font-black tracking-wide" style={{ color: currentAccent.primary }}>
                                                <Trophy className="w-3.5 h-3.5" />
                                                <span>Level 3 · Acolyte</span>
                                            </div>
                                            <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                                                <Coins className="w-3.5 h-3.5" />
                                                <span>24 Tokens</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-1">
                                            <div className="h-full rounded-full transition-all duration-300" style={{ width: '65%', backgroundColor: currentAccent.primary }} />
                                        </div>
                                        <div className="text-[10px] text-gray-400 text-right">
                                            325 / 500 XP to Scholar
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 4: Launchpad (Quickstart) */}
                        {step === 4 && (
                            <motion.div
                                key="step-4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col items-center text-center gap-4"
                            >
                                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                                    <Rocket className="h-7 w-7" />
                                </div>

                                <div className="space-y-1.5">
                                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                        You Are Ready to Learn
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">
                                        You have the foundational tools to achieve steady study momentum. Choose how you'd like to get started:
                                    </p>
                                </div>

                                {/* Triad Pillars */}
                                <div className="w-full text-left rounded-2xl bg-white/[0.03] border border-white/10 p-4 mt-2 space-y-2.5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-cyan-400/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-white">Daily Focused Quests</div>
                                            <div className="text-[11px] text-gray-400">P1-P5 priorities and subtask breakdowns.</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-purple-400/15 border border-purple-400/30 flex items-center justify-center text-purple-400 shrink-0">
                                            <School className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-white">Socratic Active Recall</div>
                                            <div className="text-[11px] text-gray-400">Rapid drills that build real intuition.</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                                            <ShieldAlert className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-white">Guilt-Free Consistency</div>
                                            <div className="text-[11px] text-gray-400">Zero broken streaks via Pivot Void Days.</div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── Bottom Navigation Controls ─────────────────────────────────── */}
                <div className="relative z-10 w-full pt-4 mt-2 border-t border-white/5">
                    {step === TOTAL_STEPS - 1 ? (
                        <div className="flex flex-col gap-2.5 w-full">
                            <button
                                type="button"
                                onClick={handleLaunchPlan}
                                className="w-full py-3.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_25px_rgba(0,240,255,0.3)] hover:scale-[1.01] active:scale-[0.99]"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>Create My First Study Plan</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleComplete}
                                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-white/5"
                            >
                                <span>Explore Dashboard</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 w-full">
                            {step > 0 ? (
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-colors cursor-pointer"
                                    title="Previous step"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                            ) : null}

                            <button
                                type="button"
                                onClick={handleNext}
                                className="flex-1 py-3.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:scale-[1.01] active:scale-[0.99]"
                            >
                                <span>{step === 0 && !demoSubtaskDone ? 'Try Demo or Continue' : 'Continue'}</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
