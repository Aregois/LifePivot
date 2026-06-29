import { generateTasksChunk } from '@/app/actions'
import { verifyUserSession } from '@/utils/auth'
import { NextResponse } from 'next/server'

// POST /api/plans/generate-tasks - Generate tasks for a given learning plan day range chunk
export async function POST(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { goalId, startDay, endDay } = body

        if (!goalId || startDay === undefined || endDay === undefined) {
            return NextResponse.json({ error: 'Missing required fields: goalId, startDay, endDay' }, { status: 400 })
        }

        const result = await generateTasksChunk(goalId, Number(startDay), Number(endDay))

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Error in POST /api/plans/generate-tasks:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
