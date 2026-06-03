'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Sparkles, Heart, Diamond, Flame, Trophy, Zap, 
    BookOpen, ArrowRight, CheckCircle2, Eye, ShieldAlert, Cpu 
} from 'lucide-react'
import { haptics } from '@/utils/haptics'

interface Step {
    title: string
    description: string
    icon: any
    color: string
    glow: string
    badge: string
}

export function OnboardingTour() {
    const [mounted, setMounted] = useState(false)
    const [step, setStep] = useState(0)
    const [isOpen, setIsOpen] = useState(false)

    const steps: Step[] = [
        {
            title: "Welcome, Pathseeker",
            description: "LifePivot is an adaptive learning calendar designed to build consistency and manage your study schedule dynamically.",
            icon: Sparkles,
            color: "from-indigo-400 to-cyan-400 text-cyan-400",
            glow: "rgba(6,182,212,0.2)",
            badge: "Product Mission"
        },
        {
            title: "Resource HUD & Wallet",
            description: "Manage Hearts (Lives) and Gems. Completing study goals awards Gems. If you fall behind, Lives protect your daily streak.",
            icon: Heart,
            color: "from-rose-500 to-red-600 text-rose-500",
            glow: "rgba(244,63,94,0.2)",
            badge: "Accountability Loop"
        },
        {
            title: "Task Priority (P1 to P5)",
            description: "Plans alternate from light Exercises (P1), Overview reading (P2), up to Deep Theory (P5). Higher priorities reward more XP and Gems.",
            icon: Trophy,
            color: "from-yellow-400 to-amber-500 text-yellow-400",
            glow: "rgba(234,179,8,0.2)",
            badge: "Plan Curriculum"
        },
        {
            title: "The 3-Tier Pivot Engine",
            description: "When tasks are missed, the engine recovers. It tries a Slide (using scheduled rest days), falls back to Crunch (losing 1 Life), or Avalanches debt.",
            icon: ShieldAlert,
            color: "from-orange-500 to-rose-600 text-orange-500",
            glow: "rgba(249,115,22,0.2)",
            badge: "Intelligent Realignment"
        },
        {
            title: "Circadian Multipliers",
            description: "Study in Morning (6am-11am) or Evening (6pm-10pm) zones to earn keys. Use them to open chests for a 20-minute double multiplier booster.",
            icon: Zap,
            color: "from-cyan-400 to-violet-500 text-cyan-400",
            glow: "rgba(0,240,255,0.25)",
            badge: "Time-Locked Multipliers"
        },
        {
            title: "Active Recall & Recall Decks",
            description: "Summarize your study at completion. Socratic AI evaluates your reflection to generate Leitner spaced repetition flashcards.",
            icon: BookOpen,
            color: "from-violet-500 to-fuchsia-600 text-violet-400",
            glow: "rgba(168,85,247,0.2)",
            badge: "Recall & Spacing"
        }
    ]

    useEffect(() => {
        setMounted(true)
        const completed = localStorage.getItem('lifepivot_onboarding_completed')
        if (completed !== 'true') {
            setIsOpen(true)
        }

        // Listen for reset events immediately
        const handleCheckOnboarding = () => {
            const currentStatus = localStorage.getItem('lifepivot_onboarding_completed')
            if (currentStatus !== 'true') {
                setStep(0)
                setIsOpen(true)
            }
        }
        window.addEventListener('lifepivot_onboarding_completed_changed', handleCheckOnboarding)
        // Add polling check every second in case tab triggers it
        const pollInterval = setInterval(() => {
            const currentStatus = localStorage.getItem('lifepivot_onboarding_completed')
            if (currentStatus !== 'true' && !isOpen) {
                setStep(0)
                setIsOpen(true)
            }
        }, 1000)

        return () => {
            window.removeEventListener('lifepivot_onboarding_completed_changed', handleCheckOnboarding)
            clearInterval(pollInterval)
        }
    }, [isOpen])

    const handleNext = () => {
        haptics.medium()
        if (step < steps.length - 1) {
            setStep(prev => prev + 1)
        } else {
            localStorage.setItem('lifepivot_onboarding_completed', 'true')
            setIsOpen(false)
        }
    }

    const handleSkip = () => {
        haptics.medium()
        localStorage.setItem('lifepivot_onboarding_completed', 'true')
        setIsOpen(false)
    }

    if (!mounted || !isOpen) return null

    const currentStep = steps[step]
    const IconComponent = currentStep.icon

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#050508]/85 backdrop-blur-2xl select-none">
            {/* Ambient sliding light rings */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[20%] w-[350px] h-[350px] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[20%] right-[20%] w-[350px] h-[350px] bg-neon-violet/5 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            <motion.div
                initial={{ scale: 0.95, opacity: 0, rotateX: 10 }}
                animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                exit={{ scale: 0.95, opacity: 0, rotateX: 10 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="relative w-full max-w-sm rounded-[2.5rem] bg-[#141217] border border-white/10 p-7 shadow-[0_0_80px_rgba(0,0,0,0.85)] flex flex-col items-center justify-between min-h-[440px] text-center overflow-hidden"
            >
                {/* Dynamic Radial Glow */}
                <div 
                    className="absolute inset-0 opacity-20 pointer-events-none transition-all duration-700 blur-[50px]"
                    style={{ background: `radial-gradient(circle at center, ${currentStep.glow}, transparent 65%)` }}
                />

                {/* Badge Label */}
                <div className="relative z-10">
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-500 bg-white/5 border border-white/5 px-3 py-1 rounded-full">
                        {currentStep.badge}
                    </span>
                </div>

                {/* Step Content Card */}
                <div className="relative z-10 flex flex-col items-center gap-6 my-6 flex-1 justify-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25 }}
                            className="flex flex-col items-center gap-5"
                        >
                            {/* Visual Icon */}
                            <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${currentStep.color} flex items-center justify-center border border-white/10 shadow-lg`}>
                                <IconComponent className="h-7 w-7 text-white" />
                            </div>

                            {/* Header & Description */}
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-white italic tracking-tighter leading-snug uppercase">
                                    {currentStep.title}
                                </h3>
                                <p className="text-xs text-gray-400 font-medium leading-relaxed px-1">
                                    {currentStep.description}
                                </p>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Bottom navigation dots and button */}
                <div className="relative z-10 w-full flex flex-col gap-4">
                    {/* Stepper Dots indicator */}
                    <div className="flex justify-center gap-1.5">
                        {steps.map((_, i) => (
                            <div 
                                key={i} 
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    i === step ? 'w-5 bg-electric-blue shadow-[0_0_8px_#00f0ff]' : 'w-1.5 bg-white/15'
                                }`} 
                            />
                        ))}
                    </div>

                    {/* Controls Actions */}
                    <div className="flex items-center gap-3 w-full">
                        {step < steps.length - 1 ? (
                            <button
                                onClick={handleSkip}
                                className="flex-1 py-3 text-xs font-black text-gray-500 hover:text-gray-400 uppercase tracking-widest transition-colors"
                            >
                                Skip
                            </button>
                        ) : null}
                        
                        <button
                            onClick={handleNext}
                            className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                step === steps.length - 1
                                    ? 'bg-electric-blue text-black shadow-[0_0_15px_rgba(0,240,255,0.25)] hover:scale-[1.02] active:scale-[0.98]'
                                    : 'bg-white text-black hover:scale-[1.02] active:scale-[0.98]'
                            }`}
                        >
                            {step === steps.length - 1 ? (
                                <>
                                    Begin Journey
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                </>
                            ) : (
                                <>
                                    Next Tip
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
