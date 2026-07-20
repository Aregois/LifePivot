import { createClient } from '@/utils/supabase/server'
import { verifyUserSession } from '@/utils/auth'
import { NextResponse } from 'next/server'

// POST /api/workspaces/leave - Leave a workspace
export async function POST(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { workspaceId } = body

        if (!workspaceId) {
            return NextResponse.json({ error: 'Missing required field: workspaceId' }, { status: 400 })
        }

        const supabase = await createClient()

        // Check if user is a member
        const { data: membership, error: checkError } = await supabase
            .from('workspace_members')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('user_id', user.id)
            .maybeSingle()

        if (checkError) {
            return NextResponse.json({ error: checkError.message }, { status: 500 })
        }

        if (!membership) {
            return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 400 })
        }

        // Delete membership
        const { error: deleteError } = await supabase
            .from('workspace_members')
            .delete()
            .eq('workspace_id', workspaceId)
            .eq('user_id', user.id)

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Left workspace successfully' })
    } catch (err: any) {
        console.error('Error in POST /api/workspaces/leave:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
