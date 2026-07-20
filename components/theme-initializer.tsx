'use client'

import { useEffect } from 'react'

export function ThemeInitializer() {
    useEffect(() => {
        const accent = localStorage.getItem('lifepivot_accent') || 'blue'
        const root = document.documentElement
        if (accent === 'violet') {
            root.style.setProperty('--color-electric-blue', '#bd00ff')
            root.style.setProperty('--color-neon-violet', '#ff00a0')
            root.style.setProperty('--accent-rgb', '189, 0, 255')
            root.style.setProperty('--violet-rgb', '255, 0, 160')
        } else if (accent === 'green') {
            root.style.setProperty('--color-electric-blue', '#10b981')
            root.style.setProperty('--color-neon-violet', '#059669')
            root.style.setProperty('--accent-rgb', '16, 185, 129')
            root.style.setProperty('--violet-rgb', '5, 150, 105')
        } else if (accent === 'sunset') {
            root.style.setProperty('--color-electric-blue', '#f59e0b')
            root.style.setProperty('--color-neon-violet', '#d97706')
            root.style.setProperty('--accent-rgb', '245, 158, 11')
            root.style.setProperty('--violet-rgb', '217, 119, 6')
        } else {
            root.style.setProperty('--color-electric-blue', '#00f0ff')
            root.style.setProperty('--color-neon-violet', '#bd00ff')
            root.style.setProperty('--accent-rgb', '0, 240, 255')
            root.style.setProperty('--violet-rgb', '189, 0, 255')
        }
    }, [])

    return null
}
