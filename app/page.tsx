import { createClient } from '@/utils/supabase/server'
import { getLocalDateString } from '@/utils/date-utils'
import { DashboardClient } from '@/components/dashboard-client'
import { AuthenticatedLayoutClient } from '@/components/authenticated-layout-client'
import { LandingPage } from '@/components/landing-page'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If visitor is unauthenticated, render the Public Marketing Landing Page
  if (!user) {
    return <LandingPage />
  }

  // If user is logged in, fetch profile and active goals for the dashboard
  const [{ data: goals }, { data: profile }] = await Promise.all([
    supabase
      .from('learning_goals')
      .select(`
        id, title, created_at, duration_days, plan_metadata, level, goal_intent,
        tasks ( id, status, due_date, task_type, title, duration_mins, priority )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('profiles')
      .select('xp, level, current_streak, streak_shields_count, is_subscribed')
      .eq('id', user.id)
      .single()
  ])

  const username = user?.email?.split('@')[0] || 'Pathseeker'

  return (
    <AuthenticatedLayoutClient>
      <DashboardClient
        username={username}
        profile={profile}
        goals={goals || []}
        todayStr={getLocalDateString()}
      />
    </AuthenticatedLayoutClient>
  )
}
