'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { DateSelector } from '@/components/date-selector'
import { TodaysFocusHeader } from '@/components/todays-focus-header'
import { GoalSection } from '@/components/goal-section'
import { LearningPlanCreator } from '@/components/learning-plan-creator'
import { ResetPlanButton } from '@/components/reset-plan-button'
import { PlanProgressCard } from '@/components/plan-progress-card'
import { getLocalDateString } from '@/utils/date-utils'
import { List, Network } from 'lucide-react'
import { MindMap } from '@/components/mind-map'
import { haptics } from '@/utils/haptics'
import { useEconomy } from '@/components/economy-provider'
import { useLanguage } from '@/components/language-provider'

interface PlanClientProps {
    user: any
    goals: any[] | null
    goalsError: any
}

export function PlanClient({ user, goals, goalsError }: PlanClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const urlDate = searchParams.get('date')

    const [selectedDate, setSelectedDate] = useState(urlDate || getLocalDateString())
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
    const { setGems } = useEconomy()
    const { t } = useLanguage()

    const handleSelectDate = useCallback((date: string) => {
        setSelectedDate(date)
        router.push(`/plan?date=${date}`, { scroll: false })
    }, [router])

    useEffect(() => {
        if (urlDate) {
            setSelectedDate(urlDate)
        }
    }, [urlDate])

    if (!user) return null

    const totalRemaining = goals?.reduce((acc, goal) => {
        return acc + goal.tasks.filter((t: any) => t.status === 'pending').length
    }, 0) || 0

    return (
        <div className="flex flex-col gap-6 pb-48 w-full max-w-7xl mx-auto pt-4">
            {!goalsError && goals && goals.length > 0 && (
                <div className="flex items-center justify-between px-6 pb-2">
                    <div className="flex flex-col">
                        <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                            {viewMode === 'list' ? t('plan.todays_focus') : t('plan.learning_map')}
                        </h2>
                        <span className="text-sm text-gray-400 mt-1">
                            {viewMode === 'list' 
                                ? t('plan.sessions_remaining').replace('{count}', totalRemaining.toString()) 
                                : t('plan.interactive_roadmap')}
                        </span>
                    </div>
                    
                    {/* View switcher Segment Control */}
                    <div className="bg-[#141824] p-1 rounded-2xl border border-white/5 flex gap-0.5 shadow-md">
                        <button
                            onClick={() => { haptics.light(); setViewMode('list') }}
                            className={`p-2 lg:px-4 rounded-xl transition-all active:scale-90 flex items-center gap-2 ${viewMode === 'list' ? 'bg-electric-blue/15 text-electric-blue border border-electric-blue/20' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                            <span className="hidden md:inline text-xs font-bold uppercase tracking-wider">{t('plan.list_view')}</span>
                        </button>
                        <button
                            onClick={() => { haptics.light(); setViewMode('map') }}
                            className={`p-2 lg:px-4 rounded-xl transition-all active:scale-90 flex items-center gap-2 ${viewMode === 'map' ? 'bg-electric-blue/15 text-electric-blue border border-electric-blue/20' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}
                            title="Mind Map View"
                        >
                            <Network className="w-4 h-4" />
                            <span className="hidden md:inline text-xs font-bold uppercase tracking-wider">{t('plan.map_view')}</span>
                        </button>
                    </div>
                </div>
            )}

            {!goalsError && goals && goals.length > 0 && viewMode === 'list' && (
                <div className="px-6">
                    <DateSelector
                        selectedDate={selectedDate}
                        onSelectDate={handleSelectDate}
                    />
                </div>
            )}

            <div className="px-6 space-y-6 pt-2">
                {goalsError && (
                    <div className="p-8 rounded-[2.5rem] border border-red-500/20 bg-[#141217] text-center shadow-[0_0_40px_rgba(239,68,68,0.05)] relative overflow-hidden">
                        <h3 className="text-xl font-bold text-red-400 mb-3">Database Out of Sync</h3>
                        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                            Your Supabase API hasn't recognized the new data structure yet.
                        </p>
                        <div className="text-xs font-mono bg-black/50 p-4 rounded-2xl text-left text-red-300 border border-red-500/10 break-words mb-8">
                            {goalsError.message || JSON.stringify(goalsError)}
                        </div>
                        <p className="text-xs text-gray-500 uppercase tracking-[0.2em] font-black mb-4">Fix Connection</p>
                        <div className="relative text-[11px] font-mono bg-black/60 p-4 rounded-2xl text-electric-blue border border-electric-blue/20 select-all">
                            NOTIFY pgrst, 'reload schema';
                        </div>
                        <p className="mt-4 text-[10px] text-gray-500 italic">Run this in your SQL Editor.</p>
                    </div>
                )}

                {!goalsError && (!goals || goals.length === 0) ? (
                    <div className="mt-8 max-w-2xl mx-auto">
                        <LearningPlanCreator />
                    </div>
                ) : !goalsError && goals && goals.length > 0 && (
                    <>
                        {viewMode === 'list' ? (
                            <>
                                {goals.map((goal) => (
                                    <div key={goal.id} className="flex flex-col xl:flex-row gap-8 w-full items-start">
                                        {/* Left Column: Progress Card */}
                                        <div className="flex-1 min-w-0 w-full">
                                            <PlanProgressCard
                                                goalTitle={goal.title}
                                                createdAt={goal.created_at}
                                                durationDays={goal.duration_days}
                                                tasks={goal.tasks}
                                            />
                                        </div>
                                        {/* Right Column: Goal Section / Tasks */}
                                        <div className="w-full xl:w-[450px] shrink-0 xl:sticky xl:top-24">
                                            <div className="bg-[#141824]/60 border border-white/5 p-6 rounded-[2.5rem] glass-card">
                                                <GoalSection
                                                    goal={goal as any}
                                                    selectedDate={selectedDate}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="pt-12 pb-8 border-t border-white/5 flex flex-col items-center mt-8">
                                    <p className="text-xs text-gray-500 mb-4 uppercase tracking-widest font-bold">{t('profile.danger')}</p>
                                    <ResetPlanButton />
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-[600px] lg:h-[800px] border border-white/5 rounded-[2.5rem] overflow-hidden bg-[#141824]/30">
                                <MindMap 
                                    goal={goals[0]} 
                                    onOptimisticGemUpdate={(delta) => setGems(prev => Math.max(0, prev + delta))}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
