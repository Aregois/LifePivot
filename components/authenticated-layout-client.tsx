'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
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
    const { showMobileChat, setShowMobileChat, activeChatTask, setActiveChatTask } = useEconomy()
    const pathname = usePathname()
    const isCalendar = pathname === '/calendar'
    const [overdueGoalId, setOverdueGoalId] = useState<string | null>(null)

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
                {children}
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


