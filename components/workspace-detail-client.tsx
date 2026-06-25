'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Users, Coins, ArrowLeft, Plus, Award, Flame, Calendar, BookOpen, Clock, LogOut, CheckCircle2, ChevronRight, Loader2, Paperclip } from 'lucide-react'
import { FileUploader } from './file-uploader'
import { useLanguage } from './language-provider'
import { haptics } from '@/utils/haptics'
import { motion, AnimatePresence } from 'framer-motion'

interface Student {
    id: string
    username: string
    xp: number
    level: number
    currentStreak: number
    highStreak: number
    tokens: number
    joinedAt: string
    totalTasks: number
    completedTasks: number
    completionRate: number
}

interface WorkspaceDetailClientProps {
    user: any
    workspace: any
    initialProfile: any
}

export function WorkspaceDetailClient({ user, workspace, initialProfile }: WorkspaceDetailClientProps) {
    const router = useRouter()
    const { t } = useLanguage()
    const [isPending, startTransition] = useTransition()

    const [students, setStudents] = useState<Student[]>([])
    const [feedItems, setFeedItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [materialsOpen, setMaterialsOpen] = useState(false)

    // Task Injection Modal States
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
    const [injectTaskTitle, setInjectTaskTitle] = useState('')
    const [injectTaskSubject, setInjectTaskSubject] = useState('GENERAL')
    const [injectTaskDuration, setInjectTaskDuration] = useState(45)
    const [injectTaskPriority, setInjectTaskPriority] = useState(3)
    const [injectTaskNotes, setInjectTaskNotes] = useState('')
    const [injectError, setInjectError] = useState<string | null>(null)
    const [injectSuccess, setInjectSuccess] = useState(false)

    const isTutor = initialProfile.role === 'tutor' && workspace.creator_id === user.id

    const fetchCohortData = async () => {
        const supabase = createClient()
        try {
            // 1. Fetch workspace members
            const { data: members, error: memError } = await supabase
                .from('workspace_members')
                .select('user_id, joined_at')
                .eq('workspace_id', workspace.id)

            if (memError || !members) return

            const memberIds = members.map(m => m.user_id)
            if (memberIds.length === 0) return

            // 2. Fetch profiles
            const { data: profiles, error: profError } = await supabase
                .from('profiles')
                .select('id, username, xp, level, current_streak, high_streak, tokens_balance')
                .in('id', memberIds)

            if (profError || !profiles) return

            // 3. Fetch tasks for completion rate calculation
            const { data: tasks, error: taskError } = await supabase
                .from('tasks')
                .select('id, title, status, due_date, user_id, task_type, subject')
                .in('user_id', memberIds)

            if (taskError || !tasks) return

            // Parse students list
            const studentList: Student[] = profiles.map(p => {
                const studentTasks = tasks.filter(t => t.user_id === p.id && t.task_type !== 'void')
                const total = studentTasks.length
                const completed = studentTasks.filter(t => t.status === 'completed').length
                const rate = total > 0 ? Math.round((completed / total) * 100) : 0
                const joinedInfo = members.find(m => m.user_id === p.id)

                return {
                    id: p.id,
                    username: p.username || `Student-${p.id.slice(0, 5)}`,
                    xp: p.xp || 0,
                    level: p.level || 1,
                    currentStreak: p.current_streak || 0,
                    highStreak: p.high_streak || 0,
                    tokens: p.tokens_balance || 0,
                    joinedAt: joinedInfo?.joined_at || new Date().toISOString(),
                    totalTasks: total,
                    completedTasks: completed,
                    completionRate: rate
                }
            })

            setStudents(studentList)

            // Parse recent completed tasks for Focus Feed
            const completions = tasks
                .filter(t => t.status === 'completed' && t.task_type !== 'void')
                .map(t => {
                    const student = studentList.find(s => s.id === t.user_id)
                    return {
                        id: t.id,
                        title: t.title,
                        subject: t.subject || 'GENERAL',
                        username: student?.username || 'Unknown Student',
                        userId: t.user_id
                    }
                })
                .slice(0, 10) // Display top 10

            setFeedItems(completions)

        } catch (err) {
            console.error('Error fetching cohort data:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCohortData()
    }, [workspace.id])

    const handleLeaveCohort = () => {
        const confirm = window.confirm('Are you sure you want to leave this study cohort?')
        if (!confirm) return

        haptics.medium()
        startTransition(async () => {
            try {
                const res = await fetch('/api/workspaces/leave', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workspaceId: workspace.id })
                })
                const data = await res.json()
                if (data.success) {
                    haptics.medium()
                    router.push('/workspaces')
                } else {
                    haptics.error()
                    alert(data.error || 'Failed to leave cohort')
                }
            } catch (err) {
                console.error(err)
                alert('An error occurred')
            }
        })
    }

    const handleInjectTask = (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedStudent) return
        if (!injectTaskTitle.trim()) {
            setInjectError('Task title is required')
            return
        }

        haptics.medium()
        setInjectError(null)
        startTransition(async () => {
            try {
                const res = await fetch('/api/tasks/push-tutor-task', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentId: selectedStudent.id,
                        workspaceId: workspace.id,
                        task: {
                            title: injectTaskTitle,
                            subject: injectTaskSubject,
                            duration_mins: Number(injectTaskDuration),
                            priority: Number(injectTaskPriority),
                            notes: injectTaskNotes
                        }
                    })
                })
                const data = await res.json()
                if (data.success) {
                    haptics.medium()
                    setInjectSuccess(true)
                    setTimeout(() => {
                        setInjectSuccess(false)
                        setSelectedStudent(null)
                        setInjectTaskTitle('')
                        setInjectTaskNotes('')
                    }, 2000)
                    fetchCohortData()
                } else {
                    haptics.error()
                    setInjectError(data.error || 'Failed to inject task')
                }
            } catch (err) {
                console.error(err)
                setInjectError('An error occurred during injection')
            }
        })
    }

    // Calculations
    const aggregateXp = students.reduce((sum, s) => sum + s.xp, 0)
    const avgCompletion = students.length > 0
        ? Math.round(students.reduce((sum, s) => sum + s.completionRate, 0) / students.length)
        : 0

    return (
        <div className="flex flex-col gap-6 py-6 px-4 md:px-8 w-full max-w-7xl mx-auto pt-4 pb-32">
            
            {/* Header subnav */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => { haptics.light(); router.push('/workspaces') }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-black uppercase tracking-wider text-gray-300 transition-all active:scale-95"
                >
                    <ArrowLeft className="w-4 h-4" />
                    All Cohorts
                </button>

                <button
                    onClick={handleLeaveCohort}
                    disabled={isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-xs font-black uppercase tracking-wider text-rose-400 transition-all active:scale-95 shrink-0"
                >
                    <LogOut className="w-4 h-4" />
                    Leave Cohort
                </button>
            </div>

            {/* Title Block */}
            <div className="mb-2">
                <h1 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">{workspace.name}</h1>
                <p className="text-gray-400 text-xs mt-1">Study domain managed by {workspace.is_premium ? 'Premium Tutor Tier' : 'Standard Cohort'}</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 text-electric-blue animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
                    {/* Left & Middle Column (2/3): HUD & Student Roster */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Cohort Progress HUD */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gradient-to-r from-[#141829] to-[#0E111F] border border-white/5 p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-electric-blue/5 rounded-full blur-[40px] pointer-events-none" />
                            
                            <div className="flex flex-col gap-1.5 border-b sm:border-b-0 sm:border-r border-white/5 pb-4 sm:pb-0 sm:pr-4">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cohort Size</span>
                                <span className="text-2xl font-black text-white flex items-center gap-1.5">
                                    <Users className="w-5 h-5 text-electric-blue" />
                                    {students.length} Members
                                </span>
                            </div>

                            <div className="flex flex-col gap-1.5 border-b sm:border-b-0 sm:border-r border-white/5 py-4 sm:py-0 sm:px-4">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Combined XP</span>
                                <span className="text-2xl font-black text-white flex items-center gap-1.5">
                                    <Award className="w-5 h-5 text-yellow-500" />
                                    {aggregateXp} XP
                                </span>
                            </div>

                            <div className="flex flex-col gap-1.5 pt-4 sm:pt-0 sm:pl-4">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Average Syllabus Completion</span>
                                <span className="text-2xl font-black text-emerald-400 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-5 h-5" />
                                    {avgCompletion}%
                                </span>
                            </div>
                        </div>

                        {/* Student Progress Roster */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-black text-white uppercase tracking-wider px-2">Cohort Members Progression</h2>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {students.map(student => (
                                    <div
                                        key={student.id}
                                        className="bg-[#141824] border border-white/5 p-6 rounded-[2.2rem] flex flex-col justify-between h-44 shadow-md relative overflow-hidden group hover:border-white/10"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border border-white/10 text-white font-black text-sm">
                                                    {student.username.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="text-white font-black text-sm truncate max-w-[130px]">{student.username}</h3>
                                                    <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">Level {student.level} Pathseeker</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full shrink-0">
                                                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500/20" />
                                                <span className="text-[10px] font-black text-orange-400">{student.currentStreak}d</span>
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="space-y-1.5 my-3">
                                            <div className="flex items-center justify-between text-[9px] font-black uppercase text-gray-400 tracking-wider">
                                                <span>Tasks Completed</span>
                                                <span className="text-emerald-400">{student.completionRate}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                                                <div
                                                    className="h-full bg-gradient-to-r from-electric-blue to-neon-violet rounded-full transition-all duration-1000"
                                                    style={{ width: `${student.completionRate}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Tutor Task Inject Button */}
                                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-extrabold">
                                                {student.completedTasks}/{student.totalTasks} Tasks
                                            </span>
                                            {isTutor && student.id !== user.id && (
                                                <button
                                                    onClick={() => { haptics.medium(); setSelectedStudent(student) }}
                                                    className="px-3.5 py-1.5 rounded-lg bg-electric-blue/10 border border-electric-blue/20 hover:bg-electric-blue hover:text-black font-black text-[9px] tracking-widest uppercase transition-all flex items-center gap-1 text-electric-blue"
                                                >
                                                    <Plus className="w-3 h-3 stroke-[2.5]" />
                                                    Inject Task
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column (1/3): Focus Feed Timeline */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-[#141824] border border-white/5 p-6 rounded-[2.5rem] shadow-xl flex flex-col gap-4">
                            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                                <div className="h-9 w-9 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center rounded-xl text-emerald-400">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <h3 className="text-white font-extrabold text-sm uppercase tracking-wider">Focus Feed</h3>
                            </div>

                            {feedItems.length === 0 ? (
                                <p className="text-xs text-gray-500 italic text-center py-8">
                                    No completions logged in this cohort yet. Let's start studying!
                                </p>
                            ) : (
                                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                                    {feedItems.map((item, idx) => (
                                        <div key={item.id || idx} className="flex gap-3 items-start relative">
                                            {/* Timeline Line Connector */}
                                            {idx < feedItems.length - 1 && (
                                                <div className="absolute left-[13px] top-6 bottom-0 w-[1px] bg-white/5" />
                                            )}
                                            
                                            {/* Timeline dot */}
                                            <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-white uppercase tracking-wide truncate">{item.username}</p>
                                                <p className="text-gray-400 text-xs mt-0.5 leading-normal">
                                                    Completed focus block: <span className="text-emerald-400 font-bold">{item.title}</span>
                                                </p>
                                                <span className="text-[8px] font-bold text-gray-600 bg-white/5 border border-white/5 px-2 py-0.5 rounded mt-1.5 inline-block uppercase">
                                                    {item.subject}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Study Materials Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6"
            >
                <button
                    onClick={() => setMaterialsOpen(prev => !prev)}
                    className="flex items-center gap-2 w-full text-left mb-3"
                >
                    <Paperclip className="w-3.5 h-3.5 text-electric-blue" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Study Materials</span>
                    <span className="ml-auto text-[10px] text-gray-600">{materialsOpen ? '▲' : '▼'}</span>
                </button>
                <AnimatePresence>
                    {materialsOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <FileUploader workspaceId={workspace.id} maxFiles={5} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Task Injector Modal */}
            <AnimatePresence>
                {selectedStudent && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-[#0B0D17]/80 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-md rounded-[2.5rem] bg-[#141824] border border-white/10 p-8 shadow-2xl flex flex-col gap-6"
                        >
                            <div className="flex flex-col gap-1.5">
                                <h3 className="text-lg font-black text-white uppercase tracking-wider italic">Inject Study Task</h3>
                                <p className="text-xs text-gray-400 leading-relaxed font-medium">
                                    Directly queue a custom learning node to <span className="text-electric-blue font-bold">{selectedStudent.username}</span>'s active syllabus.
                                </p>
                            </div>

                            {injectSuccess ? (
                                <div className="py-8 text-center space-y-3">
                                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-white font-black text-sm uppercase">Task Injected</h4>
                                    <p className="text-gray-400 text-xs">
                                        Task successfully added to the student's calendar checklist.
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleInjectTask} className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Task Title</label>
                                        <input
                                            type="text"
                                            required
                                            value={injectTaskTitle}
                                            onChange={(e) => setInjectTaskTitle(e.target.value)}
                                            placeholder="e.g. Solve Integration Practice Set C"
                                            className="w-full bg-[#0B0D17]/80 border border-white/[0.06] rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-electric-blue transition-colors font-medium"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Subject Domain</label>
                                            <select
                                                value={injectTaskSubject}
                                                onChange={(e) => setInjectTaskSubject(e.target.value)}
                                                className="w-full bg-[#0B0D17]/80 border border-white/[0.06] rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-electric-blue transition-colors font-semibold"
                                            >
                                                <option value="GENERAL">General</option>
                                                <option value="MATH">Mathematics</option>
                                                <option value="SCIENCE">Science & Bio</option>
                                                <option value="TECH">Coding & CS</option>
                                                <option value="ARTS">Arts & Design</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Duration (Mins)</label>
                                            <input
                                                type="number"
                                                required
                                                min="5"
                                                max="480"
                                                value={injectTaskDuration}
                                                onChange={(e) => setInjectTaskDuration(Number(e.target.value))}
                                                className="w-full bg-[#0B0D17]/80 border border-white/[0.06] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-electric-blue transition-colors font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Priority Rating (1 - 5)</label>
                                        <select
                                            value={injectTaskPriority}
                                            onChange={(e) => setInjectTaskPriority(Number(e.target.value))}
                                            className="w-full bg-[#0B0D17]/80 border border-white/[0.06] rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-electric-blue transition-colors font-semibold"
                                        >
                                            <option value="1">Priority 1: Light Drill</option>
                                            <option value="2">Priority 2: Conceptual Overview</option>
                                            <option value="3">Priority 3: Standard Practice</option>
                                            <option value="4">Priority 4: Hard Application</option>
                                            <option value="5">Priority 5: Deep Theory Ceiling</option>
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Tutor Notes / Guidelines</label>
                                        <textarea
                                            value={injectTaskNotes}
                                            onChange={(e) => setInjectTaskNotes(e.target.value)}
                                            placeholder="Write specific guidelines or links..."
                                            rows={3}
                                            className="w-full bg-[#0B0D17]/80 border border-white/[0.06] rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-electric-blue transition-colors font-medium resize-none"
                                        />
                                    </div>

                                    {injectError && (
                                        <p className="text-[10px] text-red-400 font-bold text-center bg-red-500/5 py-2 border border-red-500/10 rounded-xl">
                                            {injectError}
                                        </p>
                                    )}

                                    <div className="flex gap-3 mt-4">
                                        <button
                                            type="button"
                                            onClick={() => { haptics.light(); setSelectedStudent(null) }}
                                            className="flex-1 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] tracking-widest uppercase hover:bg-white/10 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isPending}
                                            className="flex-1 py-3.5 rounded-2xl bg-electric-blue text-black hover:scale-[1.02] active:scale-95 transition-all font-black text-[10px] tracking-widest uppercase shadow-[0_0_20px_rgba(0,240,255,0.25)] flex items-center justify-center gap-1"
                                        >
                                            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Inject'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
