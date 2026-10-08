'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Clock, X, AlertCircle, Loader2, Sparkles } from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { useLanguage } from '@/components/language-provider'

export interface StudyTipCarouselModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => Promise<void> | void
  onTokensRewarded?: (newTokensBalance: number) => void
  rewardAmount?: number
}

interface StudyTip {
  icon: string
  tag: string
  title: string
  description: string
  colorScheme: 'cyan' | 'violet' | 'amber' | 'emerald'
}

const DEFAULT_STUDY_TIPS: StudyTip[] = [
  {
    icon: '🧠',
    tag: 'COGNITIVE SCIENCE',
    title: 'Active Recall Retrieval',
    description:
      'Testing your memory before re-reading notes creates 3x stronger neural pathways than passive review.',
    colorScheme: 'cyan',
  },
  {
    icon: '⏳',
    tag: 'LEARNING PROTOCOL',
    title: 'Spaced Interval Repetition',
    description:
      'Review concepts right when forgetting curves begin to steepen to achieve permanent long-term retention.',
    colorScheme: 'violet',
  },
  {
    icon: '🌌',
    tag: 'NEURAL CONSOLIDATION',
    title: 'Strategic Void Days',
    description:
      'Taking scheduled rest days allows your brain to organize memories into structural understanding without breaking streaks.',
    colorScheme: 'amber',
  },
  {
    icon: '⚡',
    tag: 'FEYNMAN TECHNIQUE',
    title: 'Conceptual Grounding',
    description:
      'If you cannot explain a concept in simple everyday terms, you have identified a fundamental knowledge gap.',
    colorScheme: 'emerald',
  },
  {
    icon: '🎯',
    tag: 'ENERGY ALIGNMENT',
    title: 'Priority Sequencing (P5/P4)',
    description:
      'Tackle highest-friction syllabus milestones at peak morning alertness for maximum compound gains.',
    colorScheme: 'cyan',
  },
]

const TOTAL_AD_SECONDS = 15

export function StudyTipCarouselModal({
  isOpen,
  onClose,
  onComplete,
  onTokensRewarded,
  rewardAmount = 5,
}: StudyTipCarouselModalProps) {
  const { t } = useLanguage()
  const [secondsRemaining, setSecondsRemaining] = useState<number>(TOTAL_AD_SECONDS)
  const [slideIndex, setSlideIndex] = useState<number>(0)
  const [isCompleted, setIsCompleted] = useState<boolean>(false)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true)
  const [isClaiming, setIsClaiming] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cooldownSecs, setCooldownSecs] = useState<number>(0)
  const [claimSuccess, setClaimSuccess] = useState<boolean>(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize Ad Session on Modal Open
  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    setSecondsRemaining(TOTAL_AD_SECONDS)
    setSlideIndex(0)
    setIsCompleted(false)
    setSessionToken(null)
    setIsLoadingSession(true)
    setIsClaiming(false)
    setErrorMessage(null)
    setCooldownSecs(0)
    setClaimSuccess(false)

    const initAdSession = async () => {
      try {
        const res = await fetch('/api/tokens/ad-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        const data = await res.json()

        if (res.status === 429) {
          haptics.tier4.warning()
          setCooldownSecs(data.cooldownRemaining || 3600)
          setIsLoadingSession(false)
          return
        }

        if (!res.ok) {
          throw new Error(data.error || 'Failed to initialize ad session')
        }

        setSessionToken(data.sessionToken)
        setIsLoadingSession(false)

        // Start countdown timer
        let remaining = TOTAL_AD_SECONDS
        timerRef.current = setInterval(() => {
          remaining -= 1
          setSecondsRemaining(remaining)

          if (remaining <= 0) {
            if (timerRef.current) clearInterval(timerRef.current)
            setIsCompleted(true)
            haptics.tier3.success()
          }
        }, 1000)
      } catch (err: any) {
        console.error('Ad session error:', err)
        haptics.tier4.error()
        setErrorMessage(err.message || 'Unable to connect to reward server')
        setIsLoadingSession(false)
      }
    }

    initAdSession()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isOpen])

  // Auto-advance study tip every 3 seconds
  useEffect(() => {
    if (!isOpen || isLoadingSession || isCompleted) return
    const elapsed = TOTAL_AD_SECONDS - secondsRemaining
    const currentSlide = Math.min(Math.floor(elapsed / 3), DEFAULT_STUDY_TIPS.length - 1)
    setSlideIndex(currentSlide)
  }, [secondsRemaining, isOpen, isLoadingSession, isCompleted])

  // Cooldown local tick
  useEffect(() => {
    if (cooldownSecs <= 0) return
    const cooldownTimer = setTimeout(() => {
      setCooldownSecs((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearTimeout(cooldownTimer)
  }, [cooldownSecs])

  const formatCooldown = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const handleClaimReward = async () => {
    if (!sessionToken || isClaiming || !isCompleted) return

    setIsClaiming(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/tokens/reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim reward')
      }

      haptics.tier3.celebrate()
      setClaimSuccess(true)

      if (data.newTokensBalance !== undefined && onTokensRewarded) {
        onTokensRewarded(data.newTokensBalance)
      }

      if (onComplete) {
        await onComplete()
      }

      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err: any) {
      console.error('Claim reward error:', err)
      haptics.tier4.error()
      setErrorMessage(err.message || 'Failed to claim tokens')
      setIsClaiming(false)
    }
  }

  const defaultTip = DEFAULT_STUDY_TIPS[slideIndex] || DEFAULT_STUDY_TIPS[0]
  const localizedTag = t(`study_tips.tips.${slideIndex}.tag`)
  const localizedTitle = t(`study_tips.tips.${slideIndex}.title`)
  const localizedDesc = t(`study_tips.tips.${slideIndex}.description`)

  const currentTip = {
    icon: defaultTip.icon,
    colorScheme: defaultTip.colorScheme,
    tag: localizedTag && !localizedTag.startsWith('study_tips.') ? localizedTag : defaultTip.tag,
    title: localizedTitle && !localizedTitle.startsWith('study_tips.') ? localizedTitle : defaultTip.title,
    description: localizedDesc && !localizedDesc.startsWith('study_tips.') ? localizedDesc : defaultTip.description,
  }
  const progressRatio = (TOTAL_AD_SECONDS - secondsRemaining) / TOTAL_AD_SECONDS

  // SVG Circular math
  const radius = 24
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - progressRatio * circumference

  const tagColorStyles = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.15)]',
    violet: 'bg-neon-violet/10 text-neon-violet border-neon-violet/20 shadow-[0_0_10px_rgba(189,0,255,0.15)]',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#050508]/95 backdrop-blur-xl"
            onClick={() => {
              if (isCompleted || cooldownSecs > 0 || errorMessage) {
                haptics.tier1.light()
                onClose()
              }
            }}
          />

          {/* Ambient Glows */}
          <div
            aria-hidden="true"
            className="fixed top-0 right-0 w-80 h-80 bg-electric-blue/10 rounded-full blur-[100px] pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="fixed bottom-0 left-0 w-80 h-80 bg-neon-violet/10 rounded-full blur-[100px] pointer-events-none"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-[420px] bg-[#0c101c]/95 border border-white/10 p-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {/* Close Button (Enabled when completed, error, or on cooldown) */}
            {(isCompleted || cooldownSecs > 0 || errorMessage || claimSuccess) && (
              <button
                onClick={() => {
                  haptics.tier1.light()
                  onClose()
                }}
                className="absolute top-5 right-5 p-2 text-gray-400 hover:text-white rounded-full bg-white/5 border border-white/10 transition-colors z-20"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Header Bar */}
            <div className="flex items-center justify-between mb-5 pr-8">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
                <span className="text-[10px] font-black text-amber-400 tracking-[0.2em] uppercase">
                  {t('study_tips.sponsored_insight')}
                </span>
              </div>

              <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                <span className="text-[10px] font-black text-amber-400">
                  {t('study_tips.tokens_reward', { amount: rewardAmount })}
                </span>
              </div>
            </div>

            {/* Loading Session State */}
            {isLoadingSession && !cooldownSecs && !errorMessage && (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 animate-spin text-electric-blue mb-4" />
                <p className="text-xs font-black tracking-widest uppercase text-white mb-1">
                  {t('study_tips.connecting')}
                </p>
                <p className="text-[11px] text-gray-400">
                  {t('study_tips.generating')}
                </p>
              </div>
            )}

            {/* Cooldown Active State */}
            {cooldownSecs > 0 && !isLoadingSession && (
              <div className="py-10 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-2xl shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  ⏳
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white mb-1">
                  {t('study_tips.cooldown_active')}
                </h3>
                <p className="text-xs text-gray-400 mb-5 max-w-[260px]">
                  {t('study_tips.cooldown_desc')}
                </p>
                <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 font-mono text-base font-black text-amber-400 tracking-wider mb-6">
                  {formatCooldown(cooldownSecs)}
                </div>
                <button
                  onClick={() => {
                    haptics.tier1.light()
                    onClose()
                  }}
                  className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-black tracking-widest uppercase text-gray-300 transition-colors"
                >
                  {t('study_tips.return_to_shop')}
                </button>
              </div>
            )}

            {/* Error State */}
            {errorMessage && !isLoadingSession && cooldownSecs === 0 && (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white mb-1">
                  {t('study_tips.session_error')}
                </h3>
                <p className="text-xs text-rose-300 mb-6 max-w-[280px]">
                  {errorMessage}
                </p>
                <button
                  onClick={() => {
                    haptics.tier1.light()
                    onClose()
                  }}
                  className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-black tracking-widest uppercase text-white transition-colors"
                >
                  {t('workspaces.cancel')}
                </button>
              </div>
            )}

            {/* Main Interactive Carousel Content */}
            {!isLoadingSession && !cooldownSecs && !errorMessage && (
              <>
                {/* Countdown & Progress bar Row */}
                <div className="flex items-center gap-4 mb-5 pb-4 border-b border-white/[0.06]">
                  {/* SVG Circular countdown ring */}
                  <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                    <svg className="w-14 h-14 -rotate-90">
                      <circle
                        cx="28"
                        cy="28"
                        r={radius}
                        fill="transparent"
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeWidth="3.5"
                      />
                      <circle
                        cx="28"
                        cy="28"
                        r={radius}
                        fill="transparent"
                        stroke="var(--color-electric-blue)"
                        strokeWidth="3.5"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-linear drop-shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-sm font-black text-white font-mono leading-none">
                        {secondsRemaining}
                      </span>
                      <span className="text-[7px] font-black text-gray-500 uppercase tracking-wider">
                        SEC
                      </span>
                    </div>
                  </div>

                  {/* Progress Header & Linear Bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black tracking-wider uppercase text-white">
                        {isCompleted ? t('study_tips.reward_unlocked') : t('study_tips.learning_interstitial')}
                      </span>
                      <span className="text-[10px] font-black text-electric-blue">
                        {Math.round(progressRatio * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-electric-blue to-soft-cyan rounded-full"
                        style={{ width: `${progressRatio * 100}%` }}
                        transition={{ duration: 0.3, ease: 'linear' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Study Tip Slide Carousel Card */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center text-center min-h-[170px] justify-center relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={slideIndex}
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center w-full"
                    >
                      <div className="text-3xl mb-2 filter drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
                        {currentTip.icon}
                      </div>

                      <div
                        className={`inline-flex px-2.5 py-0.5 rounded-full border text-[9px] font-black tracking-widest uppercase mb-2 ${
                          tagColorStyles[currentTip.colorScheme]
                        }`}
                      >
                        {currentTip.tag}
                      </div>

                      <h4 className="text-sm font-black text-white tracking-wide mb-1.5">
                        {currentTip.title}
                      </h4>

                      <p className="text-[11.5px] leading-relaxed text-gray-300 max-w-[320px]">
                        {currentTip.description}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Slide Indicator Dots */}
                <div className="flex items-center justify-center gap-1.5 my-4">
                  {DEFAULT_STUDY_TIPS.map((_, idx) => (
                    <motion.div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === slideIndex
                          ? 'w-5 bg-electric-blue shadow-[0_0_8px_rgba(var(--accent-rgb),0.6)]'
                          : idx < slideIndex
                          ? 'w-1.5 bg-emerald-400'
                          : 'w-1.5 bg-white/10'
                      }`}
                    />
                  ))}
                </div>

                {/* Bottom CTA Action Area */}
                <div className="mt-2">
                  {claimSuccess ? (
                    <div className="w-full py-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                      <CheckCircle2 className="w-4 h-4" />
                      {t('study_tips.tokens_claimed')}
                    </div>
                  ) : isCompleted ? (
                    <button
                      onClick={handleClaimReward}
                      disabled={isClaiming}
                      className="w-full py-4 rounded-2xl font-black text-xs tracking-widest uppercase text-black bg-gradient-to-r from-electric-blue to-soft-cyan hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(var(--accent-rgb),0.35)] cursor-pointer"
                    >
                      {isClaiming ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-black" />
                          {t('study_tips.claiming')}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          {t('study_tips.claim_reward', { amount: rewardAmount })}
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-3 text-gray-400">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-[11px] font-bold tracking-wider">
                        {secondsRemaining}s
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default StudyTipCarouselModal
