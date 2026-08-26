'use client'

import { useState, useCallback } from 'react'
import { Home, Calendar, ShoppingBag, User, Bot, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { haptics } from '@/utils/haptics'
import { useEconomy } from '@/components/economy-provider'
import { useLanguage } from '@/components/language-provider'
import { createClient } from '@/utils/supabase/client'
import { getLocalDateString } from '@/utils/date-utils'

export function BottomNav() {
    const pathname = usePathname()
    const router = useRouter()
    const { level, setGlobalFocusTask } = useEconomy()
    const { t } = useLanguage()
    const [resolving, setResolving] = useState(false)

    const tabs = [
        { name: t('nav.home'), href: '/', icon: Home },
        { name: t('nav.plan'), href: '/plan', icon: Calendar },
        { name: t('nav.shop'), href: '/shop', icon: ShoppingBag },
        { name: t('nav.profile'), href: '/profile', icon: User },
    ]

    const handleTutorPress = useCallback(async () => {
        haptics.medium()
        setResolving(true)
        try {
            const supabase = createClient()
            const todayStr = getLocalDateString()

            // 1. Try to fetch today's highest priority pending task with goal title
            let { data } = await supabase
                .from('tasks')
                .select('*, learning_goals(title)')
                .eq('status', 'pending')
                .eq('due_date', todayStr)
                .order('priority', { ascending: false })
                .limit(1)
                .maybeSingle()

            // 2. Fallback: fetch nearest pending task overall
            if (!data) {
                const res = await supabase
                    .from('tasks')
                    .select('*, learning_goals(title)')
                    .eq('status', 'pending')
                    .order('due_date', { ascending: true })
                    .limit(1)
                    .maybeSingle()
                data = res.data
            }

            if (data) {
                const goalTitle = (data as any).learning_goals?.title || 'Active Task'
                // Open focus session overlay globally
                setGlobalFocusTask(data as any, goalTitle)
            } else {
                router.push('/plan')
            }
        } catch (err) {
            console.error('Error opening active task focus mode:', err)
            router.push('/plan')
        } finally {
            setResolving(false)
        }
    }, [router, setGlobalFocusTask])

    return (
        <nav role="navigation" aria-label="Main navigation" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:hidden z-50">
            {/* Nav Container with inset effect */}
            <div className="relative h-[max(88px,88px+env(safe-area-inset-bottom,0px))] bg-[#141824] border-t border-white/[0.05] flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom,0.5rem)] rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                {/* Background extension to prevent gap during overscroll/bouncing on iOS */}
                <div className="absolute top-full left-0 right-0 h-[50vh] bg-[#141824]" />

                {/* Central Floating Tutor / Today's Active Task Button */}
                <button
                    aria-label={t('nav.open_tutor')}
                    onClick={handleTutorPress}
                    disabled={resolving}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 group active:scale-90 transition-transform duration-200 disabled:active:scale-100"
                >
                    <div className="relative w-16 h-16">
                        {/* Pulsing ring while resolving */}
                        {resolving && (
                            <span className="absolute inset-0 rounded-full bg-electric-blue/30 animate-ping" />
                        )}
                        <div className="w-16 h-16 rounded-full bg-electric-blue border-4 border-[#0B0D17] flex items-center justify-center shadow-[0_0_12px_rgba(var(--accent-rgb),0.18)] cursor-pointer hover:bg-electric-blue/90 transition-colors z-10 relative">
                            {resolving
                                ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                                : <Bot className="h-6 w-6 text-white" />
                            }
                        </div>
                    </div>
                    <span className="relative z-10 text-[10px] font-bold text-electric-blue uppercase tracking-widest mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        {t('nav.tutor')}
                    </span>
                </button>

                {tabs.map((tab, idx) => {
                    const Icon = tab.icon
                    const isActive = pathname === tab.href

                    // Push left tabs left, and right tabs right to make space for the central Tutor button
                    const isLeftCenter = idx === 1
                    const isRightCenter = idx === 2

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
