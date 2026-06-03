'use client'

import { useState, useEffect } from 'react'
import { useEconomy } from './economy-provider'
import { Heart, Diamond, Sparkles } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { haptics } from '@/utils/haptics'
import { AvatarIcon } from './avatar-icons'
import { useLanguage } from './language-provider'

export function HUD() {
    const { lives, gems, xp, level, avatarId } = useEconomy()
    const { t } = useLanguage()
    const pathname = usePathname()
    const router = useRouter()
    const [mindfulMode, setMindfulMode] = useState(false)

    useEffect(() => {
        const checkMindfulMode = () => {
            setMindfulMode(localStorage.getItem('lifepivot_mindful_mode') === 'true')
        }
        checkMindfulMode()
        window.addEventListener('lifepivot_mindful_mode_changed', checkMindfulMode)
        return () => {
            window.removeEventListener('lifepivot_mindful_mode_changed', checkMindfulMode)
        }
    }, [])

    if (pathname === '/calendar') return null

    const xpNeeded = level * 100
    const xpPercentage = Math.min(100, Math.max(0, (xp / xpNeeded) * 100))

    // Resolve context title based on pathname
    let routeTitle = 'Dashboard'
    if (pathname === '/plan') routeTitle = t('nav.plan')
    else if (pathname === '/shop') routeTitle = t('nav.shop')
    else if (pathname === '/profile') routeTitle = t('nav.profile')

    return (
        <header role="banner" className="sticky top-0 z-[100] w-full bg-[#050508]/85 backdrop-blur-xl border-b border-white/5">
            {/* ──── MOBILE HUD (Shown on mobile/tablet) ──── */}
            <div className="md:hidden flex flex-col pt-[max(1.25rem,env(safe-area-inset-top,1.25rem))] pb-4 px-6">
                <div className="flex items-center justify-between mb-3.5">
                    {/* Left: Logo & Level */}
                    <div className="flex items-center gap-2.5">
                        <Link
                            href="/profile"
                            onClick={() => haptics.light()}
                            className="w-8 h-8 rounded-full bg-[#1C2033] border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer active:scale-90 transition-transform"
                        >
                            <AvatarIcon id={avatarId} className="w-full h-full" />
                        </Link>
                        <h1 className="text-xl font-black tracking-tight text-white">
                            LifePivot
                        </h1>
                        {!mindfulMode && (
                            <span className="text-[8px] font-black text-electric-blue bg-electric-blue/15 border border-electric-blue/25 px-2 py-0.5 rounded-full select-none uppercase">
                                {t('hud.level')} {level}
                            </span>
                        )}
                    </div>

                    {/* Right: Resources Pill */}
                    {!mindfulMode && (
                        <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-[#1C2033] border border-white/5 shadow-md">
                            <div className="flex items-center gap-1" aria-label={`${gems} gems`}>
                                <Diamond className="h-3.5 w-3.5 text-electric-blue fill-electric-blue/20" />
                                <span className="text-xs font-black text-electric-blue">{gems}</span>
                            </div>
                            <div className="h-3 w-[1px] bg-white/10" aria-hidden="true" />
                            <div className="flex items-center gap-1" aria-label={`${lives} lives`}>
                                <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" />
                                <span className="text-xs font-black text-white">{lives}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile XP Progress Bar */}
                {!mindfulMode && (
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                        <div 
                            className="h-full bg-gradient-to-r from-electric-blue to-neon-violet transition-all duration-1000 shadow-[0_0_8px_rgba(0,240,255,0.6)]"
                            style={{ width: `${xpPercentage}%` }}
                        />
                    </div>
                )}
            </div>

            {/* ──── DESKTOP TOP BAR (Shown on screens >= 768px) ──── */}
            <div className="hidden md:flex flex-col w-full">
                <div className="flex items-center justify-between px-8 h-20">
                    {/* Left: Context Page Title */}
                    <div className="flex-1">
                        <h2 className="text-xl font-black text-white uppercase tracking-wider">
                            {routeTitle}
                        </h2>
                    </div>

                    {/* Right: Gamification HUD */}
                    {!mindfulMode && (
                        <div className="flex items-center gap-4">
                            {/* Lives/Hearts Pill */}
                            <div className="flex items-center gap-2 bg-[#141824] px-4 py-2 rounded-xl border border-red-500/20 md:border-white/10 shadow-[0_0_12px_rgba(255,46,99,0.05)] md:shadow-none">
                                <Heart className="h-4 w-4 text-red-500 md:text-slate-400 fill-red-500 md:fill-slate-400/20 filter drop-shadow-[0_0_8px_rgba(255,46,99,0.8)] md:filter-none" />
                                <span className="text-xs font-black text-red-500 md:text-slate-300">{lives}/5</span>
                            </div>

                            {/* Gems Pill */}
                            <div className="flex items-center gap-2 bg-[#141824] px-4 py-2 rounded-xl border border-electric-blue/20 md:border-white/10 shadow-[0_0_12px_rgba(0,240,255,0.05)] md:shadow-none">
                                <Diamond className="h-4 w-4 text-electric-blue md:text-slate-400 fill-electric-blue/20 md:fill-slate-400/20 filter drop-shadow-[0_0_8px_rgba(0,240,255,0.8)] md:filter-none" />
                                <span className="text-xs font-black text-electric-blue md:text-slate-300">{gems}</span>
                            </div>

                            {/* Level Up Button */}
                            <button 
                                onClick={() => {
                                    haptics.medium()
                                    router.push('/profile?tab=mastery')
                                }}
                                className="px-5 py-2 rounded-xl bg-electric-blue/5 border border-electric-blue text-electric-blue md:bg-transparent md:border-white/10 md:text-slate-300 text-[10px] font-black tracking-widest uppercase hover:bg-electric-blue md:hover:bg-white/5 hover:text-black md:hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(0,240,255,0.15)] md:shadow-none active:scale-95 cursor-pointer"
                            >
                                {t('hud.level')} UP
                            </button>
                        </div>
                    )}
                </div>

                {/* Full-width Widescreen XP Progress Bar */}
                {!mindfulMode && (
                    <div className="w-full h-[2px] bg-white/[0.03] relative overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-neon-violet to-electric-blue transition-all duration-1000 shadow-[0_0_10px_#bd00ff]"
                            style={{ width: `${xpPercentage}%` }}
                        />
                    </div>
                )}
            </div>
        </header>
    )
}
