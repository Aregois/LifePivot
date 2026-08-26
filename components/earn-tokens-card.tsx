'use client'

import React, { useState, useEffect } from 'react'
import { Sparkles, Clock, Play } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { haptics } from '@/utils/haptics'
import { StudyTipCarouselModal } from './study-tip-carousel-modal'

interface EarnTokensCardProps {
  tokens: number
  setTokens: React.Dispatch<React.SetStateAction<number>> | ((val: number) => void)
}

export function EarnTokensCard({ tokens, setTokens }: EarnTokensCardProps) {
  const [cooldownSecs, setCooldownSecs] = useState<number>(0)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [rewardClaimedBanner, setRewardClaimedBanner] = useState<boolean>(false)

  // Fetch initial profile cooldown on mount
  useEffect(() => {
    const supabase = createClient()
    const checkCooldown = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
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

  const formatCooldown = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const handleOpenModal = () => {
    if (cooldownSecs > 0) {
      haptics.tier4.warning()
      return
    }
    haptics.tier2.action()
    setIsModalOpen(true)
  }

  const handleTokensRewarded = (newBalance: number) => {
    setTokens(newBalance)
    setCooldownSecs(3600) // Reset 60-minute cooldown
    setRewardClaimedBanner(true)
    setTimeout(() => setRewardClaimedBanner(false), 5000)
  }

  return (
    <>
      <div className="relative bg-gradient-to-r from-[#0E1520] to-[#141824] border border-white/[0.06] p-5 rounded-[1.8rem] shadow-xl overflow-hidden">
        {/* Ambient background blur */}
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 w-32 h-32 bg-electric-blue/5 rounded-full blur-[40px] pointer-events-none"
        />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(var(--accent-rgb),0.15)]">
            🎬
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-black text-electric-blue uppercase tracking-widest">
                Earn Free Tokens
              </p>
              <Sparkles className="w-3 h-3 text-electric-blue animate-pulse" />
            </div>
            <p className="text-[9px] text-gray-400 uppercase tracking-wider mt-0.5 font-medium">
              15s Rewarded Insight · +5 Tokens
            </p>
          </div>
          <div className="ml-auto bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl shadow-[0_0_10px_rgba(245,158,11,0.15)]">
            <span className="text-[10px] font-black text-amber-400">+5 🪙</span>
          </div>
        </div>

        {rewardClaimedBanner && (
          <div className="mb-3 py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-fade-in">
            <span>✅</span>
            <span>+5 Tokens Claimed Successfully!</span>
          </div>
        )}

        <button
          onClick={handleOpenModal}
          disabled={cooldownSecs > 0}
          className={`w-full py-3.5 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
            cooldownSecs > 0
              ? 'bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-electric-blue to-soft-cyan text-black hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(var(--accent-rgb),0.25)]'
          }`}
        >
          {cooldownSecs > 0 ? (
            <>
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span>⏱ Cooldown — {formatCooldown(cooldownSecs)}</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-black text-black" />
              <span>Watch Insight (+5 Tokens)</span>
            </>
          )}
        </button>
      </div>

      {/* Standalone Rewarded Ad Modal */}
      <StudyTipCarouselModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTokensRewarded={handleTokensRewarded}
        rewardAmount={5}
      />
    </>
  )
}

export default EarnTokensCard
