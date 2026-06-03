import { createClient } from '@/utils/supabase/server'
import { ThreeDCalendarGrid } from '@/components/three-d-calendar-grid'
import { getLocalDateString } from '@/utils/date-utils'
import { redirect } from 'next/navigation'

export default async function CalendarPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const { data: tasks } = await supabase
        .from('tasks')
        .select(`
            *,
            learning_goals ( title )
        `)
        .eq('user_id', user.id)

    let activeDates: string[] = []
    let completedDates: string[] = []
    let missedDates: string[] = []

    if (tasks) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayIso = getLocalDateString()

        const dateMap: Record<string, { total: number, pending: number }> = {}

        tasks.forEach(t => {
            if (!dateMap[t.due_date]) dateMap[t.due_date] = { total: 0, pending: 0 }
            dateMap[t.due_date].total++
            if (t.status === 'pending') dateMap[t.due_date].pending++
        })

        const pending: string[] = []
        const completed: string[] = []
        const missed: string[] = []

        Object.entries(dateMap).forEach(([date, stats]) => {
            if (stats.pending > 0) {
                if (date < todayIso) missed.push(date)
                else pending.push(date)
            } else if (stats.total > 0) {
                completed.push(date)
            }
        })

        activeDates = pending
        completedDates = completed
        missedDates = missed
    }

    return (
        <div className="w-full flex-1 flex flex-col min-h-0 relative text-white">
            <main className="flex-1 min-h-0 flex flex-col">
                <ThreeDCalendarGrid
                    activeDates={activeDates}
                    completedDates={completedDates}
                    missedDates={missedDates}
                    tasks={tasks as any[] || []}
                />
            </main>
        </div>
    )
}

