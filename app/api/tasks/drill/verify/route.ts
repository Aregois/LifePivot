import { verifyMicroDrillAnswers } from '@/app/actions'
import { verifyUserSession } from '@/utils/auth'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { taskId, userAnswers, isFullFocus = false } = body

        if (!taskId || !Array.isArray(userAnswers)) {
            return NextResponse.json(
                { error: 'Missing required fields: taskId, userAnswers' },
                { status: 400 }
            )
        }

        const verifyResult = await verifyMicroDrillAnswers(taskId, userAnswers)

        if (verifyResult.error) {
            return NextResponse.json({ error: verifyResult.error }, { status: 400 })
        }

        const { passed, results, correctCount = 0, totalCount = 3 } = verifyResult
        const supabase = await createClient()

        // Calculate rewards: +50 base XP + 20 per correct answer. 3/3 gets 110 XP + 15 tokens; otherwise 5 tokens if score > 0
        const rewardXp = 50 + correctCount * 20
        const rewardTokens = correctCount === totalCount ? 15 : (correctCount > 0 ? 5 : 0)

        let leveledUp = false
        let newLevel = 1
        let newTokens = 0
        let newXp = 0

        // Fetch current profile to apply rewards
        const { data: profile } = await supabase
            .from('profiles')
            .select('tokens_balance, xp, level, multiplier_active')
            .eq('id', user.id)
            .single()

        if (profile) {
            let finalTokensReward = rewardTokens
            if (profile.multiplier_active && finalTokensReward > 0) {
                finalTokensReward = finalTokensReward * 2
            }

            newTokens = (profile.tokens_balance ?? 0) + finalTokensReward
            newXp = (profile.xp ?? 0) + rewardXp
            newLevel = profile.level ?? 1

            let xpNeeded = newLevel * 100
            while (newXp >= xpNeeded && newLevel < 100) {
                newXp -= xpNeeded
                newLevel += 1
                xpNeeded = newLevel * 100
                leveledUp = true
            }

            await supabase
                .from('profiles')
                .update({
                    tokens_balance: newTokens,
                    xp: newXp,
                    level: newLevel,
                    multiplier_active: profile.multiplier_active ? false : profile.multiplier_active,
                })
                .eq('id', user.id)
        }

        // If passed (or completed drill), mark task as completed
        if (passed || correctCount >= 2) {
            await supabase
                .from('tasks')
                .update({ status: 'completed' })
                .eq('id', taskId)
                .eq('user_id', user.id)
        }

        return NextResponse.json({
            success: true,
            passed,
            results,
            correctCount,
            totalCount,
            rewardXp,
            rewardTokens,
            leveledUp,
            newLevel,
            newTokens,
            newXp,
        })
    } catch (err: any) {
        console.error('Error in POST /api/tasks/drill/verify:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
