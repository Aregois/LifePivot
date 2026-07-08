'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function PaymentSuccessPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const sessionId = searchParams.get('session_id')
    const [countdown, setCountdown] = useState(5)

    useEffect(() => {
        if (countdown === 0) {
            router.push('/plan')
        }
    }, [countdown, router])

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="fixed inset-0 bg-[#0B0D17] flex items-center justify-center p-6">
            {/* Ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-neon-violet/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/3 -translate-y-1/3 w-64 h-64 bg-electric-blue/10 rounded-full blur-[80px] pointer-events-none" />

            <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 24 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', duration: 0.6 }}
                className="relative z-10 w-full max-w-sm flex flex-col items-center text-center gap-6 bg-[#141824] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl"
            >
                {/* Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-violet/20 to-electric-blue/20 border border-white/10 flex items-center justify-center shadow-[0_0_40px_rgba(189,0,255,0.25)]"
                >
                    <Sparkles className="w-9 h-9 text-electric-blue" />
                </motion.div>

                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-black text-white uppercase tracking-wider">
                        Payment Confirmed
                    </h1>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Your account is being updated. This usually takes a few seconds.
                    </p>
                </div>

                {/* Auto-redirect */}
                <div className="flex items-center gap-2 text-xs text-gray-500 font-bold">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-electric-blue" />
                    <span>Redirecting in <span className="text-electric-blue tabular-nums">{countdown}s</span></span>
                </div>

                <div className="w-full flex flex-col gap-3 border-t border-white/5 pt-4">
                    <Link
                        href="/plan"
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-neon-violet to-electric-blue text-white font-black text-[10px] tracking-widest uppercase text-center shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        Go to My Plans
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                        href="/shop"
                        className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-400 font-bold text-[10px] tracking-widest uppercase text-center hover:bg-white/10 transition-all"
                    >
                        Visit the Shop
                    </Link>
                </div>
            </motion.div>
        </div>
    )
}
