'use client'

import { useState, useMemo, useEffect } from 'react'
import { Sparkles, Calendar, Zap, LayoutDashboard, Flame, TrendingUp, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { CircadianChests } from '@/components/circadian-chests'
import { ReactiveAvatar } from '@/components/reactive-avatar'
import { SocraticCheckpointBattle } from '@/components/socratic-checkpoint-battle'
import { ClientGreeting } from '@/components/client-greeting'
import { useLanguage } from '@/components/language-provider'
import { translateGoal } from '@/utils/translations'
import { checkCheckpointBattleDue } from '@/app/actions'

interface DashboardClientProps {
  username: string
  profile: any
  dueCardsCount: number
  goals: any[]
  todayStr: string
}

export function DashboardClient({
  username,
  profile,
  dueCardsCount,
  goals,
  todayStr
}: DashboardClientProps) {
  const { t, locale } = useLanguage()

  const [activeGoalId, setActiveGoalId] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [checkpointBattle, setCheckpointBattle] = useState<any>(null)

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
      const match = goals.find(g => g.id === activeGoalId)
      if (match) return match
    }
    return goals[0] || null
  }, [goals, activeGoalId, isMounted])

  // Translate goal details dynamically
  const translatedGoalData = useMemo(() => {
    return translateGoal(activeGoal, locale)
  }, [activeGoal, locale])

  // Calculate stats dynamically on client side for the selected active goal
  const stats = useMemo(() => {
    if (!activeGoal) return null
    
    const tasks = activeGoal.tasks || []
    const realTasks = tasks.filter((t: any) => t.task_type !== 'void')
    const completed = realTasks.filter((t: any) => t.status === 'completed').length
    const total = realTasks.length
    const todayTasks = realTasks.filter((t: any) => t.due_date === todayStr)
    const todayPending = todayTasks.filter((t: any) => t.status === 'pending').length
    
    // Streak
    const streak = profile?.current_streak ?? 0

    // Current plan day calculation
    const start = new Date(activeGoal.created_at)
    start.setHours(0, 0, 0, 0)
    const today = new Date(todayStr + 'T00:00:00')
    const currentDay = Math.max(1, Math.min(
      Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      activeGoal.duration_days
    ))

    return { 
      completed, 
      total, 
      todayPending, 
      todayTotal: todayTasks.length, 
      streak, 
      currentDay 
    }
  }, [activeGoal, todayStr, profile?.current_streak])

  // Fetch Socratic Checkpoint Battle dynamically for the active goal on mount/change
  useEffect(() => {
    if (activeGoal?.id) {
      checkCheckpointBattleDue(activeGoal.id).then(battleCheck => {
        if (battleCheck.due) {
          setCheckpointBattle(battleCheck)
        } else {
          setCheckpointBattle(null)
        }
      }).catch(e => {
        console.error('Failed to check checkpoint battle due:', e)
        setCheckpointBattle(null)
      })
    } else {
      setCheckpointBattle(null)
    }
  }, [activeGoal?.id])

  const userLevel = profile?.level ?? 1
  let levelTitleLocalized = t('dashboard.level_titles.pathseeker')
  if (userLevel >= 11) levelTitleLocalized = t('dashboard.level_titles.grandmaster')
  else if (userLevel >= 8) levelTitleLocalized = t('dashboard.level_titles.sage')
  else if (userLevel >= 5) levelTitleLocalized = t('dashboard.level_titles.scholar')
  else if (userLevel >= 3) levelTitleLocalized = t('dashboard.level_titles.acolyte')

  return (
    <div className="flex flex-col gap-5 sm:gap-6 lg:gap-8 py-4 flex-1 w-full max-w-7xl mx-auto">
      {checkpointBattle && translatedGoalData && (
        <SocraticCheckpointBattle
          goalId={translatedGoalData.id}
          wallDate={checkpointBattle.date}
          wallLabel={checkpointBattle.label}
        />
      )}
      {/* Hero Welcome Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A1F36] to-[#0B0D17] border border-white/5 p-5 sm:p-8 lg:p-12 shadow-2xl shrink-0">
        <div className="absolute top-0 right-0 p-6 lg:p-10 opacity-20 pointer-events-none">
          <Sparkles className="h-32 w-32 lg:h-48 lg:w-48 text-electric-blue" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <p className="text-electric-blue font-bold tracking-[0.2em] uppercase text-[11px] mb-2 lg:mb-4">
              {t('dashboard.title')}
            </p>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
              <ClientGreeting />,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-blue to-neon-violet capitalize mr-3">
                {username}
              </span>
              {profile && (
                <span className="text-xs lg:text-sm font-black text-neon-violet bg-neon-violet/10 border border-neon-violet/20 px-3 py-1 rounded-full inline-block align-middle select-none">
                  {t('dashboard.lvl')} {profile.level}
                </span>
              )}
            </h1>
            <p className="text-gray-400 mt-4 lg:mt-6 text-sm lg:text-base max-w-none sm:max-w-md leading-relaxed">
              {stats
                ? stats.todayPending > 0
                  ? t('dashboard.sessions_left').replace('{count}', stats.todayPending.toString())
                  : stats.todayTotal > 0
                    ? t('dashboard.all_sessions_done')
                    : t('dashboard.no_sessions_scheduled')
                : t('dashboard.ready_continue')
              }
            </p>
          </div>
          {/* Mobile Reactive Avatar */}
          <div className="flex md:hidden justify-start shrink-0">
            <ReactiveAvatar />
          </div>

          {/* Desktop Professional Monogram & Status */}
          <div className="hidden md:flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl select-none">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center border border-white/10 shrink-0 shadow-md">
              <span className="text-white font-black text-xl tracking-wider uppercase">
                {username.slice(0, 2)}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-left">
              <p className="text-xs font-black text-white uppercase tracking-wider">
                {profile ? levelTitleLocalized : t('dashboard.level_titles.pathseeker')}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  {t('dashboard.status_focused')}
                </span>
              </div>
              {profile && (
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {t('dashboard.shields_equipped').replace('{count}', profile.streak_shields_count.toString())}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      {userLevel < 2 ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#141824] to-[#0B0D17] border border-white/5 p-8 text-center flex flex-col items-center justify-center min-h-[350px] shadow-2xl glass-card w-full">
          <div className="absolute top-0 right-0 w-64 h-64 bg-electric-blue/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-electric-blue/10 flex items-center justify-center border border-electric-blue/20 mb-6 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
            <Zap className="h-8 w-8 text-electric-blue" />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider mb-2">Next Checkpoint</h2>
          <p className="text-gray-400 text-sm max-w-md leading-relaxed mb-6">
            Complete your first study milestone to unlock your dashboard.
          </p>

          {/* Progress Bar towards Level 2 (1000 XP) */}
          <div className="w-full max-w-sm mb-8 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress to Level 2</span>
              <span className="text-xs font-black text-electric-blue">{profile?.xp ?? 0} / 1000 XP</span>
            </div>
            <div className="w-full bg-[#0B0D17] h-2 rounded-full overflow-hidden border border-white/5 shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-electric-blue to-neon-violet transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                style={{ width: `${Math.min(100, Math.max(0, ((profile?.xp ?? 0) / 1000) * 100))}%` }}
              />
            </div>
          </div>

          <Link
            href="/plan"
            className="px-6 py-3.5 rounded-xl border border-electric-blue/30 text-electric-blue bg-electric-blue/5 font-black text-xs tracking-widest uppercase hover:bg-electric-blue hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(0,240,255,0.08)] active:scale-95 animate-pulse"
          >
            Go to Plan Portal
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
          
          {/* Left/Center Column: Progress & Daily Quests */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            
            {/* Live Progress Summary */}
            {stats ? (
              <div className="relative p-6 lg:p-8 rounded-3xl bg-[#141824]/80 border border-white/5 overflow-hidden glass-card">
                <div className="absolute top-0 right-0 w-64 h-64 bg-electric-blue/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />

                <div className="relative z-10 flex flex-col gap-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-electric-blue" />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                          {t('dashboard.current_plan')}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">{t('dashboard.day')} {stats.currentDay}</span>
                        {translatedGoalData && <span className="text-sm font-bold text-gray-500">/ {translatedGoalData.duration_days}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Completion bar */}
                <div className="space-y-3 mt-2">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-gray-400 tabular-nums">
                      {t('dashboard.sessions_completed').replace('{completed}', stats.completed.toString()).replace('{total}', stats.total.toString())}
                    </span>
                    <span className="text-xl font-extrabold text-electric-blue">
                      {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-[#0B0D17] rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-electric-blue to-neon-violet shadow-[0_0_15px_rgba(0,240,255,0.8)] rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%` }}
                    >
                      <div className="absolute right-0 top-0 bottom-0 w-8 bg-white/30 blur-[4px]"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 lg:p-12 rounded-3xl bg-[#141824]/30 border border-dashed border-white/10 flex flex-col items-center justify-center text-center glass">
                <LayoutDashboard className="h-10 w-10 text-gray-600 mb-4" />
                <p className="text-gray-400 text-sm font-medium">{t('dashboard.create_plan_desc')}</p>
              </div>
            )}

            {/* Daily Quests List */}
            {stats && (
              <div className="p-6 lg:p-8 rounded-3xl bg-[#141824]/60 border border-white/5 flex-1 flex flex-col glass-card">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-white">{t('dashboard.daily_quests')}</h3>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
                    {t('dashboard.completed_count').replace('{completed}', (stats.todayTotal - stats.todayPending).toString()).replace('{total}', stats.todayTotal.toString())}
                  </span>
                </div>
                
                <div className="space-y-3 flex-1">
                  {translatedGoalData?.tasks && translatedGoalData.tasks.filter((t: any) => t.due_date === todayStr).length > 0 ? (
                    translatedGoalData.tasks
                      .filter((t: any) => t.due_date === todayStr && t.task_type !== 'void')
                      .map((task: any) => {
                        const isDone = task.status === 'completed'
                        return (
                          <Link href="/plan" key={task.id} className="block active:scale-[0.99] transition-transform">
                            <div className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200 ${
                              isDone 
                                ? 'bg-[#1C2136]/30 border-white/5 opacity-60 line-through' 
                                : 'bg-[#1C2136]/80 border-electric-blue/20 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:border-electric-blue/40'
                            }`}>
                              <div className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 ${
                                isDone ? 'bg-electric-blue border-electric-blue' : 'border-gray-600 bg-[#0B0D17]'
                              }`}>
                                {isDone && <Sparkles className="w-3.5 h-3.5 text-black" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-bold truncate transition-colors ${
                                  isDone ? 'text-gray-400' : 'text-white group-hover:text-electric-blue'
                                }`}>{task.title || t('dashboard.focus_session')}</h4>
                                <p className="text-[11px] text-gray-500 mt-1 uppercase tracking-wider font-semibold">
                                  {task.task_type} • {task.duration_mins} mins
                                </p>
                              </div>
                              {!isDone && (
                                <div className="flex items-center bg-[#0B0D17] rounded-full px-2.5 py-1 border border-electric-blue/30 shadow-[0_0_10px_rgba(0,240,255,0.15)]">
                                  <span className="font-black text-[11px] text-electric-blue">+{task.priority * 10} XP</span>
                                </div>
                              )}
                            </div>
                          </Link>
                        )
                      })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center opacity-60">
                      <Zap className="h-8 w-8 text-gray-600 mb-3" />
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{t('dashboard.no_quests_today')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Quick Actions & Streak Wager */}
          <div className="xl:col-span-1 flex flex-col gap-6">
            <div className="p-6 rounded-3xl bg-[#141824]/60 border border-white/5 glass-card">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">{t('dashboard.quick_actions')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                <Link href="/plan" className="group p-5 rounded-2xl bg-[#1C2136]/50 border border-white/5 hover:border-electric-blue/30 hover:bg-[#1C2136] transition-all relative overflow-hidden active:scale-[0.98]">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-electric-blue/10 rounded-full blur-[30px] group-hover:bg-electric-blue/20 transition-all pointer-events-none" />
                  <div className="h-12 w-12 rounded-[1rem] bg-electric-blue/10 flex items-center justify-center border border-electric-blue/20 mb-3 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-[0_0_15px_rgba(0,240,255,0.1)]">
                    <Calendar className="h-6 w-6 text-electric-blue" />
                  </div>
                  <h3 className="text-white font-bold text-sm">{t('dashboard.review_plan')}</h3>
                  <p className="text-[11px] text-gray-400 uppercase font-black tracking-widest mt-1">
                    {stats ? `${t('dashboard.day')} ${stats.currentDay}` : t('dashboard.no_plan')}
                  </p>
                </Link>
              </div>
            </div>

            <CircadianChests />
          </div>
        </div>
      )}
    </div>
  )
}
