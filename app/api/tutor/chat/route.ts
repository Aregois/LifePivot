import { verifyUserSession } from '@/utils/auth'
import { sendSocraticMessage } from '@/app/actions'
import { NextResponse } from 'next/server'

// POST /api/tutor/chat - Expose Socratic AI tutor responses to mobile client
export async function POST(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { taskId, message, history, persona } = body

        if (!taskId || !message) {
            return NextResponse.json({ error: 'Missing taskId or message' }, { status: 400 })
        }

        const result = await sendSocraticMessage(taskId, message, history || [], undefined, persona || 'feynman')
        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json({ reply: result.reply, isFirstMessage: result.isFirstMessage })
    } catch (err: any) {
        console.error('Error in POST /api/tutor/chat:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
