import { createClient } from '@/utils/supabase/server'
import { signOut } from '@/app/login/actions'
import { getLocalDateString } from '@/utils/date-utils'
import { redirect } from 'next/navigation'
import { ProfileClient } from '@/components/profile-client'

export default async function ProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Fetch user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // Fetch all user tasks to calculate metrics
    const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)

    const completedTasks = tasks?.filter(t => t.status === 'completed') || []
    const totalCompleted = completedTasks.length
    const totalFocusMins = completedTasks.reduce((acc, t) => acc + (t.duration_mins ?? 30), 0)
    const p5Completed = completedTasks.filter(t => t.priority === 5).length
    const hasReflection = completedTasks.some(t => t.reflection && t.reflection.length > 0)
    
    // Streak calculations
    const todayStr = getLocalDateString()
    const taskDates = Array.from(new Set(tasks?.map(t => t.due_date) || [])).sort().reverse()
    let currentStreak = 0
    for (const date of taskDates) {
        if (date >= todayStr) continue // Skip today/future
        const dayTasks = tasks?.filter(t => t.due_date === date && t.task_type !== 'void') || []
        if (dayTasks.length === 0) continue
        if (dayTasks.every(t => t.status === 'completed')) {
            currentStreak++
        } else {
            break
        }
    }

    const level = profile?.level ?? 1
    const xp = profile?.xp ?? 0

    // Title based on level
    let title = 'Pathseeker'
    if (level >= 11) title = 'Grandmaster'
    else if (level >= 8) title = 'Sage'
    else if (level >= 5) title = 'Scholar'
    else if (level >= 3) title = 'Acolyte'

    const username = user?.email?.split('@')[0] || 'Pathseeker'

    // Achievements matrix (using serializable iconId keys)
    const achievements = [
        {
            id: 'first_focus',
            title: 'First Focus',
            description: 'Complete your first task focus session.',
            unlocked: totalCompleted >= 1,
            iconId: 'first_focus',
            color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
            glowColor: 'rgba(16,185,129,0.2)'
        },
        {
            id: 'recall_master',
            title: 'Feynman Apprentice',
            description: 'Pass your first Socratic active recall quiz.',
            unlocked: hasReflection,
            iconId: 'recall_master',
            color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
            glowColor: 'rgba(245,158,11,0.2)'
        },
        {
            id: 'deep_learner',
            title: 'Deep Learner',
            description: 'Complete a P5 (Deep Theory) task.',
            unlocked: p5Completed >= 1,
            iconId: 'deep_learner',
            color: 'text-neon-violet bg-neon-violet/10 border-neon-violet/20',
            glowColor: 'rgba(139,92,246,0.2)'
        },
        {
            id: 'streak_starter',
            title: 'Streak Starter',
            description: 'Maintain a 3-day study completion streak.',
            unlocked: currentStreak >= 3,
            iconId: 'streak_starter',
            color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
            glowColor: 'rgba(249,115,22,0.2)'
        }
    ]

    const completedToday = tasks?.filter(t => t.status === 'completed' && t.due_date === todayStr).length || 0
    const focusToday = tasks?.filter(t => t.status === 'completed' && t.due_date === todayStr).reduce((acc, t) => acc + (t.duration_mins ?? 30), 0) || 0

    const completedDates = Array.from(new Set(
        tasks?.filter(t => t.status === 'completed')
              .map(t => t.due_date) || []
    ))

    return (
        <ProfileClient
            username={username}
            level={level}
            xp={xp}
            title={title}
            totalCompleted={totalCompleted}
            totalFocusMins={totalFocusMins}
            currentStreak={currentStreak}
            achievements={achievements}
            completedToday={completedToday}
            focusToday={focusToday}
            signOutAction={signOut}
            completedDates={completedDates}
        />
    )
}
