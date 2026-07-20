'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles, Key, Lock, Diamond, Flame, Zap } from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from './language-provider'

export function CircadianChests() {
    const { t } = useLanguage()
    const [mounted, setMounted] = useState(false)
    const [hasDawnKey, setHasDawnKey] = useState(false)
    const [hasDuskKey, setHasDuskKey] = useState(false)
    const [multiplierEnd, setMultiplierEnd] = useState<number | null>(null)
    const [timeLeft, setTimeLeft] = useState(0)
    const [celebrating, setCelebrating] = useState(false)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Current hour
    const [hour, setHour] = useState(new Date().getHours())

    useEffect(() => {
        setMounted(true)
        updateStates()
        
        // Polling timer to keep hour and countdown accurate
        const interval = setInterval(() => {
            setHour(new Date().getHours())
            updateStates()
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    const updateStates = () => {
        if (typeof window === 'undefined') return
        setHasDawnKey(localStorage.getItem('lifepivot_dawn_key') === 'true')
        setHasDuskKey(localStorage.getItem('lifepivot_dusk_key') === 'true')
        
        const end = localStorage.getItem('lifepivot_chest_multiplier_end')
        if (end) {
            const endNum = Number(end)
            if (Date.now() < endNum) {
                setMultiplierEnd(endNum)
                setTimeLeft(Math.ceil((endNum - Date.now()) / 1000))
            } else {
                setMultiplierEnd(null)
                localStorage.removeItem('lifepivot_chest_multiplier_end')
            }
        }
    }

    // Active multiplier timer countdown
    useEffect(() => {
        if (multiplierEnd) {
            timerRef.current = setInterval(() => {
                const diff = Math.ceil((multiplierEnd - Date.now()) / 1000)
                if (diff <= 0) {
                    setMultiplierEnd(null)
                    localStorage.removeItem('lifepivot_chest_multiplier_end')
                    if (timerRef.current) clearInterval(timerRef.current)
                } else {
                    setTimeLeft(diff)
                }
            }, 1000)
        } else {
            if (timerRef.current) clearInterval(timerRef.current)
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }, [multiplierEnd])

    const handleOpenChest = (type: 'dawn' | 'dusk') => {
        haptics.medium()
        setCelebrating(true)
        
        // Consume key and start 20 minutes booster
        if (type === 'dawn') {
            localStorage.removeItem('lifepivot_dawn_key')
            setHasDawnKey(false)
        } else {
            localStorage.removeItem('lifepivot_dusk_key')
            setHasDuskKey(false)
        }

        const endTime = Date.now() + 20 * 60 * 1000 // 20 minutes
        localStorage.setItem('lifepivot_chest_multiplier_end', String(endTime))
        setMultiplierEnd(endTime)
        setTimeLeft(20 * 60)

        // Light celebration haptic pulse
        let pulses = 0
        const interval = setInterval(() => {
            haptics.light()
            pulses++
            if (pulses > 8) clearInterval(interval)
        }, 150)

        setTimeout(() => {
            setCelebrating(false)
        }, 4000)
    }

    const formatTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
        const s = (totalSeconds % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    if (!mounted) return null

    // Time window definitions
    const isMorning = hour >= 6 && hour < 11
    const isEvening = hour >= 18 && hour < 22

    // Determine current chest option
    let chestState: 'dawn_locked' | 'dawn_ready' | 'dusk_locked' | 'dusk_ready' | 'waiting' = 'waiting'
    
    if (isMorning) {
        chestState = hasDawnKey ? 'dawn_ready' : 'dawn_locked'
    } else if (isEvening) {
        chestState = hasDuskKey ? 'dusk_ready' : 'dusk_locked'
    }

    return (
        <div className="w-full relative">
            {/* Full-Screen Opening Celebration Overlay */}
            <AnimatePresence>
                {celebrating && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-lg flex flex-col items-center justify-center text-center p-6"
                    >
                        {/* Exploding particles */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            {[...Array(24)].map((_, i) => {
                                const angle = (i * 360) / 24
                                const distance = 100 + Math.random() * 200
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 0, x: 0, y: 0 }}
                                        animate={{
                                            scale: [0, 1.5, 0],
                                            x: Math.cos((angle * Math.PI) / 180) * distance,
                                            y: Math.sin((angle * Math.PI) / 180) * distance
                                        }}
                                        transition={{ duration: 1.5, ease: 'easeOut', repeat: 1 }}
                                        className="absolute w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-cyan-400 to-violet-500"
                                        style={{ boxShadow: '0 0 10px rgba(var(--accent-rgb), 0.8)' }}
                                    />
                                )
                            })}
                        </div>

                        <motion.div
                            initial={{ scale: 0.5, rotate: -20 }}
                            animate={{ scale: [0.5, 1.2, 1], rotate: 0 }}
                            transition={{ type: 'spring', damping: 15 }}
                            className="flex flex-col items-center gap-6 max-w-sm"
                        >
                            <div className="h-24 w-24 bg-gradient-to-br from-cyan-400 to-violet-500 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(var(--accent-rgb),0.5)] border border-white/20">
                                <Sparkles className="h-12 w-12 text-white animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black text-white uppercase tracking-wider">{t('circadian.celebration_title')}</h2>
                                <p className="text-gray-400 text-xs leading-relaxed px-4">
                                    {t('circadian.celebration_desc')}
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Active Booster Widget (Always visible if booster is running) */}
            <AnimatePresence>
                {multiplierEnd && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 15 }}
                        className="bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/25 p-5 rounded-[2rem] flex items-center justify-between shadow-md mb-4 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/5 rounded-full blur-2xl pointer-events-none" />
                        <div className="flex items-center gap-3.5">
                            <div className="h-11 w-11 rounded-2xl bg-cyan-400/15 border border-cyan-400/20 flex items-center justify-center shadow-[0_0_15px_rgba(var(--accent-rgb),0.15)]">
                                <Zap className="h-5 w-5 text-cyan-400 animate-bounce" />
                            </div>
                            <div>
                                <h4 className="text-white font-extrabold text-sm flex items-center gap-1.5">
                                    {t('circadian.catalyst_active')}
                                </h4>
                                <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mt-0.5 animate-pulse">
                                    {t('circadian.multiplier_enabled')}
                                </p>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">{t('circadian.time_left')}</span>
                            <span className="text-white font-black text-lg font-mono tracking-tight block mt-0.5">{formatTime(timeLeft)}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Circadian Chest Container Card */}
            {!multiplierEnd && (
                <div className="bg-[#141824] border border-white/5 p-5 rounded-[2rem] flex flex-col gap-4 relative overflow-hidden group shadow-lg">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full">
                                {t('circadian.title')}
                            </span>
                            <h3 className="text-lg font-black text-white mt-3">{t('circadian.subtitle')}</h3>
                            <p className="text-gray-400 text-[10px] mt-1 leading-relaxed">
                                {t('circadian.desc')}
                            </p>
                        </div>
                    </div>

                    {/* Rendering Chest State */}
                    {chestState === 'dawn_ready' && (
                        <div className="bg-[#0B0D17] border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                                    <Key className="h-5 w-5 text-emerald-400 animate-pulse" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-white text-xs font-black uppercase">{t('circadian.dawn_unlocked_title')}</h4>
                                    <p className="text-[9px] text-gray-500 mt-0.5 truncate">{t('circadian.dawn_unlocked_desc')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleOpenChest('dawn')}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_12px_rgba(16,185,129,0.3)] active:scale-95 transition-all shrink-0"
                            >
                                {t('circadian.open_btn')}
                            </button>
                        </div>
                    )}

                    {chestState === 'dusk_ready' && (
                        <div className="bg-[#0B0D17] border border-cyan-500/20 p-4 rounded-2xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center shrink-0">
                                    <Key className="h-5 w-5 text-cyan-400 animate-pulse" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-white text-xs font-black uppercase">{t('circadian.dusk_unlocked_title')}</h4>
                                    <p className="text-[9px] text-gray-500 mt-0.5 truncate">{t('circadian.dusk_unlocked_desc')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleOpenChest('dusk')}
                                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_12px_rgba(var(--accent-rgb),0.3)] active:scale-95 transition-all shrink-0"
                            >
                                {t('circadian.open_btn')}
                            </button>
                        </div>
                    )}

                    {chestState === 'dawn_locked' && (
                        <div className="bg-[#0B0D17] border border-white/5 p-4 rounded-2xl flex items-center justify-between gap-4 opacity-75">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shrink-0">
                                    <Lock className="h-5 w-5 text-gray-600" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-gray-400 text-xs font-black uppercase">{t('circadian.dawn_locked_title')}</h4>
                                    <p className="text-[9px] text-gray-600 mt-0.5">{t('circadian.dawn_locked_desc')}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {chestState === 'dusk_locked' && (
                        <div className="bg-[#0B0D17] border border-white/5 p-4 rounded-2xl flex items-center justify-between gap-4 opacity-75">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shrink-0">
                                    <Lock className="h-5 w-5 text-gray-600" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-gray-400 text-xs font-black uppercase">{t('circadian.dusk_locked_title')}</h4>
                                    <p className="text-[9px] text-gray-600 mt-0.5">{t('circadian.dusk_locked_desc')}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {chestState === 'waiting' && (
                        <div className="bg-[#0B0D17] border border-white/5 p-4 rounded-2xl text-center py-5">
                            <p className="text-gray-500 text-xs font-black uppercase tracking-wider">{t('circadian.sleeping')}</p>
                            <p className="text-[9px] text-gray-600 mt-1 max-w-[240px] mx-auto leading-relaxed">
                                {t('circadian.sleeping_desc')}
                            </p>
                            <div className="flex justify-center gap-4 mt-3">
                                <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
                                    <Key className={`h-3 w-3 ${hasDawnKey ? 'text-emerald-400' : 'text-gray-600'}`} />
                                    <span>{t('circadian.dawn_key')}: {hasDawnKey ? t('circadian.key_ready') : t('circadian.key_none')}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
                                    <Key className={`h-3 w-3 ${hasDuskKey ? 'text-cyan-400' : 'text-gray-600'}`} />
                                    <span>{t('circadian.dusk_key')}: {hasDuskKey ? t('circadian.key_ready') : t('circadian.key_none')}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
