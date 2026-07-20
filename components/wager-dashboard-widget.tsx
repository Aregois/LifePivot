'use client'

import { useEffect, useState } from 'react'
import { useEconomy } from './economy-provider'
import { Flame, ChevronRight, Loader2, Sparkles, Coins } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { haptics } from '@/utils/haptics'
import { useLanguage } from './language-provider'

export function WagerDashboardWidget() {
    const { wager } = useEconomy()
    const [currentStreak, setCurrentStreak] = useState(0)
    const [mounted, setMounted] = useState(false)

    const { t } = useLanguage()

    useEffect(() => {
        const supabase = createClient()
        const fetchStreak = async () => {
            try {
                const { data } = await supabase.from('profiles')
                    .select('current_streak')
                    .single()
                if (data) {
                    setCurrentStreak(data.current_streak ?? 0)
                }
            } catch {
                // ignore errors
            } finally {
                setMounted(true)
            }
        }
        fetchStreak()
    }, [])

    if (!mounted) return null

    if (!wager) {
        return (
            <Link 
                href="/shop"
                onClick={() => haptics.light()}
                className="group p-5 rounded-[2rem] bg-gradient-to-br from-[#1A182F] to-[#141221] border border-neon-violet/10 hover:border-neon-violet/30 transition-all duration-300 relative overflow-hidden flex flex-col gap-3.5 shadow-lg"
            >
                <div className="absolute top-0 right-0 w-24 h-24 bg-neon-violet/5 rounded-full blur-[30px] group-hover:bg-neon-violet/10 transition-all pointer-events-none" />
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-neon-violet/10 border border-neon-violet/20 flex items-center justify-center rounded-xl">
                            <Flame className="h-4 w-4 text-neon-violet" />
                        </div>
                        <span className="text-[10px] font-black text-neon-violet uppercase tracking-[0.15em]">{t('shop.wager_title')}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-neon-violet transition-colors group-hover:translate-x-0.5" />
                </div>
                <div>
                    <h4 className="text-white font-extrabold text-sm">{t('shop.wager_challenge')}</h4>
                    <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                        {t('shop.wager_desc')}
                    </p>
                </div>
            </Link>
        )
    }

    // Wager is active
    const now = new Date()
    const startDate = new Date(wager.startDate)
    const elapsedDays = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    const daysLeft = Math.max(0, 7 - elapsedDays)
    
    // Status calculations
    const isWon = currentStreak >= wager.targetStreak
    const progressPercent = Math.min(100, Math.max(0, ((currentStreak - wager.startStreak) / 7) * 100))

    return (
        <Link 
            href="/shop"
            onClick={() => haptics.light()}
            className="group p-5 rounded-[2rem] bg-[#141824]/60 border border-emerald-500/10 hover:border-emerald-500/25 transition-all duration-300 relative overflow-hidden flex flex-col gap-4 shadow-lg glass-card"
        >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-[30px] pointer-events-none" />
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center rounded-xl">
                        {isWon ? (
                            <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
                        ) : (
                            <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
                        )}
                    </div>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.15em]">
                        {isWon ? t('shop.challenge_completed') : t('shop.challenge_active')}
                    </span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-emerald-400 transition-colors group-hover:translate-x-0.5" />
            </div>

            <div className="space-y-1">
                <h4 className="text-white font-extrabold text-sm">
                    {isWon ? t('shop.claim_reward') : `${t('shop.target_streak')}: ${wager.targetStreak}`}
                </h4>
                <p className="text-[10px] text-gray-400 leading-normal">
                    {isWon 
                        ? t('shop.won_desc').replace('{target}', wager.targetStreak.toString()) 
                        : `${currentStreak} / ${wager.targetStreak} ${t('shop.current_streak').toLowerCase()} • ${Math.ceil(daysLeft)}d`
                    }
                </p>
            </div>

            {/* Simple progress bar */}
            {!isWon && (
                <div className="w-full space-y-1.5">
                    <div className="w-full h-2 bg-[#0B0D17] rounded-full overflow-hidden border border-white/5 relative">
                        <div 
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="bg-[#0B0D17]/50 border border-white/5 px-4 py-2 rounded-xl flex items-center justify-between text-[10px] font-bold text-gray-400">
                <span>Tokens Locked: {wager.amount}</span>
                <span className="text-emerald-400 flex items-center gap-0.5 font-extrabold">
                    {t('shop.wins')}: <Coins className="h-3 w-3 fill-emerald-500/20 text-emerald-400 inline" /> {wager.amount * 2}
                </span>
            </div>
        </Link>
    )
}
