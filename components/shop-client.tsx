'use client'

import { useState, useEffect, useTransition, ComponentType } from 'react'
import { Heart, Zap, Sparkles, Diamond, ShieldCheck, Loader2, Crown, Palette, Music, RotateCcw, Flame } from 'lucide-react'
import { useLanguage } from './language-provider'
import { useEconomy } from './economy-provider'
import { verifyShopPurchase, purchaseCustomization, placeWagerServer, rewardWagerServer } from '@/app/actions'
import { createClient } from '@/utils/supabase/client'
import { haptics } from '@/utils/haptics'
import { motion, AnimatePresence } from 'framer-motion'



interface ShopItem {
    id: string
    type: 'utility' | 'title' | 'frame' | 'soundscape'
    title: string
    description: string
    cost: number
    icon: ComponentType<{ className?: string }>
    color: string
    glowColor: string
    badge?: string
}

export function ShopClient() {
    const { t } = useLanguage()
    const { gems, setGems, setLives, setVoidDays, wager, setWager } = useEconomy()
    const [isPending, startTransition] = useTransition()
    const [purchaseError, setPurchaseError] = useState<string | null>(null)
    const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null)
    const [unlockedItems, setUnlockedItems] = useState<string[]>([])
    const [mounted, setMounted] = useState(false)
    const [voidPlacementModal, setVoidPlacementModal] = useState(false)

    // Wager States
    const [currentStreak, setCurrentStreak] = useState(0)
    const [wagerAmount, setWagerAmount] = useState(20)
    const [confirmingWager, setConfirmingWager] = useState(false)
    const [wagerError, setWagerError] = useState<string | null>(null)

    useEffect(() => {
        const titles = JSON.parse(localStorage.getItem('lifepivot_unlocked_titles') || '["title_scholar"]')
        const frames = JSON.parse(localStorage.getItem('lifepivot_unlocked_frames') || '["frame_standard"]')
        const sounds = JSON.parse(localStorage.getItem('lifepivot_unlocked_soundscapes') || '["none", "space", "rain", "binaural"]')

        // Fetch current streak
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
                setUnlockedItems([...titles, ...frames, ...sounds])
                setMounted(true)
            }
        }
        fetchStreak()
    }, [])

    const wagerResolution = (() => {
        if (!wager || !mounted) return null

        const now = new Date()
        const startDate = new Date(wager.startDate)
        const elapsedDays = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        const daysLeft = Math.max(0, 7 - elapsedDays)
        const maxPossibleStreak = currentStreak + Math.ceil(daysLeft)

        if (currentStreak >= wager.targetStreak) {
            return 'won'
        } else if (maxPossibleStreak < wager.targetStreak || (currentStreak === 0 && elapsedDays > 0.05)) {
            return 'lost'
        } else {
            return 'active'
        }
    })()

    const handlePlaceWager = async () => {
        if (gems < wagerAmount) {
            haptics.error()
            setWagerError(t('shop.wager_insufficient_gems'))
            setTimeout(() => setWagerError(null), 3000)
            return
        }

        haptics.medium()
        
        startTransition(async () => {
            const res = await placeWagerServer(wagerAmount)
            if (res.error) {
                haptics.error()
                setWagerError(res.error)
                setTimeout(() => setWagerError(null), 3000)
                return
            }

            // Success
            haptics.medium()
            setGems(res.newGems ?? (gems - wagerAmount))
            setWager({
                amount: wagerAmount,
                startStreak: currentStreak,
                targetStreak: currentStreak + 7,
                daysRemaining: 7,
                startDate: new Date().toISOString()
            })
            setConfirmingWager(false)
            setPurchaseSuccess(t('shop.wager_success_placed').replace('{amount}', wagerAmount.toString()).replace('{target}', (currentStreak + 7).toString()))
            setTimeout(() => setPurchaseSuccess(null), 5000)
        })
    }

    const handleClaimWager = async () => {
        if (!wager) return

        haptics.medium()
        startTransition(async () => {
            const rewardAmount = wager.amount * 2
            const res = await rewardWagerServer(rewardAmount)
            if (res.error) {
                haptics.error()
                setWagerError(res.error)
                setTimeout(() => setWagerError(null), 3000)
                return
            }

            haptics.medium()
            setGems(res.newGems ?? (gems + rewardAmount))
            setWager(null)
            setPurchaseSuccess(t('shop.wager_reward_claimed').replace('{amount}', rewardAmount.toString()))
            setTimeout(() => setPurchaseSuccess(null), 5000)
        })
    }

    const handleDismissWager = () => {
        haptics.light()
        setWager(null)
    }


    const shopItems: ShopItem[] = [
        {
            id: 'heart',
            type: 'utility',
            title: t('shop.items.heart.title'),
            description: t('shop.items.heart.desc'),
            cost: 5,
            icon: Heart,
            color: 'from-rose-500 to-red-600 text-rose-500',
            glowColor: 'rgba(244,63,94,0.3)',
            badge: t('shop.items.heart.badge')
        },
        {
            id: 'void',
            type: 'utility',
            title: t('shop.items.void.title'),
            description: t('shop.items.void.desc'),
            cost: 10,
            icon: Zap,
            color: 'from-soft-cyan/40 to-cyan-500 text-soft-cyan',
            glowColor: 'rgba(0,240,255,0.3)',
            badge: t('shop.items.void.badge')
        },
        {
            id: 'multiplier',
            type: 'utility',
            title: t('shop.items.multiplier.title'),
            description: t('shop.items.multiplier.desc'),
            cost: 15,
            icon: Sparkles,
            color: 'from-amber-400 to-orange-500 text-amber-400',
            glowColor: 'rgba(245,158,11,0.3)',
            badge: t('shop.items.multiplier.badge')
        },
        {
            id: 'shield',
            type: 'utility',
            title: t('shop.items.shield.title'),
            description: t('shop.items.shield.desc'),
            cost: 15,
            icon: ShieldCheck,
            color: 'from-emerald-400 to-teal-500 text-teal-400',
            glowColor: 'rgba(52,211,153,0.3)',
            badge: t('shop.items.shield.badge')
        },
        {
            id: 'repair',
            type: 'utility',
            title: t('shop.items.repair.title'),
            description: t('shop.items.repair.desc'),
            cost: 30,
            icon: RotateCcw,
            color: 'from-indigo-400 to-purple-500 text-indigo-400',
            glowColor: 'rgba(129,140,248,0.3)',
            badge: t('shop.items.repair.badge')
        },
        {
            id: 'title_alchemist',
            type: 'title',
            title: t('shop.items.title_alchemist.title'),
            description: t('shop.items.title_alchemist.desc'),
            cost: 15,
            icon: Crown,
            color: 'from-violet-500 to-fuchsia-600 text-violet-400',
            glowColor: 'rgba(168,85,247,0.3)',
            badge: t('shop.items.title_alchemist.badge')
        },
        {
            id: 'title_navigator',
            type: 'title',
            title: t('shop.items.title_navigator.title'),
            description: t('shop.items.title_navigator.desc'),
            cost: 20,
            icon: Crown,
            color: 'from-cyan-500 to-blue-600 text-cyan-400',
            glowColor: 'rgba(6,182,212,0.3)',
            badge: t('shop.items.title_navigator.badge')
        },
        {
            id: 'title_legend',
            type: 'title',
            title: t('shop.items.title_legend.title'),
            description: t('shop.items.title_legend.desc'),
            cost: 25,
            icon: Crown,
            color: 'from-yellow-400 to-amber-500 text-yellow-400',
            glowColor: 'rgba(234,179,8,0.3)',
            badge: t('shop.items.title_legend.badge')
        },
        {
            id: 'frame_neon',
            type: 'frame',
            title: t('shop.items.frame_neon.title'),
            description: t('shop.items.frame_neon.desc'),
            cost: 20,
            icon: Palette,
            color: 'from-emerald-400 to-cyan-500 text-cyan-400',
            glowColor: 'rgba(52,211,153,0.3)',
            badge: t('shop.items.frame_neon.badge')
        },
        {
            id: 'frame_sunset',
            type: 'frame',
            title: t('shop.items.frame_sunset.title'),
            description: t('shop.items.frame_sunset.desc'),
            cost: 25,
            icon: Palette,
            color: 'from-amber-500 to-rose-600 text-amber-500',
            glowColor: 'rgba(249,115,22,0.3)',
            badge: t('shop.items.frame_sunset.badge')
        },
        {
            id: 'frame_cosmic',
            type: 'frame',
            title: t('shop.items.frame_cosmic.title'),
            description: t('shop.items.frame_cosmic.desc'),
            cost: 30,
            icon: Palette,
            color: 'from-indigo-500 to-purple-600 text-indigo-400',
            glowColor: 'rgba(99,102,241,0.3)',
            badge: t('shop.items.frame_cosmic.badge')
        },
        {
            id: 'sound_cafe',
            type: 'soundscape',
            title: t('shop.items.sound_cafe.title'),
            description: t('shop.items.sound_cafe.desc'),
            cost: 15,
            icon: Music,
            color: 'from-purple-500 to-pink-600 text-pink-400',
            glowColor: 'rgba(139,92,246,0.3)',
            badge: t('shop.items.sound_cafe.badge')
        },
        {
            id: 'sound_greenhouse',
            type: 'soundscape',
            title: t('shop.items.sound_greenhouse.title'),
            description: t('shop.items.sound_greenhouse.desc'),
            cost: 15,
            icon: Music,
            color: 'from-green-500 to-teal-600 text-green-400',
            glowColor: 'rgba(16,185,129,0.3)',
            badge: t('shop.items.sound_greenhouse.badge')
        }
    ]

    const executePurchase = (itemId: string, voidPlacement?: 'tomorrow' | 'end') => {
        const item = shopItems.find(i => i.id === itemId)
        if (!item) return

        startTransition(async () => {
            let success = false
            let message = ''

            if (item.type === 'utility') {
                const result = await verifyShopPurchase(item.id as 'heart' | 'void' | 'multiplier' | 'shield' | 'repair', voidPlacement)
                if (result && 'error' in result && result.error) {
                    haptics.error()
                    if (result.error === 'LIVES_FULL') {
                        setPurchaseError(t('shop.hearts_full'))
                    } else if (result.error === 'MULTIPLIER_ALREADY_ACTIVE') {
                        setPurchaseError(t('shop.multiplier_active'))
                    } else if (result.error === 'SHIELDS_FULL') {
                        setPurchaseError(t('shop.shields_full'))
                    } else if (result.error === 'STREAK_NOT_BROKEN') {
                        setPurchaseError(t('shop.streak_active'))
                    } else if (result.error === 'NO_STREAK_TO_REPAIR') {
                        setPurchaseError(t('shop.no_repair'))
                    } else {
                        setPurchaseError(t('shop.purchase_failed'))
                    }
                    setTimeout(() => setPurchaseError(null), 3000)
                    return
                }
                success = true
                message = result.message || `Successfully purchased ${item.title}!`

                if (item.id === 'heart') {
                    setLives(prev => Math.min(5, prev + 1))
                } else if (item.id === 'void') {
                    setVoidDays(prev => prev + 1)
                }
            } else {
                const result = await purchaseCustomization(item.cost, item.title)
                if (result && 'error' in result && result.error) {
                    haptics.error()
                    setPurchaseError('Purchase failed: ' + result.error)
                    setTimeout(() => setPurchaseError(null), 3000)
                    return
                }
                success = true
                message = result.message || `Successfully unlocked ${item.title}!`

                if (item.type === 'title') {
                    const titles = JSON.parse(localStorage.getItem('lifepivot_unlocked_titles') || '["title_scholar"]')
                    if (!titles.includes(item.id)) {
                        titles.push(item.id)
                        localStorage.setItem('lifepivot_unlocked_titles', JSON.stringify(titles))
                    }
                } else if (item.type === 'frame') {
                    const frames = JSON.parse(localStorage.getItem('lifepivot_unlocked_frames') || '["frame_standard"]')
                    if (!frames.includes(item.id)) {
                        frames.push(item.id)
                        localStorage.setItem('lifepivot_unlocked_frames', JSON.stringify(frames))
                    }
                } else if (item.type === 'soundscape') {
                    const sounds = JSON.parse(localStorage.getItem('lifepivot_unlocked_soundscapes') || '["none", "space", "rain", "binaural"]')
                    const key = item.id.replace('sound_', '')
                    if (!sounds.includes(key)) {
                        sounds.push(key)
                        localStorage.setItem('lifepivot_unlocked_soundscapes', JSON.stringify(sounds))
                    }
                }

                const key = item.id.startsWith('sound_') ? item.id.replace('sound_', '') : item.id
                setUnlockedItems(prev => [...prev, key])
            }

            if (success) {
                haptics.medium()
                setGems(prev => Math.max(0, prev - item.cost))
                setPurchaseSuccess(message)
                setTimeout(() => setPurchaseSuccess(null), 3000)
            }
        })
    }

    const handlePurchase = (item: ShopItem) => {
        if (gems < item.cost) {
            haptics.error()
            setPurchaseError(`Not enough Gems! You need ${item.cost - gems} more.`)
            setTimeout(() => setPurchaseError(null), 3000)
            return
        }

        haptics.medium()
        setPurchaseError(null)
        setPurchaseSuccess(null)

        if (item.id === 'void') {
            setVoidPlacementModal(true)
        } else {
            executePurchase(item.id)
        }
    }

    if (!mounted) return null

    return (
        <div className="flex flex-col gap-6 py-6 px-4 md:px-8 w-full max-w-md md:max-w-4xl xl:max-w-6xl mx-auto">
            <div className="px-2 mb-2">
                <h1 className="text-3xl font-black text-white leading-tight">{t('shop.exchange')}</h1>
                <p className="text-gray-400 text-xs mt-1">{t('shop.exchange_desc')}</p>
            </div>
            {/* Header / Balance */}
            <div className="flex items-center justify-between bg-gradient-to-r from-[#1E2338] to-[#141829] border border-white/5 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-electric-blue/10 rounded-full blur-[40px] pointer-events-none" />
                <div>
                    <h2 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">{t('shop.wallet')}</h2>
                    <p className="text-2xl font-black text-white mt-1">{t('shop.exchange')}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-electric-blue/10 border border-electric-blue/20 px-4 py-2.5 rounded-2xl">
                    <Diamond className="h-4 w-4 text-electric-blue fill-electric-blue/30" />
                    <span className="text-lg font-black text-electric-blue tabular-nums">{gems}</span>
                </div>
            </div>

            {/* {t('shop.wager_title')} Challenge */}
            <div className="w-full">
                {!wager ? (
                    <div className="bg-[#141824] border border-white/5 p-6 rounded-[2.2rem] flex flex-col gap-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-neon-violet/5 rounded-full blur-[40px] pointer-events-none" />
                        <div className="flex items-start justify-between">
                            <div>
                                <span className="text-[10px] font-black text-neon-violet uppercase tracking-[0.2em] bg-neon-violet/10 border border-neon-violet/20 px-3 py-1 rounded-full">{t('shop.wager_challenge')}</span>
                                <h3 className="text-xl font-black text-white mt-3">{t('shop.wager_title')}</h3>
                                <p className="text-gray-400 text-xs mt-1">{t('shop.wager_desc')}</p>
                            </div>
                            <div className="h-10 w-10 bg-neon-violet/10 border border-neon-violet/20 flex items-center justify-center rounded-xl shrink-0">
                                <Flame className="h-5 w-5 text-neon-violet" />
                            </div>
                        </div>

                        {/* Wager amounts chips selector */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('shop.select_bet')}</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[10, 20, 50, 100].map((amt) => {
                                    const active = wagerAmount === amt
                                    return (
                                        <button
                                            key={amt}
                                            onClick={() => {
                                                haptics.light()
                                                setWagerAmount(amt)
                                            }}
                                            className={`py-3.5 rounded-2xl text-sm font-black border transition-all flex flex-col items-center justify-center gap-1 ${
                                                active
                                                    ? 'bg-neon-violet/25 border-neon-violet text-white scale-105 shadow-[0_0_15px_rgba(189,0,255,0.25)]'
                                                    : 'bg-[#0B0D17] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                                            }`}
                                        >
                                            <span className="flex items-center gap-0.5">
                                                <Diamond className="h-3 w-3 fill-current shrink-0" />
                                                {amt}
                                            </span>
                                            <span className="text-[8px] font-bold text-gray-500 uppercase">{t('shop.wins')} {amt * 2}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Target Details */}
                        <div className="bg-[#0B0D17] border border-white/5 p-4 rounded-2xl flex items-center justify-between text-xs">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('shop.target_streak')}</span>
                                <span className="text-white font-extrabold">{currentStreak + 7} Days</span>
                            </div>
                            <div className="h-8 w-[1px] bg-white/5" />
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('shop.wager_term')}</span>
                                <span className="text-white font-extrabold">7 Days</span>
                            </div>
                            <div className="h-8 w-[1px] bg-white/5" />
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('shop.current_streak')}</span>
                                <span className="text-gray-400 font-extrabold">{currentStreak} Days</span>
                            </div>
                        </div>

                        {wagerError && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-2xl text-center font-bold">
                                {wagerError}
                            </div>
                        )}

                        <button
                            onClick={() => {
                                if (confirmingWager) {
                                    handlePlaceWager()
                                } else {
                                    haptics.medium()
                                    setConfirmingWager(true)
                                    setTimeout(() => setConfirmingWager(false), 3000)
                                }
                            }}
                            disabled={isPending}
                            className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                                confirmingWager
                                    ? 'bg-amber-500 text-black animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                                    : 'bg-white text-black hover:scale-[1.02] active:scale-[0.98]'
                            }`}
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : confirmingWager ? (
                                t('shop.confirm_wager')
                            ) : (
                                <>
                                    <Flame className="h-4 w-4 fill-current" />
                                    {t('shop.place_wager')}
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    /* Wager Active/Resolved Card */
                    <div className="bg-[#141824] border border-white/5 p-6 rounded-[2.2rem] flex flex-col gap-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[40px] pointer-events-none" />
                        
                        {wagerResolution === 'won' ? (
                            <div className="flex flex-col gap-4 text-center items-center py-4">
                                <div className="h-16 w-16 bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] text-emerald-400 animate-bounce">
                                    <Sparkles className="h-8 w-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white">{t('shop.challenge_completed')}</h3>
                                    <p className="text-gray-400 text-xs mt-2 max-w-sm">
                                        {t('shop.won_desc').replace('{target}', wager.targetStreak.toString())}
                                    </p>
                                </div>
                                <div className="bg-[#0B0D17] border border-white/5 px-6 py-3.5 rounded-2xl flex items-center gap-3">
                                    <div className="text-left">
                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">{t('shop.double_reward')}</span>
                                        <span className="text-emerald-400 text-lg font-black flex items-center gap-1 mt-0.5">
                                            <Diamond className="h-4 w-4 fill-emerald-400/20 shrink-0" />
                                            +{wager.amount * 2} Gems
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClaimWager}
                                    disabled={isPending}
                                    className="w-full mt-2 py-4 rounded-2xl bg-emerald-500 text-black font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                                >
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('shop.claim_reward')}
                                </button>
                            </div>
                        ) : wagerResolution === 'lost' ? (
                            <div className="flex flex-col gap-4 text-center items-center py-4">
                                <div className="h-16 w-16 bg-red-500/20 border border-red-500/30 flex items-center justify-center rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.3)] text-red-400">
                                    <RotateCcw className="h-8 w-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white">{t('shop.wager_lost')}</h3>
                                    <p className="text-gray-400 text-xs mt-2 max-w-sm">
                                        {t('shop.lost_desc').replace('{amount}', wager.amount.toString())}
                                    </p>
                                </div>
                                <button
                                    onClick={handleDismissWager}
                                    className="w-full mt-2 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-sm hover:bg-white/10 active:scale-[0.98] transition-all"
                                >
                                    {t('shop.acknowledge')}
                                </button>
                            </div>
                        ) : (
                            /* Active status progress card */
                            <div className="flex flex-col gap-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">{t('shop.challenge_active')}</span>
                                        <h3 className="text-lg font-black text-white mt-3">{t('shop.wager_title')} In Progress</h3>
                                        <p className="text-gray-400 text-xs mt-1">{t('shop.wager_active_desc').replace('{target}', wager.targetStreak.toString())}</p>
                                    </div>
                                    <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center rounded-xl shrink-0">
                                        <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" />
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="space-y-2 mt-2">
                                    <div className="flex justify-between items-end text-xs">
                                        <span className="text-gray-400 font-extrabold">{t('shop.current_streak')}: {currentStreak} / {wager.targetStreak} Days</span>
                                        <span className="text-emerald-400 font-black">
                                            {Math.round(Math.min(100, Math.max(0, ((currentStreak - wager.startStreak) / 7) * 100)))}%
                                        </span>
                                    </div>
                                    <div className="w-full h-3 bg-[#0B0D17] rounded-full overflow-hidden border border-white/5 relative">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                                            style={{ width: `${Math.round(Math.min(100, Math.max(0, ((currentStreak - wager.startStreak) / 7) * 100)))}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Details list */}
                                <div className="grid grid-cols-2 gap-3 mt-1">
                                    <div className="bg-[#0B0D17] border border-white/5 p-3 rounded-2xl text-center">
                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">{t('shop.gems_locked')}</span>
                                        <span className="text-white font-extrabold text-sm flex items-center justify-center gap-1 mt-0.5">
                                            <Diamond className="h-3.5 w-3.5 fill-white/10 text-white shrink-0" />
                                            {wager.amount}
                                        </span>
                                    </div>
                                    <div className="bg-[#0B0D17] border border-white/5 p-3 rounded-2xl text-center">
                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">{t('shop.double_reward')}</span>
                                        <span className="text-emerald-400 font-extrabold text-sm flex items-center justify-center gap-1 mt-0.5">
                                            <Diamond className="h-3.5 w-3.5 fill-emerald-400/20 text-emerald-400 shrink-0" />
                                            {wager.amount * 2}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Notification center */}
            <div className="min-h-[40px] relative z-20">

                <AnimatePresence mode="wait">
                    {purchaseError && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-2xl text-center font-bold"
                        >
                            {purchaseError}
                        </motion.div>
                    )}
                    {purchaseSuccess && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-3 rounded-2xl text-center font-bold flex items-center justify-center gap-1.5"
                        >
                            <ShieldCheck className="h-4 w-4" />
                            {purchaseSuccess}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {shopItems.map((item) => {
                    const IconComponent = item.icon
                    const isPurchased = unlockedItems.includes(item.id.startsWith('sound_') ? item.id.replace('sound_', '') : item.id)
                    const isAffordable = gems >= item.cost

                    return (
                        <div
                            key={item.id}
                            className="bg-[#141824] border border-white/5 rounded-[2.2rem] p-5 flex items-start gap-4 transition-all duration-300 relative overflow-hidden group hover:border-white/10"
                        >
                            {/* Backdrop Glow */}
                            <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-[40px]"
                                style={{ background: `radial-gradient(circle at 10% 20%, ${item.glowColor}, transparent 50%)` }}
                            />

                            {/* Icon Wrapper */}
                            <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center border border-white/10 shrink-0 shadow-lg`}>
                                <IconComponent className="h-5 w-5 text-white" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-extrabold text-sm text-white truncate">{item.title}</h3>
                                    {item.badge && (
                                        <span className="text-[8px] font-black uppercase bg-white/5 text-gray-500 border border-white/5 px-2 py-0.5 rounded-full shrink-0">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-400 text-xs leading-relaxed">
                                    {item.description}
                                </p>

                                {/* Cost & Buy Button */}
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                                    <div className="flex items-center gap-1 text-electric-blue">
                                        {!isPurchased && <Diamond className="h-3.5 w-3.5 fill-electric-blue/20" />}
                                        <span className="text-xs font-black tabular-nums">{isPurchased ? t('shop.unlocked') : item.cost}</span>
                                    </div>

                                    <button
                                        onClick={() => !isPurchased && handlePurchase(item)}
                                        disabled={isPending || isPurchased}
                                        className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                                            isPurchased
                                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default'
                                                : isPending
                                                    ? 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed'
                                                    : isAffordable
                                                        ? 'bg-electric-blue text-black hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                                                        : 'bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10'
                                        }`}
                                    >
                                        {isPending ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : isPurchased ? (
                                            t('shop.owned')
                                        ) : (
                                            t('shop.exchange_btn')
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Void Placement Selection Modal */}
            <AnimatePresence>
                {voidPlacementModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0B0D17]/80 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-sm rounded-[2.5rem] bg-[#141824] border border-white/10 p-6 shadow-2xl flex flex-col gap-5 text-center"
                        >
                            <div className="mx-auto h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                                <Zap className="h-6 w-6" />
                            </div>
                            <div className="space-y-1.5">
                                <h3 className="text-lg font-black text-white uppercase tracking-wider italic">{t('shop.position_rest')}</h3>
                                <p className="text-xs text-gray-400 leading-relaxed px-2 font-medium">
                                    {t('shop.rest_desc')}
                                </p>
                            </div>
                            <div className="flex flex-col gap-2.5">
                                <button
                                    onClick={() => {
                                        setVoidPlacementModal(false)
                                        executePurchase('void', 'tomorrow')
                                    }}
                                    className="w-full py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    {t('shop.rest_tomorrow')}
                                </button>
                                <button
                                    onClick={() => {
                                        setVoidPlacementModal(false)
                                        executePurchase('void', 'end')
                                    }}
                                    className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white hover:text-white hover:bg-white/10 hover:border-white/20 font-black text-xs uppercase tracking-wider transition-all"
                                >
                                    {t('shop.rest_end')}
                                </button>
                                <button
                                    onClick={() => {
                                        haptics.light()
                                        setVoidPlacementModal(false)
                                    }}
                                    className="w-full py-2 text-xs font-black text-gray-500 hover:text-gray-400 uppercase tracking-widest transition-colors mt-1"
                                >
                                    {t('shop.cancel')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
