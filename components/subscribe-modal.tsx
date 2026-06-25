'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Sparkles, Crown, CheckCircle2, CreditCard, X, Loader2 } from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { motion, AnimatePresence } from 'framer-motion'

interface SubscribeModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function SubscribeModal({ isOpen, onClose, onSuccess }: SubscribeModalProps) {
    const [isPending, startTransition] = useTransition()
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
    const [cardName, setCardName] = useState('')
    const [cardNumber, setCardNumber] = useState('')
    const [expiry, setExpiry] = useState('')
    const [cvc, setCvc] = useState('')
    const [checkoutStep, setCheckoutStep] = useState<'details' | 'success'>('details')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    if (!isOpen) return null

    const handleCheckout = (e: React.FormEvent) => {
        e.preventDefault()
        if (!cardName.trim() || cardNumber.length < 16 || expiry.length < 5 || cvc.length < 3) {
            setErrorMsg('Please fill in all credit card details correctly')
            return
        }

        haptics.medium()
        setErrorMsg(null)
        startTransition(async () => {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setErrorMsg('Not authenticated')
                    return
                }

                // Update is_subscribed to true in profiles
                const { error } = await supabase
                    .from('profiles')
                    .update({ is_subscribed: true })
                    .eq('id', user.id)

                if (error) {
                    haptics.error()
                    setErrorMsg(error.message || 'Failed to update subscription')
                    return
                }

                haptics.medium()
                setCheckoutStep('success')
                if (onSuccess) {
                    onSuccess()
                }
            } catch (err) {
                console.error(err)
                setErrorMsg('Transaction processing failed')
            }
        })
    }

    const benefits = [
        'Unlimited learning paths & active plans',
        'Ambient study soundscapes (cafe, rain, space)',
        'Exclusive profile border cosmetics',
        '2x XP and focus token reward catalysts',
        'Priority Socratic AI tutor responses'
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

                    {checkoutStep === 'details' ? (
                        <>
                            {/* Premium Header */}
                            <div className="flex flex-col items-center text-center gap-2 mt-4">
                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-neon-violet to-electric-blue flex items-center justify-center border border-white/10 text-white shadow-[0_0_20px_rgba(189,0,255,0.3)]">
                                    <Crown className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-wider italic mt-2">LifePivot Solo Power</h3>
                                <p className="text-gray-400 text-xs font-medium max-w-xs">
                                    Unlock your full learning potential with premium tools.
                                </p>
                            </div>

                            {/* Benefits checklist */}
                            <div className="space-y-2 bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
                                {benefits.map((benefit, idx) => (
                                    <div key={idx} className="flex gap-2.5 items-start text-xs text-gray-300">
                                        <CheckCircle2 className="w-4.5 h-4.5 text-electric-blue shrink-0 mt-0.5" />
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

                            {/* Credit Card checkout form */}
                            <form onSubmit={handleCheckout} className="flex flex-col gap-4 border-t border-white/5 pt-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <CreditCard className="w-4 h-4 text-gray-400" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mock Checkout details</span>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Cardholder Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={cardName}
                                        onChange={(e) => setCardName(e.target.value)}
                                        placeholder="Jane Doe"
                                        className="w-full bg-[#0B0D17]/80 border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-electric-blue transition-colors font-medium"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Card Number</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={16}
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                                        placeholder="4111 2222 3333 4444"
                                        className="w-full bg-[#0B0D17]/80 border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-electric-blue transition-colors font-medium"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Expiry (MM/YY)</label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={5}
                                            value={expiry}
                                            onChange={(e) => {
                                                let val = e.target.value.replace(/\D/g, '')
                                                if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2, 4)
                                                setExpiry(val)
                                            }}
                                            placeholder="12/28"
                                            className="w-full bg-[#0B0D17]/80 border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-electric-blue transition-colors font-medium"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">CVC</label>
                                        <input
                                            type="password"
                                            required
                                            maxLength={3}
                                            value={cvc}
                                            onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                                            placeholder="•••"
                                            className="w-full bg-[#0B0D17]/80 border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-electric-blue transition-colors font-medium"
                                        />
                                    </div>
                                </div>

                                {errorMsg && (
                                    <p className="text-[10px] text-red-400 font-bold text-center bg-red-500/5 py-2 border border-red-500/10 rounded-xl">
                                        {errorMsg}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-neon-violet to-electric-blue text-white hover:scale-[1.02] active:scale-95 transition-all font-black text-[10px] tracking-widest uppercase shadow-[0_0_20px_rgba(0,240,255,0.25)] flex items-center justify-center gap-1.5 mt-2"
                                >
                                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : `Subscribe Now • $${billingCycle === 'monthly' ? '9.99' : '59.99'}`}
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Success View */
                        <div className="py-12 flex flex-col items-center justify-center text-center gap-4 mt-6">
                            <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-pulse">
                                <Sparkles className="w-8 h-8" />
                            </div>
                            <h3 className="text-white font-black text-lg uppercase tracking-wider italic">Solo Power Active</h3>
                            <p className="text-gray-400 text-xs leading-relaxed max-w-xs font-medium">
                                Your account has been upgraded successfully. You now have unlimited path creation and premium customizations!
                            </p>
                            
                            <button
                                onClick={() => {
                                    haptics.light()
                                    onClose()
                                    window.location.reload()
                                }}
                                className="mt-4 px-8 py-3.5 rounded-xl bg-electric-blue text-black font-black text-[10px] tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)] hover:scale-105 active:scale-95"
                            >
                                Enter Learning Domain
                            </button>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
