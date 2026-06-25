import { verifyUserSession } from '@/utils/auth'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // 1. Verify user session
    const user = await verifyUserSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Read query parameters
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('planId')
    const workspaceId = searchParams.get('workspaceId')

    const supabase = await createClient()

    // 3. Build query
    let query = supabase
      .from('document_metadata')
      .select('id, file_name, file_size, mime_type, created_at, user_id')

    if (workspaceId) {
      // Verify workspace access: check if creator first
      const { data: creatorCheck } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', workspaceId)
        .eq('creator_id', user.id)
        .maybeSingle()

      if (!creatorCheck) {
        // If not creator, check if member
        const { data: memberCheck } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (!memberCheck) {
          return NextResponse.json({ error: 'Access denied to this workspace' }, { status: 403 })
        }
      }

      query = query.eq('workspace_id', workspaceId)
    } else {
      query = query.eq('user_id', user.id)
      if (planId) {
        query = query.eq('plan_id', planId)
      }
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ documents: data ?? [] })
  } catch (err: any) {
    console.error('Error listing documents:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
