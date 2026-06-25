import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        // Parse sorting query parameters
        const { searchParams } = new URL(request.url)
        const sortBy = searchParams.get('sortBy') || 'created_at' // 'created_at' or 'rating'
        const order = searchParams.get('order') || 'desc' // 'asc' or 'desc'

        let query = supabase
            .from('learning_goals')
            .select('id, title, duration_days, level, goal_intent, commitment_hours_per_week, is_public, rating, created_at, profiles(id, role, linkedin_url)')
            .eq('is_public', true)

        if (sortBy === 'rating') {
            query = query.order('rating', { ascending: order === 'asc' })
        } else {
            query = query.order('created_at', { ascending: order === 'asc' })
        }

        const { data: plans, error } = await query

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, plans })
    } catch (err: any) {
        console.error('Error fetching discoverable plans:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
