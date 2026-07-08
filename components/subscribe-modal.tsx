'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Crown, CheckCircle2, X, Loader2, ExternalLink, Settings } from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { motion, AnimatePresence } from 'framer-motion'

interface SubscribeModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
    isAlreadySubscribed?: boolean
}

export function SubscribeModal({ isOpen, onClose, onSuccess, isAlreadySubscribed }: SubscribeModalProps) {
    const [isPending, startTransition] = useTransition()
    const [portalPending, setPortalPending] = useState(false)
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    if (!isOpen) return null

    const handleCheckout = () => {
        haptics.medium()
        setErrorMsg(null)

        const priceId = billingCycle === 'monthly'
            ? process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
            : process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID

        startTransition(async () => {
            try {
                const res = await fetch('/api/stripe/create-checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ priceId, mode: 'subscription' }),
                })
                const data = await res.json()
                if (!res.ok || !data.url) {
                    setErrorMsg(data.error || 'Could not start checkout. Please try again.')
                    return
                }
                window.location.href = data.url
            } catch {
                setErrorMsg('Network error. Please try again.')
            }
        })
    }

    const handleManageSubscription = async () => {
        haptics.medium()
        setPortalPending(true)
        setErrorMsg(null)
        try {
            const res = await fetch('/api/stripe/portal', { method: 'POST' })
            const data = await res.json()
            if (!res.ok || !data.url) {
                setErrorMsg(data.error || 'Could not open billing portal.')
                setPortalPending(false)
                return
            }
            window.location.href = data.url
        } catch {
            setErrorMsg('Network error. Please try again.')
            setPortalPending(false)
        }
    }

    const benefits = [
        'Unlimited learning plans — no cap',
        'Ambient study soundscapes (cafe, rain, space)',
        'Exclusive profile border cosmetics',
        '2× XP and focus token reward catalysts',
        'Priority Socratic AI tutor responses',
    ]

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-[#0B0D17]/85 backdrop-blur-md">
            <AnimatePresence>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 30 }}
                    className="relative w-full max-w-lg rounded-[2.5rem] bg-[#141824] border border-white/10 p-6 md:p-8 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
                >
                    {/* Close button */}
                    <button
                        onClick={() => { haptics.light(); onClose() }}
                        className="absolute right-6 top-6 w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-90"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Header */}
                    <div className="flex flex-col items-center text-center gap-2 mt-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-neon-violet to-electric-blue flex items-center justify-center border border-white/10 text-white shadow-[0_0_20px_rgba(189,0,255,0.3)]">
                            <Crown className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-wider italic mt-2">LifePivot Solo Power</h3>
                        <p className="text-gray-400 text-xs font-medium max-w-xs">
                            Unlock your full learning potential with premium tools.
                        </p>
                    </div>

                    {isAlreadySubscribed ? (
                        /* Already subscribed — show manage option */
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col items-center gap-3 py-4">
                                <div className="w-12 h-12 rounded-full bg-neon-violet/10 border border-neon-violet/20 flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-neon-violet" />
                                </div>
                                <p className="text-white font-black text-base uppercase tracking-wider">Solo Power Active</p>
                                <p className="text-gray-400 text-xs text-center leading-relaxed max-w-xs">
                                    Your Pro subscription is active. You can manage billing, update your card, or cancel via the Stripe portal.
                                </p>
                            </div>

                            {errorMsg && (
                                <p className="text-[10px] text-red-400 font-bold text-center bg-red-500/5 py-2 border border-red-500/10 rounded-xl">
                                    {errorMsg}
                                </p>
                            )}

                            <button
                                onClick={handleManageSubscription}
                                disabled={portalPending}
                                className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-95"
                            >
                                {portalPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Settings className="w-3.5 h-3.5" /> Manage Subscription</>}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Benefits checklist */}
                            <div className="space-y-2 bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
                                {benefits.map((benefit, idx) => (
                                    <div key={idx} className="flex gap-2.5 items-start text-xs text-gray-300">
                                        <CheckCircle2 className="w-4 h-4 text-electric-blue shrink-0 mt-0.5" />
                                        <span className="font-semibold leading-relaxed">{benefit}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Plan Selection Toggles */}
                            <div className="flex gap-4">
                                <div
                                    onClick={() => { haptics.light(); setBillingCycle('monthly') }}
                                    className={`flex-1 p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col gap-1 ${
                                        billingCycle === 'monthly'
                                            ? 'bg-electric-blue/5 border-electric-blue shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                                            : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Monthly plan</span>
                                    <span className="text-lg font-black text-white">$9.99<span className="text-xs text-gray-400 font-normal">/mo</span></span>
                                </div>

                                <div
                                    onClick={() => { haptics.light(); setBillingCycle('yearly') }}
                                    className={`flex-1 p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col gap-1 relative ${
                                        billingCycle === 'yearly'
                                            ? 'bg-neon-violet/5 border-neon-violet shadow-[0_0_15px_rgba(189,0,255,0.1)]'
                                            : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-neon-violet border border-neon-violet/20 text-[8px] font-black uppercase text-white tracking-widest">Save 50%</span>
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Yearly plan</span>
                                    <span className="text-lg font-black text-white">$59.99<span className="text-xs text-gray-400 font-normal">/yr</span></span>
                                </div>
                            </div>

                            {errorMsg && (
                                <p className="text-[10px] text-red-400 font-bold text-center bg-red-500/5 py-2 border border-red-500/10 rounded-xl">
                                    {errorMsg}
                                </p>
                            )}

                            <button
                                onClick={handleCheckout}
                                disabled={isPending}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-neon-violet to-electric-blue text-white hover:scale-[1.02] active:scale-95 transition-all font-black text-[10px] tracking-widest uppercase shadow-[0_0_20px_rgba(0,240,255,0.25)] flex items-center justify-center gap-2 mt-2"
                            >
                                {isPending
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <><ExternalLink className="w-3.5 h-3.5" />{`Upgrade Now • $${billingCycle === 'monthly' ? '9.99/mo' : '59.99/yr'}`}</>
                                }
                            </button>

                            <p className="text-center text-[9px] text-gray-600 font-medium">
                                Secure checkout via Stripe. Cancel anytime.
                            </p>
                        </>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
