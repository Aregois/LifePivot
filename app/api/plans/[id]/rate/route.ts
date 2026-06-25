import { createClient } from '@/utils/supabase/server'
import { verifyUserSession } from '@/utils/auth'
import { NextResponse } from 'next/server'

// POST /api/plans/[id]/rate - Rate a public marketplace plan (1-5 stars)
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: goalId } = await params
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { rating } = body

        const numRating = Number(rating)
        if (isNaN(numRating) || numRating < 1 || numRating > 5) {
            return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 })
        }

        const supabase = await createClient()

        // 1. Fetch public goal details
        const { data: goal, error: goalError } = await supabase
            .from('learning_goals')
            .select('*')
            .eq('id', goalId)
            .single()

        if (goalError || !goal) {
            return NextResponse.json({ error: 'Learning plan not found' }, { status: 404 })
        }

        if (!goal.is_public) {
            return NextResponse.json({ error: 'Cannot rate private plans' }, { status: 400 })
        }

        // 2. Fetch or initialize ratings count/sum in plan_metadata
        const metadata = goal.plan_metadata || {}
        
        // Default values to preserve historical 5.0 rating if none exist
        const currentCount = Number(metadata.rating_count || 1)
        const currentSum = Number(metadata.rating_sum || (5.0 * currentCount))

        const newCount = currentCount + 1
        const newSum = currentSum + numRating
        const newAverage = Number((newSum / newCount).toFixed(2))

        const updatedMetadata = {
            ...metadata,
            rating_count: newCount,
            rating_sum: newSum
        }

        // 3. Update the goal record
        const { data: updatedGoal, error: updateError } = await supabase
            .from('learning_goals')
            .update({
                rating: newAverage,
                plan_metadata: updatedMetadata
            })
            .eq('id', goalId)
            .select()
            .single()

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            rating: updatedGoal.rating,
            ratingCount: newCount,
            message: 'Rating submitted successfully!'
        })
    } catch (err: any) {
        console.error('Error in POST /api/plans/[id]/rate:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
