'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { executeAlgorithmicSlide, PIVOT_TRACE } from '@/utils/pivot-engine'
import { getLocalDateString } from '@/utils/date-utils'

function cleanAndParseJSON<T>(rawText: string, fallback: T): T {
    try {
        let cleaned = rawText.trim();
        
        // Match content between triple backticks (optionally starting with "json")
        const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (jsonMatch) {
            cleaned = jsonMatch[1].trim();
        } else {
            cleaned = cleaned.replace(/```(?:json)?/gi, '').replace(/```/gi, '').trim();
        }

        try {
            return JSON.parse(cleaned) as T;
        } catch (firstErr) {
            const firstBrace = cleaned.indexOf('{');
            const firstBracket = cleaned.indexOf('[');
            let start = -1;
            let end = -1;
            
            if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
                start = firstBrace;
                end = cleaned.lastIndexOf('}');
            } else if (firstBracket !== -1) {
                start = firstBracket;
                end = cleaned.lastIndexOf(']');
            }
            
            if (start !== -1 && end !== -1 && end > start) {
                const substring = cleaned.substring(start, end + 1);
                return JSON.parse(substring) as T;
            }
            throw firstErr;
        }
    } catch (err) {
        console.error("cleanAndParseJSON failed to parse text:", rawText, err);
        return fallback;
    }
}

export async function createGoalBase(formData: FormData) {
    console.log('[DEBUG createGoalBase] Server action triggered')
    const supabase = await createClient()
    const title = formData.get('title') as string
    const durationDays = parseInt(formData.get('duration_days') as string) || 30
    const level = formData.get('level') as string || 'Beginner'
    const goalIntent = formData.get('goal_intent') as string || 'Level Up'
    const category = formData.get('category') as string || 'Custom'
    const language = formData.get('language') as string || 'en'
    let sprintWalls: { date: string; label: string }[] = []
    try {
        sprintWalls = JSON.parse(formData.get('sprint_walls') as string || '[]')
    } catch {
        return { error: 'Invalid sprint walls format' }
    }
    const dailyHours = parseInt(formData.get('daily_hours') as string) || 2

    if (!title) return { error: 'No title provided' }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Check if the user already has an active plan
    const { data: existingGoals } = await supabase
        .from('learning_goals')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

    if (existingGoals && existingGoals.length > 0) {
        return { error: 'You already have an active learning plan.' }
    }

    const { data: goal, error: insertError } = await supabase
        .from('learning_goals')
        .insert({
            title,
            user_id: user.id,
            duration_days: durationDays,
            level: level,
            goal_intent: goalIntent,
            sprint_walls: sprintWalls,
            commitment_hours_per_week: dailyHours * 7, // Keeping DB field but storing derived value for now or we could rename column
            plan_metadata: { category, language }
        })
        .select()
        .single()

    if (insertError) return { error: insertError.message }

    revalidatePath('/', 'layout')
    return { success: true, goalId: goal.id }
}

export async function generateTasksChunk(goalId: string, startDay: number, endDay: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: goal } = await supabase
        .from('learning_goals')
        .select('*')
        .eq('id', goalId)
        .single()

    if (!goal) return { error: 'Goal not found' }

    const { model } = await import('@/utils/gemini');

    const category = (goal.plan_metadata as any)?.category || 'Custom';
    const language = (goal.plan_metadata as any)?.language || 'en';
    const categoryPrompts: Record<string, string> = {
        'Coding': 'The curriculum must follow a hands-on, project-building approach. Focus on writing clean code, modular programming, writing tests, debugging exercises (P1/P3/P4), and deep systems or algorithmic design theory (P5). Subtasks must outline specific engineering tasks (e.g., "Write unit tests for authentication endpoints", "Refactor error handling middleware").',
        'Science': 'The curriculum must emphasize physical laws, biochemical mechanisms, scientific models, or experimental designs. Incorporate conceptual summaries (P2), math-based science problem sets or calculations (P4), and peer-reviewed paper analyses or experimental research designs (P5). Subtasks should demand mechanistic understanding (e.g., "Draw diagram of action potential propagation", "Calculate chemical equilibrium constants for reactions 1-4").',
        'Math': 'The curriculum must follow a rigorous proof, derivation, and calculation track. Emphasize math problem sheets and practice questions (P1/P4), conceptual theory overviews (P2), and the study of complex derivations or fundamental mathematical proofs (P5). Subtasks must specify problems or proofs to solve (e.g., "Derive Taylor series expansion for log functions", "Write formal proof for theorem 2.1").',
        'Languages': 'The curriculum must focus on conversational fluency, auditory/visual immersion, and written practice. Highlight vocabulary acquisition and grammar drills (P1/P2), active listening/speaking exercises (P3), reading local publications (P4), and full conversational dialogues, essay composition, or speech presentations (P5). Subtasks must require active output (e.g., "Record a 3-minute self-introduction speech", "Write a 150-word journal entry about your weekend").',
        'Humanities': 'The curriculum must focus on critical analysis, historical context, or cultural synthesis. Emphasize extensive readings and text annotations (P2), drafting outlines and comparative arguments (P4), and writing analytical synthesis essays or evaluating philosophical texts (P5). Subtasks should focus on conceptual analysis (e.g., "Annotate chapter 4 of the critique", "Write a comparative paragraph analyzing author perspectives").',
        'Arts & Design': 'The curriculum must follow a portfolio-driven, hands-on creative path. Focus on technical sketching, color theory exercises, or wireframing drills (P1/P2), project layout or storyboard compositions (P4), and final piece execution, creative portfolio work, or user experience testing loops (P5). Subtasks should guide manual/digital creation (e.g., "Sketch 3 perspective views of the product", "Create color palette mockups with 5 contrast pairs").',
        'Business': 'The curriculum must focus on commercial analysis, financial modeling, and strategy formulation. Focus on reading market summaries (P2), calculating financial statements or building market models (P4), and conducting SWOT analyses, competitive research reports, or business model canvas generation (P5). Subtasks should require actionable deliverables (e.g., "Build cash flow projection sheet for year 1", "Conduct competitive audit on 3 direct rivals").',
        'Music': 'The curriculum must emphasize musical practice, notation, and theory. Focus on technical runs, scale patterns, and chord exercises (P1), ear-training or dictation drills (P3), transcription of songs (P4), and compositional exercises or music theory analysis (P5). Subtasks should specify practice guidelines (e.g., "Practice G-major arpeggios at 120bpm for 15 mins", "Transcribe the first 4 bars of the melody").',
        'History': 'The curriculum must follow a historical investigation and archival analysis flow. Focus on timeline construction (P1), primary document reviews (P2), comparative analysis (P4), and writing critical research arguments or thematic evaluations (P5). Subtasks should guide historical analysis (e.g., "Create chronological timeline of the treaty negotiation", "Read and annotate 3 letters from the archive").',
        'Social Sciences': 'The curriculum must cover theories of human behavior, society, and research methodology. Focus on reading seminal research papers (P2), designing survey questions or analyzing statistical datasets (P4), and writing theoretical critiques or ethical reviews of experiment designs (P5). Subtasks should prompt research tasks (e.g., "Outline 5 interview questions for the demographic group", "Run linear regression analysis on dataset alpha").',
        'Health & Fitness': 'The curriculum must balance physical drills, nutritional education, and exercise biomechanics. Focus on form drill practice or flexibility routines (P1), studying anatomy or physiology overviews (P2), planning workout sessions and macro logs (P4), and designing macro-cycles, analyzing biomechanical movement patterns, or creating long-term fitness plans (P5). Subtasks should focus on physical tracking (e.g., "Log daily macronutrient splits", "Perform and record 3 sets of slow form drills for squats").',
        'Custom': 'The curriculum should be a balanced, general study course covering key concepts, vocabulary, practice exercises, and project milestones.'
    };
    const categoryInstructions = categoryPrompts[category] || categoryPrompts['Custom'];

    const prompt = `
        The user goal topic: "${goal.title}"
        Subject Category: "${category}"
        Category Specific Guidelines:
        ${categoryInstructions}

        TARGET LANGUAGE CONSTRAINT:
        CRITICAL: You must generate ALL task titles, subjects, descriptions, subtask titles, and void day task names in the language: "${language}". Do not use English names or text unless the target language is "en" or English is explicitly requested.

        Mission Intent: ${goal.goal_intent}
        Total Duration: ${goal.duration_days} days.
        Daily Study Budget: ${goal.commitment_hours_per_week / 7} hours/day.
        Level: ${goal.level}.
        Phase Boundaries (Hard Walls): ${JSON.stringify(goal.sprint_walls)}
        
        Current Generate Window: Days ${startDay} to ${endDay}.
        
        TASK HIERARCHY (P0 to P5):
        - P5 (Deep Theory): Hardest concepts. Mental ceiling. Max 1 per day.
        - P4 (Hard Application): Complex problems. Can be paired with P1 or P2.
        - P3 (Standard): Daily progress baseline.
        - P2 (Theory Overview): Big picture reading/watching.
        - P1 (Exercises): Brain Thickener. Low-stress repetition.
        - P0 (Void Day): Rest day. Zero tasks. Used for safety net.

        DURATION ELASTICITY RULES:
        - Short (10-14 days): High intensity. Strictly ONE P0 (Void) day total, placed before the final deadline.
        - Medium (15-30 days): Balanced. Inject ONE P0 day every 6 days.
        - Long (31-90 days): Sustainable. Strictly place a P0 day immediately following every P5 day.

        GOAL ARCHETYPE BALANCING:
        - Type A: Hard Wall (Exam): syllabus coverage, linear, dense, high P5 frequency. Pre-exam days = P1/P2 only.
        - Type B: Level Up (Mastery): skill mastery, theory loops (P5 -> P4). Generous P0 days for reflection.
        - Type C: Curiosity (Intro): interest-building, low pressure. Zero/Low P5. Heavy P2/P3. Flexible P0.
        
        RULES:
        1. Distribute workload based on commitment: 3 to 5 tasks per day (unless P0).
        2. Priority system: Each task MUST have a Priority tier from 0 to 5.
        3. P5 Limit: Never more than ONE P5 task per day.
        4. Void Days: On a P0 day, create exactly ONE task with title "VOID DAY" and priority 0.
        5. HARD CONSTRAINT: NEVER place a P0 (Void Day) on the FINAL DAY of the plan (${goal.duration_days}) or on any date listed as a "Phase Boundary".
        6. EXAM FINALE: If Mission Intent is "Exam", the last 3 days of the plan MUST be strictly P1 (Exercises) and P2 (Overview) for final review. No P5 or P4 tasks allowed in the final 72 hours.
        7. TOPIC SPECIFICITY: All task titles MUST be directly related to the goal topic "${goal.title}". Do not use generic names like "Module Overview". Use specific terms (e.g., "Refraction Index Calculation" instead of "Practice Exercises").
        8. SUBTASKS: For tasks with priority 4, include "subtasks": an array of exactly 3-4 objects. For tasks with priority 5, include "subtasks": an array of exactly 4-5 objects. For all other priorities, set "subtasks": []. Each subtask must be a concrete, specific action step directly related to the task title (e.g., "Solve integration problems 12-18", not "Practice exercises"). Each subtask must have a unique string "id" (use a short random string like "st_1"), a "title" string, and "completed": false.
        
        Return ONLY a JSON object with two keys:
        {
            "tasks": [
                {
                    "day_number": number,
                    "title": "task name",
                    "subject": "MATH|HISTORY|SCIENCE|TECH|ARTS|GENERAL",
                    "duration_mins": number,
                    "priority": 0|1|2|3|4|5,
                    "task_type": "task"|"void",
                    "subtasks": [{"id": string, "title": string, "completed": false}]
                }
            ],
            "plan_metadata": {
                "hard_walls": ["YYYY-MM-DD", ...],
                "void_days": [number, ...],
                "sprint_boundaries": [number, ...]
            }
        }
    `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const payload = cleanAndParseJSON(responseText, { tasks: [] as any[], plan_metadata: {} as any });
        const generatedTasks = payload.tasks || [];
        const planMetadata = payload.plan_metadata;

        // Save metadata to the goal, preserving the category
        const mergedMetadata = {
            ...((goal.plan_metadata as object) || {}),
            ...planMetadata
        };
        await supabase
            .from('learning_goals')
            .update({ plan_metadata: mergedMetadata })
            .eq('id', goalId);

        const baseDate = new Date(goal.created_at);
        const tasksToInsert = generatedTasks.map((task: any) => {
            const targetDate = new Date(baseDate);
            targetDate.setDate(targetDate.getDate() + (task.day_number - 1));

            return {
                goal_id: goalId,
                user_id: user.id,
                title: task.title,
                subject: task.subject,
                duration_mins: task.duration_mins,
                priority: task.priority,
                task_type: task.task_type || 'task',
                due_date: getLocalDateString(targetDate),
                subtasks: task.subtasks ?? []
            };
        });

        const { error: taskError } = await supabase.from('tasks').insert(tasksToInsert)
        if (taskError) return { error: taskError.message }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (err) {
        console.error("Chunk generation failed. Generating baseline fallback plan:", err);
        try {
            const baseDate = new Date(goal.created_at);
            const tasksToInsert: any[] = [];
            for (let day = startDay; day <= endDay; day++) {
                const targetDate = new Date(baseDate);
                targetDate.setDate(targetDate.getDate() + (day - 1));
                const dateStr = getLocalDateString(targetDate);
                const isVoidDay = day % 6 === 0 && day !== goal.duration_days;
                if (isVoidDay) {
                    tasksToInsert.push({
                        goal_id: goalId,
                        user_id: user.id,
                        title: "VOID DAY",
                        subject: "GENERAL",
                        duration_mins: 0,
                        priority: 0,
                        task_type: "void",
                        due_date: dateStr,
                        subtasks: []
                    });
                } else {
                    const isTheoryDay = day % 2 === 1;
                    tasksToInsert.push({
                        goal_id: goalId,
                        user_id: user.id,
                        title: isTheoryDay 
                            ? `Study Core Concepts of ${goal.title} (Part ${day})`
                            : `Practical Application of ${goal.title} (Part ${day})`,
                        subject: "GENERAL",
                        duration_mins: 45,
                        priority: isTheoryDay ? 2 : 3,
                        task_type: "task",
                        due_date: dateStr,
                        subtasks: []
                    });
                    tasksToInsert.push({
                        goal_id: goalId,
                        user_id: user.id,
                        title: `Review Exercises & Exercises for ${goal.title} - Set ${day}`,
                        subject: "GENERAL",
                        duration_mins: 30,
                        priority: 1,
                        task_type: "task",
                        due_date: dateStr,
                        subtasks: []
                    });
                }
            }
            const { error: taskError } = await supabase.from('tasks').insert(tasksToInsert)
            if (taskError) {
                console.error("Failed to insert fallback tasks:", taskError);
                return { error: taskError.message };
            }
            revalidatePath('/', 'layout')
            return { success: true }
        } catch (fallbackErr) {
            console.error("Plan fallback generation failed completely:", fallbackErr);
            return { error: 'Failed to generate task schedule' }
        }
    }
}

export async function addTask(goalId: string, formData: FormData) {
    const supabase = await createClient()
    const title = formData.get('title') as string
    if (!title) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('tasks').insert({
        goal_id: goalId,
        user_id: user.id,
        title,
        due_date: getLocalDateString()
    })

    revalidatePath('/', 'layout')
}

// Priority-to-Gem reward mapping
const GEM_REWARD: Record<number, number> = {
    0: 0, // Void Day — no reward
    1: 1, // Exercises
    2: 1, // Theory Overview
    3: 1, // Standard
    4: 2, // Hard Application
    5: 3, // Deep Theory
}

export async function toggleTask(taskId: string, currentStatus: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch the task's priority so we can scale the gem reward correctly
    const { data: task } = await supabase
        .from('tasks')
        .select('priority')
        .eq('id', taskId)
        .single()

    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    const gemDelta = GEM_REWARD[task?.priority ?? 3] ?? 1
    const baseXp = task?.priority && task.priority > 0 ? (task.priority * 10 + 10) : 0

    await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)
        .eq('user_id', user.id)

    // Award or revoke gems/XP based on priority
    const { data: profile } = await supabase
        .from('profiles')
        .select('gems, xp, level')
        .eq('id', user.id)
        .single()

    if (profile) {
        let newGems = profile.gems
        let newXp = profile.xp ?? 0
        let newLevel = profile.level ?? 1

        if (newStatus === 'completed') {
            newGems += gemDelta
            newXp += baseXp
            let xpNeeded = newLevel * 100
            while (newXp >= xpNeeded) {
                newXp -= xpNeeded
                newLevel += 1
                xpNeeded = newLevel * 100
            }
        } else {
            newGems = Math.max(0, profile.gems - gemDelta)
            newXp = Math.max(0, (profile.xp ?? 0) - baseXp)
        }

        await supabase
            .from('profiles')
            .update({ gems: newGems, xp: newXp, level: newLevel })
            .eq('id', user.id)
    }

    revalidatePath('/', 'layout')
}

export async function toggleSubtask(taskId: string, subtaskId: string, completed: boolean) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch current subtasks array
    const { data: task } = await supabase
        .from('tasks')
        .select('subtasks')
        .eq('id', taskId)
        .eq('user_id', user.id)
        .single()

    if (!task) return

    const updatedSubtasks = (task.subtasks ?? []).map((st: any) =>
        st.id === subtaskId ? { ...st, completed } : st
    )

    await supabase
        .from('tasks')
        .update({ subtasks: updatedSubtasks })
        .eq('id', taskId)
        .eq('user_id', user.id)

    revalidatePath('/', 'layout')
}

// ─── Focus Mode Constants ─────────────────────────────────────────────────────
const HINT_GEM_COST = 0
const CHAT_GEM_COST = 0

/**
 * Completes a task via Focus Mode.
 * isFullFocus = true  → 2x gem reward (stayed for the full timer)
 * isFullFocus = false → 1x gem reward ("Already Done" before timer started)
 */
export async function completeTaskFocusMode(taskId: string, isFullFocus: boolean, isCatalystActive: boolean = false) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: task } = await supabase
        .from('tasks')
        .select('priority')
        .eq('id', taskId)
        .eq('user_id', user.id)
        .single()

    if (!task) return { error: 'Task not found' }

    const baseReward = GEM_REWARD[task.priority] ?? 1
    let gemReward = isFullFocus ? baseReward * 2 : baseReward
    if (isCatalystActive) {
        gemReward = gemReward * 2
    }

    await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', taskId)
        .eq('user_id', user.id)

    const { data: profile } = await supabase
        .from('profiles')
        .select('gems, xp, level, multiplier_active')
        .eq('id', user.id)
        .single()

    let newGems = profile?.gems ?? 0
    let newXp = profile?.xp ?? 0
    let newLevel = profile?.level ?? 1
    let leveledUp = false

    if (profile) {
        // Apply focus multiplier if active
        if (profile.multiplier_active) {
            gemReward = gemReward * 2
        }
        newGems += gemReward

        // Calculate XP reward
        const baseXp = task.priority > 0 ? (task.priority * 10 + 10) : 0
        let xpReward = isFullFocus ? baseXp * 2 : baseXp
        if (isCatalystActive) {
            xpReward = xpReward * 2
        }
        newXp += xpReward

        let xpNeeded = newLevel * 100
        while (newXp >= xpNeeded) {
            newXp -= xpNeeded
            newLevel += 1
            xpNeeded = newLevel * 100
            leveledUp = true
        }

        await supabase
            .from('profiles')
            .update({ 
                gems: newGems, 
                xp: newXp, 
                level: newLevel,
                multiplier_active: false // Reset multiplier once used
            })
            .eq('id', user.id)
    }

    revalidatePath('/', 'layout')
    return { 
        success: true, 
        gemsAwarded: gemReward, 
        xpAwarded: isFullFocus ? (task.priority * 10 + 10) * (isCatalystActive ? 4 : 2) : (task.priority * 10 + 10) * (isCatalystActive ? 2 : 1),
        leveledUp,
        newLevel
    }
}

/**
 * Generates a Socratic hint using a lean micro-prompt (~80 tokens in, ~120 out).
 * Checks DB cache first — cached hints cost 0 tokens and 0 gems.
 */
export async function generateHint(taskId: string, subtaskTitle?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: task } = await supabase
        .from('tasks')
        .select('id, title, subject, priority, ai_hint, goal_id')
        .eq('id', taskId)
        .eq('user_id', user.id)
        .single()

    if (!task) return { error: 'Task not found' }

    const cacheKey = subtaskTitle ? subtaskTitle : 'general'
    let hintsCache: Record<string, string> = {}
    
    // Parse existing hints cache
    if (task.ai_hint) {
        try {
            hintsCache = JSON.parse(task.ai_hint)
        } catch {
            hintsCache = { general: task.ai_hint } // legacy migration for raw strings
        }
    }

    // Return cached hint if it exists for this specific subtask (or general)
    if (hintsCache[cacheKey]) {
        return { hint: hintsCache[cacheKey], fromCache: true }
    }

    // No gem gate needed - AI features are free!

    const { data: goal } = await supabase
        .from('learning_goals')
        .select('title')
        .eq('id', task.goal_id)
        .single()

    const subtaskLine = subtaskTitle
        ? `The student is specifically stuck on this subtask: "${subtaskTitle}"`
        : 'The student is looking for an entry point or conceptual intuition for this task.'

    const prompt = `You are a world-class Socratic professor (in the style of Richard Feynman). Your goal is to help the student build deep, intuitive understanding.

COURSE CONTEXT:
- Main Course/Goal: "${goal?.title ?? task.subject ?? 'the subject'}"
- Current Focus Task: "${task.title}"
- ${subtaskLine}

TUTORING INSTRUCTIONS:
1. Avoid generic praise, fluff, or empty conversational filler (NEVER start with "That's a great question", "Brilliant point", "Indeed, that's fundamental", etc.). Dive straight into the core conceptual insight.
2. Provide a vivid, concrete analogy or intuitive explanation specifically tailored to the unique mechanics of "${task.title}" (e.g., if it is about Arabic letters, mention unique elements like their shape-shifting cursive connections or script strokes, rather than general writing).
3. End with exactly ONE precise, guiding question that prompts the student to apply this intuition or take the next logical step.
4. Keep the response punchy, conversational, and highly informative (3-5 sentences). Do not write the final code or solve the exact exercise for them, but do explain the underlying concepts clearly.
5. CRITICAL: Ensure the response is complete, fully formed, and does not end mid-sentence or cut off. Every sentence must end with appropriate punctuation.

Respond now:`

    console.log('[generateHint] Prompt context:', { taskTitle: task.title, subject: task.subject, goalTitle: goal?.title, subtaskTitle })

    try {
        const { textModel } = await import('@/utils/gemini')
        const result = await textModel.generateContent(prompt)
        const hint = result.response.text().trim()

        console.log('[generateHint] Generated hint:', hint)

        // Update JSON cache
        hintsCache[cacheKey] = hint
        const updatedCacheStr = JSON.stringify(hintsCache)

        // Cache hint
        await supabase.from('tasks').update({ ai_hint: updatedCacheStr }).eq('id', taskId)

        return { hint, fromCache: false }
    } catch (err) {
        console.error('[generateHint] AI call failed. Deploying heuristic fallback:', err)
        const fallbackHint = `To build conceptual intuition for "${task.title}", consider: What are the primary inputs, processes, and outputs of this action? Try to write down or sketch the simplest possible mechanism that performs this function. What is one specific question you have about how its components interact?`
        try {
            hintsCache[cacheKey] = fallbackHint
            const updatedCacheStr = JSON.stringify(hintsCache)
            await supabase.from('tasks').update({ ai_hint: updatedCacheStr }).eq('id', taskId)
        } catch (dbErr) {
            console.error('[generateHint] Failed to cache fallback hint:', dbErr)
        }
        return { hint: fallbackHint, fromCache: false }
    }
}

/**
 * Sends a message to the Socratic AI tutor.
 * Gems deducted only on the first message of a session; all follow-ups are free.
 */
export async function sendSocraticMessage(
    taskId: string,
    userMessage: string,
    history: { role: 'user' | 'model'; text: string }[],
    subtaskTitle?: string,
    persona: string = 'feynman'
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const isFirstMessage = history.length === 0

    // No gem gate or deduction - AI features are free!

    const { data: task } = await supabase
        .from('tasks').select('title, subject, priority, goal_id').eq('id', taskId).single()

    const { data: goal } = task?.goal_id
        ? await supabase.from('learning_goals').select('title').eq('id', task.goal_id).single()
        : { data: null }

    const subtaskLine = subtaskTitle ? `Specific struggle: "${subtaskTitle}"` : ''

    let personaPrompt = `You are a world-class Socratic tutor and inspiring professor (in the style of Richard Feynman). Your goal is to explain concepts in simple terms using vivid analogies, physical intuition, and clear mental models.`
    if (persona === 'socrates') {
        personaPrompt = `You are a Socratic guide speaking in the style of Socrates himself. Your goal is to lead the student to deep conceptual mastery through dialectic wisdom, questioning their assumptions, and offering cognitive scaffolding rather than direct answers.`
    } else if (persona === 'stoic') {
        personaPrompt = `You are a study guide in the style of Marcus Aurelius, the Stoic philosopher. Your goal is to help the student build focus, clarity, and intellectual discipline, speaking in a calm, direct, encouraging, and philosophical tone.`
    }

    const systemPrompt = `${personaPrompt} Your goal is to guide the student to deep conceptual mastery.

STUDY CONTEXT:
- Main Course/Goal: "${goal?.title ?? 'their subject'}"
- Current Focus Task: "${task?.title ?? 'a study task'}" (${task?.subject ?? 'GENERAL'}, Priority ${task?.priority ?? 3}/5)
- ${subtaskLine}

TUTORING PRINCIPLES:
1. Zero Fluff/Praise: Do NOT use generic compliments or validation (e.g., avoid "That's a brilliant question", "Great job", "Good point", "Indeed, that's fundamental"). Start directly with the explanation or conceptual insight.
2. High-Quality Intuition: When the student asks a question or shares a thought, explain the underlying mechanism using a vivid analogy, physical intuition, or a clear mental model specifically related to the unique aspects of "${task?.title}".
3. Scaffolding, not Evasiveness: Explain the concepts/mechanics clearly. Socratic tutoring means not doing their homework or writing their code/answers for them, but you should absolutely explain the theoretical principles they need to arrive at the answer.
4. Guiding Question: End with exactly ONE clear, targeted question that prompts them to take the next step or apply the concept.
5. Conciseness: Keep responses punchy, conversational, and packed with conceptual value (3-5 sentences).
6. CRITICAL: Ensure the response is complete, fully formed, and does not end mid-sentence or cut off. Every sentence must end with appropriate punctuation.`

    try {
        const { textModel } = await import('@/utils/gemini')

        const chatHistory = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }],
        }))

        const chat = textModel.startChat({
            history: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: "Understood. I will guide the student warmly and intellectually without revealing direct answers." }] },
                ...chatHistory,
            ],
        })

        const result = await chat.sendMessage(userMessage)
        const reply = result.response.text().trim()
        return { reply, isFirstMessage }
    } catch (err) {
        console.error('[sendSocraticMessage] AI call failed:', err)
        return { error: 'AI_FAILED' }
    }
}



export async function deletePlan() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // This will cascade delete tasks because of the DB foreign key constraint
    const { error } = await supabase
        .from('learning_goals')
        .delete()
        .eq('user_id', user.id)

    if (error) return { error: error.message }

    revalidatePath('/', 'layout')
    return { success: true }
}

/**
 * PRE-CHECK: Returns potential tier without executing
 */
export async function checkRescheduleTier(goalId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const [{ data: goal }, { data: profile }] = await Promise.all([
        supabase.from('learning_goals').select('*').eq('id', goalId).single(),
        supabase.from('profiles').select('*').eq('id', user.id).single()
    ])

    if (!goal || !profile) return { error: 'Context not found' }

    // Check for Void Days
    const todayStr = getLocalDateString()
    const { data: futureTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', goalId)
        .gte('due_date', todayStr)
        .order('due_date', { ascending: true })

    if (futureTasks) {
        const tasksByDate = futureTasks.reduce((acc: any, t) => {
            acc[t.due_date] = acc[t.due_date] || []
            acc[t.due_date].push(t)
            return acc
        }, {})
        const hasVoid = Object.values(tasksByDate).some((day: any) => day.length === 1 && day[0].priority === 0)
        if (hasVoid) return { tier: 1 }
    }

    if (profile.lives > 0) return { tier: 2 }
    return { tier: 3 }
}

/**
 * 3-TIER RESCHEDULE ENTRY POINT
 */
export async function processPivot(goalId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    PIVOT_TRACE.log('CORE', 'Processing Pivot Request', { goalId });

    // 1. Fetch State (Goal, Profile)
    const [{ data: goal }, { data: profile }] = await Promise.all([
        supabase.from('learning_goals').select('*').eq('id', goalId).single(),
        supabase.from('profiles').select('*').eq('id', user.id).single()
    ]);

    if (!goal || !profile) return { error: 'Database context not found' };

    // 2. Check Overdue Tasks Count
    const todayStr = getLocalDateString();
    const { data: overdueTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('goal_id', goalId)
        .eq('status', 'pending')
        .lt('due_date', todayStr);

    if (!overdueTasks || overdueTasks.length === 0) {
        return { success: true, message: 'No tasks to pivot' };
    }

    // 3. DECISION ENGINE
    // Tier 1: Try Algorithmic Slide if P0 days exist
    const slideResult = await executeAlgorithmicSlide(goalId, user.id);
    if (slideResult.success) {
        revalidatePath('/', 'layout');
        return { success: true, tier: 1 };
    }

    // Tier 2: AI Crunch if Slide failed but Lives exist
    if (profile.lives > 0) {
        PIVOT_TRACE.log('CORE', 'Tier 1 Failed. Falling back to Tier 2: AI Crunch');
        const crunchResult = await executeAICrunch(goalId, user.id);
        if (crunchResult?.success) {
            revalidatePath('/', 'layout');
            return { success: true, tier: 2 };
        }
    }

    // Tier 3: The Avalanche (Critical Debt)
    PIVOT_TRACE.log('CORE', 'Tiers 1 & 2 Failed or Impossible. Falling back to Tier 3: Avalanche');
    await executeAvalanche(goalId, user.id);
    revalidatePath('/', 'layout');
    return { success: true, tier: 3 };
}

async function executeAICrunch(goalId: string, userId: string) {
    const supabase = await createClient()
    const todayStr = getLocalDateString();

    // 1. Deduct Life
    const { data: profile } = await supabase.from('profiles').select('lives').eq('id', userId).single();
    if (!profile || profile.lives <= 0) return { success: false };

    await supabase.from('profiles').update({ lives: profile.lives - 1 }).eq('id', userId);

    // 2. Extract context for AI: Overdue + Future Tasks in current sprint
    const { data: allTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', goalId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

    const { data: goal } = await supabase.from('learning_goals').select('*').eq('id', goalId).single();
    if (!allTasks || !goal) return { success: false };

    const { model } = await import('@/utils/gemini');

    // Find nearest Hard Wall for context
    const futureWalls = (goal.sprint_walls || []).filter((w: any) => w.date >= todayStr);
    const nextWall = futureWalls[0] || { date: 'end of plan', label: 'Goal Deadline' };

    const prompt = `
        CRUNCH MODE ACTIVATED.
        Goal: ${goal.title}
        Mission Intent: ${goal.goal_intent}
        Time Budget: ${goal.commitment_hours_per_week / 7} hours/day.
        Hard Wall Context: ${nextWall.label} at ${nextWall.date}.
        
        TASKS TO RESCHEDULE: ${JSON.stringify(allTasks.map(t => ({ title: t.title, priority: t.priority, duration: t.duration_mins, old_date: t.due_date })))}
        
        RULES:
        1. COMPRESSION: Merge these tasks into the days between ${todayStr} and ${nextWall.date}.
        2. DENSITY: You can increase daily workload beyond the budget if needed, but DO NOT move the Hard Wall.
        3. PRIORITIZATION: Protect P5 (Deep Theory) and P1 (Practice). If budget is exceeded, remove P2 (Theory Overview) tasks.
        4. No P5 Overlap: Never more than one P5 task per day.
        
        Return ONLY a JSON array of objects:
        [
            { "title": "...", "new_date": "YYYY-MM-DD", "priority": 0-5, "task_type": "task" }
        ]
    `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const compressed = cleanAndParseJSON(responseText, [] as any[]);

        // Delete old pending tasks and insert new ones
        await supabase.from('tasks').delete().eq('goal_id', goalId).eq('status', 'pending');

        const tasksToInsert = compressed.map((t: any) => ({
            goal_id: goalId,
            user_id: userId,
            title: t.title,
            priority: t.priority,
            task_type: t.task_type || 'task',
            due_date: t.new_date,
            status: 'pending'
        }));

        await supabase.from('tasks').insert(tasksToInsert);

        // Update Goal Metadata to reflect Crunch Mode
        const { data: currentGoal } = await supabase.from('learning_goals').select('plan_metadata').eq('id', goalId).single();
        const updatedMetadata = { ...(currentGoal?.plan_metadata as any || {}), is_crunch_mode: true };
        await supabase.from('learning_goals').update({ plan_metadata: updatedMetadata }).eq('id', goalId);

        PIVOT_TRACE.log('TIER_2', 'AI Crunch Complete');
        return { success: true };
    } catch (err) {
        PIVOT_TRACE.log('TIER_2', 'AI Crunch Failed', err);
        return { success: false };
    }
}

async function executeAvalanche(goalId: string, userId: string) {
    const supabase = await createClient()
    const todayStr = getLocalDateString();

    // Simply move all overdue tasks to "Today" without any optimization
    const { data: overdue } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', goalId)
        .eq('status', 'pending')
        .lt('due_date', todayStr);

    if (overdue) {
        for (const t of overdue) {
            await supabase
                .from('tasks')
                .update({ due_date: todayStr, pivoted_count: (t.pivoted_count || 0) + 1 })
                .eq('id', t.id);
        }
    }
    PIVOT_TRACE.log('TIER_3', 'Avalanche Complete. Tasks stacked on today.');
}

export async function rescheduleTaskToTomorrow(taskId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Calculate tomorrow's local date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = getLocalDateString(tomorrow)

    const { error } = await supabase
        .from('tasks')
        .update({ due_date: tomorrowStr })
        .eq('id', taskId)
        .eq('user_id', user.id)

    if (error) return { error: error.message }

    revalidatePath('/', 'layout')
    return { success: true }
}

export async function saveTaskNotes(taskId: string, notes: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('tasks')
        .update({ notes })
        .eq('id', taskId)
        .eq('user_id', user.id)

    if (error) return { error: error.message }
    return { success: true }
}

export async function saveTaskReflection(taskId: string, reflection: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('tasks')
        .update({ reflection })
        .eq('id', taskId)
        .eq('user_id', user.id)

    if (error) return { error: error.message }
    return { success: true }
}

export async function fetchTaskResources(taskId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Check if task already has resources cached
    const { data: task, error: fetchErr } = await supabase
        .from('tasks')
        .select('title, subject, resources')
        .eq('id', taskId)
        .eq('user_id', user.id)
        .single()

    if (fetchErr || !task) return { error: 'Task not found' }

    if (task.resources && Array.isArray(task.resources) && task.resources.length > 0) {
        return { resources: task.resources }
    }

    // Call Gemini to generate 3 educational resources
    const prompt = `
        Generate exactly 3 actual, high-quality, stable educational resources for the following task topic:
        Topic: "${task.title}" (Subject: ${task.subject ?? 'General'})

        Format the output strictly as a JSON array of objects, with NO other text:
        [
          {
            "title": "A short, descriptive resource title (e.g. Wikipedia: Refraction, or Khan Academy: Light & Refraction)",
            "type": "youtube" | "wikipedia" | "web",
            "url": "https://..."
          }
        ]
        Provide real or highly relevant, standard URL pathways. For youtube type, you can use search results URLs (e.g., https://www.youtube.com/results?search_query=refraction+index). For wikipedia type, use standard wikipedia concept page URLs.
    `

    try {
        const { model } = await import('@/utils/gemini')
        const result = await model.generateContent(prompt)
        const responseText = result.response.text()
        const resources = cleanAndParseJSON(responseText, [] as any[])

        await supabase
            .from('tasks')
            .update({ resources })
            .eq('id', taskId)
            .eq('user_id', user.id)

        revalidatePath('/', 'layout')
        return { resources }
    } catch (err) {
        console.error('Failed to fetch resources:', err)
        return { error: 'AI failed to generate resources' }
    }
}

export async function submitActiveRecallAnswer(taskId: string, answer: string, persona: string = 'feynman') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: task } = await supabase
        .from('tasks')
        .select('title, subject')
        .eq('id', taskId)
        .eq('user_id', user.id)
        .single()

    if (!task) return { error: 'Task not found' }

    let personaEvaluatorPrompt = `You are a Socratic professor reviewing a student's answer/summary for their completed task.`
    if (persona === 'socrates') {
        personaEvaluatorPrompt = `You are Socrates himself, reviewing a student's answer/summary for their completed task using ancient dialectic wisdom, questioning their assumptions, and providing scaffolding.`
    } else if (persona === 'stoic') {
        personaEvaluatorPrompt = `You are Marcus Aurelius, a Stoic guide reviewing a student's answer/summary for their completed task. Focus on cultivating focus, discipline, and clarity, using a calm, direct, and philosophical tone.`
    } else {
        personaEvaluatorPrompt = `You are Richard Feynman, a world-class tutor reviewing a student's answer/summary for their completed task. Provide feedback using simple terms, intuitive explanation, or a warm analogy.`
    }

    const prompt = `
        ${personaEvaluatorPrompt}
        Task title: "${task.title}"
        Student's explanation: "${answer}"

        Determine if the explanation shows real effort and basic accuracy (Pass), or if it is too short (less than 4-5 words), lazy, or completely incorrect (Needs Work).
        Provide a very brief (2-3 sentences max) Socratic guidance or encouragement in your persona. Do not give direct solutions.
        
        Respond ONLY with a JSON object, matching this format:
        {
          "feedback": "your response here",
          "rating": "Pass" | "Needs Work"
        }
    `

    try {
        const { model } = await import('@/utils/gemini')
        const result = await model.generateContent(prompt)
        const responseText = result.response.text()
        const evaluation = cleanAndParseJSON(responseText, { feedback: "Socratic feedback generation failed.", rating: "Needs Work" })

        if (evaluation.rating === 'Pass') {
            const { data: profile } = await supabase
                .from('profiles')
                .select('gems, xp, level')
                .eq('id', user.id)
                .single()

            if (profile) {
                const bonusGems = 2
                const bonusXp = 30

                let newXp = (profile.xp ?? 0) + bonusXp
                let newLevel = profile.level ?? 1
                let xpNeeded = newLevel * 100
                let leveledUp = false

                while (newXp >= xpNeeded) {
                    newXp -= xpNeeded
                    newLevel += 1
                    xpNeeded = newLevel * 100
                    leveledUp = true
                }

                await supabase
                    .from('profiles')
                    .update({
                        gems: profile.gems + bonusGems,
                        xp: newXp,
                        level: newLevel
                    })
                    .eq('id', user.id)

                // Generate a flashcard based on the task title and the user's explanation
                try {
                    const { textModel } = await import('@/utils/gemini')
                    const fcPrompt = `
                        Course Context: "${task.subject ?? 'General study'}"
                        Task Title: "${task.title}"
                        Student's Explanation (Accurate): "${answer}"

                        Create a single active recall flashcard (Question and Answer pair) that captures the core concept.
                        - The question should be challenging and focus on the main takeaway or mechanism.
                        - The answer should be extremely concise (1-2 sentences), clear, and scientifically accurate.
                        - Avoid referencing the task itself (e.g. do not say "Based on the task...").

                        Respond ONLY with a JSON object, matching this format:
                        {
                          "question": "question text",
                          "answer": "answer text"
                        }
                    `
                    const fcResult = await textModel.generateContent(fcPrompt)
                    const fcText = fcResult.response.text()
                    const fcData = cleanAndParseJSON(fcText, { question: "", answer: "" })

                    if (fcData.question && fcData.answer) {
                        await supabase
                            .from('flashcards')
                            .insert({
                                user_id: user.id,
                                task_id: taskId,
                                question: fcData.question,
                                answer: fcData.answer,
                                leitner_box: 1,
                                next_review: new Date().toISOString()
                            })
                    }
                } catch (fcErr) {
                    console.error('[submitActiveRecallAnswer] Flashcard generation failed:', fcErr)
                }

                revalidatePath('/', 'layout')
                return { 
                    feedback: evaluation.feedback, 
                    rating: 'Pass', 
                    gemsAwarded: bonusGems, 
                    xpAwarded: bonusXp,
                    leveledUp,
                    newLevel
                }
            }
        }

        return { feedback: evaluation.feedback, rating: 'Needs Work' }
    } catch (err) {
        console.error('Active recall submission failed. Deploying heuristic fallback:', err)
        const words = answer.trim().split(/\s+/).filter(Boolean)
        const hasPassed = words.length >= 8
        if (hasPassed) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('gems, xp, level')
                .eq('id', user.id)
                .single()
            if (profile) {
                const bonusGems = 2
                const bonusXp = 30
                let newXp = (profile.xp ?? 0) + bonusXp
                let newLevel = profile.level ?? 1
                let xpNeeded = newLevel * 100
                let leveledUp = false
                while (newXp >= xpNeeded) {
                    newXp -= xpNeeded
                    newLevel += 1
                    xpNeeded = newLevel * 100
                    leveledUp = true
                }
                await supabase
                    .from('profiles')
                    .update({
                        gems: profile.gems + bonusGems,
                        xp: newXp,
                        level: newLevel
                    })
                    .eq('id', user.id)
                try {
                    await supabase
                        .from('flashcards')
                        .insert({
                            user_id: user.id,
                            task_id: taskId,
                            question: `Explain the core mechanism or takeaway of "${task.title}".`,
                            answer: answer.trim(),
                            leitner_box: 1,
                            next_review: new Date().toISOString()
                        })
                } catch (fcErr) {
                    console.error('[submitActiveRecallAnswer] Local flashcard insertion failed:', fcErr)
                }
                revalidatePath('/', 'layout')
                return {
                    feedback: "Backup Evaluator: Your summary shows significant effort. Keep exploring the underlying mechanics to build stronger mental models!",
                    rating: 'Pass',
                    gemsAwarded: bonusGems,
                    xpAwarded: bonusXp,
                    leveledUp,
                    newLevel
                }
            }
        }
        return {
            feedback: "Your summary is too brief. Try to write at least 8 words explaining what you learned to trigger active recall.",
            rating: 'Needs Work'
        }
    }
}

export async function verifyShopPurchase(
    itemType: 'heart' | 'void' | 'multiplier' | 'shield' | 'repair',
    voidPlacement?: 'tomorrow' | 'end'
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('gems, lives, multiplier_active, streak_shields_count, current_streak, high_streak')
        .eq('id', user.id)
        .single()

    if (!profile) return { error: 'Profile not found' }

    if (itemType === 'heart') {
        if (profile.gems < 5) return { error: 'NOT_ENOUGH_GEMS' }
        if (profile.lives >= 5) return { error: 'LIVES_FULL' }

        const { error } = await supabase
            .from('profiles')
            .update({ gems: profile.gems - 5, lives: profile.lives + 1 })
            .eq('id', user.id)

        if (error) return { error: error.message }
        revalidatePath('/', 'layout')
        return { success: true, message: 'Purchased 1 Life!' }
    }

    if (itemType === 'void') {
        if (profile.gems < 10) return { error: 'NOT_ENOUGH_GEMS' }

        const { data: goal } = await supabase
            .from('learning_goals')
            .select('id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (!goal) return { error: 'No active learning plan to assign a void day.' }

        let dateStr = ''
        if (voidPlacement === 'tomorrow') {
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            dateStr = getLocalDateString(tomorrow)

            // Shift all future tasks scheduled on or after tomorrow forward by 1 day
            const { data: futureTasks } = await supabase
                .from('tasks')
                .select('id, due_date')
                .eq('goal_id', goal.id)
                .gte('due_date', dateStr)
                .order('due_date', { ascending: false })

            if (futureTasks && futureTasks.length > 0) {
                for (const t of futureTasks) {
                    const currentDueDate = new Date(t.due_date + 'T00:00:00')
                    currentDueDate.setDate(currentDueDate.getDate() + 1)
                    await supabase
                        .from('tasks')
                        .update({ due_date: getLocalDateString(currentDueDate) })
                        .eq('id', t.id)
                }
            }
        } else {
            const { data: lastTask } = await supabase
                .from('tasks')
                .select('due_date')
                .eq('user_id', user.id)
                .order('due_date', { ascending: false })
                .limit(1)
                .single()

            let targetDate = new Date()
            if (lastTask) {
                targetDate = new Date(lastTask.due_date + 'T00:00:00')
                targetDate.setDate(targetDate.getDate() + 1)
            } else {
                targetDate.setDate(targetDate.getDate() + 1)
            }
            dateStr = getLocalDateString(targetDate)
        }

        const { error: insertErr } = await supabase.from('tasks').insert({
            goal_id: goal.id,
            user_id: user.id,
            title: 'VOID DAY',
            priority: 0,
            task_type: 'void',
            due_date: dateStr,
            status: 'pending'
        })

        if (insertErr) return { error: insertErr.message }

        await supabase
            .from('profiles')
            .update({ gems: profile.gems - 10 })
            .eq('id', user.id)

        revalidatePath('/', 'layout')
        return { 
            success: true, 
            message: voidPlacement === 'tomorrow' 
                ? 'Scheduled a Void (Rest) Day for tomorrow (' + dateStr + ') and pushed upcoming work back by 1 day.' 
                : 'Scheduled a Void (Rest) Day at the end of the plan for ' + dateStr 
        }
    }

    if (itemType === 'multiplier') {
        if (profile.gems < 15) return { error: 'NOT_ENOUGH_GEMS' }
        if (profile.multiplier_active) return { error: 'MULTIPLIER_ALREADY_ACTIVE' }

        const { error } = await supabase
            .from('profiles')
            .update({ gems: profile.gems - 15, multiplier_active: true })
            .eq('id', user.id)

        if (error) return { error: error.message }
        revalidatePath('/', 'layout')
        return { success: true, message: 'Focus Multiplier activated for your next focus session!' }
    }

    if (itemType === 'shield') {
        if (profile.gems < 15) return { error: 'NOT_ENOUGH_GEMS' }
        if ((profile.streak_shields_count ?? 0) >= 2) return { error: 'SHIELDS_FULL' }

        const { error } = await supabase
            .from('profiles')
            .update({ 
                gems: profile.gems - 15, 
                streak_shields_count: (profile.streak_shields_count ?? 0) + 1 
            })
            .eq('id', user.id)

        if (error) return { error: error.message }
        revalidatePath('/', 'layout')
        return { success: true, message: 'Streak Shield equipped! Automatically protects your streak when you miss a day.' }
    }

    if (itemType === 'repair') {
        if (profile.gems < 30) return { error: 'NOT_ENOUGH_GEMS' }
        if ((profile.current_streak ?? 0) > 0) return { error: 'STREAK_NOT_BROKEN' }
        if ((profile.high_streak ?? 0) === 0) return { error: 'NO_STREAK_TO_REPAIR' }

        const { error } = await supabase
            .from('profiles')
            .update({ 
                gems: profile.gems - 30, 
                current_streak: profile.high_streak 
            })
            .eq('id', user.id)

        if (error) return { error: error.message }
        revalidatePath('/', 'layout')
        return { success: true, message: `Streak repaired! Restored your streak of ${profile.high_streak} days!` }
    }

    return { error: 'Invalid item type' }
}

export async function purchaseCustomization(cost: number, itemName: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('gems')
        .eq('id', user.id)
        .single()

    if (!profile) return { error: 'Profile not found' }
    if (profile.gems < cost) return { error: 'NOT_ENOUGH_GEMS' }

    const { error } = await supabase
        .from('profiles')
        .update({ gems: profile.gems - cost })
        .eq('id', user.id)

    if (error) return { error: error.message }
    revalidatePath('/', 'layout')
    return { success: true, message: `Successfully unlocked ${itemName}!` }
}

export async function claimAchievementReward(xpReward: number, gemReward: number, achievementTitle: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('gems, xp, level')
        .eq('id', user.id)
        .single()

    if (!profile) return { error: 'Profile not found' }

    let newXp = profile.xp + xpReward
    let newLevel = profile.level
    let xpNeeded = newLevel * 100
    while (newXp >= xpNeeded) {
        newXp -= xpNeeded
        newLevel += 1
        xpNeeded = newLevel * 100
    }

    const { error } = await supabase
        .from('profiles')
        .update({ 
            gems: profile.gems + gemReward,
            xp: newXp,
            level: newLevel
        })
        .eq('id', user.id)

    if (error) return { error: error.message }
    revalidatePath('/', 'layout')
    return { success: true, newGems: profile.gems + gemReward, newXp, newLevel, message: `Claimed reward for: ${achievementTitle}!` }
}

export async function fetchFlashcards() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: flashcards, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user.id)
        .order('next_review', { ascending: true })

    if (error) return { error: error.message }
    return { flashcards }
}

export async function reviewFlashcard(cardId: string, rating: 'easy' | 'hard') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: card } = await supabase
        .from('flashcards')
        .select('*')
        .eq('id', cardId)
        .eq('user_id', user.id)
        .single()

    if (!card) return { error: 'Flashcard not found' }

    let nextBox = card.leitner_box
    if (rating === 'easy') {
        nextBox = Math.min(5, nextBox + 1)
    } else {
        nextBox = 1 // Reset to Box 1 for spaced repetition
    }

    // Leitner intervals in days: Box 1 = 1 day, Box 2 = 3 days, Box 3 = 7 days, Box 4 = 14 days, Box 5 = 30 days
    const intervals: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 }
    const daysToAdd = intervals[nextBox] ?? 1

    const nextReviewDate = new Date()
    nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd)

    const { error: updateError } = await supabase
        .from('flashcards')
        .update({
            leitner_box: nextBox,
            next_review: nextReviewDate.toISOString()
        })
        .eq('id', cardId)
        .eq('user_id', user.id)

    if (updateError) return { error: updateError.message }

    // Award XP/Gems for review!
    const { data: profile } = await supabase
        .from('profiles')
        .select('gems, xp, level')
        .eq('id', user.id)
        .single()

    let awardGems = 1
    let awardXp = 10
    let leveledUp = false
    let newLevel = profile?.level ?? 1

    if (profile) {
        let newXp = (profile.xp ?? 0) + awardXp
        let xpNeeded = newLevel * 100
        while (newXp >= xpNeeded) {
            newXp -= xpNeeded
            newLevel += 1
            xpNeeded = newLevel * 100
            leveledUp = true
        }

        await supabase
            .from('profiles')
            .update({
                gems: profile.gems + awardGems,
                xp: newXp,
                level: newLevel
            })
            .eq('id', user.id)
    }

    revalidatePath('/', 'layout')
    return { success: true, nextBox, nextReview: nextReviewDate.toISOString(), gemsAwarded: awardGems, xpAwarded: awardXp, leveledUp, newLevel }
}

export async function placeWagerServer(cost: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('gems')
        .eq('id', user.id)
        .single()

    if (!profile) return { error: 'Profile not found' }
    if (profile.gems < cost) return { error: 'NOT_ENOUGH_GEMS' }

    const { error } = await supabase
        .from('profiles')
        .update({ gems: profile.gems - cost })
        .eq('id', user.id)

    if (error) return { error: error.message }
    revalidatePath('/', 'layout')
    return { success: true, newGems: profile.gems - cost }
}

export async function rewardWagerServer(gemReward: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('gems')
        .eq('id', user.id)
        .single()

    if (!profile) return { error: 'Profile not found' }

    const { error } = await supabase
        .from('profiles')
        .update({ gems: profile.gems + gemReward })
        .eq('id', user.id)

    if (error) return { error: error.message }
    revalidatePath('/', 'layout')
    return { success: true, newGems: profile.gems + gemReward }
}

export async function fetchRecallPitItems() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const [{ data: flashcards }, { data: overdueTasks }] = await Promise.all([
        supabase
            .from('flashcards')
            .select('*')
            .eq('user_id', user.id)
            .eq('leitner_box', 1),
        supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .neq('task_type', 'void')
            .lt('due_date', getLocalDateString())
    ])

    return {
        success: true,
        flashcards: flashcards || [],
        overdueTasks: overdueTasks || []
    }
}

export async function recoverLifeFromRecallPit() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('lives')
        .eq('id', user.id)
        .single()

    if (!profile) return { error: 'Profile not found' }
    if (profile.lives >= 5) return { error: 'LIVES_FULL' }

    const { error } = await supabase
        .from('profiles')
        .update({ lives: profile.lives + 1 })
        .eq('id', user.id)

    if (error) return { error: error.message }
    revalidatePath('/', 'layout')
    return { success: true, newLives: profile.lives + 1 }
}

export async function awardStreakShieldServer() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('streak_shields_count')
        .eq('id', user.id)
        .single()

    if (!profile) return { error: 'Profile not found' }
    
    // Max 2 shields
    if ((profile.streak_shields_count ?? 0) >= 2) {
        return { error: 'SHIELDS_FULL', message: 'Shields are already full! Awarded 5 Gems instead.' }
    }

    const { error } = await supabase
        .from('profiles')
        .update({ streak_shields_count: (profile.streak_shields_count ?? 0) + 1 })
        .eq('id', user.id)

    if (error) return { error: error.message }
    revalidatePath('/', 'layout')
    return { success: true, newShieldsCount: (profile.streak_shields_count ?? 0) + 1 }
}

export async function rescueOverdueTask(taskId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const todayStr = getLocalDateString()

    const { data: task } = await supabase
        .from('tasks')
        .select('pivoted_count')
        .eq('id', taskId)
        .eq('user_id', user.id)
        .single()

    if (!task) return { error: 'Task not found' }

    const { error } = await supabase
        .from('tasks')
        .update({
            due_date: todayStr,
            pivoted_count: (task.pivoted_count || 0) + 1
        })
        .eq('id', taskId)
        .eq('user_id', user.id)

    if (error) return { error: error.message }
    
    revalidatePath('/', 'layout')
    return { success: true }
}

export async function checkCheckpointBattleDue(goalId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { due: false }

    const { data: goal } = await supabase
        .from('learning_goals')
        .select('sprint_walls, plan_metadata')
        .eq('id', goalId)
        .eq('user_id', user.id)
        .single()

    if (!goal) return { due: false }

    const todayStr = getLocalDateString()
    const sprintWalls = (goal.sprint_walls as any[]) || []
    const planMetadata = (goal.plan_metadata as any) || {}
    const completedBattles = planMetadata.completed_checkpoint_battles || []

    for (const wall of sprintWalls) {
        if (wall.date <= todayStr && !completedBattles.includes(wall.date)) {
            return { due: true, date: wall.date, label: wall.label }
        }
    }

    return { due: false }
}

export async function startCheckpointBattle(goalId: string, wallDate: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: goal } = await supabase
        .from('learning_goals')
        .select('title')
        .eq('id', goalId)
        .single()

    const { data: completedTasks } = await supabase
        .from('tasks')
        .select('title, subject')
        .eq('goal_id', goalId)
        .eq('status', 'completed')
        .lte('due_date', wallDate)
        .limit(10)

    const topics = completedTasks?.map(t => t.title).join(', ') || 'general progress'

    const greetingPrompt = `You are a tough but inspiring Socratic examiner testing a student for their milestone on "${wallDate}".
The learning goal is: "${goal?.title}".
The student has completed these topics: [${topics}].

Begin the Socratic checkpoint battle by welcoming the student and asking ONE deep, conceptual question that tests their fundamental understanding of these topics. Do not explain the answer, just ask the question. Keep it brief (2-3 sentences max).`

    try {
        const { textModel } = await import('@/utils/gemini')
        const result = await textModel.generateContent(greetingPrompt)
        const greeting = result.response.text().trim()
        return { greeting }
    } catch (err) {
        console.error('Failed to start checkpoint battle:', err)
        return { greeting: `Welcome to your Checkpoint Battle for the milestone on ${wallDate}. Let's test your knowledge on: ${topics}. Can you explain how these concepts connect and outline their core mechanism?` }
    }
}

export async function sendCheckpointBattleMessage(
    goalId: string,
    wallDate: string,
    userMessage: string,
    history: { role: 'user' | 'model'; text: string }[]
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: goal } = await supabase
        .from('learning_goals')
        .select('title')
        .eq('id', goalId)
        .single()

    const turnCount = history.filter(h => h.role === 'model').length + 1

    let evaluationInstruction = ""
    if (turnCount >= 3) {
        evaluationInstruction = `
CRITICAL: This is the final turn. You must now evaluate the student's level of comprehension. 
If they have demonstrated a solid understanding of the concepts discussed, they PASS. If they are evasive, incorrect, or clearly don't know the material, they FAIL.
Provide your final dialogue reply, and then append a JSON block at the very end of your response, starting on a new line, exactly in this format:
EVALUATION: {"rating": "Pass"} or EVALUATION: {"rating": "Fail"}`
    }

    const { data: completedTasks } = await supabase
        .from('tasks')
        .select('title')
        .eq('goal_id', goalId)
        .eq('status', 'completed')
        .lte('due_date', wallDate)
        .limit(10)

    const topics = completedTasks?.map(t => t.title).join(', ') || 'general progress'

    const systemPrompt = `You are a tough but inspiring Socratic examiner testing a student for their milestone on ${wallDate}.
Learning Goal: "${goal?.title}"
Completed Topics: [${topics}]

INSTRUCTIONS:
1. Probe the user's understanding of the topics. Guide them socratically if they make small errors, but maintain high standards.
2. Keep responses brief and conversational (2-3 sentences).
3. Do not praise too much, be formal and objective.
${evaluationInstruction}`

    try {
        const { textModel } = await import('@/utils/gemini')
        const chatHistory = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }],
        }))

        const chat = textModel.startChat({
            history: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: "Understood. I will conduct the Socratic Checkpoint Battle formally." }] },
                ...chatHistory,
            ],
        })

        const result = await chat.sendMessage(userMessage)
        const responseText = result.response.text().trim()

        let rating: 'Pass' | 'Fail' | null = null
        let reply = responseText

        const evalIndex = responseText.indexOf('EVALUATION:')
        if (evalIndex !== -1) {
            reply = responseText.substring(0, evalIndex).trim()
            const jsonPart = responseText.substring(evalIndex + 11).trim()
            try {
                const evalData = JSON.parse(jsonPart)
                rating = evalData.rating === 'Pass' ? 'Pass' : 'Fail'
            } catch (e) {
                console.error("Failed to parse evaluation JSON:", e)
                if (jsonPart.toLowerCase().includes('pass')) {
                    rating = 'Pass'
                } else {
                    rating = 'Fail'
                }
            }
        }

        return { reply, rating }
    } catch (err) {
        console.error('AI Battle call failed:', err)
        return { reply: "I am unable to continue the evaluation at this time. Please try again.", rating: turnCount >= 3 ? 'Pass' : null }
    }
}

export async function resolveCheckpointBattle(goalId: string, wallDate: string, rating: 'Pass' | 'Fail') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: goal } = await supabase
        .from('learning_goals')
        .select('plan_metadata')
        .eq('id', goalId)
        .eq('user_id', user.id)
        .single()

    if (!goal) return { error: 'Goal not found' }

    if (rating === 'Pass') {
        const metadata = (goal.plan_metadata as any) || {}
        const completed = metadata.completed_checkpoint_battles || []
        if (!completed.includes(wallDate)) {
            completed.push(wallDate)
        }
        metadata.completed_checkpoint_battles = completed

        await supabase
            .from('learning_goals')
            .update({ plan_metadata: metadata })
            .eq('id', goalId)

        const { data: profile } = await supabase
            .from('profiles')
            .select('gems, xp, level')
            .eq('id', user.id)
            .single()

        if (profile) {
            const bonusGems = 15
            const bonusXp = 100
            let newXp = (profile.xp ?? 0) + bonusXp
            let newLevel = profile.level ?? 1
            let xpNeeded = newLevel * 100
            while (newXp >= xpNeeded) {
                newXp -= xpNeeded
                newLevel += 1
                xpNeeded = newLevel * 100
            }

            await supabase
                .from('profiles')
                .update({ gems: profile.gems + bonusGems, xp: newXp, level: newLevel })
                .eq('id', user.id)
        }
    } else {
        const { data: profile } = await supabase
            .from('profiles')
            .select('lives')
            .eq('id', user.id)
            .single()

        if (profile) {
            const newLives = Math.max(0, profile.lives - 1)
            await supabase
                .from('profiles')
                .update({ lives: newLives })
                .eq('id', user.id)
        }
    }

    revalidatePath('/', 'layout')
    return { success: true }
}

export async function generateSocraticMicroDrills(taskId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('title, subject, drill_data')
        .eq('id', taskId)
        .eq('user_id', user.id)
        .single()

    if (taskError) {
        console.error('generateSocraticMicroDrills task fetch error:', taskError)
        return { error: `Task not found (DB error: ${taskError.message})` }
    }

    if (!task) return { error: 'Task not found in user account' }

    if (task.drill_data) {
        return { drill: task.drill_data }
    }

    const prompt = `You are an educational designer. Generate exactly 3 multiple-choice questions to test comprehension on this study topic: "${task.title}".
Subject area: "${task.subject ?? 'General study'}"

Format the response strictly as a JSON object, with NO other text:
{
  "questions": [
    {
      "question": "question text",
      "options": ["option 1", "option 2", "option 3", "option 4"],
      "correctOptionIndex": 0
    },
    ...
  ]
}
Ensure the distractors (incorrect options) are plausible but clearly wrong. Keep the questions focused on primary conceptual mechanisms rather than memorization.`

    try {
        const { model } = await import('@/utils/gemini')
        const result = await model.generateContent(prompt)
        const text = result.response.text()
        const parsed = cleanAndParseJSON(text, { questions: [] })

        if (parsed.questions && parsed.questions.length > 0) {
            await supabase
                .from('tasks')
                .update({ drill_data: parsed })
                .eq('id', taskId)
            return { drill: parsed }
        }
        return { error: 'AI failed to generate structural format.' }
    } catch (err) {
        console.error('Failed to generate micro-drills:', err)
        const fallback = {
            questions: [
                {
                    question: `Which of the following describes the core objective of "${task.title}"?`,
                    options: [
                        "Applying the principles to practice problem solving.",
                        "Passively reviewing concepts without engagement.",
                        "Memorizing answers for exam prep.",
                        "Ignoring conceptual foundations."
                    ],
                    correctOptionIndex: 0
                },
                {
                    question: "Why is active recall important for this task?",
                    options: [
                        "It builds long-term neural connections and exposes understanding gaps.",
                        "It makes studying faster but less effective.",
                        "It is only useful for vocabulary terms.",
                        "It doesn't affect long-term retention."
                    ],
                    correctOptionIndex: 0
                },
                {
                    question: "What is the best way to verify conceptual mastery?",
                    options: [
                        "Explaining the idea simply in your own words.",
                        "Rereading the textbook page multiple times.",
                        "Highlighting definitions in different colors.",
                        "Skipping straight to advanced material."
                    ],
                    correctOptionIndex: 0
                }
            ]
        }
        await supabase
            .from('tasks')
            .update({ drill_data: fallback })
            .eq('id', taskId)
        return { drill: fallback }
    }
}

export async function verifyMicroDrillAnswers(taskId: string, userAnswers: number[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('drill_data, priority')
        .eq('id', taskId)
        .eq('user_id', user.id)
        .single()

    if (taskError) {
        console.error('verifyMicroDrillAnswers task fetch error:', taskError)
        return { error: `Drill context not found (DB error: ${taskError.message})` }
    }

    if (!task || !task.drill_data) return { error: 'Drill context not found' }

    const drill = task.drill_data as any
    const questions = drill.questions || []
    
    let correctCount = 0
    const results = questions.map((q: any, idx: number) => {
        const isCorrect = q.correctOptionIndex === userAnswers[idx]
        if (isCorrect) correctCount++
        return {
            index: idx,
            isCorrect,
            correctIndex: q.correctOptionIndex
        }
    })

    const passed = correctCount === questions.length

    if (passed) {
        drill.passed = true
        await supabase
            .from('tasks')
            .update({ 
                drill_data: drill
            })
            .eq('id', taskId)
    }

    return { passed, results, correctCount, totalCount: questions.length }
}






