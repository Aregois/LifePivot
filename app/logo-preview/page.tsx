'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { InteractiveLogo, LogoStatus } from '../../components/interactive-logo'
import { LifePivotLogoSVG } from '../../components/lifepivot-logo-svg'
import { Sparkles, Palette, Zap, ArrowLeft, Shield, Flame, RotateCcw } from 'lucide-react'
import { haptics } from '../../utils/haptics'

type AccentTheme = 'blue' | 'violet' | 'green' | 'sunset'

export default function LogoPreviewPage() {
    const [theme, setTheme] = useState<AccentTheme>('blue')
    const [status, setStatus] = useState<LogoStatus>('normal')
    const [interactive, setInteractive] = useState(true)
    const [showGlow, setShowGlow] = useState(true)

    // Load initial theme from localStorage if present
    useEffect(() => {
        const saved = (localStorage.getItem('lifepivot_accent') as AccentTheme) || 'blue'
        setTheme(saved)
    }, [])

    const handleThemeChange = (nextTheme: AccentTheme) => {
        haptics.tier1.selection()
        setTheme(nextTheme)
        localStorage.setItem('lifepivot_accent', nextTheme)
        const root = document.documentElement
        if (nextTheme === 'violet') {
            root.style.setProperty('--color-electric-blue', '#bd00ff')
            root.style.setProperty('--color-neon-violet', '#ff00a0')
            root.style.setProperty('--accent-rgb', '189, 0, 255')
            root.style.setProperty('--violet-rgb', '255, 0, 160')
        } else if (nextTheme === 'green') {
            root.style.setProperty('--color-electric-blue', '#10b981')
            root.style.setProperty('--color-neon-violet', '#059669')
            root.style.setProperty('--accent-rgb', '16, 185, 129')
            root.style.setProperty('--violet-rgb', '5, 150, 105')
        } else if (nextTheme === 'sunset') {
            root.style.setProperty('--color-electric-blue', '#f59e0b')
            root.style.setProperty('--color-neon-violet', '#d97706')
            root.style.setProperty('--accent-rgb', '245, 158, 11')
            root.style.setProperty('--violet-rgb', '217, 119, 6')
        } else {
            root.style.setProperty('--color-electric-blue', '#00f0ff')
            root.style.setProperty('--color-neon-violet', '#bd00ff')
            root.style.setProperty('--accent-rgb', '0, 240, 255')
            root.style.setProperty('--violet-rgb', '189, 0, 255')
        }
    }

    const themes: Array<{ id: AccentTheme; name: string; color: string; desc: string }> = [
        { id: 'blue', name: 'Cyber Blue', color: '#00f0ff', desc: 'Default Neon Cyan / Violet' },
        { id: 'violet', name: 'Synth Violet', color: '#bd00ff', desc: 'Deep Violet / Hot Pink' },
        { id: 'green', name: 'Matrix Emerald', color: '#10b981', desc: 'Vibrant Emerald / Mint' },
        { id: 'sunset', name: 'Solar Sunset', color: '#f59e0b', desc: 'Amber Gold / Radiant Orange' }
    ]

    const statusOptions: Array<{ id: LogoStatus; name: string; icon: any; desc: string }> = [
        { id: 'normal', name: 'Living Ambient', icon: Sparkles, desc: 'Calm 4s respiration rhythm' },
        { id: 'focus', name: 'Focus / Flow', icon: Zap, desc: 'Energetic cyan pulse with audio sync' },
        { id: 'streak', name: 'Active Streak', icon: Flame, desc: 'Warm amber flame aura' },
        { id: 'pivot', name: 'Pivot Warning', icon: Shield, desc: 'Ethereal crimson / violet shimmer' }
    ]

    return (
        <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center px-4 py-8 md:py-12 select-none overflow-x-hidden">
            {/* Ambient Background Lighting */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[rgba(var(--accent-rgb),0.07)] rounded-full blur-[140px] transition-all duration-700" />
            </div>

            {/* Header */}
            <header className="relative z-10 w-full max-w-2xl flex items-center justify-between mb-8">
                <Link
                    href="/"
                    onClick={() => haptics.tier1.selection()}
                    className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 hover:text-white px-3 py-2 rounded-xl bg-white/5 border border-white/5 active:scale-95 transition-all"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to App</span>
                </Link>

                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-electric-blue/10 border border-electric-blue/30 text-electric-blue text-[10px] font-black uppercase tracking-widest">
                    <span>Native Plus Vector</span>
                </div>
            </header>

            {/* Main Interactive Stage */}
            <main className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-8">
                <div className="text-center">
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                        Interactive LifePivot Logo
                    </h1>
                    <p className="text-xs md:text-sm text-gray-400 mt-2 max-w-md mx-auto">
                        Vector SVG with real-time theme reactivity, 3D spring gyroscope tilt, specular glass reflection, living ambient pulse, and haptic feedback.
                    </p>
                </div>

                {/* Hero Stage Card */}
                <div className="w-full relative rounded-3xl p-8 md:p-12 bg-gradient-to-b from-[#0E111F]/90 to-[#0A0D17]/90 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_30px_rgba(var(--accent-rgb),0.08)] flex flex-col items-center justify-center gap-6 overflow-hidden">
                    {/* Interactive Logo Hero */}
                    <div className="py-4">
                        <InteractiveLogo
                            size={160}
                            status={status}
                            interactive={interactive}
                            showGlow={showGlow}
                            enableEasterEgg={true}
                        />
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                        <Sparkles className="w-3.5 h-3.5 text-electric-blue" />
                        <span>Hover or drag to tilt in 3D • Tap 3x rapidly for Easter egg</span>
                    </div>
                </div>

                {/* Control Panel: Themes */}
                <div className="w-full bg-[#0E111F] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-300">
                        <Palette className="w-4 h-4 text-electric-blue" />
                        <span>1. Real-Time Theme Reactivity (Changes SVG code)</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {themes.map(t => (
                            <button
                                key={t.id}
                                onClick={() => handleThemeChange(t.id)}
                                className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all text-left ${
                                    theme === t.id
                                        ? 'bg-white/10 border-electric-blue shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)] scale-102'
                                        : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                }`}
                            >
                                <div
                                    className="w-7 h-7 rounded-full shadow-md border border-white/20"
                                    style={{ backgroundColor: t.color }}
                                />
                                <div className="text-center">
                                    <div className="text-xs font-black text-white">{t.name}</div>
                                    <div className="text-[9px] text-gray-400 truncate max-w-[120px]">{t.desc}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Control Panel: Ambient Pulse Status */}
                <div className="w-full bg-[#0E111F] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-300">
                        <Zap className="w-4 h-4 text-electric-blue" />
                        <span>2. Living Ambient Pulse Modes</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {statusOptions.map(opt => {
                            const Icon = opt.icon
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => {
                                        haptics.tier1.selection()
                                        setStatus(opt.id)
                                    }}
                                    className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all text-center ${
                                        status === opt.id
                                            ? 'bg-white/10 border-electric-blue shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)] scale-102'
                                            : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    <Icon className="w-5 h-5 text-electric-blue" />
                                    <div>
                                        <div className="text-xs font-black text-white">{opt.name}</div>
                                        <div className="text-[9px] text-gray-400">{opt.desc}</div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Size Matrix Preview */}
                <div className="w-full bg-[#0E111F] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-gray-300">
                            3. UI Scale Consistency (Retina Crispness)
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase font-mono">0px blur / 100% vector</span>
                    </div>

                    <div className="flex items-center justify-around py-4 border-t border-white/5">
                        <div className="flex flex-col items-center gap-2">
                            <InteractiveLogo size="xs" status={status} />
                            <span className="text-[9px] font-bold text-gray-400">XS (20px)</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <InteractiveLogo size="sm" status={status} />
                            <span className="text-[9px] font-bold text-gray-400">HUD (26px)</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <InteractiveLogo size="md" status={status} />
                            <span className="text-[9px] font-bold text-gray-400">Sidebar (36px)</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <InteractiveLogo size="lg" status={status} />
                            <span className="text-[9px] font-bold text-gray-400">Modal (56px)</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
