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

    // Fetch user profile to check subscription status
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_subscribed')
        .eq('id', user.id)
        .single()

    const isSubscribed = !!profile?.is_subscribed

    if (!isSubscribed) {
        // Check if the user already has an active plan
        const { data: existingGoals } = await supabase
            .from('learning_goals')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)

        if (existingGoals && existingGoals.length > 0) {
            return { error: 'SUBSCRIBE_REQUIRED' }
        }
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

/**
 * @deprecated Use streaming API route /api/plans/generate instead.
 * This is retained temporarily for compatibility but should not be called by new code.
 */
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
        'Arts': 'The curriculum must follow a portfolio-driven, hands-on creative path. Focus on technical sketching, color theory exercises, or wireframing drills (P1/P2), project layout or storyboard compositions (P4), and final piece execution, creative portfolio work, or user experience testing loops (P5). Subtasks should guide manual/digital creation (e.g., "Sketch 3 perspective views of the product", "Create color palette mockups with 5 contrast pairs").',
        'Business': 'The curriculum must focus on commercial analysis, financial modeling, and strategy formulation. Focus on reading market summaries (P2), calculating financial statements or building market models (P4), and conducting SWOT analyses, competitive research reports, or business model canvas generation (P5). Subtasks should require actionable deliverables (e.g., "Build cash flow projection sheet for year 1", "Conduct competitive audit on 3 direct rivals").',
        'Music': 'The curriculum must emphasize musical practice, notation, and theory. Focus on technical runs, scale patterns, and chord exercises (P1), ear-training or dictation drills (P3), transcription of songs (P4), and compositional exercises or music theory analysis (P5). Subtasks should specify practice guidelines (e.g., "Practice G-major arpeggios at 120bpm for 15 mins", "Transcribe the first 4 bars of the melody").',
        'History': 'The curriculum must follow a historical investigation and archival analysis flow. Focus on timeline construction (P1), primary document reviews (P2), comparative analysis (P4), and writing critical research arguments or thematic evaluations (P5). Subtasks should guide historical analysis (e.g., "Create chronological timeline of the treaty negotiation", "Read and annotate 3 letters from the archive").',
        'Social': 'The curriculum must cover theories of human behavior, society, and research methodology. Focus on reading seminal research papers (P2), designing survey questions or analyzing statistical datasets (P4), and writing theoretical critiques or ethical reviews of experiment designs (P5). Subtasks should prompt research tasks (e.g., "Outline 5 interview questions for the demographic group", "Run linear regression analysis on dataset alpha").',
        'Health': 'The curriculum must balance physical drills, nutritional education, and exercise biomechanics. Focus on form drill practice or flexibility routines (P1), studying anatomy or physiology overviews (P2), planning workout sessions and macro logs (P4), and designing macro-cycles, analyzing biomechanical movement patterns, or creating long-term fitness plans (P5). Subtasks should focus on physical tracking (e.g., "Log daily macronutrient splits", "Perform and record 3 sets of slow form drills for squats").',
        'Custom': 'The curriculum should be a balanced, general study course covering key concepts, vocabulary, practice exercises, and project milestones.'
    };
    const categoryInstructions = categoryPrompts[category] || categoryPrompts['Custom'];

    // --- Stage 3: Fetch uploaded document context for AI grounding ---
    let documentContextBlock = ''
    try {
        // Fetch workspaces the user belongs to
        const { data: memberWorkspaces } = await supabase
            .from('workspace_members')
            .select('workspace_id')
            .eq('user_id', goal.user_id)

        const workspaceIds = memberWorkspaces?.map((w: any) => w.workspace_id) || []

        let query = supabase
            .from('document_metadata')
            .select('file_name, text_content')
            .not('text_content', 'is', null)

        if (workspaceIds.length > 0) {
            query = query.or(`plan_id.eq.${goalId},workspace_id.in.(${workspaceIds.join(',')})`)
        } else {
            query = query.eq('plan_id', goalId)
        }

        const { data: docRows } = await query
            .order('created_at', { ascending: false })
            .limit(3)

        if (docRows && docRows.length > 0) {
            const docSnippets = docRows
                .map((d: any) => `[${d.file_name}]\n${String(d.text_content).slice(0, 1500)}`)
                .join('\n\n---\n\n')
            documentContextBlock = `
[CONTEXT DOCUMENTS — USER UPLOADED TABLE OF CONTENTS]
The student has uploaded the following syllabus/contents pages from their study material.
Use ONLY these topics and chapter headings to generate hyper-relevant tasks that directly match this curriculum.
Do NOT generate generic tasks if specific chapters are visible below:

${docSnippets}

[END CONTEXT DOCUMENTS]
`
        }
    } catch {
        // Non-fatal: proceed without document context if query fails
    }
    // --- End Stage 3 context injection ---

    const prompt = `${documentContextBlock}
        The user goal topic: "${goal.title}"
        Subject Category: "${category}"
        Category Specific Guidelines:
        ${categoryInstructions}

        MULTILINGUAL TRANSLATION CONSTRAINT:
        CRITICAL: To optimize performance and reduce response time, only generate task titles and subtask titles directly in the user's active language: "${language}". Do NOT output any translation arrays, dictionaries, or "title_translations" fields.

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
        4. Void Days: On a P0 day, create exactly ONE task with title "VOID DAY" (in language "${language}") and priority 0.
        5. HARD CONSTRAINT: NEVER place a P0 (Void Day) on the FINAL DAY of the plan (${goal.duration_days}) or on any date listed as a "Phase Boundary".
        6. EXAM FINALE: If Mission Intent is "Exam", the last 3 days of the plan MUST be strictly P1 (Exercises) and P2 (Overview) for final review. No P5 or P4 tasks allowed in the final 72 hours.
        7. TOPIC SPECIFICITY: All task titles MUST be directly related to the goal topic "${goal.title}". Do not use generic names like "Module Overview". Use specific terms (e.g., "Refraction Index Calculation" instead of "Practice Exercises").
        8. SUBTASKS: For tasks with priority 4, include "subtasks": an array of exactly 3-4 objects. For tasks with priority 5, include "subtasks": an array of exactly 4-5 objects. For all other priorities, set "subtasks": []. Each subtask must be a concrete, specific action step directly related to the task title (e.g., "Solve integration problems 12-18", not "Practice exercises"). Each subtask must have a unique string "id" (use a short random string like "st_1") and "title" in language "${language}".
        
        Return ONLY a JSON object matching this schema:
        {
            "tasks": [
                {
                    "day_number": number,
                    "title": "task title in language ${language}",
                    "subject": "MATH|HISTORY|SCIENCE|TECH|ARTS|GENERAL",
                    "duration_mins": number,
                    "priority": 0|1|2|3|4|5,
                    "task_type": "task"|"void",
                    "subtasks": [
                        {
                            "id": string,
                            "title": "subtask title in language ${language}"
                        }
                    ]
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
        const payload = cleanAndParseJSON(responseText, { tasks: [] as any[], plan_metadata: {} as any }) as any;
        const generatedTasks = payload.tasks || [];
        const planMetadata = payload.plan_metadata || {};
        const goalTitleTranslations = payload.goal_title_translations || { [language]: goal.title };

        // Merge translated titles into plan_metadata
        const mergedMetadata = {
            ...((goal.plan_metadata as object) || {}),
            ...planMetadata,
            translated_titles: {
                ...((goal.plan_metadata as any)?.translated_titles || {}),
                ...goalTitleTranslations
            }
        };

        await supabase
            .from('learning_goals')
            .update({ plan_metadata: mergedMetadata })
            .eq('id', goalId);

        const baseDate = new Date(goal.created_at);
        const tasksToInsert = generatedTasks.map((task: any) => {
            const targetDate = new Date(baseDate);
            targetDate.setDate(targetDate.getDate() + (task.day_number - 1));

            // Select active language translation for title and subtasks
            const activeTitle = task.title || '';
            const activeSubtasks = (task.subtasks ?? []).map((st: any) => ({
                id: st.id || `st_${Math.random().toString(36).substring(2, 11)}`,
                title: st.title || '',
                completed: false
            }));

            // Prepare the special translations subtask programmatically
            const translationsSubtask = {
                id: "translations",
                title: "",
                completed: false,
                translations: {
                    title: task.title_translations || { [language]: activeTitle },
                    subtasks: (task.subtasks ?? []).reduce((acc: any, st: any) => {
                        const subId = st.id || `st_${Math.random().toString(36).substring(2, 11)}`;
                        acc[subId] = st.title_translations || { [language]: st.title || '' };
                        return acc;
                    }, {})
                }
            };

            const subtasksWithTranslations = [...activeSubtasks, translationsSubtask];

            return {
                goal_id: goalId,
                user_id: user.id,
                title: activeTitle,
                subject: task.subject,
                duration_mins: task.duration_mins,
                priority: task.priority,
                task_type: task.task_type || 'task',
                due_date: getLocalDateString(targetDate),
                subtasks: subtasksWithTranslations
            };
        });

        const { error: taskError } = await supabase.from('tasks').insert(tasksToInsert)
        if (taskError) return { error: taskError.message }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (err) {
        console.error("Chunk generation failed. Generating baseline fallback plan:", err);
        try {
            const goalTitleTranslationsFallback = {
                en: goal.title,
                ru: goal.title,
                fr: goal.title,
                es: goal.title,
                hy: goal.title,
                ja: goal.title,
                zh: goal.title
            };
            const mergedMetadataFallback = {
                ...((goal.plan_metadata as object) || {}),
                translated_titles: {
                    ...((goal.plan_metadata as any)?.translated_titles || {}),
                    ...goalTitleTranslationsFallback
                }
            };
            await supabase
                .from('learning_goals')
                .update({ plan_metadata: mergedMetadataFallback })
                .eq('id', goalId);

            const baseDate = new Date(goal.created_at);
            const tasksToInsert: any[] = [];
            for (let day = startDay; day <= endDay; day++) {
                const targetDate = new Date(baseDate);
                targetDate.setDate(targetDate.getDate() + (day - 1));
                const dateStr = getLocalDateString(targetDate);
                const isVoidDay = day % 6 === 0 && day !== goal.duration_days;

                const voidDayTranslations = {
                    en: "VOID DAY",
                    ru: "ДЕНЬ ОТДЫХА",
                    fr: "JOUR VIDE",
                    es: "DÍA DE DESCANSO",
                    hy: "ՀԱՆԳՍՏԻ ՕՐ",
                    ja: "休養日",
                    zh: "休息日"
                };

                const theoryTranslations = {
                    en: `Study Core Concepts of ${goal.title} (Part ${day})`,
                    ru: `Изучение основных концепций ${goal.title} (Часть ${day})`,
                    fr: `Étudier les concepts de base de ${goal.title} (Partie ${day})`,
                    es: `Estudiar conceptos básicos de ${goal.title} (Parte ${day})`,
                    hy: `Ուսումնասիրել ${goal.title}-ի հիմնական հասկացությունները (Մաս ${day})`,
                    ja: `${goal.title}の核となる概念の学習 (パート ${day})`,
                    zh: `学习 ${goal.title} 的核心概念 (第 ${day} 部分)`
                };

                const practicalTranslations = {
                    en: `Practical Application of ${goal.title} (Part ${day})`,
                    ru: `Практическое применение ${goal.title} (Часть ${day})`,
                    fr: `Application pratique de ${goal.title} (Partie ${day})`,
                    es: `Aplicación práctica de ${goal.title} (Parte ${day})`,
                    hy: `${goal.title}-ի գործնական կիրառում (Մաս ${day})`,
                    ja: `${goal.title}の実践的応用 (パート ${day})`,
                    zh: `${goal.title} 的实际应用 (第 ${day} 部分)`
                };

                const reviewTranslations = {
                    en: `Review Exercises & Exercises for ${goal.title} - Set ${day}`,
                    ru: `Повторение упражнений для ${goal.title} - Набор ${day}`,
                    fr: `Exercices de révision pour ${goal.title} - Série ${day}`,
                    es: `Ejercicios de revisión para ${goal.title} - Serie ${day}`,
                    hy: `Կրկնողության վարժություններ ${goal.title}-ի համար - Կոմպլեկտ ${day}`,
                    ja: `${goal.title}の復習問題と練習 - セット ${day}`,
                    zh: `复习 ${goal.title} 的练习 - 第 ${day} 组`
                };

                if (isVoidDay) {
                    const activeTitle = voidDayTranslations[language as keyof typeof voidDayTranslations] || voidDayTranslations.en;
                    const translationsSubtask = {
                        id: "translations",
                        title: "",
                        completed: false,
                        translations: {
                            title: voidDayTranslations,
                            subtasks: {}
                        }
                    };
                    tasksToInsert.push({
                        goal_id: goalId,
                        user_id: user.id,
                        title: activeTitle,
                        subject: "GENERAL",
                        duration_mins: 0,
                        priority: 0,
                        task_type: "void",
                        due_date: dateStr,
                        subtasks: [translationsSubtask]
                    });
                } else {
                    const isTheoryDay = day % 2 === 1;
                    const mainTranslations = isTheoryDay ? theoryTranslations : practicalTranslations;
                    const activeMainTitle = mainTranslations[language as keyof typeof mainTranslations] || mainTranslations.en;

                    const mainTranslationsSubtask = {
                        id: "translations",
                        title: "",
                        completed: false,
                        translations: {
                            title: mainTranslations,
                            subtasks: {}
                        }
                    };

                    tasksToInsert.push({
                        goal_id: goalId,
                        user_id: user.id,
                        title: activeMainTitle,
                        subject: "GENERAL",
                        duration_mins: 45,
                        priority: isTheoryDay ? 2 : 3,
                        task_type: "task",
                        due_date: dateStr,
                        subtasks: [mainTranslationsSubtask]
                    });

                    const activeReviewTitle = reviewTranslations[language as keyof typeof reviewTranslations] || reviewTranslations.en;
                    const reviewTranslationsSubtask = {
                        id: "translations",
                        title: "",
                        completed: false,
                        translations: {
                            title: reviewTranslations,
                            subtasks: {}
                        }
                    };

                    tasksToInsert.push({
                        goal_id: goalId,
                        user_id: user.id,
                        title: activeReviewTitle,
                        subject: "GENERAL",
                        duration_mins: 30,
                        priority: 1,
                        task_type: "task",
                        due_date: dateStr,
                        subtasks: [reviewTranslationsSubtask]
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

// Priority-to-Token reward mapping
const TOKEN_REWARD: Record<number, number> = {
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

    // Fetch the task's priority so we can scale the token reward correctly
    const { data: task } = await supabase
        .from('tasks')
        .select('priority')
        .eq('id', taskId)
        .single()

    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    const tokenDelta = TOKEN_REWARD[task?.priority ?? 3] ?? 1
    const baseXp = task?.priority && task.priority > 0 ? (task.priority * 10 + 10) : 0

    await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)
        .eq('user_id', user.id)

    // Award or revoke tokens/XP based on priority
    const { data: profile } = await supabase
        .from('profiles')
        .select('tokens_balance, xp, level')
        .eq('id', user.id)
        .single()

    if (profile) {
        let newTokens = profile.tokens_balance ?? 0
        let newXp = profile.xp ?? 0
        let newLevel = profile.level ?? 1

        if (newStatus === 'completed') {
            newTokens += tokenDelta
            newXp += baseXp
            let xpNeeded = newLevel * 100
            while (newXp >= xpNeeded) {
                newXp -= xpNeeded
                newLevel += 1
                xpNeeded = newLevel * 100
            }
        } else {
            newTokens = Math.max(0, (profile.tokens_balance ?? 0) - tokenDelta)
            newXp = Math.max(0, (profile.xp ?? 0) - baseXp)
        }

        await supabase
            .from('profiles')
            .update({ tokens_balance: newTokens, xp: newXp, level: newLevel })
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

    const baseReward = TOKEN_REWARD[task.priority] ?? 1
    let tokenReward = isFullFocus ? baseReward * 2 : baseReward
    if (isCatalystActive) {
        tokenReward = tokenReward * 2
    }

    await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', taskId)
        .eq('user_id', user.id)

    const { data: profile } = await supabase
        .from('profiles')
        .select('tokens_balance, xp, level, multiplier_active')
        .eq('id', user.id)
        .single()

    let newTokens = profile?.tokens_balance ?? 0
    let newXp = profile?.xp ?? 0
    let newLevel = profile?.level ?? 1
    let leveledUp = false

    if (profile) {
        // Apply focus multiplier if active
        if (profile.multiplier_active) {
            tokenReward = tokenReward * 2
        }
        newTokens += tokenReward

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
                tokens_balance: newTokens, 
                xp: newXp, 
                level: newLevel,
                multiplier_active: false // Reset multiplier once used
            })
            .eq('id', user.id)
    }

    revalidatePath('/', 'layout')
    return { 
        success: true, 
        tokensAwarded: tokenReward, 
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
        .select('title, plan_metadata')
        .eq('id', task.goal_id)
        .single()

    const language = (goal?.plan_metadata as any)?.language || 'en'

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
6. TARGET LANGUAGE: You must generate the entire response in the language: "${language}". Do not write in English unless "${language}" is "en" or English is explicitly requested.

Respond now:`

    console.log('[generateHint] Prompt context:', { taskTitle: task.title, subject: task.subject, goalTitle: goal?.title, subtaskTitle, language })

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
        
        // Localized fallbacks
        const fallbacks: Record<string, string> = {
            en: `To build conceptual intuition for "${task.title}", consider: What are the primary inputs, processes, and outputs of this action? Try to write down or sketch the simplest possible mechanism that performs this function. What is one specific question you have about how its components interact?`,
            ru: `Чтобы развить интуитивное понимание темы "${task.title}", подумайте: каковы основные входные данные, процессы и результаты этого действия? Попробуйте записать или набросать простейший механизм, который выполняет эту функцию. Какой конкретный вопрос у вас есть о том, как взаимодействуют его компоненты?`,
            fr: `Pour développer une intuition conceptuelle pour "${task.title}", considérez : Quels sont les intrants, processus et extrants principaux de cette action ? Essayez d'écrire ou de dessiner le mécanisme le plus simple qui remplit cette fonction. Quelle est la question spécifique que vous vous posez sur l'interaction de ses composants ?`,
            es: `Para desarrollar una intuición conceptual para "${task.title}", considera: ¿Cuáles son las entradas, procesos y salidas principales de esta acción? Intenta escribir o esbozar el mecanismo más sencillo que realice esta función. ¿Qué pregunta específica tienes sobre cómo interactúan sus componentes?`,
            hy: `"${task.title}" թեմայի վերաբերյալ պատկերացում կազմելու համար դիտարկեք. որո՞նք են այս գործողության հիմնական մուտքերը, գործընթացները և արդյունքները: Փորձեք գրել կամ նկարել պարզագույն մեխանիզմը, որն իրականացնում է այս գործառույթը: Ի՞նչ կոնկրետ հարց ունեք դրա բաղադրիչների փոխազդեցության վերաբերյալ:`,
            ja: `「${task.title}」の概念的な理解を深めるために、次の点を考えてみてください：このアクションの主なインプット、プロセス、アウトプットは何ですか？この機能を実行する最もシンプルな仕組みを書き出すか、スケッチしてみてください。そのコンポーネントがどのように相互作用するかについて、具体的にどのような疑問がありますか？`,
            zh: `为了建立对“${task.title}”的概念直觉，请考虑：此操作的主要输入、过程和输出是什么？尝试写下或勾勒出执行此功能的最简单机制。关于其组件如何相互作用，你有什么具体的问题？`
        }

        const fallbackHint = fallbacks[language] || fallbacks['en']
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
        ? await supabase.from('learning_goals').select('title, plan_metadata').eq('id', task.goal_id).single()
        : { data: null }

    const language = (goal?.plan_metadata as any)?.language || 'en'
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
6. CRITICAL: Ensure the response is complete, fully formed, and does not end mid-sentence or cut off. Every sentence must end with appropriate punctuation.
7. TARGET LANGUAGE: You must generate all your messages in the language: "${language}". Do not write in English unless "${language}" is "en" or English is explicitly requested.

Respond now:`

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

    if ((profile.tokens_balance ?? 0) > 0) return { tier: 2 }
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

    // Tier 2: AI Crunch if Slide failed but Tokens exist
    if ((profile.tokens_balance ?? 0) > 0) {
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

    // 1. Deduct Token
    const { data: profile } = await supabase.from('profiles').select('tokens_balance').eq('id', userId).single();
    if (!profile || (profile.tokens_balance ?? 0) <= 0) return { success: false };

    await supabase.from('profiles').update({ tokens_balance: Math.max(0, profile.tokens_balance - 1) }).eq('id', userId);

    // 2. Extract context for AI: Overdue + Future Tasks in current sprint
    const { data: allTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', goalId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

    const { data: goal } = await supabase.from('learning_goals').select('*').eq('id', goalId).single();
    if (!allTasks || !goal) return { success: false };

    const language = (goal.plan_metadata as any)?.language || 'en';

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
        5. TARGET LANGUAGE: Ensure all compressed task titles are written in the language: "${language}". Do not write in English unless "${language}" is "en" or English is explicitly requested.
        
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

    if (overdue && overdue.length > 0) {
        const overdueIds = overdue.map(t => t.id);
        // Find the max pivoted_count among overdue tasks and increment uniformly
        const maxPivotedCount = Math.max(...overdue.map(t => t.pivoted_count || 0));

        // Single bulk update: all overdue tasks moved to today in one DB call
        await supabase
            .from('tasks')
            .update({ due_date: todayStr, pivoted_count: maxPivotedCount + 1 })
            .in('id', overdueIds);
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
        .select('title, subject, resources, goal_id')
        .eq('id', taskId)
        .eq('user_id', user.id)
        .single()

    if (fetchErr || !task) return { error: 'Task not found' }

    if (task.resources && Array.isArray(task.resources) && task.resources.length > 0) {
        return { resources: task.resources }
    }

    const { data: goal } = await supabase
        .from('learning_goals')
        .select('plan_metadata')
        .eq('id', task.goal_id)
        .single()
    const language = (goal?.plan_metadata as any)?.language || 'en'

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
        
        TARGET LANGUAGE: Generate the "title" of each resource in the language: "${language}". Do not write in English unless "${language}" is "en" or English is explicitly requested. Keep the URLs standard.
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
        .select('title, subject, goal_id')
        .eq('id', taskId)
        .eq('user_id', user.id)
        .single()

    if (!task) return { error: 'Task not found' }

    const { data: goal } = await supabase
        .from('learning_goals')
        .select('plan_metadata')
        .eq('id', task.goal_id)
        .single()

    const language = (goal?.plan_metadata as any)?.language || 'en'

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
        
        CRITICAL TARGET LANGUAGE: You must write the "feedback" string in the language: "${language}". Do not write in English unless "${language}" is "en" or English is explicitly requested.

        Respond ONLY with a JSON object, matching this format:
        {
          "feedback": "your response here in the target language",
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
                .select('tokens_balance, xp, level')
                .eq('id', user.id)
                .single()

            if (profile) {
                const bonusTokens = 2
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
                        tokens_balance: (profile.tokens_balance ?? 0) + bonusTokens,
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
                        - CRITICAL TARGET LANGUAGE: You must write both the "question" and the "answer" in the language: "${language}". Do not write in English unless "${language}" is "en" or English is explicitly requested.

                        Respond ONLY with a JSON object, matching this format:
                        {
                          "question": "question text in target language",
                          "answer": "answer text in target language"
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
                    tokensAwarded: bonusTokens, 
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
                .select('tokens_balance, xp, level')
                .eq('id', user.id)
                .single()
            if (profile) {
                const bonusTokens = 2
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
                        tokens_balance: (profile.tokens_balance ?? 0) + bonusTokens,
                        xp: newXp,
                        level: newLevel
                    })
                    .eq('id', user.id)
                try {
                    const fallbackQuestions: Record<string, string> = {
                        en: `Explain the core mechanism or takeaway of "${task.title}".`,
                        ru: `Объясните основной механизм или суть темы "${task.title}".`,
                        fr: `Expliquez le mécanisme central ou l'essentiel de "${task.title}".`,
                        es: `Explica el mecanismo central o el concepto clave of "${task.title}".`,
                        hy: `Բացատրեք "${task.title}" թեմայի հիմնական մեխանիզմը կամ էությունը:`,
                        ja: `「${task.title}」の核心的な仕組みやポイントを説明してください。`,
                        zh: `解释“${task.title}”的核心机制或要点。`
                    }
                    const fallbackQuestion = fallbackQuestions[language] || fallbackQuestions['en']

                    await supabase
                        .from('flashcards')
                        .insert({
                            user_id: user.id,
                            task_id: taskId,
                            question: fallbackQuestion,
                            answer: answer.trim(),
                            leitner_box: 1,
                            next_review: new Date().toISOString()
                        })
                } catch (fcErr) {
                    console.error('[submitActiveRecallAnswer] Local flashcard insertion failed:', fcErr)
                }

                const fallbackPassFeedbacks: Record<string, string> = {
                    en: "Backup Evaluator: Your summary shows significant effort. Keep exploring the underlying mechanics to build stronger mental models!",
                    ru: "Резервная оценка: ваше описание показывает значительные усилия. Продолжайте изучать лежащие в основе механизмы для построения более четких ментальных моделей!",
                    fr: "Évaluateur de secours : Votre résumé montre un effort important. Continuez à explorer les mécanismes sous-jacents pour construire des modèles mentaux plus solides !",
                    es: "Evaluador de respaldo: Tu resumen muestra un esfuerzo significativo. ¡Sigue explorando los mecanismos subyacentes para construir modelos mentales más sólidos!",
                    hy: "Պահուստային գնահատում. Ձեր ամփոփումը ցույց է տալիս զգալի ջանքեր: Շարունակեք ուսումնասիրել հիմքում ընկած մեխանիզմները՝ ավելի ուժեղ մտավոր մոդելներ կառուցելու համար:",
                    ja: "バックアップ評価：要約に多大な努力が見られます。より強力なメンタルモデルを構築するために、基礎となる仕組みの探求を続けましょう！",
                    zh: "备份评估器：您的总结表现出了显著的努力。继续探索底层机制以建立更强大的心理模型！"
                }

                revalidatePath('/', 'layout')
                return {
                    feedback: fallbackPassFeedbacks[language] || fallbackPassFeedbacks['en'],
                    rating: 'Pass',
                    tokensAwarded: bonusTokens,
                    xpAwarded: bonusXp,
                    leveledUp,
                    newLevel
                }
            }
        }

        const fallbackFailFeedbacks: Record<string, string> = {
            en: "Your summary is too brief. Try to write at least 8 words explaining what you learned to trigger active recall.",
            ru: "Ваше описание слишком короткое. Пожалуйста, напишите не менее 8 слов, объясняющих то, что вы узнали, чтобы активировать активное припоминание.",
            fr: "Votre résumé est trop court. Essayez d'écrire au moins 8 mots expliquant ce que vous avez appris pour stimuler le rappel actif.",
            es: "Tu resumen es demasiado breve. Intenta escribir al menos 8 palabras explicando lo que has aprendido para activar la recordación activa.",
            hy: "Ձեր ամփոփումը չափազանց կարճ է: Փորձեք գրել առնվազն 8 բառ՝ բացատրելով այն, ինչ սովորել եք, ակտիվ վերհիշումը խթանելու համար:",
            ja: "要約が短すぎます。アクティブリコールをトリガーするために、学んだことを説明する言葉を少なくとも8語以上書いてみてください。",
            zh: "您的总结过于简短。尝试写下至少 8 个字来解释您所学到的内容，以触发主动回忆。"
        }

        return {
            feedback: fallbackFailFeedbacks[language] || fallbackFailFeedbacks['en'],
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
        .select('tokens_balance, multiplier_active, streak_shields_count, current_streak, high_streak')
        .eq('id', user.id)
        .single()

    if (!profile) return { error: 'Profile not found' }

    const userTokens = profile.tokens_balance ?? 0

    if (itemType === 'void') {
        if (userTokens < 10) return { error: 'NOT_ENOUGH_TOKENS' }

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
            .update({ tokens_balance: userTokens - 10 })
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
        if (userTokens < 15) return { error: 'NOT_ENOUGH_TOKENS' }
        if (profile.multiplier_active) return { error: 'MULTIPLIER_ALREADY_ACTIVE' }

        const { error } = await supabase
            .from('profiles')
            .update({ tokens_balance: userTokens - 15, multiplier_active: true })
            .eq('id', user.id)

        if (error) return { error: error.message }
        revalidatePath('/', 'layout')
        return { success: true, message: 'Focus Multiplier activated for your next focus session!' }
    }

    if (itemType === 'shield') {
        if (userTokens < 15) return { error: 'NOT_ENOUGH_TOKENS' }
        if ((profile.streak_shields_count ?? 0) >= 2) return { error: 'SHIELDS_FULL' }

        const { error } = await supabase
            .from('profiles')
            .update({ 
                tokens_balance: userTokens - 15, 
                streak_shields_count: (profile.streak_shields_count ?? 0) + 1 
            })
            .eq('id', user.id)

        if (error) return { error: error.message }
        revalidatePath('/', 'layout')
        return { success: true, message: 'Streak Shield equipped! Automatically protects your streak when you miss a day.' }
    }

    if (itemType === 'repair') {
        if (userTokens < 30) return { error: 'NOT_ENOUGH_TOKENS' }
        if ((profile.current_streak ?? 0) > 0) return { error: 'STREAK_NOT_BROKEN' }
        if ((profile.high_streak ?? 0) === 0) return { error: 'NO_STREAK_TO_REPAIR' }

        const { error } = await supabase
            .from('profiles')
            .update({ 
                tokens_balance: userTokens - 30, 
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
        .select('tokens_balance')
        .eq('id', user.id)
        .single()

    if (!profile) return { error: 'Profile not found' }
    if ((profile.tokens_balance ?? 0) < cost) return { error: 'NOT_ENOUGH_TOKENS' }

    const { error } = await supabase
        .from('profiles')
        .update({ tokens_balance: (profile.tokens_balance ?? 0) - cost })
        .eq('id', user.id)

    if (error) return { error: error.message }
    revalidatePath('/', 'layout')
    return { success: true, message: `Successfully unlocked ${itemName}!` }
}

export async function claimAchievementReward(xpReward: number, tokenReward: number, achievementTitle: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tokens_balance, xp, level')
        .eq('id', user.id)
        .single()

    if (!profile) return { error: 'Profile not found' }

    let newXp = (profile.xp ?? 0) + xpReward
    let newLevel = profile.level ?? 1
    let xpNeeded = newLevel * 100
    while (newXp >= xpNeeded) {
        newXp -= xpNeeded
        newLevel += 1
        xpNeeded = newLevel * 100
    }

    const { error } = await supabase
        .from('profiles')
        .update({ 
            tokens_balance: (profile.tokens_balance ?? 0) + tokenReward,
            xp: newXp,
            level: newLevel
        })
        .eq('id', user.id)

    if (error) return { error: error.message }
    revalidatePath('/', 'layout')
    return { success: true, newTokens: (profile.tokens_balance ?? 0) + tokenReward, newXp, newLevel, message: `Claimed reward for: ${achievementTitle}!` }
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

    // Award XP/Tokens for review!
    const { data: profile } = await supabase
        .from('profiles')
        .select('tokens_balance, xp, level')
        .eq('id', user.id)
        .single()

    let awardTokens = 1
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
                tokens_balance: (profile.tokens_balance ?? 0) + awardTokens,
                xp: newXp,
                level: newLevel
            })
            .eq('id', user.id)
    }

    revalidatePath('/', 'layout')
    return { success: true, nextBox, nextReview: nextReviewDate.toISOString(), tokensAwarded: awardTokens, xpAwarded: awardXp, leveledUp, newLevel }
}

export async function placeWagerServer(cost: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tokens_balance')
        .eq('id', user.id)
        .single()

    if (!profile) return { error: 'Profile not found' }
    if ((profile.tokens_balance ?? 0) < cost) return { error: 'NOT_ENOUGH_TOKENS' }

    const { error } = await supabase
        .from('profiles')
        .update({ tokens_balance: (profile.tokens_balance ?? 0) - cost })
        .eq('id', user.id)

    if (error) return { error: error.message }
    revalidatePath('/', 'layout')
    return { success: true, newTokens: (profile.tokens_balance ?? 0) - cost }
}

export async function rewardWagerServer(tokenReward: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tokens_balance')
        .eq('id', user.id)
        .single()

    if (!profile) return { error: 'Profile not found' }

    const { error } = await supabase
        .from('profiles')
        .update({ tokens_balance: (profile.tokens_balance ?? 0) + tokenReward })
        .eq('id', user.id)

    if (error) return { error: error.message }
    revalidatePath('/', 'layout')
    return { success: true, newTokens: (profile.tokens_balance ?? 0) + tokenReward }
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

export async function recoverTokensFromRecallPit() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tokens_balance')
        .eq('id', user.id)
        .single()

    if (!profile) return { error: 'Profile not found' }

    const newTokens = (profile.tokens_balance || 0) + 2
    const { error } = await supabase
        .from('profiles')
        .update({ tokens_balance: newTokens })
        .eq('id', user.id)

    if (error) return { error: error.message }
    revalidatePath('/', 'layout')
    return { success: true, newTokens }
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
        const { data: prof } = await supabase
            .from('profiles')
            .select('tokens_balance')
            .eq('id', user.id)
            .single()
        if (prof) {
            await supabase
                .from('profiles')
                .update({ tokens_balance: (prof.tokens_balance ?? 0) + 5 })
                .eq('id', user.id)
        }
        return { error: 'SHIELDS_FULL', message: 'Shields are already full! Awarded 5 Tokens instead.' }
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
        .select('title, plan_metadata')
        .eq('id', goalId)
        .single()

    const language = (goal?.plan_metadata as any)?.language || 'en'

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

Begin the Socratic checkpoint battle by welcoming the student and asking ONE deep, conceptual question that tests their fundamental understanding of these topics. Do not explain the answer, just ask the question. Keep it brief (2-3 sentences max).

CRITICAL TARGET LANGUAGE: You must generate the entire response in the language: "${language}". Do not write in English unless "${language}" is "en" or English is explicitly requested.`

    try {
        const { textModel } = await import('@/utils/gemini')
        const result = await textModel.generateContent(greetingPrompt)
        const greeting = result.response.text().trim()
        return { greeting }
    } catch (err) {
        console.error('Failed to start checkpoint battle:', err)
        
        const fallbackGreetings: Record<string, string> = {
            en: `Welcome to your Checkpoint Battle for the milestone on ${wallDate}. Let's test your knowledge on: ${topics}. Can you explain how these concepts connect and outline their core mechanism?`,
            ru: `Добро пожаловать на Битву на контрольной точке для рубежа ${wallDate}. Давайте проверим ваши знания по темам: ${topics}. Можете ли вы объяснить, как связаны эти концепции, и описать их основной механизм?`,
            fr: `Bienvenue dans votre Combat de Point de Contrôle pour le jalon du ${wallDate}. Testons vos connaissances sur : ${topics}. Pouvez-vous expliquer comment ces concepts se connectent et décrire leur mécanisme fondamental ?`,
            es: `Te damos la bienvenida a tu Batalla de Punto de Control para el hito del ${wallDate}. Pongamos a prueba tus conocimientos sobre: ${topics}. ¿Podrías explicar cómo se conectan estos conceptos y describir su mecanismo principal?`,
            hy: `Բացատրեք "${topics}" թեմաների հիմնական մեխանիզմը կամ էությունը: Բարի գալուստ ձեր Ստուգիչ կետի ճակատամարտ ${wallDate} հանգրվանի համար: Եկեք ստուգենք ձեր գիտելիքները հետևյալ թեմաներից՝ ${topics}: Կարո՞ղ եք բացատրել, թե ինչպես են այս հասկացությունները կապված և նկարագրել դրանց հիմնական մեխանիզմը:`,
            ja: `${wallDate}のマイルストーンに向けたチェックポイントバトルへようこそ。次のトピックに関する知識をテストしましょう：${topics}。これらの概念がどのように結びついているかを説明し、その核心的なメカニズムを説明できますか？`,
            zh: `欢迎来到 ${wallDate} 里程碑的关卡挑战。让我们测试一下你在以下主题上的知识：${topics}。你能解释一下这些概念是如何关联的，并概述它们的核心机制吗？`
        }

        const greeting = fallbackGreetings[language] || fallbackGreetings['en']
        return { greeting }
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
        .select('title, plan_metadata')
        .eq('id', goalId)
        .single()

    const language = (goal?.plan_metadata as any)?.language || 'en'

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
            .select('tokens_balance, xp, level')
            .eq('id', user.id)
            .single()

        if (profile) {
            const bonusTokens = 15
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
                .update({ tokens_balance: (profile.tokens_balance ?? 0) + bonusTokens, xp: newXp, level: newLevel })
                .eq('id', user.id)
        }
    } else {
        const { data: profile } = await supabase
            .from('profiles')
            .select('tokens_balance')
            .eq('id', user.id)
            .single()

        if (profile) {
            const newTokens = Math.max(0, (profile.tokens_balance || 0) - 2)
            await supabase
                .from('profiles')
                .update({ tokens_balance: newTokens })
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
        .select('title, subject, drill_data, goal_id')
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

    const { data: goal } = await supabase
        .from('learning_goals')
        .select('plan_metadata')
        .eq('id', task.goal_id)
        .single()
    const language = (goal?.plan_metadata as any)?.language || 'en'

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
Ensure the distractors (incorrect options) are plausible but clearly wrong. Keep the questions focused on primary conceptual mechanisms rather than memorization.

CRITICAL: Generate the entire content (both the question text and the options text) in the language: "${language}". Do not write in English unless "${language}" is "en" or English is explicitly requested.`

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
        
        const fallbacks: Record<string, any> = {
            en: {
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
            },
            ru: {
                questions: [
                    {
                        question: `Что из следующего описывает основную цель темы "${task.title}"?`,
                        options: [
                            "Применение принципов к практическому решению задач.",
                            "Пассивный обзор концепций без активного вовлечения.",
                            "Заучивание ответов для подготовки к экзамену.",
                            "Игнорирование концептуальных основ."
                        ],
                        correctOptionIndex: 0
                    },
                    {
                        question: "Почему активное припоминание важно для этой задачи?",
                        options: [
                            "Оно выстраивает долгосрочные нейронные связи и выявляет пробелы в понимании.",
                            "Оно ускоряет обучение, но делает его менее эффективным.",
                            "Оно полезно только для заучивания словарных слов.",
                            "Оно не влияет на долгосрочное удержание информации."
                        ],
                        correctOptionIndex: 0
                    },
                    {
                        question: "Какой лучший способ проверить концептуальное мастерство?",
                        options: [
                            "Простое объяснение идеи своими словами.",
                            "Многократное перечитывание страницы учебника.",
                            "Выделение определений разными цветами.",
                            "Переход сразу к продвинутому материалу."
                        ],
                        correctOptionIndex: 0
                    }
                ]
            },
            fr: {
                questions: [
                    {
                        question: `Lequel des éléments suivants décrit l'objectif principal de "${task.title}" ?`,
                        options: [
                            "Appliquer les principes à la résolution de problèmes pratiques.",
                            "Revoir passivement les concepts sans engagement.",
                            "Mémoriser les réponses pour la préparation aux examens.",
                            "Ignorer les bases conceptuelles."
                        ],
                        correctOptionIndex: 0
                    },
                    {
                        question: "Pourquoi la récupération active est-elle importante pour cette tâche ?",
                        options: [
                            "Elle renforce les connexions neuronales à long terme et révèle les lacunes de compréhension.",
                            "Elle rend l'étude plus rapide mais moins efficace.",
                            "Elle n'est utile que pour les termes de vocabulaire.",
                            "Elle n'affecte pas la rétention à long terme."
                        ],
                        correctOptionIndex: 0
                    },
                    {
                        question: "Quel est le meilleur moyen de vérifier la maîtrise conceptuelle ?",
                        options: [
                            "Expliquer l'idée simplement avec ses propres mots.",
                            "Relire la page du manuel plusieurs fois.",
                            "Surligner des définitions dans différentes couleurs.",
                            "Passer directement au matériel avancé."
                        ],
                        correctOptionIndex: 0
                    }
                ]
            },
            es: {
                questions: [
                    {
                        question: `¿Cuál de las siguientes opciones describe el objetivo principal de "${task.title}"?`,
                        options: [
                            "Aplicar los principios a la resolución práctica de problemas.",
                            "Revisar pasivamente los conceptos sin involucrarse.",
                            "Memorizar respuestas para la preparación de exámenes.",
                            "Ignorar las bases conceptuales."
                        ],
                        correctOptionIndex: 0
                    },
                    {
                        question: "¿Por qué es importante el recuerdo activo para esta tarea?",
                        options: [
                            "Construye conexiones neuronales a largo plazo y expone brechas de comprensión.",
                            "Hace que el estudio sea más rápido pero menos efectivo.",
                            "Solo es útil para términos de vocabulario.",
                            "No afecta la retención a largo plazo."
                        ],
                        correctOptionIndex: 0
                    },
                    {
                        question: "¿Cuál es la mejor manera de verificar el dominio conceptual?",
                        options: [
                            "Explicar la idea de manera sencilla con tus propias palabras.",
                            "Releer la página del libro de texto varias veces.",
                            "Resaltar definiciones con diferentes colores.",
                            "Pasar directamente al material avanzado."
                        ],
                        correctOptionIndex: 0
                    }
                ]
            },
            hy: {
                questions: [
                    {
                        question: `Հետևյալներից ո՞րն է նկարագրում "${task.title}" թեմայի հիմնական նպատակը:`,
                        options: [
                            "Սկզբունքների կիրառումը գործնական խնդիրների լուծման մեջ:",
                            "Հասկացությունների պասիվ վերանայում առանց ներգրավվածության:",
                            "Պատասխանների անգիր անելը քննության նախապատրաստման համար:",
                            "Հայեցակարգային հիմքերի անտեսումը:"
                        ],
                        correctOptionIndex: 0
                    },
                    {
                        question: "Ինչու՞ է ակտիվ վերհիշումը կարևոր այս առաջադրանքի համար:",
                        options: [
                            "Այն կառուցում է երկարաժամկետ նյարդային կապեր և բացահայտում ըմբռնման բացերը:",
                            "Այն ուսումնառությունը դարձնում է ավելի արագ, բայց պակաս արդյունավետ:",
                            "Այն օգտակար է միայն բառապաշարի տերմինների համար:",
                            "Այն չի ազդում երկարաժամկետ հիշողության վրա:"
                        ],
                        correctOptionIndex: 0
                    },
                    {
                        question: "Ո՞րն է հայեցակարգային տիրապետումը ստուգելու լավագույն միջոցը:",
                        options: [
                            "Գաղափարը պարզապես սեփական բառերով բացատրելը:",
                            "Դասագրքի էջը բազմիցս վերընթերցելը:",
                            "Սահմանումները տարբեր գույներով ընդգծելը:",
                            "Անմիջապես անցնելը բարդ նյութերին:"
                        ],
                        correctOptionIndex: 0
                    }
                ]
            },
            ja: {
                questions: [
                    {
                        question: `次のうち、「${task.title}」の核心的な目的を説明しているものはどれですか？`,
                        options: [
                            "原則を実践的な問題解決に応用すること。",
                            "主体的に関与せず、受動的に概念を見直すこと。",
                            "試験対策のために答えを暗記すること。",
                            "概念的な基礎を無視すること。"
                        ],
                        correctOptionIndex: 0
                    },
                    {
                        question: "なぜこのタスクにおいてアクティブリコールが重要なのですか？",
                        options: [
                            "長期的な神経接続を構築し、理解のギャップを明らかにするため。",
                            "学習は早くなるが、効果は低くなるため。",
                            "語彙の用語にのみ有用であるため。",
                            "長期的な記憶定着には影響しないため。"
                        ],
                        correctOptionIndex: 0
                    },
                    {
                        question: "概念の習得度を確認する最良の方法は何ですか？",
                        options: [
                            "自分の言葉でシンプルにそのアイデアを説明すること。",
                            "教科書のページを何度も読み返すこと。",
                            "異なる色で定義をハイライトすること。",
                            "すぐに高度な内容に進むこと。"
                        ],
                        correctOptionIndex: 0
                    }
                ]
            },
            zh: {
                questions: [
                    {
                        question: `以下哪项描述了“${task.title}”的核心目标？`,
                        options: [
                            "将原理应用到实际解题中。",
                            "被动地复习概念而不参与互动。",
                            "为了备考而死记硬背答案。",
                            "忽略概念基础。"
                        ],
                        correctOptionIndex: 0
                    },
                    {
                        question: "为什么主动回忆对这项任务很重要？",
                        options: [
                            "它建立长期神经连接并暴露理解盲区。",
                            "它让学习更快但效果更差。",
                            "它仅对词汇术语有用。",
                            "它不影响长期记忆。"
                        ],
                        correctOptionIndex: 0
                    },
                    {
                        question: "验证概念掌握情况的最佳方法是什么？",
                        options: [
                            "用自己的话简单解释这个概念。",
                            "多次重读教科书页面。",
                            "用不同的颜色突出显示定义。",
                            "直接跳到高级材料。"
                        ],
                        correctOptionIndex: 0
                    }
                ]
            }
        }

        const fallback = fallbacks[language] || fallbacks['en']
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

export async function updateActiveGoalsLanguage(newLanguage: string) {
    console.log('[updateActiveGoalsLanguage] Action started. Target language:', newLanguage)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.warn('[updateActiveGoalsLanguage] User not authenticated')
        return { error: 'Not authenticated' }
    }

    // Fetch the goals
    const { data: goals } = await supabase
        .from('learning_goals')
        .select('id, plan_metadata')
        .eq('user_id', user.id)

    console.log('[updateActiveGoalsLanguage] Goals fetched:', goals ? goals.length : 0)

    if (goals && goals.length > 0) {
        // 1. Update goals language metadata
        for (const goal of goals) {
            const currentMetadata = (goal.plan_metadata as any) || {}
            const updatedMetadata = { ...currentMetadata, language: newLanguage }
            console.log(`[updateActiveGoalsLanguage] Updating Goal ID ${goal.id} metadata language to:`, newLanguage)
            const { error: updateError } = await supabase
                .from('learning_goals')
                .update({ plan_metadata: updatedMetadata })
                .eq('id', goal.id)
            if (updateError) {
                console.error(`[updateActiveGoalsLanguage] Failed to update Goal ID ${goal.id}:`, updateError.message)
            }
        }

        // 2. Fetch and translate tasks associated with these goals in the background (0-tokens)
        const goalIds = goals.map(g => g.id)
        const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .in('goal_id', goalIds)

        if (tasks && tasks.length > 0) {
            const updatePromises = tasks.map(async (task) => {
                const subtasksArray = task.subtasks ?? []
                let translationsSubtask = subtasksArray.find((s: any) => s.id === 'translations') as any

                if (!translationsSubtask) {
                    translationsSubtask = {
                        id: "translations",
                        title: "",
                        completed: false,
                        translations: {
                            title: {},
                            subtasks: {}
                        }
                    }
                }

                if (!translationsSubtask.translations) {
                    translationsSubtask.translations = { title: {}, subtasks: {} }
                }
                if (!translationsSubtask.translations.title) {
                    translationsSubtask.translations.title = {}
                }
                if (!translationsSubtask.translations.subtasks) {
                    translationsSubtask.translations.subtasks = {}
                }

                const titleTranslations = translationsSubtask.translations.title
                const subtaskTranslations = translationsSubtask.translations.subtasks
                let needsUpdate = false

                // Translate task title if needed
                if (!titleTranslations[newLanguage]) {
                    const translatedTitle = await translateTextFree(task.title, newLanguage)
                    if (translatedTitle) {
                        titleTranslations[newLanguage] = translatedTitle
                        needsUpdate = true
                    }
                }

                // Translate subtasks if needed
                const realSubtasks = subtasksArray.filter((s: any) => s.id !== 'translations')
                for (const sub of realSubtasks) {
                    if (!subtaskTranslations[sub.id]) {
                        subtaskTranslations[sub.id] = {}
                    }
                    if (!subtaskTranslations[sub.id][newLanguage]) {
                        const translatedSub = await translateTextFree(sub.title, newLanguage)
                        if (translatedSub) {
                            subtaskTranslations[sub.id][newLanguage] = translatedSub
                            needsUpdate = true
                        }
                    }
                }

                if (needsUpdate) {
                    const newSubtasksArray = [
                        ...realSubtasks,
                        {
                            ...translationsSubtask,
                            translations: {
                                title: titleTranslations,
                                subtasks: subtaskTranslations
                            }
                        }
                    ]
                    await supabase
                        .from('tasks')
                        .update({ subtasks: newSubtasksArray })
                        .eq('id', task.id)
                }
            })

            await Promise.all(updatePromises)
        }
    }
    
    console.log('[updateActiveGoalsLanguage] Complete. Revalidating layout paths.')
    revalidatePath('/', 'layout')
    return { success: true }
}

export async function translateTaskText(title: string, subtaskTitles: string[], targetLang: string) {
    console.log('[translateTaskText] Translating to:', targetLang)
    try {
        const translatedTitle = await translateTextFree(title, targetLang)
        const translatedSubtasks = await Promise.all(
            subtaskTitles.map(st => translateTextFree(st, targetLang))
        )
        return {
            title: translatedTitle,
            subtasks: translatedSubtasks
        }
    } catch (err) {
        console.error('[translateTaskText] Translation failed:', err)
        return { title, subtasks: subtaskTitles }
    }
}

async function translateTextFree(text: string, targetLang: string): Promise<string> {
    if (!text) return ''
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        const json = await res.json()
        return json?.[0]?.map((item: any) => item?.[0]).join('') || text
    } catch (e) {
        console.error(`[translateTextFree] Failed for text: "${text}"`, e)
        return text
    }
}

export async function importExternalPlan(formData: FormData) {
    const supabase = await createClient()
    const title = formData.get('title') as string
    const durationDays = parseInt(formData.get('duration_days') as string) || 30
    const level = formData.get('level') as string || 'Beginner'
    const goalIntent = formData.get('goal_intent') as string || 'Level Up'
    const category = formData.get('category') as string || 'Custom'
    const language = formData.get('language') as string || 'en'
    const dailyHours = parseInt(formData.get('daily_hours') as string) || 2
    const tasksJson = formData.get('tasks_json') as string || ''

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

    // Clean and parse JSON
    function cleanPastedJson(raw: string): string {
        let cleaned = raw.trim()
        if (cleaned.startsWith('```')) {
            const lines = cleaned.split('\n')
            if (lines[0].startsWith('```')) {
                lines.shift()
            }
            if (lines[lines.length - 1].startsWith('```')) {
                lines.pop()
            }
            cleaned = lines.join('\n').trim()
        }
        return cleaned
    }

    let parsedTasks: any[] = []
    try {
        const cleaned = cleanPastedJson(tasksJson)
        parsedTasks = JSON.parse(cleaned)
        if (!Array.isArray(parsedTasks)) {
            return { error: 'Pasted content is not a JSON array.' }
        }
    } catch (e: any) {
        return { error: 'Failed to parse JSON. Please ensure the LLM output is valid JSON. Error: ' + e.message }
    }

    // Calculate sprint walls
    const baseDate = new Date()
    const sprintWalls = []
    for (let day = 6; day < durationDays; day += 6) {
        const wallDate = new Date(baseDate)
        wallDate.setDate(wallDate.getDate() + (day - 1))
        sprintWalls.push({
            date: getLocalDateString(wallDate),
            label: `Checkpoint ${day / 6}`
        })
    }

    // Insert Goal
    const { data: goal, error: insertError } = await supabase
        .from('learning_goals')
        .insert({
            title,
            user_id: user.id,
            duration_days: durationDays,
            level: level,
            goal_intent: goalIntent,
            sprint_walls: sprintWalls,
            commitment_hours_per_week: dailyHours * 7,
            plan_metadata: {
                category,
                language,
                translated_titles: {
                    [language]: title
                }
            }
        })
        .select()
        .single()

    if (insertError) return { error: insertError.message }

    // Map tasks
    const tasksToInsert = parsedTasks.map((task: any) => {
        const dayNum = task.day || task.day_number || 1
        const targetDate = new Date(baseDate)
        targetDate.setDate(targetDate.getDate() + (dayNum - 1))

        const priority = typeof task.priority === 'number' ? task.priority : 3
        const taskType = (task.task_type === 'void' || priority === 0 || task.title === 'VOID DAY') ? 'void' : 'task'

        const activeSubtasks = (task.subtasks ?? []).map((st: any, idx: number) => {
            const stTitle = typeof st === 'string' ? st : (st.title || '')
            const stId = (typeof st === 'object' && st.id) ? st.id : `st_${dayNum}_${idx}`
            return {
                id: stId,
                title: stTitle,
                completed: false
            }
        })

        const translationsSubtask = {
            id: 'translations',
            title: '',
            completed: false,
            translations: {
                title: { [language]: task.title || 'Study Task' },
                subtasks: activeSubtasks.reduce((acc: any, st: any) => {
                    acc[st.id] = { [language]: st.title }
                    return acc
                }, {})
            }
        }

        return {
            goal_id: goal.id,
            user_id: user.id,
            title: task.title || 'Study Task',
            subject: task.subject || category,
            duration_mins: task.duration_mins || 45,
            priority: priority,
            task_type: taskType,
            due_date: getLocalDateString(targetDate),
            subtasks: [...activeSubtasks, translationsSubtask]
        }
    })

    const { error: tasksErr } = await supabase.from('tasks').insert(tasksToInsert)
    if (tasksErr) {
        await supabase.from('learning_goals').delete().eq('id', goal.id)
        return { error: 'Failed to insert imported tasks: ' + tasksErr.message }
    }

    revalidatePath('/', 'layout')
    return { success: true }
}
