'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Flame, Target, Sparkles, Check, Coins, Zap } from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { useLanguage } from '@/components/language-provider'
import { useEconomy } from '@/components/economy-provider'
import { claimAchievementReward } from '@/app/actions'

interface DailyChallengesCardProps {
  completedTasksCount: number
  streakCount: number
  todayStr: string
}

interface Challenge {
  id: string
  title: string
  description: string
  progress: number
  target: number
  xpReward: number
  tokenReward: number
  icon: typeof Trophy
  iconColor: string
  iconBg: string
}

export function DailyChallengesCard({
  completedTasksCount,
  streakCount,
  todayStr,
}: DailyChallengesCardProps) {
  const { t } = useLanguage()
  const { setTokens, setXp, setLevel, level } = useEconomy()

  const [focusMins, setFocusMins] = useState(0)
  const [claimedQuests, setClaimedQuests] = useState<string[]>([])
  const [claimingId, setClaimingId] = useState<string | null>(null)

  useEffect(() => {
    // Read today's focus minutes from localStorage
    const savedMins = Number(localStorage.getItem('lifepivot_focus_mins_today') || 0)
    setFocusMins(savedMins)

    // Check claimed quests for today
    const questDate = localStorage.getItem('lifepivot_claimed_quests_date')
    if (questDate === todayStr) {
      try {
        const claimed = JSON.parse(localStorage.getItem('lifepivot_claimed_quests') || '[]')
        setClaimedQuests(claimed)
      } catch {
        setClaimedQuests([])
      }
    } else {
      localStorage.setItem('lifepivot_claimed_quests_date', todayStr)
      localStorage.setItem('lifepivot_claimed_quests', '[]')
      setClaimedQuests([])
    }
  }, [todayStr])

  const challenges: Challenge[] = [
    {
      id: 'daily_focus',
      title: t('dashboard.quest_deep_focus_title'),
      description: t('dashboard.quest_deep_focus_desc'),
      progress: focusMins,
      target: 25,
      xpReward: 15,
      tokenReward: 2,
      icon: Target,
      iconColor: 'text-electric-blue',
      iconBg: 'bg-electric-blue/15 border-electric-blue/25',
    },
    {
      id: 'daily_tasks',
      title: t('dashboard.quest_tasks_title'),
      description: t('dashboard.quest_tasks_desc'),
      progress: completedTasksCount,
      target: 2,
      xpReward: 20,
      tokenReward: 2,
      icon: Zap,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-400/15 border-amber-400/25',
    },
    {
      id: 'daily_streak',
      title: t('dashboard.quest_streak_title'),
      description: t('dashboard.quest_streak_desc'),
      progress: Math.min(1, Math.max(completedTasksCount >= 1 ? 1 : 0, streakCount > 0 ? 1 : 0)),
      target: 1,
      xpReward: 10,
      tokenReward: 1,
      icon: Flame,
      iconColor: 'text-orange-400',
      iconBg: 'bg-orange-500/15 border-orange-500/25',
    },
  ]

  const handleClaim = async (challenge: Challenge) => {
    if (claimedQuests.includes(challenge.id) || claimingId !== null) return

    setClaimingId(challenge.id)
    haptics.tier3.celebrate()

    try {
      const res = await claimAchievementReward(
        challenge.xpReward,
        challenge.tokenReward,
        challenge.title
      )

      if (res && !('error' in res)) {
        // Optimistic economy updates
        setTokens((prev) => prev + challenge.tokenReward)
        setXp((prev) => {
          const next = prev + challenge.xpReward
          const needed = level * 100
          if (next >= needed) {
            setLevel((l) => l + 1)
            return next - needed
          }
          return next
        })

        const nextClaimed = [...claimedQuests, challenge.id]
        setClaimedQuests(nextClaimed)
        localStorage.setItem('lifepivot_claimed_quests', JSON.stringify(nextClaimed))
      }
    } catch (err) {
      console.error('Failed to claim quest reward:', err)
    } finally {
      setClaimingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {challenges.map((challenge, idx) => {
        const isFinished = challenge.progress >= challenge.target
        const isClaimed = claimedQuests.includes(challenge.id)
        const percent = Math.min(100, Math.max(0, (challenge.progress / challenge.target) * 100))
        const IconComponent = challenge.icon

        return (
          <motion.div
            key={challenge.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.05 }}
            className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
              isClaimed
                ? 'bg-[#121624]/40 border-white/5 opacity-70'
                : 'bg-[#151928]/85 border-white/10 shadow-lg'
            }`}
          >
            <div className="flex items-start gap-3.5">
              {/* Challenge Icon */}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${challenge.iconBg}`}
              >
                <IconComponent className={`w-5 h-5 ${challenge.iconColor}`} />
              </div>

              {/* Challenge Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-sm sm:text-base font-bold text-white truncate">
                    {challenge.title}
                  </h4>
                  <span className="text-xs font-mono font-bold text-slate-400 shrink-0">
                    {challenge.progress}/{challenge.target}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                  {challenge.description}
                </p>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden mt-3 border border-white/5">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isFinished
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                        : 'bg-gradient-to-r from-electric-blue to-neon-violet'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {/* Rewards & Claim Row */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-electric-blue bg-electric-blue/10 px-2 py-0.5 rounded-md border border-electric-blue/20">
                      <Sparkles className="w-3 h-3" />+{challenge.xpReward} XP
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-md border border-yellow-400/20">
                      <Coins className="w-3 h-3" />+{challenge.tokenReward}
                    </span>
                  </div>

                  {isClaimed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      {t('dashboard.claimed')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!isFinished || claimingId === challenge.id}
                      onClick={() => handleClaim(challenge)}
                      className={`text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 ${
                        isFinished
                          ? 'bg-gradient-to-r from-electric-blue to-neon-violet text-white shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)] animate-pulse'
                          : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                      }`}
                    >
                      <Trophy className="w-3 h-3" />
                      {t('dashboard.claim_reward')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
