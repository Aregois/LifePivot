'use client'

import { useState, useMemo, useEffect, useTransition, useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, AlertTriangle, Heart, Flame, Check, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { haptics } from '@/utils/haptics'
import { isIOS } from '@/utils/platform'

import { CalendarDrawer } from './calendar-drawer'
import type { Task } from '@/utils/types'
import { getLocalDateString } from '@/utils/date-utils'
import { useEconomy } from './economy-provider'
import { toggleTask, processPivot } from '@/app/actions'
import { useLanguage } from './language-provider'
import { translateTasksArray } from '@/utils/translations'

interface ThreeDCalendarGridProps {
    activeDates: string[]    // Pending tasks
    completedDates: string[] // All tasks done
    missedDates: string[]    // Past dates with pending tasks
    tasks: Task[]            // The full task list
    onDateSelect?: (date: string) => void
}

export function ThreeDCalendarGrid({
    activeDates: initialActiveDates,
    completedDates: initialCompletedDates,
    missedDates: initialMissedDates,
    tasks,
    onDateSelect
}: ThreeDCalendarGridProps) {
    const { t, locale } = useLanguage()
    const weekdays = useMemo(() => {
        const baseDate = new Date(Date.UTC(2021, 0, 3)); // 2021-01-03 was a Sunday
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() + i);
            return d.toLocaleDateString(locale, { weekday: 'short' });
        });
    }, [locale]);

    const [currentMonth, setCurrentMonth] = useState(() => new Date())
    const [mounted, setMounted] = useState(false)
    const [isIOSDevice, setIsIOSDevice] = useState(false)
    const [isDesktop, setIsDesktop] = useState(false)
    const [is3D, setIs3D] = useState(false)
    const router = useRouter()
    const [pivotPending, startPivotTransition] = useTransition()

    const [drawerOpen, setDrawerOpen] = useState(false)
    const [drawerDate, setDrawerDate] = useState('')

    const translatedTasks = useMemo(() => {
        return translateTasksArray(tasks, locale)
    }, [tasks, locale])

    const [localTasks, setLocalTasks] = useState<Task[]>(translatedTasks)
    const { setGems, setXp, setLevel, level, setLives } = useEconomy()

    useEffect(() => {
        setLocalTasks(translatedTasks)
    }, [translatedTasks])

    useEffect(() => {
        setMounted(true)
        setIsIOSDevice(isIOS())
        setIsDesktop(window.innerWidth >= 1024)

        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 1024)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const { activeDatesSet, completedDatesSet, missedDatesSet } = useMemo(() => {
        const todayIso = getLocalDateString()
        const dateMap: Record<string, { total: number, pending: number }> = {}

        localTasks.forEach(t => {
            if (!dateMap[t.due_date]) dateMap[t.due_date] = { total: 0, pending: 0 }
            dateMap[t.due_date].total++
            if (t.status === 'pending') dateMap[t.due_date].pending++
        })

        const pending = new Set<string>()
        const completed = new Set<string>()
        const missed = new Set<string>()

        Object.entries(dateMap).forEach(([date, stats]) => {
            if (stats.pending > 0) {
                if (date < todayIso) missed.add(date)
                else pending.add(date)
            } else if (stats.total > 0) {
                completed.add(date)
            }
        })

        return {
            activeDatesSet: pending,
            completedDatesSet: completed,
            missedDatesSet: missed
        }
    }, [localTasks])

    const drawerTasks = useMemo(() => {
        return localTasks.filter(t => t.due_date === drawerDate)
    }, [localTasks, drawerDate])

    const todayStr = getLocalDateString()
    const todaysTasks = useMemo(() => {
        return localTasks.filter(t => t.due_date === todayStr)
    }, [localTasks, todayStr])

    const firstMissedTask = useMemo(() => {
        return localTasks.find(t => t.status === 'pending' && t.due_date < todayStr)
    }, [localTasks, todayStr])

    const handleDrawerTasksUpdate = (updatedDrawerTasks: Task[]) => {
        setLocalTasks(prev => {
            const d = new Date(drawerDate + 'T12:00:00')
            d.setDate(d.getDate() + 1)
            const tomorrowStr = getLocalDateString(d)

            const updatedMap = new Map(updatedDrawerTasks.map(t => [t.id, t]))
            
            return prev.map(t => {
                if (t.due_date === drawerDate) {
                    const match = updatedMap.get(t.id)
                    if (match) {
                        return match
                    } else {
                        return { ...t, due_date: tomorrowStr }
                    }
                }
                return t
            })
        })
    }

    const handleSidebarToggle = async (taskId: string, currentStatus: string) => {
        haptics.medium()
        const newStatus = currentStatus === 'pending' ? 'completed' : 'pending'
        
        // Optimistic state updates
        setLocalTasks(prev => prev.map(t => 
            t.id === taskId 
                ? { ...t, status: newStatus as 'pending' | 'completed' } 
                : t
        ))
        
        // Economy Provider updates
        const task = localTasks.find(t => t.id === taskId)
        const GEM_REWARD: Record<number, number> = { 0: 0, 1: 1, 2: 1, 3: 1, 4: 2, 5: 3 }
        if (task) {
            const gemDelta = GEM_REWARD[task?.priority ?? 3] ?? 1
            const baseXp = task.priority && task.priority > 0 ? (task.priority * 10 + 10) : 10
            
            if (newStatus === 'completed') {
                setGems(prev => prev + gemDelta)
                setXp(prev => {
                    const nextXp = prev + baseXp
                    const xpNeeded = level * 100
                    if (nextXp >= xpNeeded) {
                        setLevel(l => l + 1)
                        return nextXp - xpNeeded
                    }
                    return nextXp
                })
            } else {
                setGems(prev => Math.max(0, prev - gemDelta))
                setXp(prev => Math.max(0, prev - baseXp))
            }
        }

        await toggleTask(taskId, currentStatus)
        router.refresh()
    }

    const handleRestoreAlignment = () => {
        if (!firstMissedTask) return
        haptics.medium()
        startPivotTransition(async () => {
            const result = await processPivot(firstMissedTask.goal_id)
            if (result?.error) {
                haptics.error()
                alert(result.error)
            } else {
                haptics.medium()
                if (result.tier === 2) {
                    setLives(prev => Math.max(0, prev - 1))
                }
                router.refresh()
            }
        })
    }

    const daysInMonth = useMemo(() => {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)

        const days = []
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null)
        }

        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = new Date(year, month, i)
            const y = date.getFullYear()
            const m = String(date.getMonth() + 1).padStart(2, '0')
            const d = String(date.getDate()).padStart(2, '0')
            const fullDate = `${y}-${m}-${d}`

            days.push({
                day: i,
                fullDate,
                isToday: date.toDateString() === new Date().toDateString()
            })
        }
        return days
    }, [currentMonth])

    // Compute the number of rows needed for the desktop grid
    const numRows = useMemo(() => {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth()
        const firstDayOffset = new Date(year, month, 1).getDay()
        const totalDays = new Date(year, month + 1, 0).getDate()
        return Math.ceil((firstDayOffset + totalDays) / 7)
    }, [currentMonth])

    // Helper for month navigation (shared between buttons and swipe)
    const goToPrevMonth = () => {
        haptics.light()
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    }
    const goToNextMonth = () => {
        haptics.light()
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    }

    // Swipe gesture for mobile month navigation
    const touchStartX = useRef(0)
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
    }
    const handleTouchEnd = (e: React.TouchEvent) => {
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (Math.abs(dx) > 50) {
            if (dx > 0) goToPrevMonth(); else goToNextMonth()
        }
    }

    const monthYear = mounted
        ? currentMonth.toLocaleString(locale, { month: 'long', year: 'numeric' })
        : ''

    const handleDateClick = (date: string) => {
        haptics.medium() // Tactile feedback on day selection
        if (onDateSelect) onDateSelect(date)
        setDrawerDate(date)
        setDrawerOpen(true)
    }

    if (!mounted) return <div className="flex-1" />

    // Desktop Splitscreen View (Standard flat grid + details right column panel)
    if (isDesktop) {
        return (
            <div className="w-full flex-1 flex gap-6 min-h-0 select-none pb-6">
                {/* Left/Center: Flat Calendar Grid */}
                <section className="flex-grow bg-[#161b2e]/30 backdrop-blur-xl border border-white/[0.08] rounded-2xl flex flex-col overflow-hidden relative p-6">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between pb-6 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-black text-white">{monthYear}</h2>
                            <div className="flex bg-[#1C2033]/50 rounded-lg p-1 border border-white/5">
                                <button onClick={goToPrevMonth}
                                    className="p-1 rounded hover:text-electric-blue hover:bg-white/5 transition-colors">
                                    <ChevronLeft className="w-5 h-5 text-white" />
                                </button>
                                <button onClick={goToNextMonth}
                                    className="p-1 rounded hover:text-electric-blue hover:bg-white/5 transition-colors">
                                    <ChevronRight className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 border-b border-white/5 bg-[#1C2033]/20 mt-4">
                        {weekdays.map((day) => (
                            <div key={day} className="py-2.5 text-center text-[10px] font-black text-electric-blue uppercase tracking-widest opacity-40">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Grid of Days */}
                    <div className="flex-1 grid grid-cols-7 gap-1 mt-1 overflow-y-auto no-scrollbar" style={{ gridTemplateRows: `repeat(${numRows}, 1fr)` }}>
                        {daysInMonth.map((day, idx) => {
                            if (!day) return <div key={`empty-${idx}`} className="border border-transparent p-2 min-h-[90px]" />

                             const isPending = activeDatesSet.has(day.fullDate)
                             const isCompleted = completedDatesSet.has(day.fullDate)
                             const isMissed = missedDatesSet.has(day.fullDate)

                             // Group tasks for this day
                             const dayTasks = localTasks.filter(t => t.due_date === day.fullDate)

                             const dayBg = 'hover:bg-white/[0.02]'
                             let borderClass = 'border-white/5'

                            if (day.isToday) {
                                borderClass = 'border-electric-blue/40 ring-1 ring-electric-blue/20 bg-electric-blue/[0.02]'
                            }

                            return (
                                <div
                                    key={day.fullDate}
                                    onClick={() => handleDateClick(day.fullDate)}
                                    className={`border ${borderClass} p-2.5 min-h-[95px] flex flex-col gap-1 transition-all ${dayBg} cursor-pointer group rounded-xl`}
                                >
                                    <div className="flex justify-between items-start mb-1 select-none">
                                        <span className={`text-[13px] font-black leading-none ${day.isToday ? 'text-electric-blue' : isPending ? 'text-white' : 'text-gray-500'}`}>
                                            {day.day}
                                        </span>
                                        {day.isToday && (
                                            <span className="text-[7px] font-black text-electric-blue uppercase tracking-wider bg-electric-blue/10 px-1.5 py-0.5 rounded">
                                                {t('plan.today')}
                                            </span>
                                        )}
                                    </div>

                                    {/* Render Task Pills */}
                                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
                                        {dayTasks.slice(0, 3).map((task) => {
                                            const isDone = task.status === 'completed'
                                            const isOverdue = task.status === 'pending' && task.due_date < getLocalDateString()
                                            
                                            let pillColor = 'bg-[#1C2033] border-l-2 border-electric-blue text-electric-blue hover:bg-electric-blue/10'
                                            if (isDone) {
                                                pillColor = 'bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-400 hover:bg-emerald-500/20'
                                            } else if (isOverdue) {
                                                pillColor = 'bg-rose-500/10 border-l-2 border-rose-500 text-rose-400 hover:bg-rose-500/20'
                                            }

                                            return (
                                                <div
                                                    key={task.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation() // Don't trigger cell click twice
                                                        handleDateClick(day.fullDate)
                                                    }}
                                                    className={`px-2 py-1 rounded text-[10px] font-bold truncate transition-colors ${pillColor}`}
                                                >
                                                    {task.title}
                                                </div>
                                            )
                                        })}
                                        {dayTasks.length > 3 && (
                                            <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-2">
                                                {t('plan.more_tasks').replace('{count}', (dayTasks.length - 3).toString())}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* Right Column: Today's Focus & CTA */}
                <section className="w-80 flex flex-col gap-6 shrink-0 overflow-y-auto pr-1">
                    {/* Missed Session CTA Card */}
                    {firstMissedTask && (
                        <div className="bg-[#161b2e]/30 backdrop-blur-xl border border-rose-500/20 p-5 rounded-2xl relative overflow-hidden group shrink-0">
                            {/* Warning red glow */}
                            <div className="absolute -top-10 -right-10 w-28 h-28 bg-rose-500/10 rounded-full blur-[30px] pointer-events-none group-hover:bg-rose-500/20 transition-all"></div>
                            
                            <div className="flex items-start gap-3 mb-4 relative z-10">
                                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/20">
                                    <AlertTriangle className="h-5 w-5 text-rose-500" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-rose-500 tracking-wider uppercase">{t('plan.timeline_fracture')}</h3>
                                    <p className="text-[10px] text-gray-400 mt-1 leading-normal font-semibold">
                                        {t('plan.timeline_fracture_desc').replace('{title}', firstMissedTask.title).replace('{date}', firstMissedTask.due_date)}
                                    </p>
                                </div>
                            </div>
                            
                            <button
                                onClick={handleRestoreAlignment}
                                disabled={pivotPending}
                                className="w-full relative z-10 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500 text-rose-400 font-black text-[9px] tracking-widest uppercase hover:bg-rose-500 hover:text-white transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-rose-500/5 disabled:opacity-40"
                            >
                                <Heart className="h-3.5 w-3.5 fill-current" />
                                {pivotPending ? t('plan.realigning') : t('plan.spend_life')}
                            </button>
                        </div>
                    )}

                    {/* Today's Focus Panel */}
                    <div className="bg-[#161b2e]/30 backdrop-blur-xl border border-white/[0.08] rounded-2xl flex flex-col flex-1 min-h-[300px]">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <Flame className="h-4 w-4 text-electric-blue" />
                                {t('plan.todays_focus')}
                            </h3>
                            <span className="bg-[#1C2033] px-2 py-0.5 rounded text-[9px] font-black text-gray-400 border border-white/5 uppercase">
                                {new Date().toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                            </span>
                        </div>

                        <div className="p-4 flex flex-col gap-2.5 flex-1 overflow-y-auto no-scrollbar">
                            {todaysTasks.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-center text-gray-500 text-xs italic">
                                    {t('plan.no_focus_sessions')}
                                </div>
                            ) : (
                                todaysTasks.map((task) => {
                                    const isDone = task.status === 'completed'
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => handleDateClick(task.due_date)}
                                            className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors cursor-pointer group"
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleSidebarToggle(task.id, task.status)
                                                }}
                                                className="w-5 h-5 rounded border border-white/15 hover:border-electric-blue/40 flex items-center justify-center mt-0.5 transition-all bg-black/20 shrink-0"
                                            >
                                                {isDone && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                                            </button>
                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-[12px] font-bold truncate transition-all ${isDone ? 'line-through text-gray-600' : 'text-gray-200 group-hover:text-electric-blue'}`}>
                                                    {task.title}
                                                </span>
                                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                                    <Clock className="h-2.5 w-2.5 text-gray-500" />
                                                    {task.duration_mins ?? 30} mins
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {/* Progress Indicator */}
                        {todaysTasks.length > 0 && (
                            <div className="mt-auto p-4 border-t border-white/5 shrink-0">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{t('plan.daily_completion')}</span>
                                    <span className="text-[10px] font-black text-electric-blue">
                                        {Math.round((todaysTasks.filter(t => t.status === 'completed').length / todaysTasks.length) * 100)}%
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-[#1C2033] rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="h-full bg-electric-blue rounded-full relative transition-all duration-500"
                                        style={{ width: `${(todaysTasks.filter(t => t.status === 'completed').length / todaysTasks.length) * 100}%` }}
                                    >
                                        <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/30 blur-[2px]"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <CalendarDrawer
                    isOpen={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    dateStr={drawerDate}
                    tasks={drawerTasks}
                    onTasksUpdate={handleDrawerTasksUpdate}
                />
            </div>
        )
    }

    return (
        <div className="w-full h-full flex flex-col perspective-1000 overflow-hidden">
            <div className="flex flex-col gap-6 mb-8 md:mb-16 px-4 md:px-8">
                <div className="flex items-center justify-between">
                    <h2 className={`${isIOSDevice ? 'text-xl' : 'text-3xl'} md:text-6xl font-black text-white tracking-tighter uppercase italic truncate mr-4 drop-shadow-2xl`}>
                        {monthYear}
                    </h2>
                    <div className="flex gap-2 md:gap-4 shrink-0 items-center">
                        <button 
                                onClick={() => { haptics.light(); setIs3D(prev => !prev) }}
                                className={`glass px-3.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border shrink-0 active:scale-95 ${
                                    is3D 
                                        ? 'bg-electric-blue/15 border-electric-blue/30 text-electric-blue shadow-[0_0_15px_rgba(0,240,255,0.15)]' 
                                        : 'bg-black/20 border-white/5 text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                {t('plan.mode_3d')}: {is3D ? 'ON' : 'OFF'}
                            </button>
                        <button onClick={goToPrevMonth}
                            className="glass p-3 md:p-6 rounded-xl md:rounded-[2rem] hover:bg-white/10 transition-all border border-white/5 active:scale-90 duration-200">
                            <ChevronLeft className="w-6 h-6 md:w-10 md:h-10 text-white" />
                        </button>
                        <button onClick={goToNextMonth}
                            className="glass p-3 md:p-6 rounded-xl md:rounded-[2rem] hover:bg-white/10 transition-all border border-white/5 active:scale-90 duration-200">
                            <ChevronRight className="w-6 h-6 md:w-10 md:h-10 text-white" />
                        </button>
                    </div>
                </div>
                <div className="w-20 h-1 bg-gradient-to-r from-electric-blue to-transparent rounded-full opacity-60" />
            </div>

            <div
                className="grid grid-cols-7 gap-2 md:gap-6 px-4 md:px-8 flex-1 transform-style-3d no-scrollbar pb-[calc(2.5rem+env(safe-area-inset-bottom))] md:pb-20"
                style={is3D ? { transform: 'rotateX(8deg)' } : {}}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {weekdays.map((day, i) => (
                    <div key={i} className="text-center text-[10px] md:text-xs font-black text-electric-blue uppercase tracking-[0.2em] opacity-40 mb-2 md:mb-4">
                        {day}
                    </div>
                ))}

                {daysInMonth.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} />

                    const isPending = activeDatesSet.has(day.fullDate)
                    const isCompleted = completedDatesSet.has(day.fullDate)
                    const isMissed = missedDatesSet.has(day.fullDate)

                    let statusClasses = 'border-white/5 bg-white/[0.02]'
                    let glowColor = ''
                    let glowHex = ''

                    if (isPending) {
                        statusClasses = 'border-electric-blue/30 bg-electric-blue/10 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                        glowColor = 'bg-electric-blue'
                        glowHex = '#00F0FF'
                    } else if (isCompleted) {
                        statusClasses = 'border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        glowColor = 'bg-emerald-500'
                        glowHex = '#10b981'
                    } else if (isMissed) {
                        statusClasses = 'border-rose-500/20 bg-rose-500/5 grayscale-[0.8] opacity-60'
                        glowColor = 'bg-rose-500'
                        glowHex = '#f43f5e'
                    }

                    return (
                        <motion.div
                            key={day.fullDate}
                            whileHover={isDesktop ? {
                                scale: 1.05,
                                translateZ: 20,
                                backgroundColor: 'rgba(255,255,255,0.08)'
                            } : undefined}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDateClick(day.fullDate)}
                            className={`
                                relative aspect-square rounded-xl md:rounded-[2rem] glass-card flex flex-col items-center justify-center cursor-pointer transition-all duration-300 border active:scale-95
                                ${statusClasses}
                                ${day.isToday ? 'ring-2 ring-electric-blue/40 ring-offset-1 ring-offset-transparent outline outline-1 md:outline-2 outline-white/30 outline-offset-1 md:outline-offset-4' : ''}
                            `}
                        >
                            <span className={`text-sm md:text-lg font-black tracking-tighter ${isPending || isCompleted ? 'text-white' : day.isToday ? 'text-electric-blue' : 'text-gray-500'}`}>
                                {day.day}
                            </span>

                            {(isPending || isCompleted || isMissed) && (
                                <div
                                    className={`absolute bottom-2 md:bottom-4 w-1.5 md:w-2 h-1.5 md:h-2 rounded-full ${glowColor}`}
                                    style={{ boxShadow: `0 0 6px ${glowHex}` }}
                                />
                            )}
                        </motion.div>
                    )
                })}
            </div>

            {/* Today quick-return button */}
            {(currentMonth.getMonth() !== new Date().getMonth() || currentMonth.getFullYear() !== new Date().getFullYear()) && (
                <button
                    onClick={() => {
                        haptics.light()
                        setCurrentMonth(new Date())
                    }}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-electric-blue text-white text-sm font-medium shadow-lg z-10 active:scale-95 transition-transform"
                    style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
                >
                    {t('plan.today')}
                </button>
            )}

            <CalendarDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                dateStr={drawerDate}
                tasks={drawerTasks}
                onTasksUpdate={handleDrawerTasksUpdate}
            />
        </div>
    )
}

