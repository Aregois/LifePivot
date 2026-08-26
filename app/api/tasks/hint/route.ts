import { generateHint } from '@/app/actions'
import { verifyUserSession } from '@/utils/auth'
import { NextResponse } from 'next/server'

// POST /api/tasks/hint - Returns a Socratic conceptual hint for a given task/subtask
export async function POST(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { taskId, subtaskTitle } = body

        if (!taskId) {
            return NextResponse.json({ error: 'Missing required field: taskId' }, { status: 400 })
        }

        const result = await generateHint(taskId, subtaskTitle)

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({
            hint: result.hint,
            fromCache: result.fromCache ?? false,
        })
    } catch (err: any) {
        console.error('Error in POST /api/tasks/hint:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
