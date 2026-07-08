import { verifyUserSession } from '@/utils/auth'
import { createClient } from '@/utils/supabase/server'
import { textModel } from '@/utils/gemini'
import { NextResponse } from 'next/server'

/**
 * POST /api/plans/enrich-p3
 *
 * Accepts { planId } and performs batch background enrichment of P3 placeholder subtasks
 * with custom context-aware ones.
 */
export async function POST(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { planId } = body

        if (!planId) {
            return NextResponse.json({ error: 'Missing planId' }, { status: 400 })
        }

        const supabase = await createClient()

        // Fetch all P3 tasks for this plan
        const { data: tasks, error: fetchError } = await supabase
            .from('tasks')
            .select('id, title')
            .eq('goal_id', planId)
            .eq('priority', 3)

        if (fetchError) {
            console.error('Error fetching tasks for enrichment:', fetchError)
            return NextResponse.json({ error: fetchError.message }, { status: 500 })
        }

        if (!tasks || tasks.length === 0) {
            return NextResponse.json({ success: true, message: 'No P3 tasks found to enrich' })
        }

        // Batch call to Gemini to generate context-aware subtasks for all P3 tasks
        const prompt = `
        You are an expert curriculum builder.
        For each of the following tasks, generate exactly 2 context-aware, highly practical, concrete subtasks.
        The subtasks must replace the generic placeholders.
        
        Input tasks:
        ${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title })))}
        
        Output format:
        Return a JSON object where each key is the task ID and the value is a JSON array of exactly 2 subtask titles (strings).
        Example:
        {
            "task_id_1": ["Concrete subtask title 1", "Concrete subtask title 2"],
            "task_id_2": ["Another concrete subtask 1", "Another concrete subtask 2"]
        }
        
        Ensure you only return the JSON. Do not wrap in markdown. Do not add any text before or after the JSON.
        `;

        const result = await textModel.generateContent(prompt)
        const responseText = result.response.text()

        // Clean and parse response
        let cleaned = responseText.trim()
        const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
        if (jsonMatch) {
            cleaned = jsonMatch[1].trim()
        } else {
            cleaned = cleaned.replace(/```(?:json)?/gi, '').replace(/```/gi, '').trim()
        }

        let payload: Record<string, string[]> = {}
        try {
            payload = JSON.parse(cleaned)
        } catch (parseErr) {
            console.error('Failed to parse P3 enrichment response JSON:', responseText, parseErr)
            return NextResponse.json({ error: 'Failed to generate valid subtasks format' }, { status: 500 })
        }

        // Update each task in Supabase
        const updatePromises = tasks.map(async (task) => {
            const subtaskStrings = payload[task.id]
            if (!subtaskStrings || !Array.isArray(subtaskStrings)) return

            const subtasksFormatted = subtaskStrings.slice(0, 2).map((subTitle: string, index: number) => {
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

            return supabase
                .from('tasks')
                .update({ subtasks: finalSubtasks })
                .eq('id', task.id)
        })

        await Promise.all(updatePromises)

        return NextResponse.json({ success: true, enrichedCount: tasks.length })
    } catch (err: any) {
        console.error('Error in POST /api/plans/enrich-p3:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
