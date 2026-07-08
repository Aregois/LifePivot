'use client'

import { useState, useEffect } from 'react'
import { Home, Calendar, Map, ShoppingBag, User, Sparkles, Award, Users, Compass, Library } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEconomy } from './economy-provider'
import { AvatarIcon } from './avatar-icons'
import { haptics } from '@/utils/haptics'
import { useLanguage } from './language-provider'
import { createClient } from '@/utils/supabase/client'

export function DesktopSidebar() {
    const pathname = usePathname()
    const { level, avatarId } = useEconomy()
    const { t } = useLanguage()
    const [isSubscribed, setIsSubscribed] = useState(false)

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                supabase
                    .from('profiles')
                    .select('is_subscribed')
                    .eq('id', user.id)
                    .single()
                    .then(({ data }) => {
                        if (data) {
                            setIsSubscribed(!!data.is_subscribed)
                        }
                    })
            }
        })
    }, [])

    const navItems = [
        { name: t('nav.home'), href: '/', icon: Home },
        { name: t('nav.plans') || 'My Plans', href: '/plans', icon: Library },
        { name: t('nav.plan'), href: '/plan', icon: Map },
        { name: t('nav.cohorts') || 'Cohorts', href: '/workspaces', icon: Users },
        { name: t('nav.marketplace') || 'Marketplace', href: '/marketplace', icon: Compass },
        { name: t('nav.shop'), href: '/shop', icon: ShoppingBag },
        { name: t('nav.profile'), href: '/profile', icon: User },
        { name: t('nav.calendar'), href: '/calendar', icon: Calendar },
    ]

    // Resolve title based on level
    let levelTitleKey = 'dashboard.level_titles.pathseeker'
    if (level >= 11) levelTitleKey = 'dashboard.level_titles.grandmaster'
    else if (level >= 8) levelTitleKey = 'dashboard.level_titles.sage'
    else if (level >= 5) levelTitleKey = 'dashboard.level_titles.scholar'
    else if (level >= 3) levelTitleKey = 'dashboard.level_titles.acolyte'

    const levelTitle = t(levelTitleKey)

    return (
        <aside className="hidden md:flex flex-col w-64 fixed left-0 top-0 h-screen py-8 px-4 bg-[#0E111F]/80 backdrop-blur-xl border-r border-white/5 z-50 select-none">
            {/* Logo */}
            <div className="mb-8 px-4 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-electric-blue to-neon-violet flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                    <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-electric-blue to-neon-violet title-glow">
                        LifePivot
                    </h1>
                </div>
            </div>

            {/* Profile Summary Card */}
            <div className="flex items-center gap-3.5 mb-8 px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
                {/* TODO: Replace monogram with user initials from profile data when available */}
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center border border-white/10 shrink-0 shadow-md select-none overflow-hidden">
                    <AvatarIcon id={avatarId} className="w-full h-full" />
                </div>
                <div className="min-w-0">
                    {/* TODO: Replace with actual user display name from profile when available */}
                    <p className="text-xs font-black text-white uppercase tracking-wider truncate">{levelTitle}</p>
                    <p className="text-[10px] font-black text-electric-blue uppercase tracking-widest mt-0.5 truncate">
                        LV {level} {levelTitle}
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    const isLocked = level < 2 && (item.href === '/workspaces' || item.href === '/marketplace' || item.href === '/shop')

                    if (isLocked) {
                        return (
                            <div
                                key={item.name}
                                className="flex items-center justify-between px-4 py-3 rounded-xl border border-transparent text-gray-600 select-none opacity-40 cursor-not-allowed"
                            >
                                <div className="flex items-center">
                                    <Icon className="w-4 h-4 mr-3" />
                                    <span className="text-[11px] font-black uppercase tracking-wider">{item.name}</span>
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5 text-gray-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                            </div>
                        )
                    }

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => {
                                if (!isActive) haptics.light()
                            }}
                            className={`flex items-center px-4 py-3 rounded-xl font-bold transition-all duration-200 active:scale-[0.98] border ${
                                isActive
                                    ? 'bg-electric-blue/10 border-electric-blue/20 text-electric-blue shadow-[0_0_15px_rgba(0,240,255,0.08)]'
                                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'
                            }`}
                        >
                            <Icon className="w-4 h-4 mr-3" />
                            <span className="text-[11px] font-black uppercase tracking-wider">{item.name}</span>
                        </Link>
                    )
                })}
            </nav>

            {/* CTA Pro Button */}
            {!isSubscribed && (
                <div className="pt-4 mt-auto border-t border-white/5">
                    <button 
                        onClick={() => haptics.medium()}
                        className="w-full py-3.5 rounded-xl border border-neon-violet/30 text-neon-violet bg-neon-violet/5 font-black text-[10px] tracking-widest uppercase hover:bg-neon-violet hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(189,0,255,0.08)] active:scale-95"
                    >
                        {t('sidebar.upgrade')}
                    </button>
                </div>
            )}
        </aside>
    )
}
