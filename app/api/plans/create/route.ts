import { createGoalBase } from '@/app/actions'
import { verifyUserSession } from '@/utils/auth'
import { NextResponse } from 'next/server'

// POST /api/plans/create - Initialize a new learning goal plan metadata
export async function POST(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            title,
            duration_days,
            level,
            goal_intent,
            sprint_walls,
            daily_hours,
            category,
            language
        } = body

        if (!title) {
            return NextResponse.json({ error: 'No title provided' }, { status: 400 })
        }

        // Convert the JSON payload to FormData to pass into createGoalBase
        const formData = new FormData()
        formData.append('title', title)
        formData.append('duration_days', (duration_days || 30).toString())
        formData.append('level', level || 'Beginner')
        formData.append('goal_intent', goal_intent || 'Level Up')
        formData.append('sprint_walls', JSON.stringify(sprint_walls || []))
        formData.append('daily_hours', (daily_hours || 2).toString())
        formData.append('category', category || 'Custom')
        formData.append('language', language || 'en')

        const result = await createGoalBase(formData)

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.error === 'SUBSCRIBE_REQUIRED' ? 403 : 400 })
        }

        return NextResponse.json({ success: true, goalId: result.goalId })
    } catch (err: any) {
        console.error('Error in POST /api/plans/create:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
