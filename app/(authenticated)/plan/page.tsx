import { createClient } from '@/utils/supabase/server'
import { PlanClient } from './plan-client'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export default async function PlanPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Fetch profile for subscription status
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_subscribed, subscription_status')
        .eq('id', user.id)
        .single()

    // Fetch ALL learning goals (we pass all to client; client determines active)
    const { data: goals, error } = await supabase
        .from('learning_goals')
        .select(`
          id,
          title,
          created_at,
          duration_days,
          plan_metadata,
          tasks (
            id,
            title,
            status,
            due_date,
            pivoted_count,
            duration_mins,
            priority,
            task_type,
            subject,
            subtasks
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    const isSubscribed = profile?.is_subscribed ?? false
    const subscriptionStatus = profile?.subscription_status ?? 'inactive'

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-[#00FFFF] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,255,255,0.2)]" />
            </div>
        }>
            <PlanClient
                user={user}
                goals={goals}
                goalsError={error}
                isSubscribed={isSubscribed}
                subscriptionStatus={subscriptionStatus}
            />
        </Suspense>
    )
}
