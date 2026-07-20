'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { haptics } from '@/utils/haptics'

const STUDY_TIPS = [
  {
    title: 'Active Recall',
    tip: 'Test yourself before reading notes. Forcing your brain to retrieve info double-strengthens neural pathways.',
  },
  {
    title: 'Context Grounding',
    tip: 'Upload your syllabus pages in Learning Goals. The AI Tutor uses these specific topics to tailor your checklist.',
  },
  {
    title: 'Void Days',
    tip: 'Schedule strategic void days on long-term plans. Rest prevents cognitive burnout and keeps your streak shield safe.',
  },
  {
    title: 'Habit Wagers',
    tip: 'Lock in tokens before beginning your weekly sprint. Financial commitment builds 3x higher task consistency.',
  },
  {
    title: 'Spaced Repetition',
    tip: 'Review cards at expanding intervals (1, 3, 7 days). This blocks the forgetting curve with minimal study time.',
  },
]

interface EarnTokensCardProps {
  tokens: number
  setTokens: (val: number) => void
}

export function EarnTokensCard({ tokens, setTokens }: EarnTokensCardProps) {
  const [cooldownSecs, setCooldownSecs] = useState<number>(0)
  const [loadingSession, setLoadingSession] = useState<boolean>(false)
  const [adPlaying, setAdPlaying] = useState<boolean>(false)
  const [adCountdown, setAdCountdown] = useState<number>(15)
  const [currentTipIndex, setCurrentTipIndex] = useState<number>(0)
  
  const [earnError, setEarnError] = useState<string | null>(null)
  const [earnSuccess, setEarnSuccess] = useState<boolean>(false)

  // Fetch initial profile cooldown on mount
  useEffect(() => {
    const supabase = createClient()
    const checkCooldown = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('profiles')
          .select('last_ad_reward_at')
          .single()

        if (data?.last_ad_reward_at) {
          const lastReward = new Date(data.last_ad_reward_at).getTime()
          const elapsed = Date.now() - lastReward
          const sixtyMinutes = 60 * 60 * 1000
          if (elapsed < sixtyMinutes) {
            setCooldownSecs(Math.ceil((sixtyMinutes - elapsed) / 1000))
          }
        }
      } catch (err) {
        console.error('Failed to load ad cooldown status:', err)
      }
    }
    checkCooldown()
  }, [])

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSecs <= 0) return
    const timer = setTimeout(() => {
      setCooldownSecs((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearTimeout(timer)
  }, [cooldownSecs])

  // Study Tip Carousel Auto-advance during ad
  useEffect(() => {
    if (!adPlaying) return
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % STUDY_TIPS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [adPlaying])

  const formatCooldown = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  };

  const handleStartAd = async () => {
    if (cooldownSecs > 0 || adPlaying || loadingSession) return
    
    haptics.medium()
    setLoadingSession(true)
    setEarnError(null)

    try {
      // 1. Request signed token session from backend
      const res = await fetch('/api/tokens/ad-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()

      if (res.status === 429) {
        const remaining = json.cooldownRemaining || 3600
        setCooldownSecs(remaining)
        setLoadingSession(false)
        return
      }

      if (!res.ok) {
        throw new Error(json.error || 'Failed to start ad session')
      }

      const { sessionToken } = json

      // 2. Launch the 15-second branded interstitial
      setLoadingSession(false)
      setAdPlaying(true)
      setAdCountdown(15)
      setCurrentTipIndex(0)

      // Start 15s countdown
      let remaining = 15
      const countdownInterval = setInterval(async () => {
        remaining -= 1
        setAdCountdown(remaining)

        if (remaining <= 0) {
          clearInterval(countdownInterval)
          
          // 3. Request reward on complete
          try {
            const rewardRes = await fetch('/api/tokens/reward', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionToken }),
            })
            const rewardJson = await rewardRes.json()

            if (rewardRes.ok) {
              haptics.medium()
              setTokens(rewardJson.newTokensBalance ?? tokens + 5)
              setEarnSuccess(true)
              setCooldownSecs(3600) // Trigger 60 minutes cooldown
              setTimeout(() => setEarnSuccess(false), 4000)
            } else {
              setEarnError(rewardJson.error || 'Failed to redeem reward')
            }
          } catch {
            setEarnError('Connection error redeeming reward')
          } finally {
            setAdPlaying(false)
          }
        }
      }, 1000)

    } catch (err: any) {
      console.error(err)
      setEarnError(err.message || 'Error initializing ad. Try again.')
      setLoadingSession(false)
    }
  }

  // Circular progress math
  const radius = 24
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (adCountdown / 15) * circumference

  return (
    <div className="relative bg-gradient-to-r from-[#0E1520] to-[#141824] border border-white/[0.06] p-5 rounded-[1.8rem] shadow-xl overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-electric-blue/5 rounded-full blur-[30px] pointer-events-none" />
      
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center text-lg shadow-[0_0_12px_rgba(var(--accent-rgb),0.15)]">🎬</div>
        <div>
          <p className="text-[10px] font-black text-electric-blue uppercase tracking-widest">Earn Free Tokens</p>
          <p className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Secure Ad Integration · Earn 5 tokens</p>
        </div>
        <div className="ml-auto bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-xl">
          <span className="text-[10px] font-black text-yellow-400">+5 🪙</span>
        </div>
      </div>

      {earnSuccess && (
        <p className="text-[10px] font-black text-emerald-400 text-center mb-3 bg-emerald-500/5 border border-emerald-500/10 py-2.5 rounded-xl">
          ✅ +5 TOKENS ADDED TO YOUR WALLET!
        </p>
      )}

      {earnError && (
        <p className="text-[10px] font-black text-rose-400 text-center mb-3 bg-rose-500/5 border border-rose-500/10 py-2.5 rounded-xl flex items-center justify-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> {earnError}
        </p>
      )}

      {/* Main button (not playing) */}
      {!adPlaying && (
        <button
          onClick={handleStartAd}
          disabled={loadingSession || cooldownSecs > 0}
          className={`w-full py-3.5 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${
            cooldownSecs > 0
              ? 'bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-electric-blue to-soft-cyan text-black hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(var(--accent-rgb),0.25)]'
          }`}
        >
          {loadingSession ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              Initializing Ad Session...
            </>
          ) : cooldownSecs > 0 ? (
            `⏱ Cooldown — ${formatCooldown(cooldownSecs)}`
          ) : (
            '▶  Watch Ad for 5 Tokens'
          )}
        </button>
      )}

      {/* Interstitial Ad / Tip Carousel Overlay when playing */}
      <AnimatePresence>
        {adPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mt-3 bg-black/40 border border-white/[0.04] p-4 rounded-2xl flex flex-col gap-3"
          >
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-electric-blue animate-pulse" /> LifePivot Study Tips
              </span>
              
              {/* Circular progress loader */}
              <div className="relative w-8 h-8 flex items-center justify-center">
                <svg className="w-8 h-8 -rotate-90">
                  <circle
                    cx="16"
                    cy="16"
                    r={radius}
                    fill="transparent"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r={radius}
                    fill="transparent"
                    stroke="var(--color-electric-blue)"
                    strokeWidth="3"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span className="absolute text-[10px] font-black text-white">{adCountdown}</span>
              </div>
            </div>

            {/* Carousel Content */}
            <div className="min-h-[64px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTipIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-[10px] font-black text-electric-blue uppercase tracking-wider mb-1">
                    {STUDY_TIPS[currentTipIndex].title}
                  </p>
                  <p className="text-[9.5px] leading-relaxed text-gray-300">
                    {STUDY_TIPS[currentTipIndex].tip}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 15, ease: 'linear' }}
                className="h-full bg-gradient-to-r from-electric-blue to-soft-cyan"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
