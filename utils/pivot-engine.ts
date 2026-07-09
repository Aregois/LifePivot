import { createClient } from './supabase/server'
import { getLocalDateString } from './date-utils'

export const PIVOT_TRACE = {
    log: (tier: string, message: string, data?: any) => {
        console.log(`[PIVOT_TRACE][${tier}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
}

export async function evaluatePivot(userId: string) {
    const supabase = await createClient()

    // 1. Fetch user's profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('lives, last_pivot_check, streak_shields_count, current_streak, high_streak')
        .eq('id', userId)
        .single()

    if (!profile) return

    const todayStr = getLocalDateString()
    const lastCheckStr = getLocalDateString(new Date(profile.last_pivot_check))

    // If already checked today, do nothing
    if (todayStr === lastCheckStr) return

    // 2. Find overdue tasks
    const { data: overdueTasks } = await supabase
        .from('tasks')
        .select('id, pivoted_count')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .lt('due_date', todayStr) // Strictly before today

    const needsPivot = overdueTasks && overdueTasks.length > 0

    if (!needsPivot) {
        // Increment streak if there are no overdue tasks (yesterday completely done)
        const nextStreak = (profile.current_streak ?? 0) + 1
        const nextHigh = Math.max(profile.high_streak ?? 0, nextStreak)

        await supabase
            .from('profiles')
            .update({ 
                last_pivot_check: new Date().toISOString(),
                current_streak: nextStreak,
                high_streak: nextHigh
            })
            .eq('id', userId)
    } else {
        // Overdue tasks exist. Consume shield or break streak.
        if ((profile.streak_shields_count ?? 0) > 0) {
            const overdueIds = overdueTasks.map(t => t.id)
            const firstPivotedCount = overdueTasks[0]?.pivoted_count ?? 0
            
            // Move overdue tasks to today
            await supabase
                .from('tasks')
                .update({ due_date: todayStr, pivoted_count: firstPivotedCount + 1 })
                .in('id', overdueIds)

            // Consume one streak shield, keep streak same, update check date
            await supabase
                .from('profiles')
                .update({
                    streak_shields_count: profile.streak_shields_count - 1,
                    last_pivot_check: new Date().toISOString()
                })
                .eq('id', userId)
        } else {
            // No shields. Streak drops to 0, but high_streak is updated/preserved.
            const nextHigh = Math.max(profile.high_streak ?? 0, profile.current_streak ?? 0)
            await supabase
                .from('profiles')
                .update({
                    current_streak: 0,
                    high_streak: nextHigh
                })
                .eq('id', userId)
        }
    }
}

/**
 * TIER 1: Algorithmic Slide
 * Ripples tasks forward until it hits a P0 (Void Day).
 */
export async function executeAlgorithmicSlide(goalId: string, userId: string) {
    const supabase = await createClient()
    PIVOT_TRACE.log('TIER_1', 'Starting Algorithmic Slide', { goalId });

    // 1. Get Goal and Metadata
    const { data: goal } = await supabase
        .from('learning_goals')
        .select('*')
        .eq('id', goalId)
        .single();

    if (!goal) throw new Error('Goal not found');
    const todayStr = getLocalDateString();

    // 2. Identify Overdue Tasks
    const { data: overdueTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', goalId)
        .eq('status', 'pending')
        .lt('due_date', todayStr)
        .order('due_date', { ascending: true });

    if (!overdueTasks || overdueTasks.length === 0) {
        PIVOT_TRACE.log('TIER_1', 'No overdue tasks found');
        return { success: true, message: 'Clean slate' };
    }

    // 3. Find the nearest P0 Day (Void Day) from today onwards
    const { data: futureTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', goalId)
        .gte('due_date', todayStr)
        .order('due_date', { ascending: true });

    if (!futureTasks) throw new Error('Could not fetch future tasks');

    // Find the first date that ONLY has a P0 task
    const tasksByDate = futureTasks.reduce((acc: any, t) => {
        acc[t.due_date] = acc[t.due_date] || [];
        acc[t.due_date].push(t);
        return acc;
    }, {});

    let nearestVoidDate: string | null = null;
    const sortedDates = Object.keys(tasksByDate).sort();

    for (const date of sortedDates) {
        const dayTasks = tasksByDate[date];
        const isVoidDay = dayTasks.length === 1 && dayTasks[0].priority === 0;
        if (isVoidDay) {
            nearestVoidDate = date;
            break;
        }
    }

    if (!nearestVoidDate) {
        PIVOT_TRACE.log('TIER_1', 'No Void Day available. Slide impossible.');
        return { success: false, reason: 'NO_VOID_DAYS' };
    }

    PIVOT_TRACE.log('TIER_1', `Nearest Void Day found at ${nearestVoidDate}. Starting Ripple.`);

    // 4. THE RIPPLE: Shift everything between today and the Void Day forward
    // IMPORTANT: We ripple FIRST, then move overdue tasks to today.
    // This prevents overdue tasks from being caught by the ripple and pushed forward.

    // 4a. Delete the Void Day task first (it will be consumed by the incoming ripple)
    const voidTask = tasksByDate[nearestVoidDate][0];
    await supabase.from('tasks').delete().eq('id', voidTask.id);

    // 4b. Ripple forward tasks that were scheduled between Today and VoidDate
    // Exclude today itself — we only shift future-dated tasks to make room
    const datesToShift = sortedDates.filter(d => d >= todayStr && d < nearestVoidDate!);

    // Exclude overdue tasks from the ripple so they don't get shifted
    const overdueIds = overdueTasks.map(t => t.id);
    const overdueIdSet = new Set(overdueIds);

    // Build the date-shift map in memory (O(n), zero DB calls)
    // Maps each date to the next date it should shift into
    const dateShiftMap = new Map<string, string>();
    for (let i = 0; i < datesToShift.length; i++) {
        const currentDate = datesToShift[i];
        const nextDate = (i === datesToShift.length - 1) ? nearestVoidDate! : datesToShift[i + 1];
        dateShiftMap.set(currentDate, nextDate);
    }

    // Apply the shift to all future tasks in memory, excluding overdue and void tasks
    const tasksToUpsert = futureTasks
        .filter(t => t.id !== voidTask.id && !overdueIdSet.has(t.id) && dateShiftMap.has(t.due_date))
        .map(t => ({ ...t, due_date: dateShiftMap.get(t.due_date)! }));

    if (tasksToUpsert.length > 0) {
        PIVOT_TRACE.log('TIER_1', `Bulk upserting ${tasksToUpsert.length} tasks in a single DB call`);
        await supabase.from('tasks').upsert(tasksToUpsert);
    }

    // 4c. Now move overdue tasks to today (after ripple, so they won't be shifted)
    if (overdueIds.length > 0) {
        await supabase
            .from('tasks')
            .update({ due_date: todayStr, pivoted_count: overdueTasks[0].pivoted_count + 1 })
            .in('id', overdueIds);
    }

    PIVOT_TRACE.log('TIER_1', 'Ripple Complete. Void Day consumed.');
    return { success: true };
}
