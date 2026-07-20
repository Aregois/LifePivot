import { createClient } from '@/utils/supabase/server'
import { verifyUserSession } from '@/utils/auth'
import { NextResponse } from 'next/server'
import { getLocalDateString } from '@/utils/date-utils'

const VALID_SUBJECTS = ['TECH', 'SCIENCE', 'MATH', 'HISTORY', 'ARTS', 'GENERAL'] as const
const VALID_GOAL_INTENTS = ['Exam', 'Level Up', 'Intro'] as const

type ValidSubject = typeof VALID_SUBJECTS[number]

function sanitizeSubject(raw: string | undefined): ValidSubject {
    if (!raw) return 'GENERAL'
    const upper = raw.toUpperCase()
    if (VALID_SUBJECTS.includes(upper as ValidSubject)) return upper as ValidSubject
    return 'GENERAL'
}

/**
 * POST /api/plans/json-import
 *
 * Accepts a JSON array of tasks (Gemini Notebook output) and creates
 * a new learning_goals row + task rows in Supabase.
 *
 * This is SEPARATE from /api/plans/import which is the marketplace clone feature.
 */
export async function POST(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { tasks, planTitle } = body as { tasks: any[], planTitle?: string }

        // ── Validate input ──────────────────────────────────────────────────
        if (!tasks || !Array.isArray(tasks)) {
            return NextResponse.json(
                { error: 'Invalid payload: "tasks" must be a JSON array.' },
                { status: 400 }
            )
        }

        if (tasks.length < 5) {
            return NextResponse.json(
                { error: 'Plan must have at least 5 tasks.' },
                { status: 400 }
            )
        }

        // Validate required fields on each task
        for (let i = 0; i < tasks.length; i++) {
            const t = tasks[i]
            const day = t.day ?? t.day_number
            if (day === undefined || day === null) {
                return NextResponse.json(
                    { error: `Missing required field: "day" on task at index ${i}` },
                    { status: 400 }
                )
            }
            if (!t.title) {
                return NextResponse.json(
                    { error: `Missing required field: "title" on day ${day}` },
                    { status: 400 }
                )
            }
            if (t.priority === undefined || t.priority === null) {
                return NextResponse.json(
                    { error: `Missing required field: "priority" on day ${day}` },
                    { status: 400 }
                )
            }
            if (typeof t.priority !== 'number' || t.priority < 0 || t.priority > 5) {
                return NextResponse.json(
                    { error: `Priority ${t.priority} on day ${day} is not valid (must be 0–5)` },
                    { status: 400 }
                )
            }
            if (t.estimated_mins === undefined || t.estimated_mins === null) {
                return NextResponse.json(
                    { error: `Missing required field: "estimated_mins" on day ${day}` },
                    { status: 400 }
                )
            }
        }

        const supabase = await createClient()

        // ── Subscription gating ────────────────────────────────────────────
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_subscribed')
            .eq('id', user.id)
            .single()

        const isSubscribed = !!profile?.is_subscribed

        if (!isSubscribed) {
            // Free users may import only if they have zero existing plans
            const { data: existingGoals } = await supabase
                .from('learning_goals')
                .select('id')
                .eq('user_id', user.id)
                .limit(1)

            if (existingGoals && existingGoals.length > 0) {
                return NextResponse.json(
                    { error: 'SUBSCRIBE_REQUIRED' },
                    { status: 403 }
                )
            }
        }

        // ── Extract plan metadata from Day 1 task ──────────────────────────
        const day1 = tasks.find((t: any) => (t.day ?? t.day_number) === 1)

        const derivedLevel = (day1?.level && ['Beginner', 'Intermediate', 'Advanced'].includes(day1.level))
            ? day1.level
            : 'Intermediate'

        const derivedGoalIntent = (day1?.goal_intent && VALID_GOAL_INTENTS.includes(day1.goal_intent))
            ? day1.goal_intent as typeof VALID_GOAL_INTENTS[number]
            : 'Level Up'

        let derivedHours = 10
        if (day1?.commitment_hours_per_week !== undefined && day1?.commitment_hours_per_week !== null) {
            const parsed = parseFloat(day1.commitment_hours_per_week)
            if (!isNaN(parsed)) {
                derivedHours = Math.round(parsed)
            }
        }

        // totalDays = max day number in the array
        const totalDays = Math.max(...tasks.map((t: any) => t.day ?? t.day_number ?? 1))

        // Derive a plan title from the tasks if not provided
        const resolvedTitle = (planTitle && planTitle.trim())
            ? planTitle.trim()
            : 'Imported Plan'

        // Build sprint walls (1 every 6 days)
        const baseDate = new Date()
        const sprintWalls: { date: string; label: string }[] = []
        for (let day = 6; day < totalDays; day += 6) {
            const wallDate = new Date(baseDate)
            wallDate.setDate(wallDate.getDate() + (day - 1))
            sprintWalls.push({
                date: getLocalDateString(wallDate),
                label: `Checkpoint ${Math.floor(day / 6)}`
            })
        }

        // ── Insert learning_goals row ────────────────────────────────────────
        const { data: goal, error: goalError } = await supabase
            .from('learning_goals')
            .insert({
                title: resolvedTitle,
                user_id: user.id,
                duration_days: totalDays,
                level: derivedLevel,
                goal_intent: derivedGoalIntent,
                sprint_walls: sprintWalls,
                commitment_hours_per_week: derivedHours,
                plan_metadata: {
                    category: 'Custom',
                    language: 'en',
                    source: 'json_import',
                    translated_titles: { en: resolvedTitle }
                }
            })
            .select()
            .single()

        if (goalError || !goal) {
            console.error('Failed to create learning goal:', goalError)
            return NextResponse.json(
                { error: 'Failed to create plan: ' + (goalError?.message ?? 'Unknown error') },
                { status: 500 }
            )
        }

        const goalId = goal.id as string

        // ── Map JSON tasks → DB rows ─────────────────────────────────────────
        const tasksToInsert = tasks.map((task: any) => {
            const dayNum = task.day ?? task.day_number ?? 1
            const targetDate = new Date(baseDate)
            targetDate.setDate(targetDate.getDate() + (dayNum - 1))

            const priority = typeof task.priority === 'number' ? task.priority : 3
            const taskType = (priority === 0 || task.task_type === 'void' || task.title === 'VOID DAY')
                ? 'void'
                : 'task'

            const rawSubject = sanitizeSubject(task.subject)

            // Format subtasks array with ids
            const rawSubtasks: string[] = Array.isArray(task.subtasks) ? task.subtasks : []
            const formattedSubtasks = rawSubtasks.map((subTitle: string, index: number) => {
                const subId = `st_${index + 1}_${Math.random().toString(36).substring(2, 8)}`
                return { id: subId, title: typeof subTitle === 'string' ? subTitle : '', completed: false }
            })

            // Translations sentinel subtask
            const translationsSubtask = {
                id: 'translations',
                title: '',
                completed: false,
                translations: {
                    title: { en: task.title },
                    subtasks: formattedSubtasks.reduce((acc: any, st: any) => {
                        acc[st.id] = { en: st.title }
                        return acc
                    }, {})
                }
            }

            return {
                goal_id: goalId,
                user_id: user.id,
                title: task.title,
                subject: rawSubject,
                duration_mins: task.estimated_mins ?? 45,
                priority,
                task_type: taskType,
                due_date: getLocalDateString(targetDate),
                status: 'pending',
                subtasks: [...formattedSubtasks, translationsSubtask]
            }
        })

        // ── Batch insert tasks ────────────────────────────────────────────────
        const { error: tasksError } = await supabase
            .from('tasks')
            .insert(tasksToInsert)

        if (tasksError) {
            console.error('Failed to insert tasks — cleaning up goal:', tasksError)
            // Orphan cleanup: delete the learning_goals row we just created
            await supabase.from('learning_goals').delete().eq('id', goalId)
            return NextResponse.json(
                { error: 'Failed to save tasks: ' + tasksError.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            planId: goalId,
            totalDays,
            totalTasks: tasks.length
        })
    } catch (err: any) {
        console.error('Error in POST /api/plans/json-import:', err)
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
