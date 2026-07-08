import { createClient } from '@/utils/supabase/server'
import { getLocalDateString } from '@/utils/date-utils'
import { DashboardClient } from '@/components/dashboard-client'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch user profile and goals.
  // Performance Optimization: Fetch all user goals but select only the minimal columns from tasks
  // (excluding subtasks, notes, resources, reflections, drill_data) to reduce data payload size.
  // Limit to 10 goals max to prevent massive arrays under free/pro tier.
  const [{ data: goals }, { data: profile }, { count: dueCardsCount }] = await Promise.all([
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
      .single(),
    supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lte('next_review', new Date().toISOString())
  ])

  const username = user?.email?.split('@')[0] || 'Pathseeker'

  return (
    <DashboardClient
      username={username}
      profile={profile}
      dueCardsCount={dueCardsCount ?? 0}
      goals={goals || []}
      todayStr={getLocalDateString()}
    />
  )
}
