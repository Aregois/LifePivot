'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Task } from '@/utils/types'

interface EconomyContextType {
    tokens: number
    gems: number
    voidDays: number
    xp: number
    level: number
    avatarId: string
    activeChatTask: Task | null
    globalFocusTask: Task | null
    globalFocusGoalTitle: string
    showMobileChat: boolean
    setTokens: (tokens: number | ((prev: number) => number)) => void
    setGems: (gems: number | ((prev: number) => number)) => void
    setVoidDays: (voidDays: number | ((prev: number) => number)) => void
    setXp: (xp: number | ((prev: number) => number)) => void
    setLevel: (level: number | ((prev: number) => number)) => void
    setAvatarId: (avatarId: string) => void
    setActiveChatTask: (task: Task | null) => void
    setGlobalFocusTask: (task: Task | null, goalTitle?: string) => void
    setShowMobileChat: (show: boolean) => void
}

const EconomyContext = createContext<EconomyContextType | undefined>(undefined)

interface EconomyProviderProps {
    children: ReactNode
    initialTokens: number
    initialGems: number
    initialVoidDays: number
    initialXp?: number
    initialLevel?: number
    initialChatTask?: Task | null
}

export function EconomyProvider({ 
    children, 
    initialTokens, 
    initialGems, 
    initialVoidDays, 
    initialXp = 0, 
    initialLevel = 1,
    initialChatTask = null
}: EconomyProviderProps) {
    const [tokens, setTokens] = useState(initialTokens)
    const [gems, setGems] = useState(initialGems)
    const [voidDays, setVoidDays] = useState(initialVoidDays)
    const [xp, setXp] = useState(initialXp)
    const [level, setLevel] = useState(initialLevel)
    const [avatarId, setAvatarIdState] = useState('avatar_owl')
    const [activeChatTask, setActiveChatTask] = useState<Task | null>(initialChatTask)
    const [globalFocusTask, setGlobalFocusTaskState] = useState<Task | null>(null)
    const [globalFocusGoalTitle, setGlobalFocusGoalTitle] = useState('Today\'s Focus')
    const [showMobileChat, setShowMobileChat] = useState(false)

    const setGlobalFocusTask = (task: Task | null, goalTitle?: string) => {
        setGlobalFocusTaskState(task)
        if (goalTitle) setGlobalFocusGoalTitle(goalTitle)
    }

    useEffect(() => {
        setTokens(initialTokens)
    }, [initialTokens])

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
    }, [])

    const setAvatarId = (next: string) => {
        setAvatarIdState(next)
        localStorage.setItem('lifepivot_equipped_avatar', next)
    }

    return (
        <EconomyContext.Provider value={{ 
            tokens, 
            gems, 
            voidDays, 
            xp, 
            level, 
            avatarId, 
            activeChatTask,
            globalFocusTask,
            globalFocusGoalTitle,
            showMobileChat,
            setTokens, 
            setGems, 
            setVoidDays, 
            setXp, 
            setLevel, 
            setAvatarId,
            setActiveChatTask,
            setGlobalFocusTask,
            setShowMobileChat
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


