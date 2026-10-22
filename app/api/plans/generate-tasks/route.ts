import { generateTasksChunk } from '@/app/actions'
import { verifyUserSession } from '@/utils/auth'
import { checkRateLimit } from '@/utils/rate-limit'
import { NextResponse } from 'next/server'

// POST /api/plans/generate-tasks - Generate tasks for a given learning plan day range chunk
export async function POST(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const rateCheck = checkRateLimit(`${user.id}:generate_chunk`, 20, 60_000)
        if (!rateCheck.allowed) {
            return NextResponse.json({ error: 'Rate limit exceeded. Please wait a moment.' }, { status: 429 })
        }

        const body = await request.json()
        const { goalId, startDay, endDay } = body

        if (!goalId || startDay === undefined || endDay === undefined) {
            return NextResponse.json({ error: 'Missing required fields: goalId, startDay, endDay' }, { status: 400 })
        }

        const safeStart = Math.max(1, Math.min(365, Math.floor(Number(startDay) || 1)))
        const safeEnd = Math.max(safeStart, Math.min(365, Math.min(safeStart + 14, Math.floor(Number(endDay) || safeStart))))

        const result = await generateTasksChunk(goalId, safeStart, safeEnd)

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Error in POST /api/plans/generate-tasks:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
