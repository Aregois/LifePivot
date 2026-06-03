'use client'

import { useState, useEffect, useRef, useTransition, useCallback } from 'react'
import type { PanInfo } from 'framer-motion'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    X, Play, Pause, RotateCcw, CheckCircle2, Plus, Diamond, 
    HelpCircle, MessageSquare, Loader2, Volume2, VolumeX, Cloud, Waves,
    BookOpen, Edit3, Clock, CheckSquare, Square, ShieldAlert,
    ExternalLink, Check, Headphones, Flame, Sparkles, Coffee, Leaf
} from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { 
    completeTaskFocusMode, generateHint, saveTaskNotes, 
    saveTaskReflection, fetchTaskResources, submitActiveRecallAnswer, 
    toggleSubtask 
} from '@/app/actions'
import { speakText, stopSpeaking } from '@/utils/tts'
import { FocusChat } from './focus-chat'
import { DesktopTutorPanel } from './desktop-tutor-panel'
import { useEconomy } from './economy-provider'
import type { Task, Subtask } from '@/utils/types'
import { SocraticMicroDrills } from './socratic-micro-drills'

type FocusState = 'idle' | 'running' | 'paused' | 'drill' | 'finished'
type TabType = 'timer' | 'notes' | 'resources'
import { useAmbientSynth } from './use-ambient-synth'
import type { SoundType } from './use-ambient-synth'

const GEM_REWARD: Record<number, number> = { 0: 0, 1: 1, 2: 1, 3: 1, 4: 2, 5: 3 }
const ADD_TIME_SECONDS = 300 // 5 minutes

interface FocusModeOverlayProps {
    task: Task
    goalTitle: string
    onClose: () => void
    onOptimisticGemUpdate: (delta: number) => void
    onTaskUpdate?: (updatedTask: Task) => void
}

export function FocusModeOverlay({ task, goalTitle, onClose, onOptimisticGemUpdate, onTaskUpdate }: FocusModeOverlayProps) {
    const { activeChatTask, setActiveChatTask } = useEconomy()
    const [mounted, setMounted] = useState(false)
    const [activeTab, setActiveTab] = useState<TabType>('timer')

    const checkAndRegisterCircadianKey = () => {
        if (typeof window === 'undefined') return
        const hour = new Date().getHours()
        const today = new Date().toDateString()
        if (hour >= 6 && hour < 11) {
            localStorage.setItem('lifepivot_dawn_key', 'true')
            localStorage.setItem('lifepivot_dawn_key_date', today)
        } else if (hour >= 18 && hour < 22) {
            localStorage.setItem('lifepivot_dusk_key', 'true')
            localStorage.setItem('lifepivot_dusk_key_date', today)
        }
    }


    useEffect(() => {
        if (task) {
            setActiveChatTask(task)
        }
    }, [task, setActiveChatTask])
    
    // Timer states
    const [totalSeconds, setTotalSeconds] = useState((task.duration_mins ?? 30) * 60)
    const [state, setState] = useState<FocusState>('idle')
    const [remaining, setRemaining] = useState((task.duration_mins ?? 30) * 60)
    const [persona, setPersona] = useState<string>('feynman')
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Subtasks states
    const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(task.subtasks ?? [])

    // Notes states
    const [notes, setNotes] = useState(task.notes ?? '')
    const hasUserEditedNotes = useRef(false)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

    // Ambient noise states
    const [sound, setSound] = useState<SoundType>('none')
    const [volume, setVolume] = useState(0.4)
    const { startSound, stopSound, setVolume: setSynthVolume } = useAmbientSynth()
    const [unlockedSoundscapes, setUnlockedSoundscapes] = useState<string[]>(['none', 'space', 'rain', 'binaural'])

    // Resources states
    const [resources, setResources] = useState<any[]>(task.resources ?? [])
    const [resourcesLoading, setResourcesLoading] = useState(false)

    // Socratic recall states
    const [reflection, setReflection] = useState(task.reflection ?? '')
    const [quizSubmitted, setQuizSubmitted] = useState(false)
    const [quizLoading, setQuizLoading] = useState(false)
    const [quizFeedback, setQuizFeedback] = useState<string | null>(null)
    const [quizResult, setQuizResult] = useState<'Pass' | 'Needs Work' | null>(null)
    const [earnedGems, setEarnedGems] = useState<number | null>(null)
    const [earnedXp, setEarnedXp] = useState<number | null>(null)
    const [didLevelUp, setDidLevelUp] = useState(false)
    const [leveledUpTo, setLeveledUpTo] = useState<number>(1)

    // General Socratic Chat & Hints states
    const [showChat, setShowChat] = useState(false)
    const [hint, setHint] = useState<string | null>(null)
    const [hintError, setHintError] = useState<string | null>(null)
    const [hintLoading, setHintLoading] = useState(false)
    const [hintOpen, setHintOpen] = useState(false)
    const [isSpeakingHint, setIsSpeakingHint] = useState(false)
    const [activeSubtask, setActiveSubtask] = useState<Subtask | null>(null)
    
    const [isPending, startTransition] = useTransition()



    const [isDesktop, setIsDesktop] = useState(false)

    // Mount guard for SSR-safe portal & preferences initialization
    useEffect(() => {
        setMounted(true)
        setIsDesktop(window.innerWidth >= 1024)
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024)
        window.addEventListener('resize', handleResize)

        // Read user preferences
        const prefDuration = Number(localStorage.getItem('lifepivot_duration') || (task.duration_mins ?? 30))
        const prefSeconds = prefDuration * 60
        setTotalSeconds(prefSeconds)
        setRemaining(prefSeconds)

        const prefSoundscape = (localStorage.getItem('lifepivot_soundscape') as SoundType) || 'none'
        setSound(prefSoundscape)

        const unlockedSounds = JSON.parse(localStorage.getItem('lifepivot_unlocked_soundscapes') || '["none", "space", "rain", "binaural"]')
        setUnlockedSoundscapes(unlockedSounds)

        const prefPersona = localStorage.getItem('lifepivot_persona') || 'feynman'
        setPersona(prefPersona)

        return () => {
            stopSpeaking()
            window.removeEventListener('resize', handleResize)
        }
    }, [task.duration_mins])

    // Escape key handler
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Debounce save notes (only when user has actually edited)
    useEffect(() => {
        if (!mounted || !hasUserEditedNotes.current || (state !== 'running' && state !== 'paused' && state !== 'idle')) return
        setSaveStatus('saving')
        const timer = setTimeout(async () => {
            await saveTaskNotes(task.id, notes)
            setSaveStatus('saved')
            setTimeout(() => setSaveStatus('idle'), 1500)
        }, 1000)
        return () => clearTimeout(timer)
    }, [notes])

    // Fetch resources if none cached on select
    useEffect(() => {
        if (activeTab === 'resources' && resources.length === 0) {
            setResourcesLoading(true)
            startTransition(async () => {
                const res = await fetchTaskResources(task.id)
                if (res && 'resources' in res && res.resources) {
                    setResources(res.resources)
                }
                setResourcesLoading(false)
            })
        }
    }, [activeTab])

    // Timer tick
    useEffect(() => {
        if (state === 'running') {
            intervalRef.current = setInterval(() => {
                setRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current!)
                        setState('drill')
                        haptics.medium()
                        stopSound()
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    }, [state])

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value)
        setVolume(val)
        setSynthVolume(val)
    }

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0')
        const s = (secs % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    const radius = 80
    const circumference = 2 * Math.PI * radius
    const clampedProgress = state === 'idle' ? 1 : Math.max(0, Math.min(1, remaining / totalSeconds))
    const dashOffset = circumference * (1 - clampedProgress)

    const timerColor = clampedProgress > 0.4 ? 'var(--color-electric-blue)' : clampedProgress > 0.2 ? '#f97316' : '#ef4444'

    const handleSubtaskToggle = async (subtask: Subtask) => {
        if (state === 'finished') return
        haptics.light()
        const newCompleted = !subtask.completed
        setLocalSubtasks(prev => prev.map(s => s.id === subtask.id ? { ...s, completed: newCompleted } : s))
        await toggleSubtask(task.id, subtask.id, newCompleted)
    }

    const handleAlreadyDone = () => {
        haptics.medium()
        setState('drill') // Route to verification drills!
    }

    const handleClaimBaseRewardOnly = () => {
        haptics.medium()
        // Claim the focus reward without active recall Socratic quiz (e.g. skips bonus gems)
        const baseGemReward = GEM_REWARD[task.priority] ?? 1
        const isFullTimer = remaining === 0
        const gemAwarded = state === 'finished' && isFullTimer ? baseGemReward * 2 : baseGemReward
        
        onOptimisticGemUpdate(gemAwarded)
        checkAndRegisterCircadianKey()

        const isCatalystActive = (() => {
            if (typeof window === 'undefined') return false
            const end = localStorage.getItem('lifepivot_chest_multiplier_end')
            if (!end) return false
            return Date.now() < Number(end)
        })()

        startTransition(async () => {
            await completeTaskFocusMode(task.id, isFullTimer, isCatalystActive)
            onTaskUpdate?.({
                ...task,
                notes,
                resources,
                reflection,
                subtasks: localSubtasks,
                status: 'completed'
            })
            onClose()
        })
    }

    const handleSubmitQuiz = () => {
        if (!reflection.trim() || quizLoading) return
        haptics.medium()
        setQuizLoading(true)
        setQuizFeedback(null)

        const isCatalystActive = (() => {
            if (typeof window === 'undefined') return false
            const end = localStorage.getItem('lifepivot_chest_multiplier_end')
            if (!end) return false
            return Date.now() < Number(end)
        })()

        checkAndRegisterCircadianKey()

        startTransition(async () => {
            // Save reflection text first
            await saveTaskReflection(task.id, reflection)

            const evaluation = await submitActiveRecallAnswer(task.id, reflection, persona)
            setQuizLoading(false)

            if ('error' in evaluation && evaluation.error) {
                setQuizFeedback('Could not check answer. Try again.')
                return
            }

            setQuizFeedback(evaluation.feedback ?? null)
            setQuizResult(evaluation.rating as 'Pass' | 'Needs Work' | null)

            if (evaluation.rating === 'Pass') {
                haptics.medium()
                
                const evaluationGems = evaluation.gemsAwarded ?? 2
                const evaluationXp = evaluation.xpAwarded ?? 30
                const finalEvalGems = isCatalystActive ? evaluationGems * 2 : evaluationGems
                const finalEvalXp = isCatalystActive ? evaluationXp * 2 : evaluationXp

                setEarnedGems(finalEvalGems)
                setEarnedXp(finalEvalXp)
                if (evaluation.leveledUp) {
                    setDidLevelUp(true)
                    setLeveledUpTo(evaluation.newLevel ?? 2)
                }

                // Award client state updates optimistically (the Socratic Quiz base actions were already recorded)
                onOptimisticGemUpdate(finalEvalGems)
                
                // Complete the standard focus mode as well to get base focus gems
                const baseGemReward = GEM_REWARD[task.priority] ?? 1
                const isFullTimer = remaining === 0
                const focusGemAward = isFullTimer ? baseGemReward * 2 : baseGemReward
                const finalFocusGems = isCatalystActive ? focusGemAward * 2 : focusGemAward
                onOptimisticGemUpdate(finalFocusGems)
                await completeTaskFocusMode(task.id, isFullTimer, isCatalystActive)
            } else {
                haptics.error()
            }
        })
    }

    const handleAddTime = () => {
        haptics.light()
        setRemaining(prev => prev + ADD_TIME_SECONDS)
        setState('running')
        if (sound !== 'none') {
            startSound(sound, volume)
        }
    }

    const handleToggleSpeech = useCallback(() => {
        if (!hint) return
        if (isSpeakingHint) {
            stopSpeaking()
            setIsSpeakingHint(false)
        } else {
            speakText(
                hint,
                () => setIsSpeakingHint(true),
                () => setIsSpeakingHint(false),
                () => setIsSpeakingHint(false)
            )
        }
    }, [hint, isSpeakingHint])

    const handleStuck = useCallback(async () => {
        if (hintLoading) return
        haptics.light()
        setHintError(null)
        if (hint) { setHintOpen(true); return }
        setHintLoading(true)
        const result = await generateHint(task.id, activeSubtask?.title)
        setHintLoading(false)
        if ('error' in result && result.error) {
            setHintError('Could not generate hint. Try again.')
            return
        }
        setHint(result.hint ?? null)
        setHintOpen(true)
    }, [hint, hintLoading, task.id, activeSubtask])

    const priorityLabel: Record<number, string> = { 0: 'VOID', 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4 HARD', 5: 'P5 DEEP THEORY' }
    const priorityColor: Record<number, string> = { 0: 'text-soft-cyan', 1: 'text-gray-400', 2: 'text-blue-400', 3: 'text-yellow-500', 4: 'text-orange-500', 5: 'text-red-500' }
    const priorityClasses: Record<number, string> = {
        0: 'text-soft-cyan border-soft-cyan/20 bg-soft-cyan/5',
        1: 'text-gray-400 border-white/10 bg-white/5',
        2: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
        3: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5',
        4: 'text-orange-500 border-orange-500/20 bg-orange-500/5',
        5: 'text-red-500 border-red-500/20 bg-red-500/5'
    }

    if (!mounted) return null

    const overlay = (
        <AnimatePresence>
            {showChat && (
                <FocusChat
                    key="focus-chat-overlay"
                    task={task}
                    goalTitle={goalTitle}
                    activeSubtaskTitle={activeSubtask?.title}
                    onClose={() => setShowChat(false)}
                    persona={persona}
                />
            )}

            {hintOpen && hint && (
                <motion.div
                    key="focus-hint-modal"
                    className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="bg-gradient-to-br from-[#121626]/95 to-[#080a12]/95 border border-white/10 rounded-[2.5rem] max-w-lg w-full p-8 shadow-2xl relative overflow-hidden flex flex-col gap-6"
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    >
                        {/* Glow effect */}
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-neon-violet/20 rounded-full blur-3xl pointer-events-none" />

                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 border border-primary/20 text-primary rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                                    <Sparkles className="h-5 w-5 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Socratic Reflection Hint</h3>
                                    {activeSubtask && (
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mt-0.5 truncate max-w-[280px]">
                                            For: {activeSubtask.title}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    haptics.light()
                                    setHintOpen(false)
                                    stopSpeaking()
                                    setIsSpeakingHint(false)
                                }}
                                className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Hint Content Text */}
                        <div className="relative z-10 text-center py-2 flex-1 overflow-y-auto no-scrollbar max-h-[250px]">
                            <p className="text-base text-gray-200 font-medium italic leading-relaxed font-sans px-4">
                                "{hint}"
                            </p>
                        </div>

                        {/* Text-to-speech audio control card */}
                        <div className="bg-black/40 border border-white/5 rounded-3xl p-5 relative z-10 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => {
                                        haptics.light()
                                        handleToggleSpeech()
                                    }}
                                    className={`px-5 py-3 rounded-2xl border flex items-center gap-2.5 transition-all text-xs font-black uppercase tracking-wider ${
                                        isSpeakingHint
                                            ? 'bg-neon-violet/10 border-neon-violet/30 text-neon-violet shadow-[0_0_15px_rgba(189,0,255,0.15)]'
                                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {isSpeakingHint ? (
                                        <>
                                            <VolumeX className="h-4 w-4" />
                                            Stop Reading
                                        </>
                                    ) : (
                                        <>
                                            <Volume2 className="h-4 w-4" />
                                            Read Aloud
                                        </>
                                    )}
                                </button>

                                {/* Waveform animation */}
                                {isSpeakingHint ? (
                                    <div className="flex items-end gap-1 h-6 pr-2">
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => {
                                            const delay = (bar % 3) * 0.15;
                                            return (
                                                <motion.div
                                                    key={bar}
                                                    className="w-1 bg-neon-violet rounded-full"
                                                    style={{ height: '4px' }}
                                                    animate={{
                                                        height: ['4px', '24px', '4px'],
                                                    }}
                                                    transition={{
                                                        duration: 0.8,
                                                        repeat: Infinity,
                                                        delay: delay,
                                                        ease: 'easeInOut',
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold uppercase tracking-wider pr-2">
                                        <Volume2 className="h-3.5 w-3.5" />
                                        Audio Ready
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-2.5 relative z-10">
                            <button
                                onClick={() => {
                                    haptics.medium()
                                    setHintOpen(false)
                                    stopSpeaking()
                                    setIsSpeakingHint(false)
                                }}
                                className="w-full py-4 rounded-2xl text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                                style={{ background: timerColor }}
                            >
                                Got it, continuing
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            <motion.div
                key="focus-main-overlay"
                className="fixed bg-[#050508] flex flex-col overflow-hidden text-white border-t border-white/5"
                style={{ 
                    paddingTop: 'env(safe-area-inset-top, 0px)',
                    top: '0px',
                    left: isDesktop ? '256px' : '0px',
                    right: '0px',
                    bottom: '0px',
                    zIndex: isDesktop ? 110 : 500
                }}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 32, mass: 0.9 }}
                drag={isDesktop ? false : 'y'}
                dragConstraints={{ top: 0 }}
                dragElastic={0.2}
                onDragEnd={(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => { if (info.offset.y > 100) onClose(); }}
            >

                {/* Background Ambient Glows */}
                <div className="pointer-events-none absolute top-1/4 right-0 h-96 w-96 translate-x-1/2 rounded-full bg-electric-blue opacity-[0.06] blur-[120px] transition-all duration-1000" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 -translate-x-1/2 rounded-full bg-neon-violet opacity-[0.06] blur-[120px] transition-all duration-1000" />

                {/* Ambient glow */}
                <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[70vw] h-[35vh] rounded-full blur-[100px] opacity-[0.08] transition-colors duration-1000"
                    style={{ background: state === 'finished' ? '#10b981' : timerColor }} />

                {isDesktop ? (
                    /* ──── WIDESCREEN DESKTOP VIEW ──── */
                    <div className="flex-1 h-full flex flex-col lg:flex-row overflow-hidden relative">
                        {/* Center Workspace */}
                        <div className="flex-1 h-full flex flex-col p-8 overflow-hidden relative min-w-0 lg:mr-80">
                            
                            {/* Background Ambient Glow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

                            {/* Header Row: Tab Selector & Close Button */}
                            <div className="relative flex items-center justify-center w-full mb-6 shrink-0 z-20">
                                {state !== 'finished' ? (
                                    <div className="flex bg-black/30 p-1 rounded-2xl border border-white/5 w-full max-w-[320px] xl:max-w-[380px]">
                                        <button
                                            onClick={() => { haptics.light(); setActiveTab('timer') }}
                                            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border ${
                                                activeTab === 'timer' 
                                                    ? 'bg-primary/10 border-primary/20 text-primary shadow-lg' 
                                                    : 'text-gray-500 hover:text-gray-300 border-transparent'
                                            }`}
                                        >
                                            <Clock className="h-3.5 w-3.5" />
                                            Focus
                                        </button>
                                        <button
                                            onClick={() => { haptics.light(); setActiveTab('notes') }}
                                            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 relative border ${
                                                activeTab === 'notes' 
                                                    ? 'bg-primary/10 border-primary/20 text-primary shadow-lg' 
                                                    : 'text-gray-500 hover:text-gray-300 border-transparent'
                                            }`}
                                        >
                                            <Edit3 className="h-3.5 w-3.5" />
                                            Notes
                                            {saveStatus !== 'idle' && (
                                                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => { haptics.light(); setActiveTab('resources') }}
                                            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border ${
                                                activeTab === 'resources' 
                                                    ? 'bg-primary/10 border-primary/20 text-primary shadow-lg' 
                                                    : 'text-gray-500 hover:text-gray-300 border-transparent'
                                            }`}
                                        >
                                            <BookOpen className="h-3.5 w-3.5" />
                                            Sources
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                                            Session Completed
                                        </span>
                                    </div>
                                )}

                                {/* Exit Button */}
                                <button 
                                    onClick={() => {
                                        stopSound()
                                        onTaskUpdate?.({
                                            ...task,
                                            notes,
                                            resources,
                                            reflection,
                                            subtasks: localSubtasks,
                                        })
                                        onClose()
                                    }}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 h-9 px-3 xl:px-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all z-20"
                                >
                                    <X className="h-4 w-4" />
                                    <span className="hidden xl:inline">Exit Focus</span>
                                </button>
                            </div>

                            {/* Desktop Content Body - Now Scrollable */}
                            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center w-full min-h-0 relative z-10 pb-6">
                                
                                {state !== 'finished' && state !== 'drill' ? (
                                    <>
                                        {/* ──── DESKTOP TIMER TAB ──── */}
                                        {activeTab === 'timer' && (
                                            <div className="w-full flex-1 flex flex-col items-center justify-center min-h-full">
                                                <div className="flex flex-col items-center gap-6 w-full py-4 shrink-0">
                                                    {/* Task Title & Goal */}
                                                    <div className="text-center mb-2 z-10 px-4 max-w-2xl">
                                                        <h2 className="font-display-xl text-3xl font-black text-white mb-1.5 leading-tight">{task.title}</h2>
                                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{goalTitle}</p>
                                                    </div>

                                                    {/* Large 320px Timer Ring */}
                                                    <button 
                                                        onClick={() => {
                                                            haptics.medium();
                                                            if (state === 'running') {
                                                                setState('paused');
                                                                stopSound();
                                                            } else if (state === 'paused') {
                                                                setState('running');
                                                                if (sound !== 'none') startSound(sound, volume);
                                                            } else if (state === 'idle') {
                                                                setState('running');
                                                            }
                                                        }}
                                                        className="timer-ring relative flex items-center justify-center rounded-full group cursor-pointer active:scale-98 transition-transform select-none focus:outline-none"
                                                        style={{
                                                            width: '320px',
                                                            height: '320px',
                                                            background: `conic-gradient(from 0deg, ${timerColor} ${clampedProgress * 360}deg, rgba(166, 200, 255, 0.05) ${clampedProgress * 360}deg)`,
                                                            boxShadow: `0 0 40px ${timerColor}20, inset 0 0 40px ${timerColor}20`
                                                        }}
                                                    >
                                                        {/* Inner circle mask */}
                                                        <div className="absolute inset-[12px] rounded-full bg-[#0a0e1a] z-10" />

                                                        {/* Hover state overlay */}
                                                        <div className="absolute inset-[12px] rounded-full bg-black/40 opacity-0 group-hover:opacity-100 z-15 flex items-center justify-center transition-opacity duration-200">
                                                            {state === 'running' ? (
                                                                <Pause className="h-10 w-10 text-white fill-white" />
                                                            ) : (
                                                                <Play className="h-10 w-10 text-white fill-white" />
                                                            )}
                                                        </div>

                                                        {/* Timer text content */}
                                                        <div className="timer-content relative z-20 text-center">
                                                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.25em] mb-1.5 block">
                                                                {state === 'idle' ? 'Ready' : state === 'paused' ? 'Paused' : 'Focusing'}
                                                            </span>
                                                            <div className="font-display-xl text-[64px] font-black text-primary leading-none tracking-tighter" style={{ textShadow: `0 0 15px ${timerColor}60` }}>
                                                                {formatTime(remaining)}
                                                            </div>
                                                            <span className="text-[9px] text-gray-600 mt-2 font-semibold uppercase tracking-wider block">
                                                                {task.duration_mins ?? 30} min session
                                                            </span>
                                                        </div>
                                                    </button>

                                                    {/* Action Buttons Row */}
                                                    <div className="flex gap-4 z-10 mt-2">
                                                        {/* Stuck button */}
                                                        <button 
                                                            onClick={handleStuck}
                                                            disabled={hintLoading}
                                                            className="bg-[#161b2e]/40 backdrop-blur-[12px] border border-white/10 bg-gradient-to-br from-white/5 to-transparent px-8 py-4 rounded-xl flex items-center gap-3 text-white hover:bg-white/5 active:scale-95 transition-all disabled:opacity-40"
                                                        >
                                                            {hintLoading ? (
                                                                <Loader2 className="h-5 w-5 text-tertiary animate-spin" />
                                                            ) : (
                                                                <HelpCircle className="h-5 w-5 text-tertiary" />
                                                            )}
                                                            <span className="text-sm font-bold text-gray-200">I'm Stuck</span>
                                                        </button>

                                                        {/* Ask Nexus button */}
                                                        <button 
                                                            onClick={() => {
                                                                haptics.light();
                                                                window.dispatchEvent(new CustomEvent('focus-tutor-input'));
                                                            }}
                                                            className="bg-[#161b2e]/40 backdrop-blur-[12px] border border-primary/20 bg-gradient-to-br from-white/5 to-transparent px-8 py-4 rounded-xl flex items-center gap-3 text-white hover:bg-white/5 active:scale-95 transition-all"
                                                        >
                                                            <MessageSquare className="h-5 w-5 text-primary" />
                                                            <span className="text-sm font-bold text-gray-200">Ask Nexus</span>
                                                        </button>
                                                    </div>

                                                    {/* Secondary control row (Start, Pause, Resume, Abort) */}
                                                    <div className="flex gap-3 z-10 w-full max-w-sm mt-1 justify-center">
                                                        {state === 'idle' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => { haptics.medium(); setState('running') }}
                                                                    className="flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider text-black hover:opacity-90 active:scale-[0.98] transition-all"
                                                                    style={{ 
                                                                        background: timerColor, 
                                                                        boxShadow: `0 0 20px ${timerColor}40`
                                                                    }}
                                                                >
                                                                    Start Focus Session
                                                                </button>
                                                                <button 
                                                                    onClick={handleAlreadyDone} 
                                                                    disabled={isPending}
                                                                    className="px-4 rounded-xl font-bold text-xs text-gray-400 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                                                                >
                                                                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Skip Timer'}
                                                                </button>
                                                            </>
                                                        )}

                                                        {state === 'running' && (
                                                            <button 
                                                                onClick={() => { haptics.light(); setState('paused'); stopSound() }}
                                                                className="w-40 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <Pause className="h-3.5 w-3.5" /> Pause Session
                                                            </button>
                                                        )}

                                                        {state === 'paused' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => { haptics.medium(); setState('running'); if (sound !== 'none') startSound(sound, volume) }}
                                                                    className="flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider text-black hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                                                    style={{ background: timerColor }}
                                                                >
                                                                    <Play className="h-3.5 w-3.5 fill-black" /> Resume
                                                                </button>
                                                                <button 
                                                                    onClick={() => { 
                                                                        stopSound(); 
                                                                        onTaskUpdate?.({
                                                                            ...task,
                                                                            notes,
                                                                            resources,
                                                                            reflection,
                                                                            subtasks: localSubtasks,
                                                                        })
                                                                        onClose() 
                                                                    }}
                                                                    className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-red-400 border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                                                >
                                                                    <RotateCcw className="h-3.5 w-3.5" /> Abort
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Soundscapes bottom panel */}
                                                <div className="w-full max-w-2xl mt-auto bg-[#161b2e]/40 backdrop-blur-[12px] border border-white/10 bg-gradient-to-br from-white/5 to-transparent rounded-2xl p-5 z-10 flex flex-col gap-4 shadow-xl shrink-0">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                                            <Headphones className="h-4 w-4 text-primary" />
                                                            Study Soundscape
                                                        </h3>
                                                        {sound !== 'none' && (
                                                            <div className="flex items-center gap-2.5 bg-black/20 px-3 py-1.5 rounded-xl border border-white/5">
                                                                <VolumeX className="h-3.5 w-3.5 text-gray-500 cursor-pointer hover:text-white transition-colors" onClick={() => { haptics.light(); setSound('none'); stopSound() }} />
                                                                <input 
                                                                    type="range" 
                                                                    min="0" 
                                                                    max="1" 
                                                                    step="0.05" 
                                                                    value={volume}
                                                                    onChange={handleVolumeChange}
                                                                    className="w-20 accent-primary bg-white/5 h-1 rounded-full cursor-pointer"
                                                                />
                                                                <Volume2 className="h-3.5 w-3.5 text-gray-300" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-start gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                                                        {[
                                                            { type: 'none', label: 'Mute', icon: VolumeX },
                                                            { type: 'space', label: 'Space', icon: Sparkles },
                                                            { type: 'rain', label: 'Rain', icon: Cloud },
                                                            { type: 'binaural', label: 'Waves', icon: Waves },
                                                            { type: 'cafe', label: 'Café', icon: Coffee },
                                                            { type: 'greenhouse', label: 'Glass', icon: Leaf }
                                                        ]
                                                        .filter(item => unlockedSoundscapes.includes(item.type))
                                                        .map((item) => {
                                                            const Icon = item.icon
                                                            const isActive = sound === item.type
                                                            return (
                                                                <button
                                                                    key={item.type}
                                                                    onClick={() => {
                                                                        haptics.light()
                                                                        setSound(item.type as SoundType)
                                                                        startSound(item.type as SoundType, volume)
                                                                    }}
                                                                    className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all border min-w-[75px] shrink-0 ${
                                                                        isActive 
                                                                            ? 'bg-primary/10 border-primary/30 text-primary shadow-[0_0_12px_rgba(166,200,255,0.15)]' 
                                                                            : 'bg-transparent border-transparent hover:bg-white/5 text-gray-500 hover:text-white'
                                                                    }`}
                                                                >
                                                                    <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-primary' : 'text-gray-500'}`} />
                                                                    <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ──── DESKTOP NOTES TAB ──── */}
                                        {activeTab === 'notes' && (
                                            <div className="flex-1 flex flex-col gap-4 w-full max-w-4xl min-h-[450px]">
                                                <div className="flex justify-between items-center bg-white/[0.03] px-6 py-4 rounded-2xl border border-white/5 shadow-md">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Workspace Scratchpad</span>
                                                    <span className="text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                                                        {saveStatus === 'saving' ? 'Auto-saving...' : saveStatus === 'saved' ? 'Saved' : 'Autosaved'}
                                                    </span>
                                                </div>
                                                <textarea
                                                    value={notes}
                                                    onChange={(e) => { hasUserEditedNotes.current = true; setNotes(e.target.value) }}
                                                    placeholder="Jot down notes, formulas, draft summaries, or complete your task answers here..."
                                                    className="flex-1 w-full bg-black/30 border border-white/5 rounded-3xl p-6 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 resize-none font-sans leading-relaxed transition-all shadow-[inset_0_2px_12px_rgba(0,0,0,0.6)]"
                                                />
                                            </div>
                                        )}

                                        {/* ──── DESKTOP RESOURCES & CHECKLIST TAB ──── */}
                                        {activeTab === 'resources' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full flex-1 py-2 items-stretch">
                                                {/* Subtasks checklist card */}
                                                <div className="bg-gradient-to-b from-white/[0.04] to-transparent backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] flex flex-col h-[420px] shadow-xl shadow-black/40">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3 border-b border-white/5 pb-2.5 flex items-center gap-2">
                                                        <CheckSquare className="h-4 w-4 text-primary" /> Checklist Progress
                                                    </p>
                                                    {localSubtasks.length > 0 ? (
                                                        <div className="flex flex-col gap-2.5 overflow-y-auto pr-1 flex-1 no-scrollbar">
                                                            {localSubtasks.map((st) => (
                                                                <button
                                                                    key={st.id}
                                                                    onClick={() => handleSubtaskToggle(st)}
                                                                    className="w-full flex items-start gap-3.5 p-4 rounded-2xl text-left bg-black/30 border border-white/5 hover:border-primary/30 hover:bg-black/40 transition-all group"
                                                                >
                                                                    {st.completed ? (
                                                                        <CheckSquare className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5 shadow-[0_0_8px_rgba(0,240,255,0.4)]" />
                                                                    ) : (
                                                                        <Square className="h-4.5 w-4.5 text-gray-600 group-hover:text-primary/50 shrink-0 mt-0.5 transition-colors" />
                                                                    )}
                                                                    <span className={`text-xs leading-relaxed transition-all ${st.completed ? 'line-through text-gray-500' : 'text-gray-200 group-hover:text-white'}`}>
                                                                        {st.title}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 flex items-center justify-center text-center text-gray-500 text-xs italic">
                                                            No subtasks defined. Focus on the main objective.
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Sources list card */}
                                                <div className="bg-gradient-to-b from-white/[0.04] to-transparent backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] flex flex-col h-[420px] shadow-xl shadow-black/40">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3 border-b border-white/5 pb-2.5 flex items-center gap-2">
                                                        <BookOpen className="h-4 w-4 text-primary" /> AI Curated Sources
                                                    </p>
                                                    {resourcesLoading ? (
                                                        <div className="flex-1 flex flex-col items-center justify-center gap-3">
                                                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                                                            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Sourcing guides...</p>
                                                        </div>
                                                    ) : resources.length === 0 ? (
                                                        <div className="flex-1 flex items-center justify-center text-center text-gray-500 text-xs italic">
                                                            No study resources sourced.
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-2.5 overflow-y-auto pr-1 flex-1 no-scrollbar">
                                                            {resources.map((res, i) => (
                                                                <a
                                                                    key={i}
                                                                    href={res.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={() => haptics.light()}
                                                                    className="flex items-center justify-between p-4 rounded-2xl bg-black/25 border border-white/5 hover:border-white/10 hover:bg-white/[0.01] transition-all active:scale-[0.98]"
                                                                >
                                                                    <div className="flex-1 min-w-0 mr-2">
                                                                        <span className="text-[8px] font-black uppercase text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full select-none">
                                                                            {res.type}
                                                                        </span>
                                                                        <h4 className="font-bold text-xs text-white mt-1.5 truncate">{res.title}</h4>
                                                                    </div>
                                                                    <ExternalLink className="h-4 w-4 text-gray-600 shrink-0" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : state === 'drill' ? (
                                    <div className="w-full flex-1 flex flex-col items-center justify-center min-h-full py-4 relative z-10">
                                        <SocraticMicroDrills 
                                            taskId={task.id}
                                            onPass={() => {
                                                haptics.medium()
                                                setState('finished')
                                                setQuizResult('Pass')
                                                setQuizFeedback('Comprehension verification passed! Mastery rewards unlocked.')
                                                setEarnedGems(GEM_REWARD[task.priority] ?? 1)
                                                setEarnedXp(task.priority * 10 + 10)
                                            }}
                                            onSkip={handleClaimBaseRewardOnly}
                                        />
                                    </div>
                                ) : (
                                    /* ──── DESKTOP COMPLETED / REFLECTION GATE ──── */
                                    <div className="w-full flex-1 flex flex-col items-center justify-center min-h-full py-4">
                                        <div className="flex flex-col gap-6 max-w-lg w-full bg-[#161b2e]/30 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="text-center">
                                            <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                                                <Check className="h-8 w-8" />
                                            </div>
                                            <h2 className="text-2xl font-black text-white">Focus Complete!</h2>
                                            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-bold">Evaluation & Reflection</p>
                                        </div>

                                        {quizResult === 'Pass' ? (
                                            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-5 flex flex-col gap-3">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Mastery Achieved</p>
                                                <p className="text-xs text-gray-300 italic leading-relaxed">"{quizFeedback}"</p>
                                                <div className="h-[1px] bg-emerald-500/10 my-1" />
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-primary">
                                                        <Diamond className="h-4 w-4 fill-primary/20" />
                                                        <span className="text-xs font-black">+{earnedGems} Focus Gems</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-neon-violet">
                                                        <Flame className="h-4 w-4 fill-neon-violet/20" />
                                                        <span className="text-xs font-black">+{earnedXp} XP</span>
                                                    </div>
                                                </div>
                                                {didLevelUp && (
                                                    <div className="mt-2 bg-neon-violet/10 border border-neon-violet/30 p-2.5 rounded-xl text-center text-xs font-black text-white uppercase tracking-wider flex items-center justify-center gap-2">
                                                        <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Leveled Up to LV {leveledUpTo}! <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-4">
                                                <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4 flex flex-col gap-2">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                                        <ShieldAlert className="h-4 w-4" /> Active Recall Challenge
                                                    </p>
                                                    <p className="text-xs text-gray-400 leading-relaxed">
                                                        Explain in your own words what you just learned or achieved. Socratic AI will evaluate your recall to award{' '}
                                                        <span className="text-white font-bold">Bonus Gems & XP</span>.
                                                    </p>
                                                </div>
                                                <textarea
                                                    value={reflection}
                                                    onChange={(e) => setReflection(e.target.value)}
                                                    placeholder="e.g. I understood that refraction happens because light shifts speed entering another medium. I completed exercises 12 to 15 correctly..."
                                                    disabled={quizLoading}
                                                    className="h-28 w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/30 resize-none leading-relaxed transition-all shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] focus:ring-1 focus:ring-amber-500/20"
                                                />
                                                {quizFeedback && (
                                                    <div className={`p-4 rounded-xl text-xs leading-relaxed ${quizResult === 'Needs Work' ? 'bg-amber-500/5 border border-amber-500/10 text-amber-400' : 'bg-red-500/5 border border-red-500/10 text-red-400'}`}>
                                                        <p className="font-bold mb-1 uppercase text-[9px] tracking-wider">Tutor Feedback:</p>
                                                        "{quizFeedback}"
                                                    </div>
                                                )}
                                                <button
                                                    onClick={handleSubmitQuiz}
                                                    disabled={!reflection.trim() || quizLoading}
                                                    className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                                                >
                                                    {quizLoading ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <>Submit for Socratic Check <Diamond className="h-3 w-3 fill-black/20" />+2</>
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        <div className="h-[1px] bg-white/5 my-1" />

                                        <div className="flex flex-col gap-2.5">
                                            {quizResult === 'Pass' ? (
                                                <button 
                                                    onClick={() => { 
                                                        haptics.medium(); 
                                                        onTaskUpdate?.({
                                                            ...task,
                                                            notes,
                                                            resources,
                                                            reflection,
                                                            subtasks: localSubtasks,
                                                            status: 'completed'
                                                        });
                                                        onClose() 
                                                    }}
                                                    className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider text-black bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                                >
                                                    Claim Mastery Rewards
                                                </button>
                                            ) : (
                                                <>
                                                    {remaining === 0 && (
                                                        <button onClick={handleAddTime}
                                                            className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-gray-300 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" /> + Add 5 Minutes
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={handleClaimBaseRewardOnly}
                                                        className="w-full py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider text-gray-500 hover:text-gray-400 active:scale-[0.98] transition-all text-center"
                                                    >
                                                        Skip Active Recall (Claim Base Gems Only)
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            </div>

                        </div>

                        {/* Right Tutor Panel Sidebar */}
                        <div className="hidden lg:flex w-80 h-full border-l border-white/5 flex-col absolute right-0 top-0 bg-[#0E111F]/80 backdrop-blur-xl z-50 shrink-0">
                            <DesktopTutorPanel />
                        </div>
                    </div>
                ) : (
                    /* ──── MOBILE / TABLET VIEW ──── */
                    <>
                        {/* ── FIXED HEADER GROUP ── */}
                        <div className="shrink-0 relative z-20 bg-[#050508]/80 backdrop-blur-xl border-b border-white/5 pb-4">
                            {/* ── TOP NAV BAR ── */}
                            <div className="flex items-center justify-between px-5 pt-4 pb-2">
                                <button 
                                    onClick={() => {
                                        stopSound()
                                        onTaskUpdate?.({
                                            ...task,
                                            notes,
                                            resources,
                                            reflection,
                                            subtasks: localSubtasks,
                                        })
                                        onClose()
                                    }}
                                    className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-transform backdrop-blur-md"
                                >
                                    <X className="h-4 w-4 text-gray-400" />
                                </button>
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${priorityClasses[task.priority] ?? 'text-gray-400 border-white/10 bg-white/5'}`}>
                                    {priorityLabel[task.priority] ?? 'FOCUS'}
                                </span>
                                <div className="w-10" />
                            </div>

                            {/* ── TASK INFO ── */}
                            <div className="px-6 text-center mt-1">
                                <h1 className="text-xl font-black text-white leading-tight tracking-tight">{task.title}</h1>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{goalTitle}</p>
                            </div>

                            {/* ── TABS SELECTOR (Only if not finished and on mobile) ── */}
                            {state !== 'finished' && (
                                <div className="flex px-6 mt-4">
                                    <div className="flex w-full bg-black/20 p-1 rounded-2xl border border-white/5">
                                        <button
                                            onClick={() => { haptics.light(); setActiveTab('timer') }}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${activeTab === 'timer' ? 'bg-electric-blue/10 border-electric-blue/20 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300 border-transparent'}`}
                                        >
                                            <Clock className="h-3.5 w-3.5" />
                                            Focus
                                        </button>
                                        <button
                                            onClick={() => { haptics.light(); setActiveTab('notes') }}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 relative border ${activeTab === 'notes' ? 'bg-electric-blue/10 border-electric-blue/20 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300 border-transparent'}`}
                                        >
                                            <Edit3 className="h-3.5 w-3.5" />
                                            Notes
                                            {saveStatus !== 'idle' && (
                                                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-electric-blue animate-ping" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => { haptics.light(); setActiveTab('resources') }}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${activeTab === 'resources' ? 'bg-electric-blue/10 border-electric-blue/20 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300 border-transparent'}`}
                                        >
                                            <BookOpen className="h-3.5 w-3.5" />
                                            Sources
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── MAIN CONTENT AREA ── */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 relative z-10 min-h-0 no-scrollbar">
                            
                            {/* ──── SCREEN A: NOT COMPLETED VIEW ──── */}
                            {state !== 'finished' && state !== 'drill' && (
                                <div className="flex flex-col gap-6 w-full py-2 animate-fade-up">
                                    {/* TAB 1: TIMER & CHECKLIST */}
                                    {activeTab === 'timer' && (
                                        <div className="flex flex-col items-center gap-6 w-full py-2">
                                            {/* Timer Radial */}
                                            <div className="relative shrink-0 my-4 flex items-center justify-center">
                                                <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
                                                    <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="6" />
                                                    <circle cx="100" cy="100" r={radius} fill="none"
                                                        stroke={timerColor} strokeWidth="6" strokeLinecap="round"
                                                        strokeDasharray={circumference} strokeDashoffset={dashOffset}
                                                        style={{ 
                                                            transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease', 
                                                            filter: clampedProgress > 0.4 
                                                                ? 'drop-shadow(0 0 10px var(--color-electric-blue))' 
                                                                : `drop-shadow(0 0 10px ${timerColor}80)`
                                                        }} />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.25em] mb-1">
                                                        {state === 'idle' ? 'Ready' : state === 'paused' ? 'Paused' : 'Focusing'}
                                                    </span>
                                                    <span className="text-4xl font-black tabular-nums text-white tracking-tight">
                                                        {formatTime(remaining)}
                                                    </span>
                                                    <span className="text-[9px] text-gray-600 mt-1 font-semibold uppercase tracking-wider">{task.duration_mins ?? 30} min session</span>
                                                </div>
                                            </div>

                                            {/* Soundscape Control Panel */}
                                            <div className="w-full bg-white/[0.03] backdrop-blur-md border border-white/5 p-4 rounded-3xl flex flex-col gap-4 shadow-xl">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Headphones className="h-4 w-4 text-electric-blue" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Study Soundscape</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 bg-black/20 p-1.5 rounded-2xl border border-white/5">
                                                    {[
                                                        { type: 'none', label: 'Mute', icon: VolumeX },
                                                        { type: 'space', label: 'Space', icon: Sparkles },
                                                        { type: 'rain', label: 'Rain', icon: Cloud },
                                                        { type: 'binaural', label: 'Waves', icon: Waves },
                                                        { type: 'cafe', label: 'Café', icon: Coffee },
                                                        { type: 'greenhouse', label: 'Glass', icon: Leaf }
                                                    ]
                                                    .filter(item => unlockedSoundscapes.includes(item.type))
                                                    .map((item) => {
                                                        const Icon = item.icon
                                                        const isActive = sound === item.type
                                                        return (
                                                            <button
                                                                key={item.type}
                                                                onClick={() => {
                                                                    haptics.light()
                                                                    setSound(item.type as SoundType)
                                                                    startSound(item.type as SoundType, volume)
                                                                }}
                                                                className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all border ${
                                                                    isActive 
                                                                        ? 'bg-electric-blue/10 border-electric-blue/20 text-white shadow-md' 
                                                                        : 'text-gray-500 hover:text-gray-300 border-transparent'
                                                                }`}
                                                            >
                                                                <Icon className={`h-4 w-4 ${isActive ? 'text-electric-blue' : 'text-gray-500'}`} />
                                                                <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                                {sound !== 'none' && (
                                                    <div className="flex items-center gap-3 bg-black/10 px-3 py-2 rounded-xl border border-white/5">
                                                        <VolumeX className="h-3.5 w-3.5 text-gray-500" />
                                                        <input 
                                                            type="range" 
                                                            min="0" 
                                                            max="1" 
                                                            step="0.05" 
                                                            value={volume}
                                                            onChange={handleVolumeChange}
                                                            className="flex-1 accent-electric-blue bg-white/5 h-1 rounded-full cursor-pointer"
                                                        />
                                                        <Volume2 className="h-3.5 w-3.5 text-gray-300" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Live checklist HUD */}
                                            {localSubtasks.length > 0 && (
                                                <div className="w-full bg-white/[0.025] backdrop-blur-md border border-white/5 p-4 rounded-3xl shadow-xl">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3">Live Progress Check</p>
                                                    <div className="flex flex-col gap-2">
                                                        {localSubtasks.map((st) => (
                                                            <button
                                                                key={st.id}
                                                                onClick={() => handleSubtaskToggle(st)}
                                                                className="w-full flex items-start gap-2.5 p-2.5 rounded-2xl text-left bg-black/20 border border-white/5 hover:border-white/10 transition-colors"
                                                            >
                                                                {st.completed ? (
                                                                    <CheckSquare className="h-4 w-4 text-electric-blue shrink-0 mt-0.5" />
                                                                ) : (
                                                                    <Square className="h-4 w-4 text-gray-600 shrink-0 mt-0.5" />
                                                                )}
                                                                <span className={`text-xs leading-relaxed ${st.completed ? 'line-through text-gray-600' : 'text-gray-300'}`}>
                                                                    {st.title}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* TAB 2: AUTOSAVING WORKSPACE NOTES */}
                                    {activeTab === 'notes' && (
                                        <div className="flex flex-col gap-3 h-full min-h-[350px]">
                                            <div className="flex justify-between items-center bg-white/[0.03] px-4 py-2.5 rounded-2xl border border-white/5">
                                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Workspace Scratchpad</span>
                                                <span className="text-[8px] font-bold text-electric-blue bg-electric-blue/10 px-2 py-0.5 rounded">
                                                    {saveStatus === 'saving' ? 'Auto-saving...' : saveStatus === 'saved' ? 'Saved' : 'Autosaved'}
                                                </span>
                                            </div>
                                            <textarea
                                                value={notes}
                                                onChange={(e) => { hasUserEditedNotes.current = true; setNotes(e.target.value) }}
                                                placeholder="Jot down notes, formulas, draft summaries, or complete your task answers here..."
                                                className="flex-1 min-h-[300px] w-full bg-white/[0.015] border border-white/5 rounded-3xl p-5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-electric-blue/30 resize-none font-sans leading-relaxed transition-colors"
                                            />
                                        </div>
                                    )}

                                    {/* TAB 3: DYNAMIC RESOURCES */}
                                    {activeTab === 'resources' && (
                                        <div className="flex flex-col gap-4 h-full min-h-[350px]">
                                            <div className="bg-white/[0.03] px-4 py-3 rounded-2xl border border-white/5">
                                                <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider">AI Curated Study Materials</p>
                                                <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                                                    We've sourced these links specifically to help you study this task's concepts.
                                                </p>
                                            </div>

                                            {resourcesLoading ? (
                                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                                    <Loader2 className="h-8 w-8 text-electric-blue animate-spin" />
                                                    <p className="text-xs text-gray-600 font-bold uppercase tracking-widest">Sourcing web guides...</p>
                                                </div>
                                            ) : resources.length === 0 ? (
                                                <div className="text-center py-16 text-gray-600 text-xs italic">
                                                    Could not find study resources.
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-3">
                                                    {resources.map((res, i) => (
                                                        <a
                                                            key={i}
                                                            href={res.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={() => haptics.light()}
                                                            className="flex items-center justify-between p-4 rounded-3xl bg-white/[0.025] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all active:scale-[0.98] shadow-lg"
                                                        >
                                                            <div className="flex-1 min-w-0 mr-3">
                                                                <span className="text-[8px] font-black uppercase text-electric-blue bg-electric-blue/15 px-2 py-0.5 rounded-full select-none">
                                                                    {res.type}
                                                                </span>
                                                                <h4 className="font-bold text-xs text-white mt-1.5 truncate">{res.title}</h4>
                                                                <p className="text-[9px] text-gray-500 truncate mt-0.5">{res.url}</p>
                                                            </div>
                                                            <ExternalLink className="h-4 w-4 text-gray-600 shrink-0" />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {state === 'drill' && (
                                <div className="flex flex-col gap-6 max-w-md mx-auto py-2 animate-fade-up">
                                    <SocraticMicroDrills 
                                        taskId={task.id}
                                        onPass={() => {
                                            haptics.medium()
                                            setState('finished')
                                            setQuizResult('Pass')
                                            setQuizFeedback('Comprehension verification passed! Mastery rewards unlocked.')
                                            setEarnedGems(GEM_REWARD[task.priority] ?? 1)
                                            setEarnedXp(task.priority * 10 + 10)
                                        }}
                                        onSkip={handleClaimBaseRewardOnly}
                                    />
                                </div>
                            )}

                            {/* ──── SCREEN B: COMPLETED / REFLECTION GATE ──── */}
                            {state === 'finished' && (
                                <div className="flex flex-col gap-6 max-w-md mx-auto py-2 animate-fade-up">
                                    {/* Success Header */}
                                    <div className="text-center">
                                        <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                            <Check className="h-8 w-8" />
                                        </div>
                                        <h2 className="text-2xl font-black text-white">Focus Complete!</h2>
                                        <p className="text-xs text-gray-500 mt-1">Proof of Work and active recall evaluation.</p>
                                    </div>

                                    {/* Socratic quiz check / evaluation result */}
                                    {quizResult === 'Pass' ? (
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-5 flex flex-col gap-3">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Mastery Achieved</p>
                                            <p className="text-xs text-gray-300 italic leading-relaxed">"{quizFeedback}"</p>
                                            
                                            <div className="h-[1px] bg-emerald-500/20 my-1" />
                                            
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-electric-blue">
                                                    <Diamond className="h-4 w-4 fill-electric-blue/20" />
                                                    <span className="text-xs font-black">+{earnedGems} Focus Gems</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-neon-violet">
                                                    <Flame className="h-4 w-4 fill-neon-violet/20" />
                                                    <span className="text-xs font-black">+{earnedXp} XP</span>
                                                </div>
                                            </div>

                                            {didLevelUp && (
                                                <div className="mt-3 bg-neon-violet/20 border border-neon-violet/40 p-3 rounded-2xl text-center text-xs font-black text-white uppercase tracking-wider flex items-center justify-center gap-2">
                                                    <Sparkles className="h-4 w-4 text-amber-400" /> Leveled Up to LV {leveledUpTo}! <Sparkles className="h-4 w-4 text-amber-400" />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-white/[0.025] border border-white/5 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
                                            <div className="flex items-center gap-2 text-amber-400">
                                                <ShieldAlert className="h-4 w-4" />
                                                <span className="text-[10px] font-black uppercase tracking-wider">Active Recall Challenge</span>
                                            </div>
                                            <p className="text-xs text-gray-400 leading-relaxed">
                                                Summarize in your own words what you just learned or solved. Socratic AI will evaluate your reflection to award{' '}
                                                <span className="text-white font-bold">Bonus Gems & XP</span>.
                                            </p>

                                            <textarea
                                                value={reflection}
                                                onChange={(e) => setReflection(e.target.value)}
                                                placeholder="e.g. I understood that refraction happens because light shifts speed entering another medium. I completed exercises 12 to 15 correctly..."
                                                disabled={quizLoading}
                                                className="h-28 w-full bg-black/40 border border-white/10 rounded-3xl p-4 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/30 resize-none leading-relaxed transition-colors"
                                            />

                                            {quizFeedback && (
                                                <div className={`p-4 rounded-2xl text-xs leading-relaxed ${quizResult === 'Needs Work' ? 'bg-amber-500/5 border border-amber-500/10 text-amber-400' : 'bg-red-500/5 border border-red-500/10 text-red-400'}`}>
                                                    <p className="font-bold mb-1 uppercase text-[9px] tracking-wider">Tutor Feedback:</p>
                                                    "{quizFeedback}"
                                                </div>
                                            )}

                                            <button
                                                onClick={handleSubmitQuiz}
                                                disabled={!reflection.trim() || quizLoading}
                                                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                                            >
                                                {quizLoading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>Submit to Professor <Diamond className="h-3 w-3 animate-pulse" />+2</>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── FOCUS CONTROL BUTTONS FOOTER ── */}
                        <div className="shrink-0 relative z-20 px-6 pt-4 pb-6 space-y-3 bg-[#050508]/85 backdrop-blur-xl border-t border-white/5"
                            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>

                            {/* ── MINI TIMER PILL: always visible on Notes/Resources tabs ── */}
                            {state !== 'finished' && activeTab !== 'timer' && (
                                <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-2.5 mb-1">
                                    <div className="flex items-center gap-1.5 flex-1">
                                        <Clock className="h-3.5 w-3.5 text-gray-500" />
                                        <span className="text-xs font-black tabular-nums text-white tracking-tight">{formatTime(remaining)}</span>
                                        <span className={`text-[9px] font-bold uppercase tracking-wider ml-1 ${
                                            state === 'running' ? 'text-electric-blue' 
                                            : state === 'paused' ? 'text-amber-400' 
                                            : 'text-gray-500'
                                        }`}>{state === 'running' ? '● Live' : state === 'paused' ? '⏸ Paused' : 'Ready'}</span>
                                    </div>
                                    {state === 'running' ? (
                                        <button
                                            onClick={() => { haptics.light(); setState('paused'); stopSound() }}
                                            className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
                                        >
                                            <Pause className="h-3.5 w-3.5 text-white" />
                                        </button>
                                    ) : state === 'paused' ? (
                                        <button
                                            onClick={() => { haptics.medium(); setState('running'); if (sound !== 'none') startSound(sound, volume) }}
                                            className="h-8 w-8 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
                                            style={{ background: timerColor }}
                                        >
                                            <Play className="h-3.5 w-3.5 text-black fill-black" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => { haptics.medium(); setState('running') }}
                                            className="h-8 px-3 rounded-xl flex items-center gap-1.5 text-black text-[10px] font-black active:scale-95 transition-transform"
                                            style={{ background: timerColor }}
                                        >
                                            <Play className="h-3 w-3 fill-black" /> Start
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* SCREEN A: ACTIVE TIMER ACTION ROW */}
                            {state !== 'finished' && activeTab === 'timer' && (
                                <>
                                    {/* IDLE */}
                                    {state === 'idle' && (
                                        <>
                                            <button onClick={() => { haptics.medium(); setState('running') }}
                                                className="w-full py-4 rounded-2xl font-black text-[15px] tracking-wide text-black hover:opacity-90 active:scale-[0.98] transition-all"
                                                style={{ 
                                                    background: timerColor, 
                                                    boxShadow: clampedProgress > 0.4 
                                                        ? '0 0 24px var(--color-electric-blue)' 
                                                        : `0 0 24px ${timerColor}50` 
                                                }}>
                                                Start Focus Session
                                            </button>
                                            <button onClick={handleAlreadyDone} disabled={isPending}
                                                className="w-full py-4 rounded-2xl font-bold text-sm text-gray-300 border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/10 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Already Done <span className="text-[10px] text-gray-600">(claim without timer)</span></>}
                                            </button>
                                        </>
                                    )}

                                    {/* RUNNING */}
                                    {state === 'running' && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button onClick={() => { haptics.light(); setState('paused'); stopSound() }}
                                                    className="py-4 rounded-2xl font-bold text-sm text-white border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                                    <Pause className="h-4 w-4" /> Pause
                                                </button>
                                                <button onClick={handleStuck} disabled={hintLoading}
                                                    className="py-4 rounded-2xl font-bold text-sm text-neon-violet border border-neon-violet/10 bg-neon-violet/5 hover:bg-neon-violet/10 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                                                    {hintLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><HelpCircle className="h-4 w-4" /> Stuck?</>}
                                                </button>
                                            </div>
                                            <button onClick={() => setShowChat(true)}
                                                className="w-full py-4 rounded-2xl font-bold text-sm text-electric-blue border border-electric-blue/10 bg-electric-blue/5 hover:bg-electric-blue/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                                <MessageSquare className="h-4 w-4" />
                                                Ask a Question
                                            </button>
                                        </>
                                    )}

                                    {/* PAUSED */}
                                    {state === 'paused' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => { haptics.medium(); setState('running'); if (sound !== 'none') startSound(sound, volume) }}
                                                className="py-4 rounded-2xl font-black text-sm text-black hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                                style={{ background: timerColor }}>
                                                <Play className="h-4 w-4 fill-black" /> Resume
                                            </button>
                                            <button onClick={() => { 
                                                stopSound(); 
                                                onTaskUpdate?.({
                                                    ...task,
                                                    notes,
                                                    resources,
                                                    reflection,
                                                    subtasks: localSubtasks,
                                                })
                                                onClose() 
                                            }}
                                                className="py-4 rounded-2xl font-bold text-sm text-red-400 border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                                <RotateCcw className="h-4 w-4" /> Abort
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* SCREEN B: COMPLETED CLAIM FLOW ROW */}
                            {state === 'finished' && (
                                <>
                                    {quizResult === 'Pass' ? (
                                        <button onClick={() => { 
                                            haptics.medium(); 
                                            onTaskUpdate?.({
                                                ...task,
                                                notes,
                                                resources,
                                                reflection,
                                                subtasks: localSubtasks,
                                                status: 'completed'
                                            });
                                            onClose() 
                                        }}
                                            className="w-full py-4 rounded-2xl font-black text-sm text-black bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                        >
                                            Claim Mastery Rewards
                                        </button>
                                    ) : (
                                        <div className="flex flex-col gap-2 w-full">
                                            {remaining === 0 && (
                                                <button onClick={handleAddTime}
                                                    className="w-full py-4 rounded-2xl font-bold text-sm text-gray-300 border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Plus className="h-4 w-4" /> + Add 5 Minutes
                                                </button>
                                            )}
                                            <button 
                                                onClick={handleClaimBaseRewardOnly}
                                                className="w-full py-4 rounded-2xl font-bold text-xs text-gray-500 hover:text-gray-400 active:scale-[0.98] transition-all text-center"
                                            >
                                                Skip Active Recall Quiz (Claim Base Gems Only)
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                )}
            </motion.div>
        </AnimatePresence>
    )

    return createPortal(overlay, document.body)
}
