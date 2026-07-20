'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, AlertTriangle, CheckCircle, Clock, BarChart2, List, Loader2, RefreshCw } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface ParsedTask {
    day: number
    title: string
    priority: number
    estimated_mins: number
    subject?: string
    subtasks?: string[]
    level?: string
    goal_intent?: string
    commitment_hours_per_week?: number
}

interface ValidationResult {
    valid: boolean
    tasks: ParsedTask[]
    errors: string[]
    warnings: string[]
    totalDays: number
    priorityBreakdown: Record<number, number>
    subjectWarning: boolean
}

// ── Priority label helper ─────────────────────────────────────────────────

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
    0: { label: 'P0 Void Day', color: '#6B7280' },
    1: { label: 'P1 Light', color: '#10B981' },
    2: { label: 'P2 Theory', color: '#3B82F6' },
    3: { label: 'P3 Practice', color: '#F59E0B' },
    4: { label: 'P4 Hard App', color: '#F97316' },
    5: { label: 'P5 Deep Theory', color: '#BD00FF' },
}

const VALID_SUBJECTS = new Set(['TECH', 'SCIENCE', 'MATH', 'HISTORY', 'ARTS', 'GENERAL'])

// ── Validation function ───────────────────────────────────────────────────

function validateJson(raw: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Strip markdown code fences if present
    let cleaned = raw.trim()
    if (cleaned.startsWith('```')) {
        const lines = cleaned.split('\n')
        if (lines[0].startsWith('```')) lines.shift()
        if (lines[lines.length - 1].startsWith('```')) lines.pop()
        cleaned = lines.join('\n').trim()
    }

    // Must be valid JSON
    let parsed: any
    try {
        parsed = JSON.parse(cleaned)
    } catch (e: any) {
        return {
            valid: false,
            tasks: [],
            errors: ['Invalid JSON — check for missing commas or brackets. ' + (e.message || '')],
            warnings: [],
            totalDays: 0,
            priorityBreakdown: {},
            subjectWarning: false,
        }
    }

    // Must be an array
    if (!Array.isArray(parsed)) {
        return {
            valid: false,
            tasks: [],
            errors: ['Must be a JSON array. Wrap the tasks in [ ... ]'],
            warnings: [],
            totalDays: 0,
            priorityBreakdown: {},
            subjectWarning: false,
        }
    }

    // Must have at least 5 items
    if (parsed.length < 5) {
        errors.push(`Plan must have at least 5 tasks. Found ${parsed.length}.`)
        return { valid: false, tasks: [], errors, warnings, totalDays: 0, priorityBreakdown: {}, subjectWarning: false }
    }

    const tasks: ParsedTask[] = []
    let subjectWarning = false

    for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i]
        const day = item.day ?? item.day_number

        // Required: day
        if (day === undefined || day === null) {
            errors.push(`Missing required field: "day" on task at index ${i}`)
            continue
        }

        // Required: title
        if (!item.title) {
            errors.push(`Missing required field: "title" on day ${day}`)
            continue
        }

        // Required: priority
        if (item.priority === undefined || item.priority === null) {
            errors.push(`Missing required field: "priority" on day ${day}`)
            continue
        }

        if (typeof item.priority !== 'number' || item.priority < 0 || item.priority > 5) {
            errors.push(`Priority ${item.priority} on day ${day} is not valid (must be 0–5)`)
            continue
        }

        // Required: estimated_mins
        if (item.estimated_mins === undefined || item.estimated_mins === null) {
            errors.push(`Missing required field: "estimated_mins" on day ${day}`)
            continue
        }

        // Subject warning (not an error — auto-corrected)
        if (item.subject && !VALID_SUBJECTS.has(String(item.subject).toUpperCase())) {
            subjectWarning = true
        }

        tasks.push({
            day,
            title: item.title,
            priority: item.priority,
            estimated_mins: item.estimated_mins,
            subject: item.subject,
            subtasks: Array.isArray(item.subtasks) ? item.subtasks : [],
            level: item.level,
            goal_intent: item.goal_intent,
            commitment_hours_per_week: item.commitment_hours_per_week,
        })
    }

    if (errors.length > 0) {
        return { valid: false, tasks, errors, warnings, totalDays: 0, priorityBreakdown: {}, subjectWarning }
    }

    // Check for void days
    const hasVoidDays = tasks.some(t => t.priority === 0)
    if (!hasVoidDays) {
        warnings.push('No Void Days found — a balanced plan usually includes rest days (P0).')
    }

    // Check for missing estimated_mins outliers
    const missingMins = tasks.filter(t => !t.estimated_mins || t.estimated_mins <= 0)
    if (missingMins.length > 0) {
        warnings.push(`${missingMins.length} task(s) have zero estimated_mins — they will default to 45 minutes.`)
    }

    if (subjectWarning) {
        warnings.push('Some tasks had unknown subject values — set to GENERAL automatically.')
    }

    const totalDays = Math.max(...tasks.map(t => t.day))

    const priorityBreakdown: Record<number, number> = {}
    for (const t of tasks) {
        priorityBreakdown[t.priority] = (priorityBreakdown[t.priority] || 0) + 1
    }

    return { valid: true, tasks, errors, warnings, totalDays, priorityBreakdown, subjectWarning }
}

// ── Main component ────────────────────────────────────────────────────────

export default function ImportPlanPage() {
    const router = useRouter()
    const [raw, setRaw] = useState('')
    const [validation, setValidation] = useState<ValidationResult | null>(null)
    const [isValidating, setIsValidating] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [planTitle, setPlanTitle] = useState('')

    const handleValidate = useCallback(() => {
        if (!raw.trim()) return
        setIsValidating(true)
        setTimeout(() => {
            const result = validateJson(raw)
            setValidation(result)
            setIsValidating(false)
        }, 300)
    }, [raw])

    const handleCreate = async () => {
        if (!validation?.valid) return
        setIsSaving(true)
        setSaveError(null)

        try {
            const res = await fetch('/api/plans/json-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tasks: validation.tasks,
                    planTitle: planTitle.trim() || undefined,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                if (data.error === 'SUBSCRIBE_REQUIRED') {
                    setSaveError('This is a Pro feature. Upgrade to unlock unlimited JSON imports.')
                } else {
                    setSaveError(data.error || 'Something went wrong. Please try again.')
                }
                return
            }

            // Success — navigate to the plan page
            router.push('/plan')
        } catch (err: any) {
            setSaveError(err.message || 'Network error. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#050508] text-white">
            {/* Background ambient glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#00F0FF] opacity-[0.04] blur-[80px]" />
                <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full bg-[#BD00FF] opacity-[0.04] blur-[80px]" />
            </div>

            <div className="relative max-w-2xl mx-auto px-5 pt-6 pb-32">

                {/* ── Back button ──────────────────────────────────────────── */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-[#00F0FF] transition-colors mb-8 group"
                >
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    Back
                </button>

                {/* ── Header ───────────────────────────────────────────────── */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/20 mb-4">
                        <Upload className="w-3 h-3 text-[#00F0FF]" />
                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#00F0FF]">JSON Import</span>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-white mb-2">Import Plan from JSON</h1>
                    <p className="text-sm text-gray-400">
                        Paste the JSON generated by Gemini Notebook to create your personalized plan.
                    </p>
                </div>

                {/* ── Plan title (optional) ─────────────────────────────────── */}
                <div className="mb-4">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">
                        Plan Title <span className="text-gray-600 normal-case tracking-normal font-normal">(optional — auto-detected if blank)</span>
                    </label>
                    <input
                        type="text"
                        value={planTitle}
                        onChange={e => setPlanTitle(e.target.value)}
                        placeholder="e.g. Quantum Mechanics — 20 Day Exam Plan"
                        className="w-full px-4 py-3 rounded-2xl bg-[#141824]/80 border border-white/[0.06] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00F0FF]/30 focus:bg-[#141824] transition-all"
                    />
                </div>

                {/* ── Textarea ─────────────────────────────────────────────── */}
                <div className="mb-4">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">
                        JSON Plan
                    </label>
                    <textarea
                        id="json-import-textarea"
                        value={raw}
                        onChange={e => {
                            setRaw(e.target.value)
                            setValidation(null)
                            setSaveError(null)
                        }}
                        placeholder="Paste your JSON plan here..."
                        maxLength={100000}
                        rows={12}
                        className="w-full px-4 py-4 rounded-2xl bg-[#0a0c14] border border-white/[0.06] text-xs text-gray-300 placeholder-gray-700 focus:outline-none focus:border-[#00F0FF]/30 transition-all resize-none leading-relaxed"
                        style={{
                            minHeight: '300px',
                            fontFamily: 'ui-monospace, "Cascadia Code", Menlo, monospace',
                        }}
                    />
                    <div className="flex justify-between mt-1.5">
                        <span className="text-[10px] text-gray-700">
                            {raw.length.toLocaleString()} / 100,000 characters
                        </span>
                        {raw.trim() && (
                            <button
                                onClick={() => { setRaw(''); setValidation(null); setSaveError(null) }}
                                className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Validate button ───────────────────────────────────────── */}
                <button
                    id="validate-json-btn"
                    onClick={handleValidate}
                    disabled={!raw.trim() || isValidating}
                    className="w-full py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed bg-[#00F0FF]/10 border border-[#00F0FF]/20 text-[#00F0FF] hover:bg-[#00F0FF]/20 mb-6 flex items-center justify-center gap-2"
                >
                    {isValidating ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Validating…</>
                    ) : (
                        'Validate & Preview'
                    )}
                </button>

                {/* ── Validation errors ─────────────────────────────────────── */}
                {validation && !validation.valid && (
                    <div className="mb-6 rounded-2xl bg-red-500/8 border border-red-500/20 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-red-400">
                                Validation Failed
                            </span>
                        </div>
                        <ul className="space-y-2">
                            {validation.errors.map((err, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-red-500 mt-0.5 flex-shrink-0 text-xs">✕</span>
                                    <span className="text-xs text-red-300/80 leading-relaxed">{err}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ── Preview section ───────────────────────────────────────── */}
                {validation && validation.valid && (
                    <div className="mb-6 space-y-4">
                        {/* Warnings */}
                        {validation.warnings.length > 0 && (
                            <div className="rounded-2xl bg-yellow-500/8 border border-yellow-500/20 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Warnings</span>
                                </div>
                                {validation.warnings.map((w, i) => (
                                    <p key={i} className="text-[11px] text-yellow-300/70 leading-relaxed mt-1">{w}</p>
                                ))}
                            </div>
                        )}

                        {/* Summary card */}
                        <div className="rounded-2xl bg-[#141824]/80 border border-[#00F0FF]/15 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <CheckCircle className="w-4 h-4 text-[#00F0FF]" />
                                <span className="text-[11px] font-black uppercase tracking-widest text-[#00F0FF]">Plan Preview</span>
                            </div>

                            {/* Stats row */}
                            <div className="grid grid-cols-3 gap-3 mb-5">
                                <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 text-center">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <Clock className="w-3 h-3 text-[#00F0FF]" />
                                    </div>
                                    <p className="text-xl font-black text-white">{validation.totalDays}</p>
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Days</p>
                                </div>
                                <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 text-center">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <List className="w-3 h-3 text-[#BD00FF]" />
                                    </div>
                                    <p className="text-xl font-black text-white">{validation.tasks.length}</p>
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Tasks</p>
                                </div>
                                <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 text-center">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <BarChart2 className="w-3 h-3 text-[#F59E0B]" />
                                    </div>
                                    <p className="text-xl font-black text-white">
                                        {validation.priorityBreakdown[0] ?? 0}
                                    </p>
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Rest Days</p>
                                </div>
                            </div>

                            {/* Priority breakdown */}
                            <div className="mb-5">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 mb-2">Priority Breakdown</p>
                                <div className="flex flex-wrap gap-2">
                                    {[5, 4, 3, 2, 1, 0].map(p => {
                                        const count = validation.priorityBreakdown[p] ?? 0
                                        if (count === 0) return null
                                        const info = PRIORITY_LABELS[p]
                                        return (
                                            <div
                                                key={p}
                                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold"
                                                style={{
                                                    backgroundColor: `${info.color}12`,
                                                    border: `1px solid ${info.color}25`,
                                                    color: info.color
                                                }}
                                            >
                                                {info.label}: {count}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* First 3 tasks preview */}
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 mb-2">First 3 Tasks</p>
                                <div className="space-y-2">
                                    {validation.tasks.slice(0, 3).map((t, i) => {
                                        const info = PRIORITY_LABELS[t.priority]
                                        return (
                                            <div key={i} className="flex items-start gap-3 py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                                <div
                                                    className="flex-shrink-0 px-2 py-0.5 rounded-lg text-[9px] font-black"
                                                    style={{
                                                        backgroundColor: `${info.color}15`,
                                                        color: info.color
                                                    }}
                                                >
                                                    D{t.day}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[12px] font-bold text-white leading-snug truncate">{t.title}</p>
                                                    <p className="text-[10px] text-gray-600 mt-0.5">
                                                        {info.label} · {t.estimated_mins}min
                                                        {t.subtasks && t.subtasks.length > 0 && ` · ${t.subtasks.length} subtask${t.subtasks.length !== 1 ? 's' : ''}`}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Save error ────────────────────────────────────────────── */}
                {saveError && (
                    <div className="mb-4 rounded-2xl bg-red-500/8 border border-red-500/20 p-4 flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm text-red-300/80 leading-relaxed">{saveError}</p>
                            <button
                                onClick={handleCreate}
                                className="mt-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors"
                            >
                                <RefreshCw className="w-3 h-3" /> Retry
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Create button ─────────────────────────────────────────── */}
                {validation?.valid && (
                    <button
                        id="create-plan-btn"
                        onClick={handleCreate}
                        disabled={isSaving}
                        className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-[0_4px_30px_rgba(0,240,255,0.15)]"
                        style={{
                            background: 'linear-gradient(135deg, rgba(189,0,255,0.25), rgba(0,240,255,0.25))',
                            border: '1px solid rgba(0,240,255,0.25)',
                        }}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin text-[#00F0FF]" />
                                <span className="text-white">Creating your plan…</span>
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 text-[#00F0FF]" />
                                <span className="text-white">Create This Plan</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}
