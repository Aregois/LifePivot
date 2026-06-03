'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Task } from '@/utils/types'

export interface WagerState {
    amount: number
    startStreak: number
    targetStreak: number
    daysRemaining: number
    startDate: string
}

interface EconomyContextType {
    lives: number
    gems: number
    voidDays: number
    xp: number
    level: number
    avatarId: string
    activeChatTask: Task | null
    showMobileChat: boolean
    wager: WagerState | null
    setLives: (lives: number | ((prev: number) => number)) => void
    setGems: (gems: number | ((prev: number) => number)) => void
    setVoidDays: (voidDays: number | ((prev: number) => number)) => void
    setXp: (xp: number | ((prev: number) => number)) => void
    setLevel: (level: number | ((prev: number) => number)) => void
    setAvatarId: (avatarId: string) => void
    setActiveChatTask: (task: Task | null) => void
    setShowMobileChat: (show: boolean) => void
    setWager: (wager: WagerState | null) => void
}

const EconomyContext = createContext<EconomyContextType | undefined>(undefined)

interface EconomyProviderProps {
    children: ReactNode
    initialLives: number
    initialGems: number
    initialVoidDays: number
    initialXp?: number
    initialLevel?: number
    initialChatTask?: Task | null
}

export function EconomyProvider({ 
    children, 
    initialLives, 
    initialGems, 
    initialVoidDays, 
    initialXp = 0, 
    initialLevel = 1,
    initialChatTask = null
}: EconomyProviderProps) {
    const [lives, setLives] = useState(initialLives)
    const [gems, setGems] = useState(initialGems)
    const [voidDays, setVoidDays] = useState(initialVoidDays)
    const [xp, setXp] = useState(initialXp)
    const [level, setLevel] = useState(initialLevel)
    const [avatarId, setAvatarIdState] = useState('avatar_owl')
    const [activeChatTask, setActiveChatTask] = useState<Task | null>(initialChatTask)
    const [showMobileChat, setShowMobileChat] = useState(false)
    const [wager, setWagerState] = useState<WagerState | null>(null)

    useEffect(() => {
        setLives(initialLives)
    }, [initialLives])

    useEffect(() => {
        setGems(initialGems)
    }, [initialGems])

    useEffect(() => {
        setVoidDays(initialVoidDays)
    }, [initialVoidDays])

    useEffect(() => {
        setXp(initialXp)
    }, [initialXp])

    useEffect(() => {
        setLevel(initialLevel)
    }, [initialLevel])

    useEffect(() => {
        const saved = localStorage.getItem('lifepivot_equipped_avatar') || 'avatar_owl'
        setAvatarIdState(saved)
        
        const savedWager = localStorage.getItem('lifepivot_active_wager')
        if (savedWager) {
            try {
                setWagerState(JSON.parse(savedWager))
            } catch (e) {
                console.error('Failed to parse wager from localStorage', e)
            }
        }
    }, [])

    const setAvatarId = (next: string) => {
        setAvatarIdState(next)
        localStorage.setItem('lifepivot_equipped_avatar', next)
    }

    const setWager = (next: WagerState | null) => {
        setWagerState(next)
        if (next) {
            localStorage.setItem('lifepivot_active_wager', JSON.stringify(next))
        } else {
            localStorage.removeItem('lifepivot_active_wager')
        }
    }

    return (
        <EconomyContext.Provider value={{ 
            lives, 
            gems, 
            voidDays, 
            xp, 
            level, 
            avatarId, 
            activeChatTask,
            showMobileChat,
            wager,
            setLives, 
            setGems, 
            setVoidDays, 
            setXp, 
            setLevel, 
            setAvatarId,
            setActiveChatTask,
            setShowMobileChat,
            setWager
        }}>
            {children}
        </EconomyContext.Provider>
    )
}

export function useEconomy() {
    const context = useContext(EconomyContext)
    if (context === undefined) {
        throw new Error('useEconomy must be used within an EconomyProvider')
    }
    return context
}


