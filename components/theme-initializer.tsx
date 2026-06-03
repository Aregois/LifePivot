'use client'

import { useEffect } from 'react'

export function ThemeInitializer() {
    useEffect(() => {
        const accent = localStorage.getItem('lifepivot_accent') || 'blue'
        const root = document.documentElement
        if (accent === 'violet') {
            root.style.setProperty('--color-electric-blue', '#bd00ff')
            root.style.setProperty('--color-neon-violet', '#ff00a0')
        } else if (accent === 'green') {
            root.style.setProperty('--color-electric-blue', '#10b981')
            root.style.setProperty('--color-neon-violet', '#059669')
        } else if (accent === 'sunset') {
            root.style.setProperty('--color-electric-blue', '#f59e0b')
            root.style.setProperty('--color-neon-violet', '#d97706')
        } else {
            root.style.setProperty('--color-electric-blue', '#00f0ff')
            root.style.setProperty('--color-neon-violet', '#bd00ff')
        }
    }, [])

    return null
}
