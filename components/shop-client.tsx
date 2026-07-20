'use client'

import { useState, useEffect, useTransition, ComponentType } from 'react'
import { Coins, Zap, Sparkles, ShieldCheck, Loader2, Crown, Palette, Music, RotateCcw, Flame, ShoppingCart, Rocket, ExternalLink } from 'lucide-react'
import { useLanguage } from './language-provider'
import { useEconomy } from './economy-provider'
import { verifyShopPurchase, purchaseCustomization, placeWagerServer, rewardWagerServer } from '@/app/actions'
import { createClient } from '@/utils/supabase/client'
import { haptics } from '@/utils/haptics'
import { motion, AnimatePresence } from 'framer-motion'
import { EarnTokensCard } from './earn-tokens-card'




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
    const { tokens, setTokens, setVoidDays, wager, setWager } = useEconomy()
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

    // Token pack purchase state
    const [tokenPackPending, setTokenPackPending] = useState<string | null>(null)
    const [tokenPackError, setTokenPackError] = useState<string | null>(null)

    const TOKEN_PACKS = [
        {
            id: 'tokens_100',
            label: 'Starter Pack',
            tokens: 100,
            price: '$1.99',
            priceId: process.env.NEXT_PUBLIC_STRIPE_TOKENS_100_PRICE_ID,
            icon: Coins,
            color: 'from-yellow-500/20 to-amber-600/20 border-yellow-500/20',
            glow: 'shadow-[0_0_20px_rgba(234,179,8,0.1)]',
            badge: null,
        },
        {
            id: 'tokens_500',
            label: 'Explorer Pack',
            tokens: 500,
            price: '$7.99',
            priceId: process.env.NEXT_PUBLIC_STRIPE_TOKENS_500_PRICE_ID,
            icon: Sparkles,
            color: 'from-electric-blue/20 to-cyan-600/20 border-electric-blue/20',
            glow: 'shadow-[0_0_20px_rgba(var(--accent-rgb),0.1)]',
            badge: 'Best Value',
        },
        {
            id: 'tokens_1500',
            label: 'Pioneer Pack',
            tokens: 1500,
            price: '$19.99',
            priceId: process.env.NEXT_PUBLIC_STRIPE_TOKENS_1500_PRICE_ID,
            icon: Rocket,
            color: 'from-neon-violet/20 to-purple-600/20 border-neon-violet/20',
            glow: 'shadow-[0_0_20px_rgba(var(--violet-rgb),0.1)]',
            badge: 'Most Tokens',
        },
    ]

    const handleBuyTokenPack = async (priceId: string | undefined, packId: string) => {
        if (!priceId) {
            setTokenPackError('Token packs are not configured yet. Check your Stripe price IDs.')
            setTimeout(() => setTokenPackError(null), 4000)
            return
        }
        haptics.medium()
        setTokenPackPending(packId)
        setTokenPackError(null)
        try {
            const res = await fetch('/api/stripe/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priceId, mode: 'payment' }),
            })
            const data = await res.json()
            if (!res.ok || !data.url) {
                setTokenPackError(data.error || 'Could not start checkout.')
                setTimeout(() => setTokenPackError(null), 4000)
                setTokenPackPending(null)
                return
            }
            window.location.href = data.url
        } catch {
            setTokenPackError('Network error. Please try again.')
            setTimeout(() => setTokenPackError(null), 4000)
            setTokenPackPending(null)
        }
    }

    useEffect(() => {
        const titles = JSON.parse(localStorage.getItem('lifepivot_unlocked_titles') || '["title_scholar"]')
        const frames = JSON.parse(localStorage.getItem('lifepivot_unlocked_frames') || '["frame_standard"]')
        const sounds = JSON.parse(localStorage.getItem('lifepivot_unlocked_soundscapes') || '["none", "space", "rain", "binaural"]')

        // Fetch current streak
        const supabase = createClient()
        const fetchData = async () => {
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
        fetchData()
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
        if (tokens < wagerAmount) {
            haptics.error()
            setWagerError("Insufficient tokens")
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
            setTokens(res.newTokens ?? (tokens - wagerAmount))
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
            setTokens(res.newTokens ?? (tokens + rewardAmount))
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
            id: 'void',
            type: 'utility',
            title: t('shop.items.void.title'),
            description: t('shop.items.void.desc'),
            cost: 10,
            icon: Zap,
            color: 'from-soft-cyan/40 to-cyan-500 text-soft-cyan',
            glowColor: 'rgba(var(--accent-rgb),0.3)',
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

    // Re-expose all items in the exchange grid
    const activeShopItems = shopItems

    const executePurchase = (itemId: string, voidPlacement?: 'tomorrow' | 'end') => {
        const item = shopItems.find(i => i.id === itemId)
        if (!item) return

        startTransition(async () => {
            let success = false
            let message = ''

            if (item.type === 'utility') {
                const result = await verifyShopPurchase(item.id as any, voidPlacement)
                if (result && 'error' in result && result.error) {
                    haptics.error()
                    if (result.error === 'MULTIPLIER_ALREADY_ACTIVE') {
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
                message = result.message || t('shop.purchased_success').replace('{name}', item.title)

                if (item.id === 'heart' || item.id === 'tokens') {
                    setTokens(prev => prev + 5)
                } else if (item.id === 'void') {
                    setVoidDays(prev => prev + 1)
                }
            } else {
                const result = await purchaseCustomization(item.cost, item.title)
                if (result && 'error' in result && result.error) {
                    haptics.error()
                    setPurchaseError(t('shop.purchase_failed_error').replace('{error}', result.error))
                    setTimeout(() => setPurchaseError(null), 3000)
                    return
                }
                success = true
                message = result.message || t('shop.unlocked_success').replace('{name}', item.title)

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
                setTokens(prev => Math.max(0, prev - item.cost))
                setPurchaseSuccess(message)
                setTimeout(() => setPurchaseSuccess(null), 3000)
            }
        })
    }

    const handlePurchase = (item: ShopItem) => {
        if (tokens < item.cost) {
            haptics.error()
            setPurchaseError(`Not enough tokens. You need ${item.cost - tokens} more.`)
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
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-[40px] pointer-events-none" />
                <div>
                    <h2 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">{t('shop.wallet')}</h2>
                    <p className="text-2xl font-black text-white mt-1">Tokens Balance</p>
                </div>
                <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-4 py-2.5 rounded-2xl">
                    <Coins className="h-4 w-4 text-yellow-500 fill-yellow-500/30 filter drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                    <span className="text-lg font-black text-white tabular-nums">{tokens}</span>
                </div>
            </div>

            {/* Secured Ad Integration */}
            <EarnTokensCard tokens={tokens} setTokens={setTokens} />

            {/* ── Buy Tokens with Real Money ─────────────────────────────────── */}
            <div className="bg-[#141824] border border-white/5 rounded-[2.2rem] p-6 shadow-xl relative overflow-hidden flex flex-col gap-5">
                <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/5 rounded-full blur-[60px] pointer-events-none" />

                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Token Store</p>
                        <h3 className="text-white font-extrabold text-base leading-tight">Buy Tokens</h3>
                    </div>
                </div>

                <p className="text-gray-400 text-xs leading-relaxed">
                    Top up your token balance instantly. Tokens are used in the shop for power-ups, cosmetics, and more.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {TOKEN_PACKS.map((pack) => {
                        const PackIcon = pack.icon
                        const isLoading = tokenPackPending === pack.id
                        return (
                            <div
                                key={pack.id}
                                className={`relative flex flex-col gap-3 p-5 rounded-[1.5rem] bg-gradient-to-br border ${pack.color} ${pack.glow} transition-all`}
                            >
                                {pack.badge && (
                                    <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-electric-blue text-[8px] font-black uppercase tracking-widest text-black">
                                        {pack.badge}
                                    </span>
                                )}

                                <div className="flex items-center gap-2">
                                    <PackIcon className="w-5 h-5 text-white opacity-80" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{pack.label}</span>
                                </div>

                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-white tabular-nums">{pack.tokens.toLocaleString()}</span>
                                    <span className="text-xs text-gray-400 font-bold">tokens</span>
                                </div>

                                <button
                                    id={`buy-${pack.id}-btn`}
                                    onClick={() => handleBuyTokenPack(pack.priceId, pack.id)}
                                    disabled={isLoading || tokenPackPending !== null}
                                    className="mt-auto flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-white/10 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/20 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isLoading
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <><ExternalLink className="w-3 h-3" />{pack.price}</>}
                                </button>
                            </div>
                        )
                    })}
                </div>

                {tokenPackError && (
                    <p className="text-[10px] text-red-400 font-bold bg-red-500/5 border border-red-500/10 rounded-xl py-2 text-center">
                        {tokenPackError}
                    </p>
                )}

                <p className="text-center text-[9px] text-gray-600 font-medium">
                    Secure one-time payment via Stripe. No subscription required.
                </p>
            </div>

            {/* Wager consistency widget */}
            {mounted && (
                <div className="bg-[#141824] border border-white/5 p-6 rounded-[2.2rem] shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-neon-violet/5 rounded-full blur-[40px] pointer-events-none" />
                    
                    {!wager ? (
                        /* No wager active: show setup form */
                        <div className="flex-1 flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 bg-neon-violet/10 border border-neon-violet/25 flex items-center justify-center rounded-xl text-neon-violet">
                                    <Flame className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-black text-neon-violet uppercase tracking-widest">{t('shop.wager_title') || 'Streak Wager'}</span>
                            </div>
                            <h3 className="text-white font-extrabold text-base">{t('shop.wager_challenge') || 'Streak Wager Challenge'}</h3>
                            <p className="text-gray-400 text-xs leading-relaxed max-w-xl">
                                {t('shop.wager_desc') || 'Bet your Gems on your daily consistency. Reach a 7-day streak target to double your gems!'}
                            </p>
                            
                            {/* Bet selection */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select Bet Amount:</span>
                                <div className="flex gap-2">
                                    {[20, 50, 100].map(amount => (
                                        <button
                                            key={amount}
                                            type="button"
                                            onClick={() => { haptics.light(); setWagerAmount(amount) }}
                                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                                wagerAmount === amount
                                                    ? 'bg-neon-violet/15 text-neon-violet border border-neon-violet/25'
                                                    : 'bg-[#0B0D17] text-gray-500 border border-white/5 hover:text-gray-300'
                                            }`}
                                        >
                                            {amount} Tokens
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Wager active: show progress & status */
                        <div className="flex-1 flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center rounded-xl text-emerald-400">
                                    <Flame className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                    {wagerResolution === 'won' ? 'Wager Completed!' : 'Active Consistency Wager'}
                                </span>
                            </div>
                            <h3 className="text-white font-extrabold text-base">
                                {wagerResolution === 'won' ? 'Double Reward Claimable' : `Consistency Target: ${wager.targetStreak} Days`}
                            </h3>
                            <p className="text-gray-400 text-xs leading-relaxed max-w-xl">
                                {wagerResolution === 'won'
                                    ? t('shop.won_desc')?.replace('{target}', wager.targetStreak.toString()) || `Amazing job! You reached your target streak of ${wager.targetStreak} days. Your bet paid off!`
                                    : wagerResolution === 'lost'
                                        ? `Streak broken! You bet ${wager.amount} tokens but did not reach the target.`
                                        : `Maintain your focus streak. Reach a ${wager.targetStreak}-day streak to double your tokens bet. Current Streak: ${currentStreak}/${wager.targetStreak} Days.`
                                }
                            </p>
                            
                            {/* Progress bar */}
                            {wagerResolution === 'active' && (
                                <div className="w-full max-w-md space-y-1.5 mt-1">
                                    <div className="flex items-center justify-between text-[9px] font-black uppercase text-gray-500 tracking-wider">
                                        <span>Streak Progress</span>
                                        <span className="text-emerald-400">{currentStreak} / {wager.targetStreak} Days</span>
                                    </div>
                                    <div className="w-full h-2 bg-[#0B0D17] rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.min(100, Math.max(0, ((currentStreak - wager.startStreak) / 7) * 100))}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="bg-[#0B0D17]/40 border border-white/5 px-4 py-2.5 rounded-xl flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-400 mt-2 max-w-md">
                                <span>Tokens Locked: {wager.amount}</span>
                                <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                                    Claim Reward: <Coins className="w-3.5 h-3.5 inline text-emerald-400" /> {wager.amount * 2}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* CTA Actions */}
                    <div className="w-full md:w-auto shrink-0 flex flex-col gap-2">
                        {wagerError && (
                            <p className="text-[10px] text-red-400 font-bold text-center bg-red-500/5 py-2 border border-red-500/10 rounded-xl max-w-[200px]">
                                {wagerError}
                            </p>
                        )}
                        
                        {!wager ? (
                            <button
                                onClick={handlePlaceWager}
                                disabled={isPending}
                                className="px-6 py-4 rounded-xl bg-neon-violet text-white hover:scale-[1.02] active:scale-95 transition-all font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(var(--violet-rgb),0.25)] flex items-center justify-center gap-1.5"
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Wager'}
                            </button>
                        ) : wagerResolution === 'won' ? (
                            <button
                                onClick={handleClaimWager}
                                disabled={isPending}
                                className="px-6 py-4 rounded-xl bg-emerald-500 text-black hover:scale-[1.02] active:scale-95 transition-all font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1.5 animate-bounce"
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Claim Double Reward'}
                            </button>
                        ) : wagerResolution === 'lost' ? (
                            <button
                                onClick={handleDismissWager}
                                className="px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-wider hover:bg-white/10 transition-all flex items-center justify-center"
                            >
                                Acknowledge Loss
                            </button>
                        ) : (
                            <button
                                disabled
                                className="px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-gray-500 font-black text-xs uppercase tracking-wider flex items-center justify-center cursor-not-allowed"
                            >
                                Active Challenge
                            </button>
                        )}
                    </div>
                </div>
            )}

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
                {activeShopItems.map((item) => {
                    const IconComponent = item.icon
                    const isPurchased = unlockedItems.includes(item.id.startsWith('sound_') ? item.id.replace('sound_', '') : item.id)
                    const isAffordable = tokens >= item.cost

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
                                        {!isPurchased && <Coins className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500/20" />}
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
                                                        ? 'bg-electric-blue text-black hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)]'
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
