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

        // Fetch task to check ownership and whether it is already completed
        const { data: task } = await supabase
            .from('tasks')
            .select('status')
            .eq('id', taskId)
            .eq('user_id', user.id)
            .single()

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        const isAlreadyCompleted = task.status === 'completed'
        const isPassed = Boolean(passed || correctCount >= 2)
        const shouldAward = isPassed && !isAlreadyCompleted

        // Only award XP and tokens when the user passes the drill and the task transitions to completed
        const rewardXp = shouldAward ? (50 + correctCount * 20) : 0
        const rewardTokens = shouldAward ? (correctCount === totalCount ? 15 : 5) : 0

        let leveledUp = false
        let newLevel = 1
        let newTokens = 0
        let newXp = 0

        // Fetch current profile to apply rewards (only when passing a pending task)
        const { data: profile } = await supabase
            .from('profiles')
            .select('tokens_balance, xp, level, multiplier_active')
            .eq('id', user.id)
            .single()

        if (profile) {
            newTokens = profile.tokens_balance ?? 0
            newXp = profile.xp ?? 0
            newLevel = profile.level ?? 1
        }

        if (profile && shouldAward) {
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

        // If passed, mark task as completed
        if (isPassed && !isAlreadyCompleted) {
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
