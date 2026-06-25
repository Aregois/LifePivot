import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // 1. Get authenticated user session (tutor)
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized: User not authenticated' }, { status: 401 })
        }

        // 2. Parse body parameters
        const body = await request.json()
        const { studentId, workspaceId, task } = body

        if (!studentId || !workspaceId || !task || !task.title) {
            return NextResponse.json({ error: 'Missing required fields: studentId, workspaceId, or task.title' }, { status: 400 })
        }

        // 3. Call the tutor_push_task database function using RPC
        const { data, error } = await supabase.rpc('tutor_push_task', {
            p_tutor_id: user.id,
            p_student_id: studentId,
            p_workspace_id: workspaceId,
            p_task_data: task
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (data && data.success === false) {
            const status = data.error.includes('verified tutor') || data.error.includes('associated') ? 403 : 400
            return NextResponse.json({ error: data.error }, { status })
        }

        return NextResponse.json({
            success: true,
            taskId: data.taskId,
            message: 'Task successfully injected into student learning plan'
        })
    } catch (err: any) {
        console.error('Error pushing tutor task:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
