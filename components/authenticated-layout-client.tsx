'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { HUD } from '@/components/hud'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopSidebar } from '@/components/desktop-sidebar'
import { DesktopTutorPanel } from '@/components/desktop-tutor-panel'
import { FocusChat } from '@/components/focus-chat'
import { useEconomy } from '@/components/economy-provider'
import { createClient } from '@/utils/supabase/client'
import type { Task } from '@/utils/types'
import { OnboardingTour } from '@/components/onboarding-tour'
import { getLocalDateString } from '@/utils/date-utils'
import { MissedSessionOverlay } from '@/components/missed-session-overlay'

export function AuthenticatedLayoutClient({
    children,
}: {
    children: React.ReactNode
}) {
    const { level, xp, showMobileChat, setShowMobileChat, activeChatTask, setActiveChatTask } = useEconomy()
    const pathname = usePathname()
    const isCalendar = pathname === '/calendar'
    const [overdueGoalId, setOverdueGoalId] = useState<string | null>(null)

    const isAdvancedRoute = pathname.startsWith('/marketplace') || pathname.startsWith('/shop') || pathname.startsWith('/workspaces')
    const isRouteLocked = level < 2 && isAdvancedRoute

    // Check for overdue tasks client-side to trigger the MissedSessionOverlay
    useEffect(() => {
        const supabase = createClient()
        const todayStr = getLocalDateString()
        supabase.from('tasks')
            .select('goal_id')
            .eq('status', 'pending')
            .lt('due_date', todayStr)
            .limit(1)
            .then(({ data }) => {
                if (data && data.length > 0) {
                    setOverdueGoalId(data[0].goal_id)
                } else {
                    setOverdueGoalId(null)
                }
            })
    }, [pathname])

    // Query a default active chat task if none selected (for both mobile and desktop views)
    useEffect(() => {
        if (!activeChatTask) {
            const supabase = createClient()
            supabase.from('tasks')
                .select('*')
                .eq('status', 'pending')
                .order('due_date', { ascending: true })
                .limit(1)
                .then(({ data }) => {
                    if (data && data.length > 0) {
                        setActiveChatTask(data[0] as Task)
                    }
                })
        }
    }, [activeChatTask, setActiveChatTask])

    return (
        <div className={`min-h-[100dvh] bg-[#050508] relative w-full overflow-x-clip md:max-w-none md:mx-0 flex flex-col md:pl-64 md:pb-0 ${isCalendar ? '' : 'lg:pr-80'}`} style={{ paddingBottom: 'max(6rem, calc(6rem + env(safe-area-inset-bottom)))' }}>
            {/* Background Ambient Glows */}
            <div className="pointer-events-none fixed top-1/4 right-0 h-96 w-96 translate-x-1/2 rounded-full bg-electric-blue opacity-[0.03] blur-[150px]" aria-hidden="true" />
            <div className="pointer-events-none fixed bottom-0 left-0 h-96 w-96 -translate-x-1/2 rounded-full bg-neon-violet opacity-[0.03] blur-[150px]" aria-hidden="true" />

            {/* Left Sidebar Navigation (Desktop only) */}
            <DesktopSidebar />

            {/* Right Socratic AI Tutor Sidebar (Desktop only) */}
            {!isCalendar && <DesktopTutorPanel />}

            {/* Top HUD Header (Shared) */}
            <HUD />

            {/* Page content wrapper */}
            <main className="relative z-10 px-4 sm:px-6 py-4 flex-1 flex flex-col">
                {isRouteLocked ? (
                    <div className="flex-1 flex items-center justify-center py-12">
                        <div className="w-full max-w-md p-8 rounded-3xl bg-[#141824]/80 border border-white/10 text-center shadow-2xl glass-card relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[85px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 mb-6 mx-auto shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-indigo-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-black text-white uppercase tracking-wider mb-3">Feature Locked</h2>
                            <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                Reach Level 2 to unlock advanced features like cohorts, marketplace schemas, and the items store.
                            </p>

                            {/* Progress bar towards Level 2 (1000 XP) */}
                            <div className="mb-8 bg-white/5 p-4 rounded-2xl border border-white/5">
                                <div className="flex justify-between items-baseline mb-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress to Level 2</span>
                                    <span className="text-xs font-black text-electric-blue">{xp} / 1000 XP</span>
                                </div>
                                <div className="w-full bg-[#0B0D17] h-2 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                    <div 
                                        className="h-full bg-gradient-to-r from-electric-blue to-neon-violet transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                                        style={{ width: `${Math.min(100, Math.max(0, (xp / 1000) * 100))}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-gray-500 mt-2 text-left font-medium">
                                    Complete tasks to earn XP and level up.
                                </p>
                            </div>

                            <Link
                                href="/"
                                className="inline-block w-full py-3.5 rounded-xl border border-electric-blue/30 text-electric-blue bg-electric-blue/5 font-black text-xs tracking-widest uppercase hover:bg-electric-blue hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(0,240,255,0.08)] active:scale-95"
                            >
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                ) : (
                    children
                )}
            </main>

            {/* Bottom Nav Bar (Mobile only) */}
            <BottomNav />

            {/* Mobile Socratic Chat Modal Overlay */}
            {showMobileChat && (
                <FocusChat 
                     task={activeChatTask} 
                     goalTitle="Socratic Companion" 
                     onClose={() => setShowMobileChat(false)} 
                />
            )}

            {/* Onboarding Guide Walkthrough */}
            <OnboardingTour />

            {/* Missed Session Overlay if alignment broken */}
            {overdueGoalId && (
                <MissedSessionOverlay 
                    goalId={overdueGoalId} 
                    onClose={() => setOverdueGoalId(null)} 
                />
            )}
        </div>
    )
}


