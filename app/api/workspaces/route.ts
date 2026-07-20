import { createClient } from '@/utils/supabase/server'
import { verifyUserSession } from '@/utils/auth'
import { NextResponse } from 'next/server'

// GET /api/workspaces - Fetch all workspaces with membership indicators
export async function GET(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createClient()

        // 1. Fetch all workspaces
        const { data: workspaces, error: wsError } = await supabase
            .from('workspaces')
            .select('*')
            .order('created_at', { ascending: false })

        if (wsError) {
            return NextResponse.json({ error: wsError.message }, { status: 500 })
        }

        // 2. Fetch current user's memberships
        const { data: memberships, error: memError } = await supabase
            .from('workspace_members')
            .select('workspace_id')
            .eq('user_id', user.id)

        if (memError) {
            return NextResponse.json({ error: memError.message }, { status: 500 })
        }

        const memberSet = new Set(memberships.map(m => m.workspace_id))

        // 3. Augment workspaces with member details
        const enrichedWorkspaces = workspaces.map(ws => ({
            ...ws,
            isJoined: memberSet.has(ws.id),
            isCreator: ws.creator_id === user.id
        }))

        return NextResponse.json({ success: true, workspaces: enrichedWorkspaces })
    } catch (err: any) {
        console.error('Error in GET /api/workspaces:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}

// POST /api/workspaces - Create a new workspace (tutor role only)
export async function POST(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, isPremium, tokenCost } = body

        if (!name) {
            return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 })
        }

        const supabase = await createClient()

        // Verify the user is a tutor
        const { data: profile, error: profError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profError || !profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        if (profile.role !== 'tutor') {
            return NextResponse.json({ error: 'Only tutors can create workspaces' }, { status: 403 })
        }

        // Create the workspace
        const { data: workspace, error: createError } = await supabase
            .from('workspaces')
            .insert({
                name,
                creator_id: user.id,
                is_premium: !!isPremium,
                token_cost: isPremium ? Number(tokenCost || 0) : 0
            })
            .select()
            .single()

        if (createError || !workspace) {
            return NextResponse.json({ error: createError?.message || 'Failed to create workspace' }, { status: 500 })
        }

        // Auto-add creator as a member
        const { error: memberError } = await supabase
            .from('workspace_members')
            .insert({
                workspace_id: workspace.id,
                user_id: user.id
            })

        if (memberError) {
            return NextResponse.json({ error: memberError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, workspace })
    } catch (err: any) {
        console.error('Error in POST /api/workspaces:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
