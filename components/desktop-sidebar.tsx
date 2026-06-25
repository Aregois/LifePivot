'use client'

import { Home, Calendar, Map, ShoppingBag, User, Sparkles, Award, Users, Compass } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEconomy } from './economy-provider'
import { AvatarIcon } from './avatar-icons'
import { haptics } from '@/utils/haptics'
import { useLanguage } from './language-provider'

export function DesktopSidebar() {
    const pathname = usePathname()
    const { level, avatarId } = useEconomy()
    const { t } = useLanguage()

    const navItems = [
        { name: t('nav.home'), href: '/', icon: Home },
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
            <div className="pt-4 mt-auto border-t border-white/5">
                <button 
                    onClick={() => haptics.medium()}
                    className="w-full py-3.5 rounded-xl border border-neon-violet/30 text-neon-violet bg-neon-violet/5 font-black text-[10px] tracking-widest uppercase hover:bg-neon-violet hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(189,0,255,0.08)] active:scale-95"
                >
                    {t('sidebar.upgrade')}
                </button>
            </div>
        </aside>
    )
}
