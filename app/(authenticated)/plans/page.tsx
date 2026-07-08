import { createClient } from '@/utils/supabase/server'
import { PlansClient } from './plans-client'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export default async function PlansPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Fetch user profile and subscription tier directly
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_subscribed, subscription_status')
        .eq('id', user.id)
        .single()

    // Optimized Data Fetching: Select only minimal fields from tasks (id, status, task_type)
    // to calculate progress metrics without loading full task metadata or details.
    const { data: goals, error } = await supabase
        .from('learning_goals')
        .select(`
            id,
            title,
            duration_days,
            level,
            goal_intent,
            created_at,
            tasks (
                id,
                status,
                task_type
            )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    const isSubscribed = profile?.is_subscribed ?? false
    const subscriptionStatus = profile?.subscription_status ?? 'inactive'

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-[#00F0FF] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,240,255,0.2)]" />
            </div>
        }>
            <PlansClient
                user={user}
                goals={goals || []}
                goalsError={error}
                isSubscribed={isSubscribed}
                subscriptionStatus={subscriptionStatus}
            />
        </Suspense>
    )
}
