import { createClient } from '@/utils/supabase/server'
import { verifyUserSession } from '@/utils/auth'
import { NextResponse } from 'next/server'

// POST /api/plans/publish - Publish a learning plan to the marketplace
export async function POST(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { goalId, isPublic, tokenCost } = body

        if (!goalId) {
            return NextResponse.json({ error: 'Missing required field: goalId' }, { status: 400 })
        }

        const supabase = await createClient()

        // 1. Verify owner of the learning goal
        const { data: goal, error: fetchError } = await supabase
            .from('learning_goals')
            .select('*')
            .eq('id', goalId)
            .single()

        if (fetchError || !goal) {
            return NextResponse.json({ error: 'Learning plan not found' }, { status: 404 })
        }

        if (goal.user_id !== user.id) {
            return NextResponse.json({ error: 'Only the creator can publish this plan' }, { status: 403 })
        }

        // 2. Set public status & token cost in plan_metadata
        const currentMetadata = goal.plan_metadata || {}
        const updatedMetadata = {
            ...currentMetadata,
            token_cost: Number(tokenCost || 0)
        }

        const { data: updatedGoal, error: updateError } = await supabase
            .from('learning_goals')
            .update({
                is_public: !!isPublic,
                plan_metadata: updatedMetadata
            })
            .eq('id', goalId)
            .select()
            .single()

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, goal: updatedGoal })
    } catch (err: any) {
        console.error('Error in POST /api/plans/publish:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
