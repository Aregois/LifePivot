'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Zap, Calendar, Coins } from 'lucide-react'
import { processPivot, checkRescheduleTier } from '@/app/actions'
import { haptics } from '@/utils/haptics'
import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from './language-provider'

interface MissedSessionOverlayProps {
    goalId: string
    onClose: () => void
}

export function MissedSessionOverlay({ goalId, onClose }: MissedSessionOverlayProps) {
    const { t } = useLanguage()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [resultTier, setResultTier] = useState<number | null>(null)
    const [potentialTier, setPotentialTier] = useState<number | null>(null)
    const [showTier3Confirmation, setShowTier3Confirmation] = useState(false)

    // Lock scroll when overlay is active
    useEffect(() => {
        const root = document.documentElement
        root.classList.add('no-scroll')
        return () => root.classList.remove('no-scroll')
    }, [])

    const handleAction = async () => {
        haptics.medium()

        // Step 1: Pre-check the tier
        const preCheck = await checkRescheduleTier(goalId)
        if (preCheck.tier === 3 && !showTier3Confirmation) {
            setPotentialTier(3)
            setShowTier3Confirmation(true)
            return
        }

        executePivot()
    }

    const executePivot = () => {
        startTransition(async () => {
            const result = await processPivot(goalId)
            if (result?.error) {
                haptics.error()
                setError(result.error)
            } else {
                setResultTier(result.tier || 1)
                setTimeout(() => {
                    onClose()
                }, 2000)
            }
        })
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0B0D17]/80 backdrop-blur-2xl"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, rotateX: 20 }}
                    animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                    exit={{ scale: 0.9, opacity: 0, rotateX: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-sm rounded-[2.5rem] bg-[#141217] border border-white/10 p-6 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden transform-style-3d"
                >
                    {/* Animated background glow */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-[100px] animate-pulse" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-electric-blue/10 rounded-full blur-[100px] animate-pulse delay-700" />

                    <div className="relative z-10 flex flex-col items-center text-center">
                        {/* Warning Icon Ring */}
                        <div className="mb-4 h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                            <AlertTriangle className="h-8 w-8 text-red-500 fill-red-500/10" strokeWidth={2.5} />
                        </div>

                        <div className="space-y-1.5 mb-6">
                            <span className="text-[9px] font-black tracking-[0.3em] text-red-500 uppercase italic">
                                {resultTier ? t('missed_session.restored') : t('missed_session.disruption')}
                            </span>
                            <h2 className="text-2xl font-black text-white tracking-tighter leading-tight uppercase italic">
                                {resultTier ? (resultTier === 1 ? t('missed_session.tier1_title') : resultTier === 2 ? t('missed_session.tier2_title') : t('missed_session.tier3_title')) : t('missed_session.interrupted')}
                            </h2>
                            <p className="text-xs text-gray-400 font-medium leading-relaxed px-2">
                                {error || (resultTier
                                    ? (resultTier === 1 ? t('missed_session.tier1_desc') : resultTier === 2 ? t('missed_session.tier2_desc') : t('missed_session.tier3_desc'))
                                    : t('missed_session.welcome_desc'))}
                            </p>
                        </div>

                        <div className="w-full space-y-3">
                            {!resultTier && !showTier3Confirmation && (
                                <button
                                    onClick={handleAction}
                                    disabled={isPending}
                                    className="group relative w-full rounded-xl bg-electric-blue py-4 px-6 flex items-center justify-between border border-electric-blue/20 shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:scale-[1.02] active:scale-95 transition-all text-white overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                    <div className="flex flex-col items-start text-left relative z-10">
                                        <span className="text-[10px] font-black tracking-widest uppercase opacity-60">
                                            {isPending ? t('missed_session.calculating') : t('missed_session.deploy_engine')}
                                        </span>
                                        <span className="text-base font-black uppercase italic tracking-tighter">
                                            {isPending ? t('missed_session.optimizing') : t('missed_session.initiate_realignment')}
                                        </span>
                                    </div>
                                    <Zap className={`h-5 w-5 text-white ${isPending ? 'animate-spin' : 'group-hover:animate-bounce'}`} />
                                </button>
                            )}

                            {!resultTier && showTier3Confirmation && (
                                <div className="space-y-2">
                                    <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest mb-1">0 Tokens remaining!</p>
                                    <button
                                        onClick={() => router.push('/shop')}
                                        className="w-full rounded-xl bg-white text-black py-4 px-6 font-black uppercase italic tracking-tighter hover:bg-gray-200 transition-all flex items-center justify-between"
                                    >
                                        <span className="text-base">Buy Tokens</span>
                                        <Coins className="h-5 w-5 fill-yellow-500/20 text-yellow-500" />
                                    </button>
                                    <button
                                        onClick={executePivot}
                                        disabled={isPending}
                                        className="w-full rounded-xl bg-white/5 border border-white/10 text-white/60 py-3 px-6 font-bold uppercase text-[10px] tracking-widest hover:text-white hover:border-white/20 transition-all"
                                    >
                                        {t('missed_session.accept_debt')}
                                    </button>
                                </div>
                            )}

                            {resultTier && (
                                <div className="w-full py-4 text-center">
                                    <div className="inline-flex items-center gap-2 text-electric-blue">
                                        <Zap className="h-5 w-5 animate-pulse" />
                                        <span className="text-xs font-black uppercase tracking-widest">{t('missed_session.resumed')}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 mt-6 px-4 py-2 rounded-full bg-white/5 border border-white/5 opacity-40">
                            <Zap className="h-3 w-3 text-electric-blue" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('missed_session.pivot_free')}</span>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
