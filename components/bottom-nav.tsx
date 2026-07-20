'use client'

import { Home, Calendar, ShoppingBag, User, Bot, Library } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { haptics } from '@/utils/haptics'
import { useEconomy } from '@/components/economy-provider'

import { useLanguage } from '@/components/language-provider'

export function BottomNav() {
    const pathname = usePathname()
    const { level, setShowMobileChat } = useEconomy()
    const { t } = useLanguage()

    const tabs = [
        { name: t('nav.home'), href: '/', icon: Home },
        { name: t('nav.plans') || 'Plans', href: '/plans', icon: Library },
        { name: t('nav.plan'), href: '/plan', icon: Calendar },
        { name: t('nav.shop'), href: '/shop', icon: ShoppingBag },
        { name: t('nav.profile'), href: '/profile', icon: User },
    ]

    return (
        <nav role="navigation" aria-label="Main navigation" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:hidden z-50">
            {/* Nav Container with inset effect */}
            <div className="relative h-[max(88px,88px+env(safe-area-inset-bottom,0px))] bg-[#141824] border-t border-white/[0.05] flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom,0.5rem)] rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                {/* Background extension to prevent gap during overscroll/bouncing on iOS */}
                <div className="absolute top-full left-0 right-0 h-[50vh] bg-[#141824]" />

                {/* Central Floating AI Tutor Button */}
                <button
                    aria-label={t('nav.open_tutor')}
                    onClick={() => {
                        haptics.medium()
                        setShowMobileChat(true)
                    }}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 group active:scale-90 transition-transform duration-200"
                >
                    <div className="w-16 h-16 rounded-full bg-electric-blue border-4 border-[#0B0D17] flex items-center justify-center shadow-[0_0_12px_rgba(var(--accent-rgb),0.18)] cursor-pointer hover:bg-electric-blue/90 transition-colors z-10">
                        <Bot className="h-6 w-6 text-white" />
                    </div>
                    <span className="relative z-10 text-[10px] font-bold text-electric-blue uppercase tracking-widest mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        {t('nav.tutor')}
                    </span>
                </button>

                {tabs.map((tab, idx) => {
                    const Icon = tab.icon
                    const isActive = pathname === tab.href

                    // Push left tabs left, and right tabs right to make space for the central Tutor button
                    const isLeftCenter = idx === 2
                    const isRightCenter = idx === 3

                    const isLocked = tab.href === '/shop' && level < 2

                    if (isLocked) {
                        return (
                            <div
                                key={tab.name}
                                className={`flex flex-col items-center justify-center min-w-[50px] h-full gap-1 opacity-35 cursor-not-allowed text-gray-600 ${isLeftCenter ? 'mr-5' : ''
                                    } ${isRightCenter ? 'ml-5' : ''
                                    }`}
                            >
                                <Icon className="h-5 w-5" strokeWidth={2} />
                                <span className="text-[9px] font-bold tracking-wide">
                                    {tab.name}
                                </span>
                            </div>
                        )
                    }

                    return (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            aria-current={isActive ? 'page' : undefined}
                            onClick={() => {
                                if (!isActive) haptics.light()
                            }}
                            className={`flex flex-col items-center justify-center min-w-[50px] h-full gap-1 transition-all active:scale-95 duration-200 ${isLeftCenter ? 'mr-5' : ''
                                } ${isRightCenter ? 'ml-5' : ''
                                } ${isActive ? 'text-electric-blue' : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <Icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[9px] font-bold tracking-wide">
                                {tab.name}
                            </span>
                            {isActive && <span className="w-1 h-1 rounded-full bg-electric-blue mt-0.5" />}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}

