import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // 1. Get authenticated user session
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized: User not authenticated' }, { status: 401 })
        }

        // 2. Parse body parameter workspaceId
        const body = await request.json()
        const { workspaceId } = body

        if (!workspaceId) {
            return NextResponse.json({ error: 'Missing required field: workspaceId' }, { status: 400 })
        }

        // 3. Call the join_workspace_transaction database function using RPC
        const { data, error } = await supabase.rpc('join_workspace_transaction', {
            p_workspace_id: workspaceId,
            p_user_id: user.id
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // 4. Check the transaction return value
        if (data && data.success === false) {
            return NextResponse.json({ error: data.error }, { status: 400 })
        }

        return NextResponse.json({ success: true, message: 'Successfully joined workspace' })
    } catch (err: any) {
        console.error('Error joining workspace:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
