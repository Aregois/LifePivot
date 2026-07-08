import { createGoalBase } from '@/app/actions'
import { verifyUserSession } from '@/utils/auth'
import { createClient } from '@/utils/supabase/server'
import { getLocalDateString } from '@/utils/date-utils'
import { textModel } from '@/utils/gemini'
import { NextResponse } from 'next/server'

// Category specific instructions matching actions.ts prompts
const CATEGORY_PROMPTS: Record<string, string> = {
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

/**
 * POST /api/plans/generate
 *
 * Switch from blocking to a live SSE streaming experience.
 * Returns the SSE stream immediately and writes parsed tasks to the database in real-time.
 */
export async function POST(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { goal, level, dailyTime, style } = body

        if (!goal || !level || !dailyTime || !style) {
            return NextResponse.json(
                { error: 'Missing required fields: goal, level, dailyTime, style' },
                { status: 400 }
            )
        }

        const durationDays = 30
        const dailyHours = mapDailyTimeToHours(dailyTime)
        const planLevel = mapLevel(level)
        const category = mapStyleToCategory(style)
        const categoryInstructions = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS['Custom']

        // Create the goal base first
        const formData = new FormData()
        formData.append('title', goal)
        formData.append('duration_days', durationDays.toString())
        formData.append('level', planLevel)
        formData.append('goal_intent', 'Level Up')
        formData.append('sprint_walls', JSON.stringify([]))
        formData.append('daily_hours', dailyHours.toString())
        formData.append('category', category)
        formData.append('language', 'en')

        const createResult = await createGoalBase(formData)
        if (createResult.error) {
            return NextResponse.json(
                { error: createResult.error },
                { status: createResult.error === 'SUBSCRIBE_REQUIRED' ? 403 : 400 }
            )
        }

        const goalId = createResult.goalId as string
        const supabase = await createClient()

        // Fetch documents context if any exist
        let documentContextBlock = ''
        try {
            const { data: memberWorkspaces } = await supabase
                .from('workspace_members')
                .select('workspace_id')
                .eq('user_id', user.id)

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
        } catch (e) {
            console.error('Error fetching document context for stream:', e)
        }

        // Fetch learning goal metadata (created_at) for date mapping
        const { data: goalData } = await supabase
            .from('learning_goals')
            .select('created_at')
            .eq('id', goalId)
            .single()

        const goalCreatedAt = goalData?.created_at || new Date().toISOString()

        const prompt = `${documentContextBlock}
        The user goal topic: "${goal}"
        Subject Category: "${category}"
        Category Specific Guidelines:
        ${categoryInstructions}

        MULTILINGUAL TRANSLATION CONSTRAINT:
        CRITICAL: To optimize performance and reduce response time, only generate task titles and subtask titles directly in the user's active language: "en". Do NOT output any translation arrays, dictionaries, or "title_translations" fields.

        Mission Intent: Level Up
        Total Duration: ${durationDays} days.
        Daily Study Budget: ${dailyHours} hours/day.
        Level: ${planLevel}.
        Phase Boundaries (Hard Walls): []
        
        Current Generate Window: Days 1 to 30.
        
        TASK HIERARCHY (P0 to P5):
        - P5 (Deep Theory): Hardest concepts. Mental ceiling. Max 1 per day.
        - P4 (Hard Application): Complex problems. Can be paired with P1 or P2.
        - P3 (Standard): Daily progress baseline.
        - P2 (Theory Overview): Big picture reading/watching.
        - P1 (Exercises): Brain Thickener. Low-stress repetition.
        - P0 (Void Day): Rest day. Zero tasks. Used for safety net.

        VOID DAY & P5 TIEBREAKER RULES:
        - The P5 Void Day rule takes absolute priority. In any plan where a P5 task is placed, a P0 Void Day must follow it the next day regardless of plan length or the every-6-days rule.
        - Otherwise, inject ONE P0 Void day every 6 days (e.g. day 6, 12, 18, 24, etc.).
        - NEVER place a P0 (Void Day) on the FINAL DAY of the plan (day 30) or on day 1.

        PRIORITY RULES:
        - P5 (Deep Theory): max 1 per day, requires 4-5 subtasks
        - P4 (Hard Application): requires 3-4 subtasks
        - P3 (Standard): requires exactly 2 subtasks (with placeholder titles like "Practice exercise 1", "Practice exercise 2")
        - P2 (Theory Overview): no subtasks (subtasks: [])
        - P1 (Exercises): no subtasks
        - P0 (Void Day): title must be "VOID DAY", no subtasks

        SYSTEM INSTRUCTION:
        Output tasks as a JSON array. Each task on its own line in this exact format:
        {"day": 1, "title": "...", "priority": 4, "estimated_mins": 45, "subtasks": ["...", "..."]}
        Output one task per line. Do not wrap in markdown. Do not add any text before or after the JSON lines.
        `;

        const encoder = new TextEncoder()
        const customStream = new ReadableStream({
            async start(controller) {
                let tasksSaved = 0
                try {
                    // Send planId as the very first event
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ planId: goalId })}\n\n`))

                    const result = await textModel.generateContentStream(prompt)
                    let buffer = ''

                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text()
                        buffer += chunkText
                        const lines = buffer.split('\n')
                        buffer = lines.pop() || ''

                        for (const line of lines) {
                            const parsedTask = cleanAndParseTaskLine(line)
                            if (parsedTask) {
                                // Save to Supabase tasks table
                                const dbTask = formatDbTask(parsedTask, goalId, user.id, category, planLevel, goalCreatedAt)
                                const { error: insertError } = await supabase
                                    .from('tasks')
                                    .insert(dbTask)

                                if (insertError) {
                                    console.error('Error inserting task mid-stream:', insertError)
                                } else {
                                    tasksSaved++
                                }

                                // Send SSE event immediately to client
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                    title: parsedTask.title,
                                    priority: parsedTask.priority,
                                    day: parsedTask.day,
                                    estimated_mins: parsedTask.estimated_mins
                                })}\n\n`))
                            }
                        }
                    }

                    // Process any leftover text in the buffer
                    if (buffer.trim()) {
                        const parsedTask = cleanAndParseTaskLine(buffer)
                        if (parsedTask) {
                            const dbTask = formatDbTask(parsedTask, goalId, user.id, category, planLevel, goalCreatedAt)
                            const { error: insertError } = await supabase
                                .from('tasks')
                                .insert(dbTask)

                            if (!insertError) {
                                tasksSaved++
                            }

                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                title: parsedTask.title,
                                priority: parsedTask.priority,
                                day: parsedTask.day,
                                estimated_mins: parsedTask.estimated_mins
                            })}\n\n`))
                        }
                    }

                    // Send [DONE] signal
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                } catch (err: any) {
                    console.error('Error in Gemini Stream Generation:', err)
                    
                    // Orphan Cleanup: delete learning goal if no tasks were generated and saved
                    if (tasksSaved === 0) {
                        console.log(`Cleaning up orphaned goal with 0 tasks saved: ${goalId}`)
                        await supabase.from('learning_goals').delete().eq('id', goalId)
                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message || 'Generation failed. Please try again.' })}\n\n`))
                } finally {
                    controller.close()
                }
            }
        })

        return new Response(customStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        })

    } catch (err: any) {
        console.error('Error in POST /api/plans/generate:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}

/** Clean and parse a streaming task line */
function cleanAndParseTaskLine(line: string) {
    const cleaned = line.trim()
    if (!cleaned) return null

    let jsonText = cleaned
    if (jsonText.startsWith('[')) jsonText = jsonText.slice(1)
    if (jsonText.endsWith(']')) jsonText = jsonText.slice(0, -1)
    if (jsonText.endsWith(',')) jsonText = jsonText.slice(0, -1)
    jsonText = jsonText.trim()
    if (!jsonText) return null

    if (!jsonText.startsWith('{') || !jsonText.endsWith('}')) {
        const startIdx = jsonText.indexOf('{')
        const endIdx = jsonText.lastIndexOf('}')
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            jsonText = jsonText.substring(startIdx, endIdx + 1)
        } else {
            return null
        }
    }

    try {
        const obj = JSON.parse(jsonText)
        if (obj && typeof obj === 'object' && ('day' in obj || 'day_number' in obj) && 'title' in obj) {
            const dayVal = obj.day !== undefined ? obj.day : obj.day_number
            return {
                day: Number(dayVal),
                title: String(obj.title),
                priority: obj.priority !== undefined ? Number(obj.priority) : 3,
                estimated_mins: obj.estimated_mins !== undefined ? Number(obj.estimated_mins) : (obj.duration_mins !== undefined ? Number(obj.duration_mins) : 45),
                subtasks: Array.isArray(obj.subtasks) ? obj.subtasks.map(String) : []
            }
        }
    } catch {
        // Ignore parsing errors for incomplete lines
    }
    return null
}

/** Formats a task object to match the Supabase DB schema with backward-compatible translations subtask */
function formatDbTask(task: any, goalId: string, userId: string, category: string, planLevel: string, goalCreatedAt: string) {
    const baseDate = new Date(goalCreatedAt)
    const targetDate = new Date(baseDate)
    targetDate.setDate(targetDate.getDate() + (task.day - 1))

    const subtasksFormatted = (task.subtasks || []).map((subTitle: string, index: number) => {
        const subId = `st_${index + 1}_${Math.random().toString(36).substring(2, 8)}`
        return {
            id: subId,
            title: subTitle,
            completed: false
        }
    })

    const translationsSubtask = {
        id: 'translations',
        title: '',
        completed: false,
        translations: {
            title: { en: task.title },
            subtasks: subtasksFormatted.reduce((acc: any, st: any) => {
                acc[st.id] = { en: st.title }
                return acc
            }, {})
        }
    }

    const finalSubtasks = [...subtasksFormatted, translationsSubtask]

    return {
        goal_id: goalId,
        user_id: userId,
        title: task.title,
        subject: mapCategoryToSubject(category),
        duration_mins: task.estimated_mins || 45,
        priority: task.priority,
        task_type: task.priority === 0 ? 'void' : 'task',
        due_date: getLocalDateString(targetDate),
        subtasks: finalSubtasks
    }
}

/** Maps onboarding style string -> structured category string */
function mapStyleToCategory(style: string): string {
    const keys = ['Coding', 'Science', 'Math', 'Languages', 'Humanities', 'Arts', 'Business', 'Music', 'History', 'Social', 'Health', 'Custom']
    const matched = keys.find(k => k.toLowerCase() === style.toLowerCase())
    if (matched) return matched

    const s = style.toLowerCase()
    if (s.includes('code') || s.includes('tech') || s.includes('program') || s.includes('develop')) return 'Coding'
    if (s.includes('science') || s.includes('bio') || s.includes('physics') || s.includes('chem')) return 'Science'
    if (s.includes('math') || s.includes('algebra') || s.includes('calculus')) return 'Math'
    if (s.includes('lang') || s.includes('speak') || s.includes('foreign') || s.includes('vocab')) return 'Languages'
    if (s.includes('human') || s.includes('philosophy') || s.includes('literat') || s.includes('writ')) return 'Humanities'
    if (s.includes('art') || s.includes('design') || s.includes('paint') || s.includes('draw') || s.includes('sketch')) return 'Arts'
    if (s.includes('business') || s.includes('finance') || s.includes('market') || s.includes('startup') || s.includes('econ')) return 'Business'
    if (s.includes('music') || s.includes('instrument') || s.includes('sing') || s.includes('guitar') || s.includes('piano')) return 'Music'
    if (s.includes('history') || s.includes('archaeol') || s.includes('ancient')) return 'History'
    if (s.includes('social') || s.includes('sociology') || s.includes('psych') || s.includes('anthro')) return 'Social'
    if (s.includes('health') || s.includes('fit') || s.includes('nutrition') || s.includes('sport') || s.includes('workout')) return 'Health'
    return 'Custom'
}

/** Maps category string -> DB subject string */
function mapCategoryToSubject(category: string): string {
    const cat = category.toUpperCase()
    if (cat === 'CODING') return 'TECH'
    if (cat === 'SCIENCE') return 'SCIENCE'
    if (cat === 'MATH') return 'MATH'
    if (cat === 'HUMANITIES' || cat === 'HISTORY' || cat === 'SOCIAL') return 'HISTORY'
    if (cat === 'ARTS') return 'ARTS'
    return 'GENERAL'
}

function mapDailyTimeToHours(dailyTime: string): number {
    const num = parseFloat(dailyTime)
    if (!isNaN(num) && num > 0) return num

    if (dailyTime.includes('15') || dailyTime.includes('30 min')) return 0.5
    if (dailyTime.includes('30') || dailyTime.includes('60 min')) return 0.75
    if (dailyTime.includes('1') || dailyTime.includes('2 hour')) return 1.5
    if (dailyTime.includes('2+')) return 2.5
    return 1
}

/** Map the onboarding level card label → Supabase level string */
function mapLevel(level: string): string {
    const lower = level.toLowerCase()
    if (lower.includes('begin')) return 'Beginner'
    if (lower.includes('inter')) return 'Intermediate'
    if (lower.includes('advan')) return 'Advanced'
    return 'Beginner'
}
