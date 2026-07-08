'use client'

import { createGoalBase, generateTasksChunk, importExternalPlan } from '@/app/actions'
import { 
    Rocket, Brain, CheckCircle2, Loader2, Target, Clock, Zap, 
    Code, FlaskConical, Calculator, Languages, BookOpen, Palette, 
    Briefcase, Music, Scroll, Users, Dumbbell, Sparkles, ChevronLeft, Copy
} from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/components/language-provider'
import { LANGUAGE_NAMES } from '@/utils/translations'
import { SubscribeModal } from './subscribe-modal'
import { FileUploader } from './file-uploader'

function TextTicker() {
    const messages = [
        "Analyzing your goal...",
        "Structuring your 30-day plan...",
        "Balancing difficulty tiers...",
        "Adding Void Days for recovery...",
        "Almost ready..."
    ]
    const [index, setIndex] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % messages.length)
        }, 1800)
        return () => clearInterval(interval)
    }, [])

    return (
        <p className="text-sm font-semibold text-electric-blue tracking-wide uppercase animate-pulse mt-4">
            {messages[index]}
        </p>
    )
}

type Step = 'CATEGORY' | 'GOAL' | 'COMMITMENT' | 'GENERATING' | 'SUCCESS'

interface CategoryItem {
    id: string
    name: string
    icon: any
    color: string
    bgColor: string
    gradient: string
    shadow: string
    description: string
    suggestedGoal: string
}

const CATEGORIES: CategoryItem[] = [
    {
        id: 'Coding',
        name: 'Coding & CS',
        icon: Code,
        color: 'text-[#00F0FF] border-[#00F0FF]/20',
        bgColor: 'bg-[#00F0FF]/10',
        gradient: 'from-[#00F0FF]/5 to-transparent',
        shadow: 'hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]',
        description: 'Coding drills, modules, and system designs.',
        suggestedGoal: 'MASTER NEXT.JS AND ADVANCED SYSTEMS DESIGN'
    },
    {
        id: 'Science',
        name: 'Science & Bio',
        icon: FlaskConical,
        color: 'text-[#00FF87] border-[#00FF87]/20',
        bgColor: 'bg-[#00FF87]/10',
        gradient: 'from-[#00FF87]/5 to-transparent',
        shadow: 'hover:shadow-[0_0_20px_rgba(0,255,135,0.15)]',
        description: 'Mechanisms, scientific models, formulas.',
        suggestedGoal: 'UNDERSTAND NEUROTRANSMITTER PATHWAYS'
    },
    {
        id: 'Math',
        name: 'Mathematics',
        icon: Calculator,
        color: 'text-[#BD00FF] border-[#BD00FF]/20',
        bgColor: 'bg-[#BD00FF]/10',
        gradient: 'from-[#BD00FF]/5 to-transparent',
        shadow: 'hover:shadow-[0_0_20px_rgba(189,0,255,0.15)]',
        description: 'Rigorous derivations, proofs, computations.',
        suggestedGoal: 'DERIVE EINSTEIN FIELD EQUATIONS'
    },
    {
        id: 'Languages',
        name: 'Languages',
        icon: Languages,
        color: 'text-[#FF9F00] border-[#FF9F00]/20',
        bgColor: 'bg-[#FF9F00]/10',
        gradient: 'from-[#FF9F00]/5 to-transparent',
        shadow: 'hover:shadow-[0_0_20px_rgba(255,159,0,0.15)]',
        description: 'Fluency, dialogue logs, grammar practices.',
        suggestedGoal: 'LEARN CONVERSATIONAL ARABIC LEVEL 2'
    },
    {
        id: 'Humanities',
        name: 'Humanities',
        icon: BookOpen,
        color: 'text-[#FF4A6B] border-[#FF4A6B]/20',
        bgColor: 'bg-[#FF4A6B]/10',
        gradient: 'from-[#FF4A6B]/5 to-transparent',
        shadow: 'hover:shadow-[0_0_20px_rgba(255,74,107,0.15)]',
        description: 'Critical texts, reading logs, essays.',
        suggestedGoal: 'CRITIQUE KANTIAN METAPHYSICAL CRITICAL PIECES'
    },
    {
        id: 'Arts',
        name: 'Arts & Design',
        icon: Palette,
        color: 'text-[#FF33A3] border-[#FF33A3]/20',
        bgColor: 'bg-[#FF33A3]/10',
        gradient: 'from-[#FF33A3]/5 to-transparent',
        shadow: 'hover:shadow-[0_0_20px_rgba(255,51,163,0.15)]',
        description: 'Technical sketches, designs, portfolios.',
        suggestedGoal: 'CREATE 3D CHARACTER SCULPTING ARCHIVE'
    },
    {
        id: 'Business',
        name: 'Business & Econ',
        icon: Briefcase,
        color: 'text-[#00E5FF] border-[#00E5FF]/20',
        bgColor: 'bg-[#00E5FF]/10',
        gradient: 'from-[#00E5FF]/5 to-transparent',
        shadow: 'hover:shadow-[0_0_20px_rgba(0,229,255,0.15)]',
        description: 'Econ modeling, market reports, charts.',
        suggestedGoal: 'BUILD VENTURE CAPITAL VALUATION SPREADSHEETS'
    },
    {
        id: 'Music',
        name: 'Music & Audio',
        icon: Music,
        color: 'text-[#8B5CF6] border-[#8B5CF6]/20',
        bgColor: 'bg-[#8B5CF6]/10',
        gradient: 'from-[#8B5CF6]/5 to-transparent',
        shadow: 'hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]',
        description: 'Theory runs, scales, audio transcriptions.',
        suggestedGoal: 'MASTER JAZZ DIATONIC IMPROVISATION'
    },
    {
        id: 'History',
        name: 'History & Lore',
        icon: Scroll,
        color: 'text-[#F59E0B] border-[#F59E0B]/20',
        bgColor: 'bg-[#F59E0B]/10',
        gradient: 'from-[#F59E0B]/5 to-transparent',
        shadow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
        description: 'Archival investigation, timelines.',
        suggestedGoal: 'MAP THE RISE OF BYZANTINE CORRIDORS'
    },
    {
        id: 'Social',
        name: 'Social Sciences',
        icon: Users,
        color: 'text-[#3B82F6] border-[#3B82F6]/20',
        bgColor: 'bg-[#3B82F6]/10',
        gradient: 'from-[#3B82F6]/5 to-transparent',
        shadow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]',
        description: 'Psychology rules, behavior analytics.',
        suggestedGoal: 'ANALYZE DIVERGENT SOCIOLOGICAL BIAS'
    },
    {
        id: 'Health',
        name: 'Health & Fitness',
        icon: Dumbbell,
        color: 'text-[#EF4444] border-[#EF4444]/20',
        bgColor: 'bg-[#EF4444]/10',
        gradient: 'from-[#EF4444]/5 to-transparent',
        shadow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]',
        description: 'Anatomy, splits, biomechanics.',
        suggestedGoal: 'PLAN PROGRESSIVE LOAD OVERLOAD SPLITS'
    },
    {
        id: 'Custom',
        name: 'Custom',
        icon: Sparkles,
        color: 'text-[#A5F3FC] border-[#A5F3FC]/20',
        bgColor: 'bg-[#A5F3FC]/10',
        gradient: 'from-[#A5F3FC]/5 to-transparent',
        shadow: 'hover:shadow-[0_0_20px_rgba(165,243,252,0.15)]',
        description: 'General baseline study planning.',
        suggestedGoal: 'FORGE EXPERIMENTAL CURRICULUM ARCHIVE'
    }
]

export function LearningPlanCreator() {
    const { t, locale } = useLanguage()
    const [step, setStep] = useState<Step>('CATEGORY')
    const [showSubscribeModal, setShowSubscribeModal] = useState(false)
    const [category, setCategory] = useState('Coding')
    const [title, setTitle] = useState('')
    const [duration, setDuration] = useState(30)
    const [level, setLevel] = useState('Beginner')
    const [intent, setIntent] = useState<'Exam' | 'Level Up' | 'Intro'>('Level Up')
    const [sprintWalls, setSprintWalls] = useState<{ date: string; label: string }[]>([])
    const [commitment, setCommitment] = useState(10)
    const [progress, setProgress] = useState(0)
    const [statusText, setStatusText] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [planLanguage, setPlanLanguage] = useState<string>('')
    const [createdGoalId, setCreatedGoalId] = useState<string | null>(null)
    
    // External Import States
    const [creationMode, setCreationMode] = useState<'ai' | 'import'>('ai')
    const [pastedJson, setPastedJson] = useState('')
    const [copyFeedback, setCopyFeedback] = useState(false)

    const activePlanLanguage = planLanguage || locale

    const getCopyPrompt = () => {
        return `Generate a day-by-day learning plan for: "${title || '[Insert Goal Title]'}"
Duration: ${duration || 30} days.
Difficulty level: ${level || 'Beginner'}.
Mission intent: ${intent || 'Level Up'}.
Subject Category: "${category}".

Format your output STRICTLY as a raw JSON array of task objects (do not wrap it in a nested parent object) matching this structure (showing multiple tasks for the same day):
[
  {
    "day": 1,
    "title": "Core Concept Overview",
    "subject": "${category.toUpperCase()}",
    "priority": 2,
    "duration_mins": 30,
    "subtasks": [],
    "notes": "Understand the foundational concepts and read initial documentation."
  },
  {
    "day": 1,
    "title": "Practical Practice Exercises",
    "subject": "${category.toUpperCase()}",
    "priority": 3,
    "duration_mins": 45,
    "subtasks": ["Concrete step 1", "Concrete step 2"],
    "notes": "Apply the concepts learned through hands-on practice problems."
  }
]

CRITICAL CONSTRAINTS:
1. Return ONLY the JSON code block. No introductory, conversational, or explaining text.
2. MULTIPLE TASKS PER DAY: Distribute exactly 3 to 5 tasks for each day (except for Void Days). Every day must have multiple distinct tasks covering different topics or styles (e.g. overview, exercises, theory).
3. priority must be 1 to 5. On day 6, 12, 18, 24, etc (every 6 days), inject exactly one "VOID DAY" task with priority 0, task_type "void", and no subtasks.
4. Target Language: Output all text fields (title, subtasks, notes) in the language: "${activePlanLanguage}".
`
    }

    const handleImportPlan = async () => {
        if (!title) {
            setError("Goal title is required.")
            return
        }
        if (!pastedJson.trim()) {
            setError("Please paste the generated JSON plan from the LLM.")
            return
        }

        setError(null)

        // Client-side cleaning and validation of pasted JSON
        let cleanedJson = pastedJson.trim()
        cleanedJson = cleanedJson.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '')
        cleanedJson = cleanedJson.trim()

        let parsedTasks: any[] = []
        try {
            parsedTasks = JSON.parse(cleanedJson)
            if (!Array.isArray(parsedTasks)) {
                setError("Pasted content is not a JSON array of tasks. Make sure it starts with [ and ends with ].")
                return
            }
        } catch (e: any) {
            setError("Failed to parse JSON. Please ensure the LLM output is valid JSON. Error: " + e.message)
            return
        }

        // Validate structure of parsed tasks
        for (let i = 0; i < parsedTasks.length; i++) {
            const task = parsedTasks[i]
            if (!task || typeof task !== 'object') {
                setError(`Task at index ${i} is not a valid task object.`)
                return
            }
            if (typeof task.day !== 'number') {
                setError(`Task at index ${i} is missing a numeric 'day' field.`)
                return
            }
            if (!task.title) {
                setError(`Task on day ${task.day} (index ${i}) is missing a 'title'.`)
                return
            }
            if (task.priority !== undefined && (typeof task.priority !== 'number' || task.priority < 0 || task.priority > 5)) {
                setError(`Task on day ${task.day} has an invalid priority. It must be a number between 0 and 5.`)
                return
            }
        }

        setStep('GENERATING')
        setStatusText("Importing Plan...")

        try {
            const formData = new FormData()
            formData.append('title', title)
            formData.append('duration_days', duration.toString())
            formData.append('level', level)
            formData.append('goal_intent', intent)
            formData.append('category', category)
            formData.append('daily_hours', commitment.toString())
            formData.append('language', activePlanLanguage)
            formData.append('tasks_json', cleanedJson)

            haptics.medium()
            const result = await importExternalPlan(formData)

            if (result.error) {
                setError(result.error)
                setStep('GOAL')
                return
            }

            setStep('SUCCESS')
            setStatusText("Plan Imported Successfully!")
            setTimeout(() => window.location.reload(), 2000)
        } catch (err: any) {
            setError(err.message || 'Failed to import external plan.')
            setStep('GOAL')
        }
    }

    const handleSelectCategory = (catId: string) => {
        haptics.light()
        setCategory(catId)
        const selected = CATEGORIES.find(c => c.id === catId)
        if (selected) {
            setTitle(selected.suggestedGoal)
        }
        setStep('GOAL')
    }

    const getStepIndex = () => {
        switch (step) {
            case 'CATEGORY': return 0
            case 'GOAL': return 1
            case 'COMMITMENT': return 2
            default: return 2
        }
    }

    const handleStartGeneration = async () => {
        setStep('GENERATING')
        setError(null)

        try {
            const formData = new FormData()
            formData.append('title', title)
            formData.append('duration_days', duration.toString())
            formData.append('level', level)
            formData.append('goal_intent', intent)
            formData.append('sprint_walls', JSON.stringify(sprintWalls))
            formData.append('daily_hours', commitment.toString())
            formData.append('category', category)
            formData.append('language', activePlanLanguage)

            haptics.medium()
            setStatusText(t('creator.generating'))
            const result = await createGoalBase(formData)

            if (result.error) {
                if (result.error === 'SUBSCRIBE_REQUIRED') {
                    setShowSubscribeModal(true)
                } else {
                    setError(result.error)
                }
                setStep('GOAL')
                return
            }

            const goalId = result.goalId!
            const totalMonths = Math.ceil(duration / 30)

            for (let i = 0; i < totalMonths; i++) {
                const startDay = i * 30 + 1
                const endDay = Math.min((i + 1) * 30, duration)

                setStatusText(t('creator.generating'))
                const chunkResult = await generateTasksChunk(goalId, startDay, endDay)

                if (chunkResult.error) {
                    setError(`Failed to generate Month ${i + 1}: ${chunkResult.error}`)
                    return
                }

                setProgress(Math.round(((i + 1) / totalMonths) * 100))
            }

            setCreatedGoalId(goalId)
            setStep('SUCCESS')
            setStatusText(t('creator.success'))
        } catch (err) {
            setError('A critical systems failure occurred.')
        }
    }

    if (step === 'GENERATING') {
        return (
            <div className="mb-12 glass-card rounded-3xl p-8 border border-white/10 bg-[#0B0D17]/80 backdrop-blur-3xl overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-electric-blue/10 to-neon-violet/10 pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center justify-center py-12 text-center w-full">
                    {error ? (
                        <>
                            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-6 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-black text-white mb-2 tracking-tighter uppercase italic">
                                Generation Failed
                            </h2>
                            <p className="text-gray-400 text-sm max-w-md mb-8 leading-relaxed">
                                {error}
                            </p>
                            <button
                                onClick={() => {
                                    setError(null)
                                    setStep('GOAL')
                                }}
                                className="px-6 py-3.5 rounded-xl border border-white/10 text-white bg-white/5 font-black text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-all duration-300 active:scale-95"
                            >
                                Back to Setup
                            </button>
                        </>
                    ) : (
                        <>
                            <Loader2 className="h-16 w-16 text-electric-blue animate-spin mb-6" />
                            <h2 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase italic">
                                {statusText}
                            </h2>
                            <TextTicker />
                            <div className="w-full max-w-md bg-white/5 h-2 rounded-full mt-8 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-electric-blue to-neon-violet transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(0,240,255,0.5)]"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-gray-400 mt-4 font-mono text-xs tracking-widest uppercase">
                                {progress}% Complete
                            </p>
                        </>
                    )}
                </div>
            </div>
        )
    }

    if (step === 'SUCCESS') {
        return (
            <div className="mb-12 glass-card rounded-3xl p-8 border border-white/10 bg-[#0B0D17]/80 backdrop-blur-3xl text-center py-10 flex flex-col gap-6 max-w-2xl mx-auto">
                <div>
                    <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(74,222,128,0.4)]" />
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">{t('creator.success')}</h2>
                    <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                        Your customized learning plan has been generated. You can now optionally upload study materials to ground your AI Tutor, or continue to your dashboard.
                    </p>
                </div>

                {createdGoalId && (
                    <div className="border-t border-b border-white/5 py-6 my-2 text-left">
                        <FileUploader planId={createdGoalId} maxFiles={5} />
                    </div>
                )}

                <button
                    onClick={() => window.location.reload()}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-electric-blue to-soft-cyan text-black font-black text-xs uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                >
                    Done & Go to Dashboard
                </button>
            </div>
        )
    }

    return (
        <div className="mb-12 relative group rounded-3xl glass p-[1px] overflow-hidden transition-all duration-500 hover:shadow-[0_0_60px_rgba(0,240,255,0.15)]">
            <div className="absolute inset-0 bg-gradient-to-r from-neon-violet via-electric-blue to-soft-cyan opacity-10 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none" />

            <div className="relative glass-card rounded-3xl p-6 sm:p-10 bg-[#0B0D17]/95 backdrop-blur-3xl border border-white/5">
                
                {/* Stepper Progress Bar */}
                <div className="flex items-center justify-between px-2 mb-10 relative">
                    <div className="absolute left-2 right-2 top-[18px] h-[2px] bg-white/5 -translate-y-1/2 z-0" />
                    <div 
                        className="absolute left-2 top-[18px] h-[2px] bg-gradient-to-r from-electric-blue to-neon-violet -translate-y-1/2 z-0 transition-all duration-500 ease-out"
                        style={{ width: `${(getStepIndex() / 2) * 94}%` }}
                    />
                    {[t('creator.step_category') || 'Category', t('creator.step_configure') || 'Configure', t('creator.step_commit') || 'Commit'].map((label, idx) => {
                        const isCompleted = getStepIndex() > idx
                        const isActive = getStepIndex() === idx
                        return (
                            <div key={idx} className="relative z-10 flex flex-col items-center w-20 sm:w-32">
                                <button 
                                    disabled={idx > getStepIndex()}
                                    onClick={() => {
                                        haptics.light()
                                        if (idx === 0) setStep('CATEGORY')
                                        if (idx === 1) setStep('GOAL')
                                        if (idx === 2) setStep('COMMITMENT')
                                    }}
                                    className={`h-9 w-9 rounded-full flex items-center justify-center border font-mono text-[10px] font-black transition-all duration-300 pointer-events-auto active:scale-95 disabled:pointer-events-none ${
                                        isCompleted 
                                            ? 'bg-gradient-to-r from-electric-blue to-neon-violet border-transparent text-white shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer' 
                                            : isActive 
                                                ? 'bg-[#0B0D17] border-electric-blue text-electric-blue shadow-[0_0_15px_rgba(0,240,255,0.2)] scale-110' 
                                                : 'bg-[#0B0D17] border-white/10 text-gray-500'
                                    }`}
                                >
                                    {isCompleted ? '✓' : `0${idx + 1}`}
                                </button>
                                <span className={`w-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest mt-2.5 text-center break-all sm:break-normal leading-normal transition-colors duration-300 ${
                                    isActive ? 'text-electric-blue' : isCompleted ? 'text-white' : 'text-gray-500'
                                }`}>
                                    {label}
                                </span>
                            </div>
                        )
                    })}
                </div>

                {error && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-mono flex items-center gap-3">
                        <Zap className="h-4 w-4" />
                        {error}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {step === 'CATEGORY' && (
                        <motion.div
                            key="category"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-12 w-12 rounded-2xl bg-[#00F0FF]/20 flex items-center justify-center border border-[#00F0FF]/30 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                                    <Sparkles className="h-6 w-6 text-[#00F0FF]" />
                                </div>
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-white uppercase italic">
                                        {t('creator.title')}
                                    </h2>
                                    <p className="text-xs text-gray-500 font-mono tracking-widest uppercase">{t('creator.subtitle')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 max-w-3xl mx-auto pt-2">
                                {CATEGORIES.map((cat) => {
                                    const Icon = cat.icon
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleSelectCategory(cat.id)}
                                            className={`relative flex flex-col items-center text-center px-2 py-4 sm:p-4 rounded-2xl border transition-all duration-300 pointer-events-auto active:scale-95 group/card bg-[#121626]/30 hover:bg-[#121626]/60 min-h-[120px] justify-center ${cat.color} ${cat.shadow}`}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br rounded-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                            <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${cat.bgColor} border border-white/5`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-white mb-1 group-hover/card:text-electric-blue transition-colors break-words leading-tight px-1 text-center">
                                                {t(`categories.${cat.id}.name`)}
                                            </h3>
                                            <p className="text-[10px] text-gray-500 leading-tight group-hover/card:text-gray-400 transition-colors">
                                                {t(`categories.${cat.id}.desc`)}
                                            </p>
                                        </button>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}

                    {step === 'GOAL' && (
                        <motion.div
                            key="goal"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-4 mb-4 justify-between">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => { haptics.light(); setStep('CATEGORY') }}
                                        className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-all pointer-events-auto"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <div>
                                        <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-white uppercase italic">
                                            {t('creator.title')}
                                        </h2>
                                        <p className="text-xs text-gray-500 font-mono tracking-widest uppercase">{t('creator.subtitle')}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-black font-mono bg-electric-blue/10 border border-electric-blue/20 text-electric-blue px-3 py-1.5 rounded-full uppercase tracking-wider">
                                    {t(`categories.${category}.name`)}
                                </span>
                            </div>

                            {/* Creation Mode Toggle */}
                            <div className="flex gap-2 p-1.5 bg-white/5 border border-white/5 rounded-2xl">
                                <button
                                    onClick={() => { haptics.light(); setCreationMode('ai') }}
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                                        creationMode === 'ai'
                                            ? 'bg-gradient-to-r from-electric-blue to-neon-violet text-white shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    AI Generator
                                </button>
                                <button
                                    onClick={() => { haptics.light(); setCreationMode('import') }}
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                                        creationMode === 'import'
                                            ? 'bg-gradient-to-r from-electric-blue to-neon-violet text-white shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Free LLM Import
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('creator.objective')}</label>
                                    <input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. OBJECTIVE"
                                        className="w-full bg-[#121626]/50 border border-white/5 rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:border-electric-blue focus:outline-none focus:ring-1 focus:ring-electric-blue/50 transition-all font-bold tracking-tight text-base sm:text-lg"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('creator.duration')}</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="90"
                                            value={duration}
                                            onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                                            className="w-full bg-[#121626]/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-electric-blue focus:outline-none transition-all font-mono font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('creator.intent')}</label>
                                        <div className="relative">
                                            <select
                                                value={intent}
                                                onChange={(e) => setIntent(e.target.value as any)}
                                                className="w-full bg-[#121626]/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-electric-blue focus:outline-none transition-all font-bold appearance-none cursor-pointer"
                                            >
                                                <option value="Exam">{t('creator.intent_exam')}</option>
                                                <option value="Level Up">{t('creator.intent_mastery')}</option>
                                                <option value="Intro">{t('creator.intent_intro')}</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('creator.initial_level')}</label>
                                        <div className="relative">
                                            <select
                                                value={level}
                                                onChange={(e) => setLevel(e.target.value)}
                                                className="w-full bg-[#121626]/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-electric-blue focus:outline-none transition-all font-bold appearance-none cursor-pointer"
                                            >
                                                <option>Beginner</option>
                                                <option>Intermediate</option>
                                                <option>Advanced</option>
                                            </select>
                                        </div>
                                    </div>

                                    {creationMode === 'import' && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Study Commitment</label>
                                            <div className="relative">
                                                <select
                                                    value={commitment}
                                                    onChange={(e) => setCommitment(parseInt(e.target.value) || 2)}
                                                    className="w-full bg-[#121626]/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-electric-blue focus:outline-none transition-all font-bold appearance-none cursor-pointer"
                                                >
                                                    <option value={1}>1H / Day</option>
                                                    <option value={2}>2H / Day</option>
                                                    <option value={4}>4H / Day</option>
                                                    <option value={6}>6H / Day</option>
                                                    <option value={8}>8H / Day</option>
                                                    <option value={12}>12H / Day (God Mode)</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {creationMode === 'ai' ? (
                                    <>
                                        {/* Sprint Walls / Milestones */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('creator.milestones')}</label>
                                            <div className="space-y-2">
                                                {sprintWalls.map((wall, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center">
                                                        <input
                                                            type="date"
                                                            value={wall.date}
                                                            readOnly
                                                            className="bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white flex-1"
                                                        />
                                                        <span className="text-xs text-gray-400 flex-1 truncate">{wall.label}</span>
                                                        <button
                                                            onClick={() => setSprintWalls(sprintWalls.filter((_, i) => i !== idx))}
                                                            className="p-2 hover:text-red-400 transition-colors cursor-pointer text-lg font-bold pointer-events-auto"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => {
                                                        const date = prompt("Milestone Date (YYYY-MM-DD):");
                                                        const label = prompt("Milestone Label (e.g. Midterm Exam):");
                                                        if (date && label) setSprintWalls([...sprintWalls, { date, label }]);
                                                    }}
                                                    className="w-full py-3 rounded-xl border border-dashed border-white/10 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:border-electric-blue/30 hover:text-electric-blue transition-all cursor-pointer pointer-events-auto"
                                                >
                                                    {t('creator.add_milestone')}
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => title && setStep('COMMITMENT')}
                                            disabled={!title}
                                            className="group/btn flex items-center justify-center gap-3 w-full rounded-2xl bg-white text-black py-4.5 font-black text-sm tracking-widest uppercase transition-all hover:bg-electric-blue hover:text-white shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-[0.98] disabled:opacity-30 disabled:grayscale pointer-events-auto cursor-pointer"
                                        >
                                            <span>{t('creator.button_next')}</span>
                                            <Rocket className="h-5 w-5 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {/* External Import UI Details */}
                                        <div className="bg-[#181D30]/40 border border-white/5 rounded-2xl p-5 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-white text-xs font-black uppercase tracking-wider">Step 1: Copy Generation Prompt</h3>
                                                    <p className="text-gray-400 text-[10px] leading-relaxed mt-1">Copy this prompt, paste it into ChatGPT/Claude to generate the plan structure for free, then return here.</p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        haptics.medium()
                                                        navigator.clipboard.writeText(getCopyPrompt())
                                                        setCopyFeedback(true)
                                                        setTimeout(() => setCopyFeedback(false), 2000)
                                                    }}
                                                    className="shrink-0 flex items-center gap-1.5 bg-electric-blue/10 border border-electric-blue/20 text-electric-blue hover:bg-electric-blue hover:text-white text-[10px] font-black tracking-wider uppercase px-3.5 py-2 rounded-xl transition-all cursor-pointer pointer-events-auto active:scale-95"
                                                >
                                                    <Copy className="h-3 w-3" />
                                                    {copyFeedback ? "Copied!" : "Copy"}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Step 2: Paste Generated JSON</label>
                                            <textarea
                                                value={pastedJson}
                                                onChange={(e) => setPastedJson(e.target.value)}
                                                placeholder="Paste the raw JSON block starting with [ and ending with ] ..."
                                                rows={5}
                                                className="w-full bg-[#121626]/50 border border-white/5 rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:border-electric-blue focus:outline-none transition-all font-mono text-xs leading-relaxed"
                                            />
                                        </div>

                                        <button
                                            onClick={handleImportPlan}
                                            disabled={!title || !pastedJson.trim()}
                                            className="group/btn flex items-center justify-center gap-3 w-full rounded-2xl bg-white text-black py-4.5 font-black text-sm tracking-widest uppercase transition-all hover:bg-electric-blue hover:text-white shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-[0.98] disabled:opacity-30 disabled:grayscale pointer-events-auto cursor-pointer"
                                        >
                                            <span>Import Learning Plan</span>
                                            <Rocket className="h-5 w-5 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {step === 'COMMITMENT' && (
                        <motion.div
                            key="commitment"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <button
                                    onClick={() => { haptics.light(); setStep('GOAL') }}
                                    className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-all pointer-events-auto"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-white uppercase italic">
                                        {t('creator.commitment_title')}
                                    </h2>
                                    <p className="text-xs text-gray-500 font-mono tracking-widest uppercase">{t('creator.commitment_subtitle')}</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 italic text-gray-400 text-sm leading-relaxed">
                                    {t('creator.commitment_desc')}
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('creator.daily_limit')}</label>
                                            <span className="text-2xl font-black text-electric-blue italic">{commitment}H</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="12"
                                            value={commitment}
                                            onChange={(e) => setCommitment(parseInt(e.target.value))}
                                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-electric-blue pointer-events-auto"
                                        />
                                        <div className="flex justify-between text-[8px] text-gray-600 font-mono">
                                            <span>1H (CAUSAL)</span>
                                            <span>12H (GOD MODE)</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 shrink-0">Understanding Check</label>
                                        <div className="flex items-center gap-3 p-5 rounded-2xl bg-white/5 border border-white/5">
                                            <Clock className="h-5 w-5 text-neon-violet shrink-0" />
                                            <p className="text-xs text-gray-300">{t('creator.check_desc')}</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleStartGeneration}
                                    className="group/btn flex items-center justify-center gap-3 w-full rounded-2xl bg-electric-blue py-5.5 font-black text-lg tracking-tighter uppercase transition-all shadow-[0_0_40px_rgba(0,240,255,0.3)] hover:scale-[1.02] active:scale-[0.98] text-white pointer-events-auto cursor-pointer"
                                >
                                    <span>{t('creator.button_generate')}</span>
                                    <Zap className="h-6 w-6 animate-pulse" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <SubscribeModal 
                isOpen={showSubscribeModal}
                onClose={() => setShowSubscribeModal(false)}
            />
        </div>
    )
}
