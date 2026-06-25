import { createClient } from '@/utils/supabase/server'
import { verifyUserSession } from '@/utils/auth'
import { NextResponse } from 'next/server'
import { getLocalDateString } from '@/utils/date-utils'

// POST /api/plans/import - Import a public plan from the marketplace
export async function POST(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { goalId } = body

        if (!goalId) {
            return NextResponse.json({ error: 'Missing required field: goalId' }, { status: 400 })
        }

        const supabase = await createClient()

        // 1. Fetch public plan to import
        const { data: goal, error: goalError } = await supabase
            .from('learning_goals')
            .select('*')
            .eq('id', goalId)
            .eq('is_public', true)
            .single()

        if (goalError || !goal) {
            return NextResponse.json({ error: 'Public plan not found' }, { status: 404 })
        }

        const authorId = goal.user_id
        const metadata = goal.plan_metadata || {}
        const tokenCost = Number(metadata.token_cost || 0)

        // 2. Perform token transaction if plan is premium and buyer is not author
        if (tokenCost > 0 && authorId !== user.id) {
            // Check buyer tokens balance
            const { data: buyerProfile, error: buyerError } = await supabase
                .from('profiles')
                .select('tokens_balance')
                .eq('id', user.id)
                .single()

            if (buyerError || !buyerProfile) {
                return NextResponse.json({ error: 'Failed to retrieve profile balance' }, { status: 500 })
            }

            if (buyerProfile.tokens_balance < tokenCost) {
                return NextResponse.json({ error: 'Insufficient tokens' }, { status: 400 })
            }

            // Deduct tokens from buyer
            const { error: deductError } = await supabase
                .from('profiles')
                .update({ tokens_balance: buyerProfile.tokens_balance - tokenCost })
                .eq('id', user.id)

            if (deductError) {
                return NextResponse.json({ error: 'Token deduction failed' }, { status: 500 })
            }

            // Credit tokens to author
            const { data: authorProfile } = await supabase
                .from('profiles')
                .select('tokens_balance')
                .eq('id', authorId)
                .single()

            if (authorProfile) {
                await supabase
                    .from('profiles')
                    .update({ tokens_balance: authorProfile.tokens_balance + tokenCost })
                    .eq('id', authorId)
            }
        }

        // 3. Clone the goal record for the buyer
        const { data: newGoal, error: cloneGoalError } = await supabase
            .from('learning_goals')
            .insert({
                user_id: user.id,
                title: `${goal.title} (Imported)`,
                duration_days: goal.duration_days,
                level: goal.level,
                goal_intent: goal.goal_intent,
                sprint_walls: goal.sprint_walls,
                commitment_hours_per_week: goal.commitment_hours_per_week,
                is_public: false,
                rating: 5.0, // Reset rating on clone
                plan_metadata: {
                    ...metadata,
                    imported_from: goalId,
                    token_cost: 0 // Reset token cost for their owned copy
                }
            })
            .select()
            .single()

        if (cloneGoalError || !newGoal) {
            return NextResponse.json({ error: 'Failed to clone plan structure' }, { status: 500 })
        }

        // 4. Fetch all tasks associated with original goal
        const { data: originalTasks, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .eq('goal_id', goalId)

        if (tasksError) {
            return NextResponse.json({ error: 'Failed to retrieve plan tasks' }, { status: 500 })
        }

        if (originalTasks.length > 0) {
            // Find reference start date of original goal to compute day offsets
            const originalStartStr = getLocalDateString(new Date(goal.created_at))
            const originalStart = new Date(originalStartStr + 'T00:00:00')
            
            const todayStr = getLocalDateString()
            const today = new Date(todayStr + 'T00:00:00')

            const clonedTasks = originalTasks.map(task => {
                const taskDate = new Date(task.due_date + 'T00:00:00')
                const diffTime = Math.abs(taskDate.getTime() - originalStart.getTime())
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                
                // Shift due date relative to today
                const newDueDate = new Date(today.getTime())
                newDueDate.setDate(today.getDate() + diffDays)
                const newDueDateStr = getLocalDateString(newDueDate)

                return {
                    goal_id: newGoal.id,
                    user_id: user.id,
                    title: task.title,
                    subject: task.subject,
                    duration_mins: task.duration_mins,
                    due_date: newDueDateStr,
                    priority: task.priority,
                    task_type: task.task_type,
                    status: 'pending',
                    ai_hint: task.ai_hint,
                    subtasks: task.subtasks,
                    notes: task.notes,
                    resources: task.resources,
                    drill_data: task.drill_data
                }
            })

            const { error: insertTasksError } = await supabase
                .from('tasks')
                .insert(clonedTasks)

            if (insertTasksError) {
                console.error('Cloning tasks error:', insertTasksError)
                return NextResponse.json({ error: 'Failed to clone task schedules' }, { status: 500 })
            }
        }

        return NextResponse.json({ success: true, goalId: newGoal.id, message: 'Plan imported successfully!' })
    } catch (err: any) {
        console.error('Error in POST /api/plans/import:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
