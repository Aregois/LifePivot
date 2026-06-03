'use client'

import { useState, useEffect, useTransition } from 'react'
import { 
    User, Award, Flame, CheckCircle, Clock, Diamond, 
    Sparkles, BookOpen, LogOut, Settings, ToggleLeft, ToggleRight, 
    Palette, Headphones, ShieldAlert, Cpu, Check, Loader2, CalendarRange,
    EyeOff, HelpCircle, Globe
} from 'lucide-react'
import { haptics as webHaptics } from '@/utils/haptics'
import { useEconomy } from './economy-provider'
import { claimAchievementReward } from '@/app/actions'
import { AvatarIcon, AVATAR_LIST } from './avatar-icons'
import { getLocalDateString } from '@/utils/date-utils'
import { useSearchParams } from 'next/navigation'
import { FlashcardsDeck } from './flashcards-deck'
import { RecallPit } from './recall-pit'
import { useLanguage } from '@/components/language-provider'
import { LANGUAGE_NAMES } from '@/utils/translations'
import { PathseekerLeagues } from './pathseeker-leagues'

const GEM_REWARD: Record<number, number> = { 0: 0, 1: 1, 2: 1, 3: 1, 4: 2, 5: 3 }

const IconMap: Record<string, any> = {
    first_focus: CheckCircle,
    recall_master: BookOpen,
    deep_learner: Sparkles,
    streak_starter: Flame
}

interface ProfileClientProps {
    username: string
    level: number
    xp: number
    title: string
    totalCompleted: number
    totalFocusMins: number
    currentStreak: number
    achievements: {
        id: string
        title: string
        description: string
        unlocked: boolean
        iconId: string
        color: string
        glowColor: string
    }[]
    completedToday?: number
    focusToday?: number
    signOutAction: () => void
    completedDates?: string[]
}

type TabType = 'mastery' | 'flashcards' | 'cosmetics' | 'settings' | 'recall-pit' | 'leagues'
type AccentType = 'blue' | 'violet' | 'green' | 'sunset'
type PersonaType = 'feynman' | 'socrates' | 'stoic'
type SoundscapeType = 'none' | 'space' | 'rain' | 'binaural' | 'cafe' | 'greenhouse'

const TITLE_NAMES: Record<string, string> = {
    title_scholar: 'Scholar',
    title_alchemist: 'Alchemist',
    title_navigator: 'Mind Navigator',
    title_legend: 'Focus Legend'
}

const ACHIEVEMENT_REWARDS: Record<string, { xp: number; gems: number }> = {
    first_focus: { xp: 20, gems: 3 },
    recall_master: { xp: 30, gems: 5 },
    deep_learner: { xp: 40, gems: 8 },
    streak_starter: { xp: 50, gems: 10 }
}

export function ProfileClient({
    username,
    level: initialLevel,
    xp: initialXp,
    title: dbTitle,
    totalCompleted,
    totalFocusMins,
    currentStreak,
    achievements,
    completedToday = 0,
    focusToday = 0,
    signOutAction,
    completedDates = []
}: ProfileClientProps) {
    const { setGems, setXp, setLevel, level, xp, avatarId, setAvatarId } = useEconomy()
    const { t, locale, setLocale } = useLanguage()
    const [activeTab, setActiveTab] = useState<TabType>('mastery')
    const [mounted, setMounted] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [claimingId, setClaimingId] = useState<string | null>(null)

    const searchParams = useSearchParams()
    const [mindfulModeEnabled, setMindfulModeEnabled] = useState(false)
    const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null)

    useEffect(() => {
        const t = searchParams.get('tab') as TabType
        if (t && ['mastery', 'flashcards', 'cosmetics', 'settings', 'recall-pit', 'leagues'].includes(t)) {
            setActiveTab(t)
        }
    }, [searchParams])

    const todayStr = getLocalDateString()

    const weekDays = (() => {
        const days = []
        const today = new Date()
        const currentDayIndex = today.getDay()
        const distanceToMon = currentDayIndex === 0 ? 6 : currentDayIndex - 1
        
        const monday = new Date(today)
        monday.setDate(today.getDate() - distanceToMon)
        monday.setHours(0, 0, 0, 0)

        const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

        for (let i = 0; i < 7; i++) {
            const date = new Date(monday)
            date.setDate(monday.getDate() + i)
            const dateStr = getLocalDateString(date)
            const isCompleted = completedDates.includes(dateStr)
            
            days.push({
                name: dayNames[i],
                dateStr,
                isToday: dateStr === todayStr,
                isFuture: date > today && dateStr !== todayStr,
                isCompleted
            })
        }
        return days
    })()

    // Settings states
    const [accent, setAccent] = useState<AccentType>('blue')
    const [duration, setDuration] = useState<number>(30)
    const [persona, setPersona] = useState<PersonaType>('feynman')
    const [soundscape, setSoundscape] = useState<SoundscapeType>('none')
    const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true)

    // Cosmetics states
    const [equippedTitle, setEquippedTitle] = useState<string>('title_scholar')
    const [equippedFrame, setEquippedFrame] = useState<string>('frame_standard')
    const [unlockedTitles, setUnlockedTitles] = useState<string[]>(['title_scholar'])
    const [unlockedFrames, setUnlockedFrames] = useState<string[]>(['frame_standard'])
    const [claimedAchievements, setClaimedAchievements] = useState<string[]>([])
    const [claimedQuests, setClaimedQuests] = useState<string[]>([])

    // Daily Quest States
    const dailyQuests = [
        {
            id: 'daily_focus',
            title: 'Deep Focus',
            description: 'Study for 25 minutes in Focus Mode today.',
            progress: focusToday,
            target: 25,
            xpReward: 15,
            gemReward: 2
        },
        {
            id: 'daily_tasks',
            title: 'Task Crusher',
            description: 'Complete 2 tasks today.',
            progress: completedToday,
            target: 2,
            xpReward: 15,
            gemReward: 2
        },
        {
            id: 'daily_streak',
            title: 'Streak Builder',
            description: 'Finish 1 task today.',
            progress: completedToday >= 1 ? 1 : 0,
            target: 1,
            xpReward: 10,
            gemReward: 1
        }
    ]

    // Load settings from localStorage
    useEffect(() => {
        setMounted(true)
        setAccent((localStorage.getItem('lifepivot_accent') as AccentType) || 'blue')
        setDuration(Number(localStorage.getItem('lifepivot_duration') || 30))
        setPersona((localStorage.getItem('lifepivot_persona') as PersonaType) || 'feynman')
        setSoundscape((localStorage.getItem('lifepivot_soundscape') as SoundscapeType) || 'none')
        setHapticsEnabled(localStorage.getItem('lifepivot_haptics') !== 'false')
        setMindfulModeEnabled(localStorage.getItem('lifepivot_mindful_mode') === 'true')

        setEquippedTitle(localStorage.getItem('lifepivot_equipped_title') || 'title_scholar')
        setEquippedFrame(localStorage.getItem('lifepivot_equipped_frame') || 'frame_standard')
        setUnlockedTitles(JSON.parse(localStorage.getItem('lifepivot_unlocked_titles') || '["title_scholar"]'))
        setUnlockedFrames(JSON.parse(localStorage.getItem('lifepivot_unlocked_frames') || '["frame_standard"]'))
        setClaimedAchievements(JSON.parse(localStorage.getItem('lifepivot_claimed_achievements') || '[]'))
        
        // Load claimed quests for today
        const questDate = localStorage.getItem('lifepivot_claimed_quests_date')
        const todayStr = new Date().toDateString()
        if (questDate === todayStr) {
            setClaimedQuests(JSON.parse(localStorage.getItem('lifepivot_claimed_quests') || '[]'))
        } else {
            localStorage.setItem('lifepivot_claimed_quests_date', todayStr)
            localStorage.setItem('lifepivot_claimed_quests', '[]')
            setClaimedQuests([])
        }
    }, [])

    const handleAccentChange = (nextAccent: AccentType) => {
        if (hapticsEnabled) webHaptics.medium()
        setAccent(nextAccent)
        localStorage.setItem('lifepivot_accent', nextAccent)

        // Apply style overrides immediately to document element
        const root = document.documentElement
        if (nextAccent === 'violet') {
            root.style.setProperty('--color-electric-blue', '#bd00ff')
            root.style.setProperty('--color-neon-violet', '#ff00a0')
        } else if (nextAccent === 'green') {
            root.style.setProperty('--color-electric-blue', '#10b981')
            root.style.setProperty('--color-neon-violet', '#059669')
        } else if (nextAccent === 'sunset') {
            root.style.setProperty('--color-electric-blue', '#f59e0b')
            root.style.setProperty('--color-neon-violet', '#d97706')
        } else {
            root.style.setProperty('--color-electric-blue', '#00f0ff')
            root.style.setProperty('--color-neon-violet', '#bd00ff')
        }
    }

    const handleDurationChange = (nextDuration: number) => {
        if (hapticsEnabled) webHaptics.light()
        setDuration(nextDuration)
        localStorage.setItem('lifepivot_duration', String(nextDuration))
    }

    const handlePersonaChange = (nextPersona: PersonaType) => {
        if (hapticsEnabled) webHaptics.light()
        setPersona(nextPersona)
        localStorage.setItem('lifepivot_persona', nextPersona)
    }

    const handleSoundscapeChange = (nextSoundscape: SoundscapeType) => {
        if (hapticsEnabled) webHaptics.light()
        setSoundscape(nextSoundscape)
        localStorage.setItem('lifepivot_soundscape', nextSoundscape)
    }

    const handleHapticsToggle = () => {
        const nextState = !hapticsEnabled
        if (nextState) webHaptics.medium()
        setHapticsEnabled(nextState)
        localStorage.setItem('lifepivot_haptics', String(nextState))
    }

    const handleMindfulModeToggle = () => {
        const nextState = !mindfulModeEnabled
        if (hapticsEnabled) webHaptics.medium()
        setMindfulModeEnabled(nextState)
        localStorage.setItem('lifepivot_mindful_mode', String(nextState))
        window.dispatchEvent(new Event('lifepivot_mindful_mode_changed'))
    }

    const handleResetOnboarding = () => {
        if (hapticsEnabled) webHaptics.medium()
        localStorage.setItem('lifepivot_onboarding_completed', 'false')
        setOnboardingStatus("Tutorial Reset! Head to the dashboard to begin.")
        setTimeout(() => setOnboardingStatus(null), 5000)
    }

    const handleEquipTitle = (titleId: string) => {
        if (hapticsEnabled) webHaptics.medium()
        setEquippedTitle(titleId)
        localStorage.setItem('lifepivot_equipped_title', titleId)
    }

    const handleEquipFrame = (frameId: string) => {
        if (hapticsEnabled) webHaptics.medium()
        setEquippedFrame(frameId)
        localStorage.setItem('lifepivot_equipped_frame', frameId)
    }

    const handleClaimAchievement = (achId: string) => {
        if (claimedAchievements.includes(achId) || claimingId !== null) return
        const rewards = ACHIEVEMENT_REWARDS[achId] || { xp: 20, gems: 2 }

        if (hapticsEnabled) webHaptics.medium()
        setClaimingId(achId)

        startTransition(async () => {
            const res = await claimAchievementReward(rewards.xp, rewards.gems, achId)
            if (res && 'error' in res && res.error) {
                if (hapticsEnabled) webHaptics.error()
                console.error(res.error)
                setClaimingId(null)
                return
            }

            // Sync with local context state
            setGems(prev => prev + rewards.gems)
            setXp(res.newXp)
            setLevel(res.newLevel)

            const claimed = [...claimedAchievements, achId]
            setClaimedAchievements(claimed)
            localStorage.setItem('lifepivot_claimed_achievements', JSON.stringify(claimed))
            setClaimingId(null)
        })
    }

    const handleClaimQuest = (quest: typeof dailyQuests[0]) => {
        if (claimedQuests.includes(quest.id) || claimingId !== null) return

        if (hapticsEnabled) webHaptics.medium()
        setClaimingId(quest.id)

        startTransition(async () => {
            const res = await claimAchievementReward(quest.xpReward, quest.gemReward, quest.title)
            if (res && 'error' in res && res.error) {
                if (hapticsEnabled) webHaptics.error()
                console.error(res.error)
                setClaimingId(null)
                return
            }

            setGems(prev => prev + quest.gemReward)
            setXp(res.newXp)
            setLevel(res.newLevel)

            const claimed = [...claimedQuests, quest.id]
            setClaimedQuests(claimed)
            localStorage.setItem('lifepivot_claimed_quests', JSON.stringify(claimed))
            setClaimingId(null)
        })
    }

    const xpNeeded = level * 100
    const xpPercentage = Math.min(100, Math.max(0, (xp / xpNeeded) * 100))

    if (!mounted) return <div className="flex-1 min-h-[400px] flex items-center justify-center"><Sparkles className="h-6 w-6 text-electric-blue animate-spin" /></div>

    // Resolve active title display name
    const activeTitle = TITLE_NAMES[equippedTitle] || dbTitle

    return (
        <div className="flex flex-col gap-6 pb-24 max-w-md md:max-w-4xl mx-auto w-full px-4 md:px-0">
            {/* Profile Header */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[#1A1F36]/80 to-[#0B0D17]/80 border border-white/10 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-center md:justify-between text-center md:text-left gap-6 w-full">
                {/* Decorative Background Icon (Desktop only) */}
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none w-28 h-28 hidden md:block">
                    <AvatarIcon id={avatarId} className="w-full h-full" />
                </div>
                
                {/* Avatar and Name Details Group */}
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 relative z-10">
                    {/* Static Inner Avatar + Rotating Animated Frame Rings */}
                    <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                        {equippedFrame === 'frame_neon' && (
                            <div className="absolute inset-0 rounded-full border-4 border-cyan-400 shadow-[0_0_20px_#00f0ff] animate-pulse" />
                        )}
                        {equippedFrame === 'frame_sunset' && (
                            <div className="absolute inset-0 rounded-full p-[3px] bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 animate-spin-slow shadow-[0_0_25px_rgba(249,115,22,0.6)]" />
                        )}
                        {equippedFrame === 'frame_cosmic' && (
                            <div className="absolute inset-0 rounded-full p-[3px] bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 animate-spin-slow shadow-[0_0_25px_rgba(139,92,246,0.7)]" />
                        )}
                        {equippedFrame === 'frame_standard' && (
                            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                        )}

                        <div className="w-[84px] h-[84px] rounded-full bg-[#0B0D17] border border-white/5 flex items-center justify-center z-10 overflow-hidden">
                            <AvatarIcon id={avatarId} className="w-full h-full" />
                        </div>

                        {/* Level badge overlaps bottom */}
                        <div className="absolute -bottom-2.5 bg-[#0B0D17] border border-white/10 px-2.5 py-0.5 rounded-full text-[9px] font-black text-electric-blue uppercase tracking-widest z-20 shadow-md">
                            LV {level}
                        </div>
                    </div>

                    <div className="flex flex-col items-center md:items-start gap-1">
                        <h2 className="text-xl md:text-3xl font-black text-white capitalize tracking-tight leading-none">{username}</h2>
                        <p className="text-xs font-black text-electric-blue uppercase tracking-widest mt-1 bg-electric-blue/5 border border-electric-blue/10 px-3 py-1 rounded-full md:px-0 md:py-0 md:bg-transparent md:border-none md:mt-1.5 md:text-gray-400">
                            {activeTitle}
                        </p>
                    </div>
                </div>

                {/* XP bar (wide on desktop, pushed right) */}
                <div className="w-full md:max-w-md flex flex-col gap-2 mt-2 md:mt-0 relative z-10">
                    <div className="flex justify-between text-[9px] font-black text-gray-500 uppercase tracking-widest">
                        <span className="text-electric-blue">Experience to Level {level + 1}</span>
                        <span>{xp} / {xpNeeded} XP</span>
                    </div>
                    <div className="w-full h-2 bg-[#1C2033]/50 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <div 
                            className="h-full bg-gradient-to-r from-electric-blue to-neon-violet transition-all duration-1000 shadow-[0_0_8px_rgba(0,240,255,0.6)] rounded-full"
                            style={{ width: `${xpPercentage}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* View Tabs Selector */}
            <div className="flex overflow-x-auto no-scrollbar p-1 rounded-2xl bg-[#141824] border border-white/5 gap-1.5 scroll-smooth whitespace-nowrap">
                <button
                    onClick={() => { if (hapticsEnabled) webHaptics.light(); setActiveTab('mastery') }}
                    className={`flex-1 min-w-[90px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'mastery' 
                            ? 'bg-[#1C2033] text-white shadow-lg' 
                            : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                    <Award className="h-4 w-4" />
                    {t('profile.tab_mastery')}
                </button>
                <button
                    onClick={() => { if (hapticsEnabled) webHaptics.light(); setActiveTab('flashcards') }}
                    className={`flex-1 min-w-[90px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'flashcards' 
                            ? 'bg-[#1C2033] text-white shadow-lg' 
                            : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                    <BookOpen className="h-4 w-4" />
                    {t('profile.tab_cards')}
                </button>
                <button
                    onClick={() => { if (hapticsEnabled) webHaptics.light(); setActiveTab('recall-pit') }}
                    className={`flex-1 min-w-[95px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 relative ${
                        activeTab === 'recall-pit' 
                            ? 'bg-[#1C2033] text-white shadow-lg' 
                            : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                    <ShieldAlert className="h-4 w-4 text-orange-500" />
                    {t('profile.tab_rescue')}
                </button>
                <button
                    onClick={() => { if (hapticsEnabled) webHaptics.light(); setActiveTab('leagues') }}
                    className={`flex-1 min-w-[90px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'leagues' 
                            ? 'bg-[#1C2033] text-white shadow-lg' 
                            : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                    <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
                    {t('profile.tab_leagues')}
                </button>
                <button
                    onClick={() => { if (hapticsEnabled) webHaptics.light(); setActiveTab('cosmetics') }}
                    className={`flex-1 min-w-[90px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'cosmetics' 
                            ? 'bg-[#1C2033] text-white shadow-lg' 
                            : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                    <Palette className="h-4 w-4" />
                    {t('profile.tab_wardrobe')}
                </button>
                <button
                    onClick={() => { if (hapticsEnabled) webHaptics.light(); setActiveTab('settings') }}
                    className={`flex-1 min-w-[90px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'settings' 
                            ? 'bg-[#1C2033] text-white shadow-lg' 
                            : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                    <Settings className="h-4 w-4" />
                    {t('profile.tab_settings')}
                </button>
            </div>

            {/* TAB CONTENT: FLASHCARDS */}
            {activeTab === 'flashcards' && (
                <FlashcardsDeck />
            )}

            {/* TAB CONTENT: RECALL PIT */}
            {activeTab === 'recall-pit' && (
                <RecallPit />
            )}

            {/* TAB CONTENT: LEAGUES */}
            {activeTab === 'leagues' && (
                <PathseekerLeagues />
            )}

            {/* TAB CONTENT: MASTERY */}
            {activeTab === 'mastery' && (
                <div className="flex flex-col xl:flex-row gap-6 w-full">
                    {/* Left Column */}
                    <div className="flex-1 flex flex-col gap-6 min-w-0">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-3 lg:gap-6">
                            <div className="bg-[#141824] border border-white/5 p-4 lg:p-6 rounded-3xl text-center shadow-lg">
                                <CheckCircle className="h-5 w-5 lg:h-6 lg:w-6 text-emerald-400 mx-auto mb-2" />
                                <p className="text-[8px] lg:text-[10px] font-black text-gray-500 uppercase tracking-wider">Completed</p>
                                <p className="text-sm lg:text-xl font-extrabold text-white mt-1 tabular-nums">{totalCompleted}</p>
                            </div>
                            <div className="bg-[#141824] border border-white/5 p-4 lg:p-6 rounded-3xl text-center shadow-lg">
                                <Clock className="h-5 w-5 lg:h-6 lg:w-6 text-electric-blue mx-auto mb-2" />
                                <p className="text-[8px] lg:text-[10px] font-black text-gray-500 uppercase tracking-wider">Study Time</p>
                                <p className="text-sm lg:text-xl font-extrabold text-white mt-1 tabular-nums">{totalFocusMins}m</p>
                            </div>
                            <div className="bg-[#141824] border border-white/5 p-4 lg:p-6 rounded-3xl text-center shadow-lg">
                                <Flame className="h-5 w-5 lg:h-6 lg:w-6 text-orange-500 mx-auto mb-2" />
                                <p className="text-[8px] lg:text-[10px] font-black text-gray-500 uppercase tracking-wider">Streak</p>
                                <p className="text-sm lg:text-xl font-extrabold text-white mt-1 tabular-nums">{currentStreak}d</p>
                            </div>
                        </div>

                        {/* Weekly Journey Activity Calendar */}
                        <div className="bg-[#141824] border border-white/5 p-5 lg:p-8 rounded-[2.5rem] shadow-lg flex flex-col gap-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <CalendarRange className="h-4 w-4 lg:h-5 lg:w-5 text-electric-blue" />
                                    <h3 className="text-xs lg:text-sm font-black uppercase tracking-wider text-gray-400">Weekly Journey</h3>
                                </div>
                                <span className="text-[8px] lg:text-[10px] font-black uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 lg:px-3 py-0.5 lg:py-1 rounded-full shrink-0 flex items-center gap-1">
                                    <Flame className="h-2.5 w-2.5 lg:h-3 lg:w-3 fill-orange-500/20" />
                                    {currentStreak}d Streak
                                </span>
                            </div>

                            <div className="flex items-center justify-between px-1 relative">
                                {/* Connector line running behind nodes */}
                                <div className="absolute left-6 right-6 top-[18px] lg:top-[22px] h-[2px] lg:h-[3px] bg-white/5 z-0" />
                                
                                {weekDays.map((day) => {
                                    return (
                                        <div key={day.dateStr} className="flex flex-col items-center gap-2 lg:gap-3 z-10 relative">
                                            <div 
                                                className={`w-9 h-9 lg:w-11 lg:h-11 rounded-full flex items-center justify-center transition-all duration-300 border ${
                                                    day.isCompleted
                                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                                        : day.isToday
                                                            ? 'bg-electric-blue/10 border-electric-blue text-electric-blue shadow-[0_0_10px_rgba(0,240,255,0.25)] animate-pulse'
                                                            : day.isFuture
                                                                ? 'bg-transparent border-dashed border-white/10 text-gray-700'
                                                                : 'bg-[#1C2033] border-white/5 text-gray-500'
                                                }`}
                                            >
                                                {day.isCompleted ? (
                                                    <Check className="h-4 w-4 lg:h-5 lg:w-5 stroke-[3px]" />
                                                ) : day.isToday ? (
                                                    <Flame className="h-4 w-4 lg:h-5 lg:w-5 text-electric-blue animate-pulse" />
                                                ) : (
                                                    <span className="text-[10px] lg:text-xs font-bold uppercase">{day.name}</span>
                                                )}
                                            </div>
                                            <span className={`text-[8px] lg:text-[10px] font-black uppercase tracking-wider ${
                                                day.isToday 
                                                    ? 'text-electric-blue' 
                                                    : day.isCompleted 
                                                        ? 'text-emerald-400' 
                                                        : 'text-gray-500'
                                            }`}>
                                                {day.name}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Daily Quests Card */}
                        <div className="bg-[#141824] border border-white/5 p-5 lg:p-8 rounded-[2.5rem] shadow-lg flex flex-col gap-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 lg:h-5 lg:w-5 text-electric-blue animate-pulse" />
                                    <h3 className="text-xs lg:text-sm font-black uppercase tracking-wider text-gray-400">Daily Quests</h3>
                                </div>
                                <span className="text-[8px] lg:text-[10px] font-black uppercase text-gray-500 bg-white/5 px-2 lg:px-3 py-0.5 lg:py-1 rounded-full shrink-0">Resets Daily</span>
                            </div>

                            <div className="flex flex-col gap-3 lg:gap-4">
                                {dailyQuests.map((quest) => {
                                    const isFinished = quest.progress >= quest.target
                                    const isClaimed = claimedQuests.includes(quest.id)
                                    const percent = Math.min(100, Math.max(0, (quest.progress / quest.target) * 100))

                                    return (
                                        <div 
                                            key={quest.id}
                                            className={`p-4 lg:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                                                isClaimed 
                                                    ? 'bg-[#0f121d] border-white/5 opacity-40 select-none' 
                                                    : 'bg-[#1c2033]/40 border-white/10'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <h4 className="text-xs lg:text-sm font-extrabold text-white">{quest.title}</h4>
                                                    <p className="text-[10px] lg:text-xs text-gray-400 mt-1">{quest.description}</p>
                                                </div>
                                                <div className="flex items-center gap-1 text-[9px] lg:text-[11px] font-black text-electric-blue shrink-0">
                                                    <span>+{quest.xpReward} XP</span>
                                                    <span>•</span>
                                                    <div className="flex items-center gap-0.5 bg-electric-blue/5 border border-electric-blue/15 px-1 lg:px-1.5 py-0.5 lg:py-1 rounded">
                                                        <Diamond className="h-2.5 w-2.5 lg:h-3 lg:w-3 text-electric-blue fill-electric-blue/20" />
                                                        <span>+{quest.gemReward}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 lg:gap-4 mt-3.5 lg:mt-4 pt-3 lg:pt-4 border-t border-white/5">
                                                <div className="flex-1 h-1.5 lg:h-2 bg-white/5 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-electric-blue transition-all duration-500"
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                                <span className="text-[9px] lg:text-[11px] text-gray-400 font-bold tabular-nums shrink-0">{quest.progress}/{quest.target}</span>
                                                
                                                {isFinished ? (
                                                    <button
                                                        onClick={() => !isClaimed && handleClaimQuest(quest)}
                                                        disabled={isClaimed || claimingId === quest.id}
                                                        className={`px-3.5 py-1.5 lg:px-4 lg:py-2 rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-wider shrink-0 transition-transform ${
                                                            isClaimed 
                                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                                                                : 'bg-electric-blue text-black hover:scale-105 active:scale-95 shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                                                        }`}
                                                    >
                                                        {claimingId === quest.id ? (
                                                            <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                                                        ) : isClaimed ? (
                                                            'Claimed'
                                                        ) : (
                                                            'Claim'
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span className="text-[9px] lg:text-[10px] font-black uppercase text-gray-500 bg-white/5 border border-white/5 px-2.5 py-1.5 lg:px-3 lg:py-2 rounded-xl shrink-0">
                                                        Studying
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="w-full xl:w-[350px] shrink-0">
                        {/* Achievements */}
                        <div className="bg-[#141824] border border-white/5 p-5 lg:p-6 rounded-[2.5rem] shadow-lg sticky top-24">
                            <div className="flex items-center gap-2 mb-4 lg:mb-6">
                                <Award className="h-4 w-4 lg:h-5 lg:w-5 text-electric-blue" />
                                <h3 className="text-xs lg:text-sm font-black uppercase tracking-wider text-gray-400">Path of Mastery</h3>
                            </div>

                            <div className="flex flex-col gap-3 lg:gap-4">
                                {achievements.map((ach) => {
                                    const Icon = IconMap[ach.iconId] || CheckCircle
                                    const isUnlocked = ach.unlocked
                                    const isClaimed = claimedAchievements.includes(ach.id)
                                    const reward = ACHIEVEMENT_REWARDS[ach.id] || { xp: 20, gems: 2 }

                                    return (
                                        <div 
                                            key={ach.id} 
                                            className={`flex flex-col p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                                                isClaimed
                                                    ? 'bg-[#0f121d] border-white/5 opacity-40 select-none'
                                                    : isUnlocked 
                                                        ? 'bg-[#1c2033] border-white/10' 
                                                        : 'bg-[#0f121d] border-white/5 opacity-40 select-none'
                                            }`}
                                        >
                                            {isUnlocked && !isClaimed && (
                                                <div 
                                                    className="absolute inset-0 pointer-events-none blur-[20px] opacity-20"
                                                    style={{ background: `radial-gradient(circle at 10% 50%, ${ach.glowColor}, transparent 60%)` }}
                                                />
                                            )}
                                            <div className="flex items-center gap-4">
                                                <div className={`h-9 w-9 lg:h-10 lg:w-10 rounded-xl border flex items-center justify-center shrink-0 ${ach.color}`}>
                                                    <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`text-xs lg:text-sm font-extrabold truncate ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                                                        {ach.title}
                                                    </h4>
                                                    <p className="text-[10px] lg:text-xs text-gray-400 mt-0.5 lg:mt-1 leading-tight">
                                                        {ach.description}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-white/5">
                                                <div className="flex items-center gap-1.5 text-[9px] lg:text-[10px] font-black text-electric-blue">
                                                    <span>+{reward.xp} XP</span>
                                                    <span>•</span>
                                                    <div className="flex items-center gap-0.5 bg-electric-blue/5 border border-electric-blue/15 px-1 lg:px-1.5 py-0.5 lg:py-1 rounded">
                                                        <Diamond className="h-2.5 w-2.5 lg:h-3 lg:w-3 text-electric-blue fill-electric-blue/20" />
                                                        <span>+{reward.gems}</span>
                                                    </div>
                                                </div>

                                                {isClaimed ? (
                                                    <span className="text-[8px] lg:text-[9px] font-black uppercase text-gray-600 bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-xl">
                                                        Claimed
                                                    </span>
                                                ) : isUnlocked ? (
                                                    <button
                                                        onClick={() => handleClaimAchievement(ach.id)}
                                                        disabled={claimingId === ach.id}
                                                        className="px-3.5 py-1.5 lg:px-4 lg:py-2 rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-wider bg-electric-blue text-black hover:scale-105 active:scale-95 shadow-[0_0_10px_rgba(0,240,255,0.25)] transition-transform"
                                                    >
                                                        {claimingId === ach.id ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            'Claim Reward'
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span className="text-[8px] lg:text-[9px] font-black uppercase text-gray-500 bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-xl">
                                                        Locked
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: COSMETICS (WARDROBE) */}
            {activeTab === 'cosmetics' && (
                <div className="flex flex-col gap-4 animate-fade-up">
                    <div className="bg-[#141824] border border-white/5 p-5 lg:p-8 rounded-[2.5rem] shadow-lg flex flex-col gap-5 lg:gap-8">
                        <div className="flex items-center gap-2">
                            <Palette className="h-4 w-4 lg:h-5 lg:w-5 text-electric-blue" />
                            <h3 className="text-xs lg:text-sm font-black uppercase tracking-wider text-gray-400">Wardrobe Customization</h3>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                            <div className="flex flex-col gap-6">
                                {/* Title Selection */}
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2.5">Equip Unlocked Title</p>
                                    <div className="flex flex-col gap-2">
                                        {unlockedTitles.map((tId) => (
                                            <button
                                                key={tId}
                                                onClick={() => handleEquipTitle(tId)}
                                                className={`w-full py-3 px-4 rounded-2xl text-left bg-[#0c0e17] border flex items-center justify-between active:scale-98 transition-all duration-200 ${
                                                    equippedTitle === tId 
                                                        ? 'border-electric-blue text-white shadow-[0_0_12px_rgba(0,240,255,0.1)]' 
                                                        : 'border-white/5 text-gray-400 hover:border-white/10'
                                                }`}
                                            >
                                                <span className="text-xs font-extrabold">{TITLE_NAMES[tId] || tId}</span>
                                                {equippedTitle === tId && <Check className="h-4 w-4 text-electric-blue" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Avatar Frame Selection */}
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2.5">Equip Unlocked Avatar Frame</p>
                                    <div className="flex flex-col gap-2">
                                        {unlockedFrames.map((fId) => {
                                            const frameLabels: Record<string, string> = {
                                                frame_standard: 'Standard Minimalist Ring',
                                                frame_neon: 'Neon Pulse (Glowing Cyan)',
                                                frame_sunset: 'Sunset Flame (Rotating Warm Gradient)',
                                                frame_cosmic: 'Cosmic Portal (Rotating Purple Halo)'
                                            }
                                            return (
                                                <button
                                                    key={fId}
                                                    onClick={() => handleEquipFrame(fId)}
                                                    className={`w-full py-3 px-4 rounded-2xl text-left bg-[#0c0e17] border flex items-center justify-between active:scale-98 transition-all duration-200 ${
                                                        equippedFrame === fId 
                                                            ? 'border-electric-blue text-white shadow-[0_0_12px_rgba(0,240,255,0.1)]' 
                                                            : 'border-white/5 text-gray-400 hover:border-white/10'
                                                    }`}
                                                >
                                                    <span className="text-xs font-extrabold">{frameLabels[fId] || fId}</span>
                                                    {equippedFrame === fId && <Check className="h-4 w-4 text-electric-blue" />}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Avatar Profile Icon Selection */}
                            <div className="lg:border-l lg:border-t-0 lg:border-white/5 lg:pl-8 border-t border-white/5 pt-5 lg:pt-0">
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2.5">Select Profile Avatar</p>
                                <div className="grid grid-cols-3 gap-3">
                                    {AVATAR_LIST.map((avatar) => (
                                        <button
                                            key={avatar.id}
                                            onClick={() => {
                                                if (hapticsEnabled) webHaptics.medium()
                                                setAvatarId(avatar.id)
                                            }}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl bg-[#0c0e17] border active:scale-95 transition-all duration-200 ${
                                                avatarId === avatar.id 
                                                    ? 'border-electric-blue shadow-[0_0_12px_rgba(0,240,255,0.15)]' 
                                                    : 'border-white/5 hover:border-white/10'
                                            }`}
                                        >
                                            <div className="w-12 h-12 rounded-full overflow-hidden shadow-md">
                                                <AvatarIcon id={avatar.id} />
                                            </div>
                                            <span className="text-[8px] font-black uppercase text-center text-gray-400 truncate w-full">
                                                {avatar.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: SETTINGS */}
            {activeTab === 'settings' && (
                <div className="flex flex-col gap-4">
                    
                    {/* Visual Customization Group */}
                    <div className="bg-[#141824] border border-white/5 p-5 rounded-[2.5rem] shadow-lg flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <Palette className="h-4 w-4 text-electric-blue" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Design Theme</h3>
                        </div>

                        {/* Theme Accent Select */}
                        <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2.5">Theme Accent Color</p>
                            <div className="grid grid-cols-4 gap-3">
                                {[
                                    { id: 'blue', label: 'Electric Blue', bg: 'bg-[#00f0ff]' },
                                    { id: 'violet', label: 'Neon Violet', bg: 'bg-[#bd00ff]' },
                                    { id: 'green', label: 'Emerald Green', bg: 'bg-[#10b981]' },
                                    { id: 'sunset', label: 'Sunset Amber', bg: 'bg-[#f59e0b]' }
                                ].map((swatch) => (
                                    <button
                                        key={swatch.id}
                                        onClick={() => handleAccentChange(swatch.id as AccentType)}
                                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-[#0c0e17] border active:scale-95 transition-all ${
                                            accent === swatch.id 
                                                ? 'border-electric-blue shadow-[0_0_12px_rgba(0,240,255,0.15)]' 
                                                : 'border-white/5 hover:border-white/10'
                                        }`}
                                    >
                                        <div className={`h-6 w-6 rounded-full ${swatch.bg} shadow-md`} />
                                        <span className="text-[8px] font-black uppercase tracking-tight text-gray-400 truncate w-full text-center">
                                            {swatch.id}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* AI & Tutor Configuration Group */}
                    <div className="bg-[#141824] border border-white/5 p-5 rounded-[2.5rem] shadow-lg flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <Cpu className="h-4 w-4 text-electric-blue" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Tutor Settings</h3>
                        </div>

                        {/* Socratic Persona selection */}
                        <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2.5">Socratic Tutor Persona</p>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'feynman', name: 'Feynman', desc: 'Intuitive & Simple' },
                                    { id: 'socrates', name: 'Socrates', desc: 'Pure Questioning' },
                                    { id: 'stoic', name: 'Marcus', desc: 'Stoic Discipline' }
                                ].map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => handlePersonaChange(p.id as PersonaType)}
                                        className={`flex flex-col items-start p-3 rounded-2xl bg-[#0c0e17] border text-left active:scale-95 transition-all ${
                                            persona === p.id 
                                                ? 'border-electric-blue' 
                                                : 'border-white/5'
                                        }`}
                                    >
                                        <span className="text-[10px] font-black text-white">{p.name}</span>
                                        <span className="text-[8px] text-gray-500 font-bold leading-tight mt-0.5">{p.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Focus Session Preferences Group */}
                    <div className="bg-[#141824] border border-white/5 p-5 rounded-[2.5rem] shadow-lg flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-electric-blue" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Timer & Sounds</h3>
                        </div>

                        {/* Default Focus Duration */}
                        <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2.5">Default Session Length</p>
                            <div className="flex gap-2 bg-[#0c0e17] p-1 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                                {[15, 25, 30, 45, 60].map((mins) => (
                                    <button
                                        key={mins}
                                        onClick={() => handleDurationChange(mins)}
                                        className={`flex-1 min-w-[50px] py-2 rounded-xl text-[10px] font-black transition-all ${
                                            duration === mins 
                                                ? 'bg-[#1C2033] text-white shadow-md' 
                                                : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                    >
                                        {mins}m
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Preferred Soundscape */}
                        <div>
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Default Ambient Sound</p>
                                <select 
                                    value={soundscape} 
                                    onChange={(e) => handleSoundscapeChange(e.target.value as SoundscapeType)}
                                    className="bg-[#0c0e17] border border-white/10 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none text-gray-300 font-bold"
                                >
                                    <option value="none">Mute</option>
                                    <option value="space">Deep Space</option>
                                    <option value="rain">Autumn Rain</option>
                                    <option value="binaural">Binaural Waves</option>
                                    <option value="cafe">Cyberpunk Café</option>
                                    <option value="greenhouse">Greenhouse Rain</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* System Controls Group */}
                    <div className="bg-[#141824] border border-white/5 p-5 rounded-[2.5rem] shadow-lg flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <Headphones className="h-4 w-4 text-electric-blue" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Device Feedback</h3>
                        </div>

                        {/* Haptic vibration toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-white font-black uppercase tracking-wide">Tactile Haptics</p>
                                <p className="text-[9px] text-gray-500 font-bold mt-0.5 leading-tight">Vibrate device on toggles and clicks.</p>
                            </div>
                            <button 
                                onClick={handleHapticsToggle}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                {hapticsEnabled ? (
                                    <ToggleRight className="h-9 w-9 text-electric-blue" />
                                ) : (
                                    <ToggleLeft className="h-9 w-9 text-gray-600" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Language Settings Group */}
                    <div className="bg-[#141824] border border-white/5 p-5 rounded-[2.5rem] shadow-lg flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-electric-blue" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">{t('profile.language')}</h3>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[10px] text-white font-black uppercase tracking-wide">Language</p>
                                <p className="text-[9px] text-gray-500 font-bold mt-0.5 leading-tight">Switch the workspace language.</p>
                            </div>
                            <select
                                value={locale}
                                onChange={(e) => {
                                    if (hapticsEnabled) webHaptics.light()
                                    setLocale(e.target.value as any)
                                }}
                                className="bg-[#0c0e17] border border-white/10 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none text-gray-300 font-bold uppercase tracking-wider"
                            >
                                {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                                    <option key={code} value={code}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Mindfulness & Guidance Preferences */}
                    <div className="bg-[#141824] border border-white/5 p-5 rounded-[2.5rem] shadow-lg flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <EyeOff className="h-4 w-4 text-electric-blue" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Mindfulness & Guide</h3>
                        </div>

                        {/* Mindful Mode Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-white font-black uppercase tracking-wide">Mindful Study Mode</p>
                                <p className="text-[9px] text-gray-500 font-bold mt-0.5 leading-tight">Hide level, league badges, and gamification HUD panels to focus purely on your studies.</p>
                            </div>
                            <button 
                                onClick={handleMindfulModeToggle}
                                className="text-gray-400 hover:text-white transition-colors shrink-0"
                            >
                                {mindfulModeEnabled ? (
                                    <ToggleRight className="h-9 w-9 text-electric-blue" />
                                ) : (
                                    <ToggleLeft className="h-9 w-9 text-gray-600" />
                                )}
                            </button>
                        </div>

                        <div className="h-[1px] bg-white/5 w-full" />

                        {/* Onboarding replay */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-white font-black uppercase tracking-wide">Tutorial Guide</p>
                                <p className="text-[9px] text-gray-500 font-bold mt-0.5 leading-tight">
                                    {onboardingStatus || "Replay the interactive onboarding walkthrough tour."}
                                </p>
                            </div>
                            <button 
                                onClick={handleResetOnboarding}
                                className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 shrink-0"
                            >
                                Replay Tour
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Logout Action */}
            <div className="mt-4">
                <form action={signOutAction}>
                    <button className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-500 font-bold hover:bg-red-500/10 transition-all active:scale-[0.98]">
                        <LogOut className="h-4 w-4" />
                        <span className="text-sm font-extrabold">{t('profile.logout')}</span>
                    </button>
                </form>

                <p className="text-center text-[8px] text-gray-600 uppercase tracking-widest font-black mt-6">
                    LifePivot v1.0.5-beta
                </p>
            </div>
        </div>
    )
}
