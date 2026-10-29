'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Sparkles,
  TrendingUp,
  LayoutDashboard,
  ArrowRight,
  Flame,
  Coins,
  CheckCircle2,
  Zap,
  Compass,
  Trophy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ReactiveAvatar } from '@/components/reactive-avatar'
import { ClientGreeting } from '@/components/client-greeting'
import { useLanguage } from '@/components/language-provider'
import { useEconomy } from '@/components/economy-provider'
import { translateGoal } from '@/utils/translations'
import { toggleTask } from '@/app/actions'
import { haptics } from '@/utils/haptics'
import { DailyQuestCard } from '@/components/daily-quest-card'
import { DailyChallengesCard } from '@/components/daily-challenges-card'
import { WeeklyStreakGlance } from '@/components/weekly-streak-glance'
import { QuickActionGrid } from '@/components/quick-action-grid'
import type { Task } from '@/utils/types'

interface DashboardClientProps {
  username: string
  profile: any
  goals: any[]
  todayStr: string
}

const SOCRATIC_QUOTES = [
  { quote: 'Small daily disciplines compounded over time yield extraordinary mastery.', author: 'LifePivot Daily' },
  { quote: 'The first principle is that you must not fool yourself — and you are the easiest person to fool.', author: 'Richard Feynman' },
  { quote: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Aristotle' },
  { quote: 'Concentrate every minute on doing what’s in front of you with precise and genuine seriousness.', author: 'Marcus Aurelius' },
  { quote: 'An unexamined study session is not worth repeating.', author: 'Socrates' },
]

const MAX_VISIBLE_QUESTS = 4

export function DashboardClient({
  username,
  profile,
  goals,
  todayStr,
}: DashboardClientProps) {
  const { t, locale } = useLanguage()
  const { xp, level, tokens, setXp, setLevel, setTokens, setGlobalFocusTask } = useEconomy()

  const [activeGoalId, setActiveGoalId] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'missions' | 'challenges'>('missions')
  const [localTasks, setLocalTasks] = useState<any[]>([])
  const [showAllQuests, setShowAllQuests] = useState(false)

  // Randomize / pick a daily socratic quote based on date string
  const dailyQuote = useMemo(() => {
    let hash = 0
    for (let i = 0; i < todayStr.length; i++) {
      hash = (hash << 5) - hash + todayStr.charCodeAt(i)
    }
    const idx = Math.abs(hash) % SOCRATIC_QUOTES.length
    return SOCRATIC_QUOTES[idx]
  }, [todayStr])

  // Hydration Guard: Load active plan from localStorage safely after mount
  useEffect(() => {
    setIsMounted(true)
    const storedActiveId = localStorage.getItem('lifepivot_active_goal_id')
    if (storedActiveId) {
      setActiveGoalId(storedActiveId)
    } else if (goals.length > 0) {
      setActiveGoalId(goals[0].id)
    }
  }, [goals])

  // Resolve the active goal (fallback to first plan during SSR or if active is invalid)
  const activeGoal = useMemo(() => {
    if (!isMounted && goals.length > 0) return goals[0]
    if (activeGoalId) {
      const match = goals.find((g) => g.id === activeGoalId)
      if (match) return match
    }
    return goals[0] || null
  }, [goals, activeGoalId, isMounted])

  // Translate goal details dynamically
  const translatedGoalData = useMemo(() => {
    return translateGoal(activeGoal, locale)
  }, [activeGoal, locale])

  // Sync tasks to local state for instant optimistic updates
  useEffect(() => {
    if (translatedGoalData?.tasks) {
      setLocalTasks(translatedGoalData.tasks)
    } else {
      setLocalTasks([])
    }
  }, [translatedGoalData?.tasks])

  // Tasks due today
  const todayTasks = useMemo(() => {
    return localTasks.filter((t: any) => t.due_date === todayStr && t.task_type !== 'void')
  }, [localTasks, todayStr])

  const pendingTodayTasks = useMemo(() => {
    return todayTasks.filter((t: any) => t.status === 'pending')
  }, [todayTasks])

  const completedTodayTasks = useMemo(() => {
    return todayTasks.filter((t: any) => t.status === 'completed')
  }, [todayTasks])

  // Sorted tasks: Pending first, completed after
  const sortedTodayTasks = useMemo(() => {
    return [...todayTasks].sort((a, b) => {
      if (a.status === 'pending' && b.status === 'completed') return -1
      if (a.status === 'completed' && b.status === 'pending') return 1
      return 0
    })
  }, [todayTasks])

  // Limit display to top 4 unless user explicitly expanded
  const visibleQuests = useMemo(() => {
    if (showAllQuests || sortedTodayTasks.length <= MAX_VISIBLE_QUESTS) {
      return sortedTodayTasks
    }
    return sortedTodayTasks.slice(0, MAX_VISIBLE_QUESTS)
  }, [sortedTodayTasks, showAllQuests])

  // Calculate stats dynamically on client side for the selected active goal
  const stats = useMemo(() => {
    if (!activeGoal) return null

    const realTasks = localTasks.filter((t: any) => t.task_type !== 'void')
    const completed = realTasks.filter((t: any) => t.status === 'completed').length
    const total = realTasks.length
    const todayPending = pendingTodayTasks.length
    const todayTotal = todayTasks.length

    // Streak
    const streak = profile?.current_streak ?? 0

    // Current plan day calculation
    const start = new Date(activeGoal.created_at)
    start.setHours(0, 0, 0, 0)
    const today = new Date(todayStr + 'T00:00:00')
    const currentDay = Math.max(
      1,
      Math.min(
        Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        activeGoal.duration_days
      )
    )

    return {
      completed,
      total,
      todayPending,
      todayTotal,
      streak,
      currentDay,
    }
  }, [activeGoal, localTasks, pendingTodayTasks.length, todayTasks.length, todayStr, profile?.current_streak])

  // Handle direct task toggle from dashboard
  const handleTaskToggle = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed'

    // 1. Optimistic local state update
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
    )

    // 2. Economy calculation
    const task = localTasks.find((t) => t.id === taskId)
    const tokenDelta =
      task?.priority === 4 ? 2 : task?.priority === 5 ? 3 : task?.priority && task.priority > 0 ? 1 : 1
    const baseXp = task?.priority && task.priority > 0 ? task.priority * 10 + 10 : 20

    if (nextStatus === 'completed') {
      setTokens((prev) => prev + tokenDelta)
      setXp((prev) => {
        const nextXp = prev + baseXp
        const needed = level * 100
        if (nextXp >= needed) {
          setLevel((l) => l + 1)
          return nextXp - needed
        }
        return nextXp
      })
    } else {
      setTokens((prev) => Math.max(0, prev - tokenDelta))
      setXp((prev) => Math.max(0, prev - baseXp))
    }

    // 3. Server action in background
    try {
      await toggleTask(taskId, currentStatus)
    } catch (err) {
      console.error('Failed to toggle task from dashboard:', err)
    }
  }

  // Handle direct 1-tap focus session from dashboard
  const handleFocusTask = (task: Task) => {
    setGlobalFocusTask(task, activeGoal?.title || "Today's Focus")
  }

  const userLevel = level || profile?.level || 1
  let levelTitleLocalized = t('dashboard.level_titles.pathseeker')
  if (userLevel >= 11) levelTitleLocalized = t('dashboard.level_titles.grandmaster')
  else if (userLevel >= 8) levelTitleLocalized = t('dashboard.level_titles.sage')
  else if (userLevel >= 5) levelTitleLocalized = t('dashboard.level_titles.scholar')
  else if (userLevel >= 3) levelTitleLocalized = t('dashboard.level_titles.acolyte')

  const xpNeeded = userLevel * 100
  const xpPercent = Math.min(100, Math.max(0, Math.round((xp / xpNeeded) * 100)))

  return (
    <div className="flex flex-col gap-6 lg:gap-8 py-2 sm:py-4 flex-1 w-full max-w-7xl mx-auto">
      {/* ─── Hero Welcome Section (Native Plus iOS Capsule) ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161B30] via-[#0F1322] to-[#070911] border border-white/10 p-5 sm:p-8 lg:p-10 shadow-2xl shrink-0">
        <div className="absolute top-0 right-0 p-6 lg:p-10 opacity-20 pointer-events-none">
          <Sparkles className="h-32 w-32 lg:h-48 lg:w-48 text-electric-blue" />
        </div>
        <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-neon-violet/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            {/* Header Badge Pills */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-electric-blue font-black tracking-[0.2em] uppercase text-[10px] bg-electric-blue/10 border border-electric-blue/20 px-2.5 py-0.5 rounded-full">
                {t('dashboard.title')}
              </span>

              {profile && (
                <span className="text-[10px] font-black text-neon-violet bg-neon-violet/10 border border-neon-violet/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {t('dashboard.lvl')} {userLevel} • {levelTitleLocalized}
                </span>
              )}

              {profile?.current_streak > 0 && (
                <span className="text-[10px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Flame className="w-2.5 h-2.5 fill-orange-400" />
                  {profile.current_streak} {t('dashboard.day_streak')}
                </span>
              )}
            </div>

            {/* Greeting */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
              <ClientGreeting />,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-blue via-soft-cyan to-neon-violet capitalize">
                {username}
              </span>
            </h1>

            {/* Status message */}
            <p className="text-slate-300 mt-3 text-xs sm:text-sm lg:text-base max-w-xl leading-relaxed">
              {stats
                ? stats.todayPending > 0
                  ? t('dashboard.sessions_left').replace('{count}', stats.todayPending.toString())
                  : stats.todayTotal > 0
                  ? t('dashboard.all_sessions_done')
                  : t('dashboard.no_sessions_scheduled')
                : t('dashboard.ready_continue')}
            </p>

            {/* Daily Socratic Spark Banner */}
            <div className="mt-4 sm:mt-5 p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md flex items-start gap-2.5 max-w-xl">
              <Sparkles className="w-4 h-4 text-electric-blue shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 italic leading-relaxed">
                "{dailyQuote.quote}"{' '}
                <span className="not-italic font-bold text-slate-400 ml-1">
                  — {dailyQuote.author}
                </span>
              </p>
            </div>
          </div>

          {/* Mobile Reactive Avatar */}
          <div className="flex md:hidden w-full justify-center shrink-0">
            <ReactiveAvatar />
          </div>

          {/* Desktop Professional Status Card */}
          <div className="hidden md:flex flex-col gap-3 bg-white/[0.03] border border-white/10 p-5 rounded-2xl select-none min-w-[240px]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center border border-white/10 shrink-0 shadow-md">
                <span className="text-white font-black text-lg tracking-wider uppercase">
                  {username.slice(0, 2)}
                </span>
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider">
                  {levelTitleLocalized}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {t('dashboard.status_focused')}
                  </span>
                </div>
              </div>
            </div>

            {/* Mini XP progress on hero */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>{xp} / {xpNeeded} XP</span>
                <span className="text-electric-blue">{xpPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-electric-blue to-neon-violet rounded-full transition-all duration-500"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Dashboard Grid ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 items-start">
        {/* ─── Left/Center Column: Plan Progress & Daily Quests (xl:col-span-2) ─── */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          {/* Live Progress Summary */}
          {stats ? (
            <div className="relative p-6 sm:p-7 rounded-3xl bg-[#141824]/80 border border-white/10 overflow-hidden glass-card">
              <div className="absolute top-0 right-0 w-64 h-64 bg-electric-blue/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />

              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <TrendingUp className="h-4 w-4 text-electric-blue" />
                      <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                        {t('dashboard.current_plan')}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-white">
                        {t('dashboard.day')} {stats.currentDay}
                      </span>
                      {translatedGoalData && (
                        <span className="text-xs sm:text-sm font-bold text-slate-400">
                          / {translatedGoalData.duration_days} ({translatedGoalData.title})
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    href="/plan"
                    onClick={() => haptics.light()}
                    className="flex items-center gap-1.5 text-xs font-black text-electric-blue hover:text-soft-cyan transition-colors bg-electric-blue/10 border border-electric-blue/20 px-3 py-1.5 rounded-xl active:scale-95"
                  >
                    <span>{t('dashboard.review_plan')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Completion Bar */}
                <div className="space-y-2 mt-1">
                  <div className="flex justify-between items-end">
                    <span className="text-xs sm:text-sm font-bold text-slate-300 tabular-nums">
                      {t('dashboard.sessions_completed')
                        .replace('{completed}', stats.completed.toString())
                        .replace('{total}', stats.total.toString())}
                    </span>
                    <span className="text-lg sm:text-xl font-extrabold text-electric-blue tabular-nums">
                      {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#0B0D17] rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-electric-blue via-soft-cyan to-neon-violet rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 lg:p-12 rounded-3xl bg-[#141824]/40 border border-dashed border-white/10 flex flex-col items-center justify-center text-center glass">
              <LayoutDashboard className="h-10 w-10 text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm font-medium mb-4">{t('dashboard.create_plan_desc')}</p>
              <Link
                href="/plan"
                className="px-5 py-2.5 rounded-2xl bg-electric-blue text-black font-black text-xs uppercase tracking-wider hover:bg-soft-cyan transition-colors"
              >
                {t('dashboard.go_plan_portal')}
              </Link>
            </div>
          )}

          {/* ─── Daily Quests & Challenges Hub (Native Plus) ─── */}
          <div className="p-5 sm:p-7 rounded-3xl bg-[#141824]/80 border border-white/10 flex-1 flex flex-col glass-card">
            {/* Header with Segmented Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-electric-blue" />
                  {t('dashboard.daily_quests')}
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  {todayTasks.length > MAX_VISIBLE_QUESTS && !showAllQuests
                    ? t('dashboard.quests_showing_count')
                        .replace('{visible}', visibleQuests.length.toString())
                        .replace('{total}', todayTasks.length.toString())
                    : t('dashboard.due_today').replace('{count}', todayTasks.length.toString())}
                </p>
              </div>

              {/* Segmented Controller (iOS Native Plus Pill) */}
              <div className="inline-flex p-1 rounded-2xl bg-black/40 border border-white/10 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    haptics.tier1.tick()
                    setActiveTab('missions')
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-1.5 ${
                    activeTab === 'missions'
                      ? 'bg-electric-blue/20 text-electric-blue border border-electric-blue/30 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Compass className="w-3 h-3" />
                  <span>{t('dashboard.missions')}</span>
                  {pendingTodayTasks.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-electric-blue text-black text-[10px] flex items-center justify-center font-black">
                      {pendingTodayTasks.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptics.tier1.tick()
                    setActiveTab('challenges')
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-1.5 ${
                    activeTab === 'challenges'
                      ? 'bg-neon-violet/20 text-neon-violet border border-neon-violet/30 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3 h-3" />
                  <span>{t('dashboard.challenges')}</span>
                </button>
              </div>
            </div>

            {/* Tab 1: Curriculum Mission Tasks */}
            {activeTab === 'missions' && (
              <div className="space-y-3 flex-1">
                {todayTasks.length > 0 ? (
                  <>
                    {visibleQuests.map((task: any, idx: number) => (
                      <DailyQuestCard
                        key={task.id}
                        task={task}
                        index={idx}
                        onToggle={handleTaskToggle}
                        onFocus={handleFocusTask}
                      />
                    ))}

                    {/* Show More / Show Less Toggle Button for Pivoted / High-Volume Quests */}
                    {todayTasks.length > MAX_VISIBLE_QUESTS && (
                      <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            haptics.tier1.tick()
                            setShowAllQuests((prev) => !prev)
                          }}
                          className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-xs font-black text-electric-blue flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
                        >
                          {showAllQuests ? (
                            <>
                              <span>{t('dashboard.show_top_quests').replace('{count}', MAX_VISIBLE_QUESTS.toString())}</span>
                              <ChevronUp className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              <span>
                                {t('dashboard.show_all_quests').replace(
                                  '{count}',
                                  todayTasks.length.toString()
                                )}
                              </span>
                              <ChevronDown className="w-4 h-4" />
                            </>
                          )}
                        </button>

                        <Link
                          href="/plan"
                          onClick={() => haptics.light()}
                          className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-xs font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                        >
                          <span>{t('dashboard.explore_roadmap')}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}

                    {/* All Completed Celebration Card */}
                    {pendingTodayTasks.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center flex flex-col items-center justify-center mt-3 shadow-lg"
                      >
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                          <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                        </div>
                        <h4 className="text-sm sm:text-base font-black text-white">
                          {t('dashboard.all_quests_completed_title')}
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 max-w-md">
                          {t('dashboard.all_quests_completed_desc')}
                        </p>
                        <Link
                          href="/plan"
                          className="mt-3.5 inline-flex items-center gap-1 text-xs font-black text-emerald-400 hover:underline uppercase tracking-wider"
                        >
                          <span>{t('dashboard.explore_roadmap')}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </motion.div>
                    )}
                  </>
                ) : (
                  /* Empty state when no quests are scheduled for today */
                  <div className="p-8 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                      <Zap className="h-6 w-6 text-slate-500" />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">
                      {t('dashboard.no_quests_today')}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs mb-4">
                      {t('dashboard.no_sessions_scheduled')}
                    </p>
                    <Link
                      href="/plan"
                      className="px-4 py-2 rounded-xl bg-electric-blue/15 text-electric-blue border border-electric-blue/30 text-xs font-black uppercase tracking-wider hover:bg-electric-blue/25 transition-all"
                    >
                      {t('dashboard.explore_roadmap')}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Gamified Habit Challenges */}
            {activeTab === 'challenges' && (
              <DailyChallengesCard
                completedTasksCount={completedTodayTasks.length}
                streakCount={profile?.current_streak ?? 0}
                todayStr={todayStr}
              />
            )}
          </div>
        </div>

        {/* ─── Right Column: Widgets, Streak & Mastery (xl:col-span-1) ─── */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          {/* 1. Weekly Consistency Glance (Apple Health style) */}
          <WeeklyStreakGlance
            currentStreak={profile?.current_streak ?? 0}
            streakShieldsCount={profile?.streak_shields_count ?? 0}
            todayStr={todayStr}
          />

          {/* 2. Quick Action Grid (4 native iOS touch tiles) */}
          <QuickActionGrid
            currentDay={stats?.currentDay}
            nextTask={pendingTodayTasks[0] || null}
            goalTitle={activeGoal?.title}
          />

          {/* 3. Level Progression & Mastery Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#141824]/80 border border-white/10 glass-card">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                {t('dashboard.level_progress_title')}
              </h3>
              <span className="text-xs font-black text-neon-violet bg-neon-violet/10 border border-neon-violet/20 px-2.5 py-0.5 rounded-full">
                {levelTitleLocalized}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-baseline text-xs font-semibold">
                <span className="text-slate-300">
                  {t('dashboard.lvl')} {userLevel}
                </span>
                <span className="text-slate-400 tabular-nums">
                  {xp} / {xpNeeded} XP
                </span>
              </div>

              <div className="w-full h-2 bg-[#0B0D17] rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-neon-violet to-electric-blue rounded-full transition-all duration-700"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-white/5 text-[11px] font-bold text-slate-400">
                <div className="flex items-center gap-1.5 text-yellow-400">
                  <Coins className="w-3.5 h-3.5" />
                  <span>{tokens} Tokens</span>
                </div>
                <div className="flex items-center gap-1.5 text-orange-400">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{profile?.current_streak ?? 0} Days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
