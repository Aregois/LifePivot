import { generateSocraticMicroDrills } from '@/app/actions'
import { verifyUserSession } from '@/utils/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { taskId } = body

        if (!taskId) {
            return NextResponse.json({ error: 'Missing required field: taskId' }, { status: 400 })
        }

        const result = await generateSocraticMicroDrills(taskId)

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({
            drill: result.drill,
        })
    } catch (err: any) {
        console.error('Error in POST /api/tasks/drill/generate:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
