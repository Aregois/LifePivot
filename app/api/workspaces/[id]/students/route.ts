import { createClient } from '@/utils/supabase/server'
import { verifyUserSession } from '@/utils/auth'
import { NextResponse } from 'next/server'

// GET /api/workspaces/[id]/students - Monitor students progress (tutor only)
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: workspaceId } = await params
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createClient()

        // 1. Verify workspace exists and user is creator/associated tutor
        const { data: workspace, error: wsError } = await supabase
            .from('workspaces')
            .select('*')
            .eq('id', workspaceId)
            .single()

        if (wsError || !workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
        }

        // Tutors can access. We verify user has tutor role.
        const { data: callerProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!callerProfile || callerProfile.role !== 'tutor') {
            return NextResponse.json({ error: 'Only tutors can inspect student progress' }, { status: 403 })
        }

        // 2. Fetch all members in this workspace
        const { data: members, error: memError } = await supabase
            .from('workspace_members')
            .select('user_id, joined_at')
            .eq('workspace_id', workspaceId)

        if (memError) {
            return NextResponse.json({ error: memError.message }, { status: 500 })
        }

        if (members.length === 0) {
            return NextResponse.json({ success: true, students: [] })
        }

        const studentIds = members.map(m => m.user_id).filter(uid => uid !== user.id) // Exclude tutor
        if (studentIds.length === 0) {
            return NextResponse.json({ success: true, students: [] })
        }

        // 3. Fetch profiles of these students
        const { data: profiles, error: profError } = await supabase
            .from('profiles')
            .select('id, tokens_balance, xp, level, current_streak, high_streak')
            .in('id', studentIds)

        if (profError) {
            return NextResponse.json({ error: profError.message }, { status: 500 })
        }

        // 4. Fetch all tasks for these students to calculate current progress metrics
        const { data: tasks, error: taskError } = await supabase
            .from('tasks')
            .select('user_id, status, task_type')
            .in('user_id', studentIds)

        if (taskError) {
            return NextResponse.json({ error: taskError.message }, { status: 500 })
        }

        // Aggregate stats per student
        const studentStats = profiles.map(profile => {
            const studentTasks = tasks.filter(t => t.user_id === profile.id && t.task_type !== 'void')
            const totalTasks = studentTasks.length
            const completedTasks = studentTasks.filter(t => t.status === 'completed').length
            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

            const joinedInfo = members.find(m => m.user_id === profile.id)

            return {
                id: profile.id,
                username: `Student-${profile.id.slice(0, 5)}`, // Or mock email/profile name
                xp: profile.xp,
                level: profile.level,
                currentStreak: profile.current_streak,
                highStreak: profile.high_streak,
                tokens: profile.tokens_balance,
                joinedAt: joinedInfo?.joined_at,
                totalTasks,
                completedTasks,
                completionRate
            }
        })

        return NextResponse.json({ success: true, students: studentStats })
    } catch (err: any) {
        console.error('Error in GET /api/workspaces/[id]/students:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
