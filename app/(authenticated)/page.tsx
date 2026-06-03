import { createClient } from '@/utils/supabase/server'
import { getLocalDateString } from '@/utils/date-utils'
import { checkCheckpointBattleDue } from '@/app/actions'
import { DashboardClient } from '@/components/dashboard-client'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: goals }, { data: profile }, { count: dueCardsCount }] = await Promise.all([
    supabase
      .from('learning_goals')
      .select(`
        id, title, created_at, duration_days,
        tasks ( id, status, due_date, task_type, title, duration_mins, priority )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('profiles')
      .select('xp, level, current_streak, streak_shields_count')
      .eq('id', user.id)
      .single(),
    supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lte('next_review', new Date().toISOString())
  ])

  const goalData = goals && goals.length > 0 ? goals[0] : null

  let checkpointBattleDue = null
  if (goalData) {
    const battleCheck = await checkCheckpointBattleDue(goalData.id)
    if (battleCheck.due) {
      checkpointBattleDue = battleCheck
    }
  }

  const username = user?.email?.split('@')[0] || 'Pathseeker'

  // Compute live stats from goal data
  let stats = null
  if (goalData) {
    const todayStr = getLocalDateString()
    const tasks = goalData.tasks || []
    const realTasks = tasks.filter((t: any) => t.task_type !== 'void')
    const completed = realTasks.filter((t: any) => t.status === 'completed').length
    const total = realTasks.length
    const todayTasks = realTasks.filter((t: any) => t.due_date === todayStr)
    const todayPending = todayTasks.filter((t: any) => t.status === 'pending').length

    // Streak (Read from DB profiles table)
    const streak = profile?.current_streak ?? 0

    // Current day
    const start = new Date(goalData.created_at)
    start.setHours(0, 0, 0, 0)
    const today = new Date(todayStr + 'T00:00:00')
    const currentDay = Math.max(1, Math.min(
      Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      goalData.duration_days
    ))

    stats = { completed, total, todayPending, todayTotal: todayTasks.length, streak, currentDay }
  }

  return (
    <DashboardClient
      username={username}
      profile={profile}
      dueCardsCount={dueCardsCount ?? 0}
      checkpointBattleDue={checkpointBattleDue}
      goalData={goalData}
      stats={stats}
      todayStr={getLocalDateString()}
    />
  )
}
