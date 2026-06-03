'use client'

import React from 'react'

export type AvatarId = 'avatar_owl' | 'avatar_rocket' | 'avatar_brain' | 'avatar_ninja' | 'avatar_planet' | 'avatar_phoenix'

export const AVATAR_LIST: { id: AvatarId; name: string; color: string }[] = [
    { id: 'avatar_owl', name: 'Wise Owl', color: 'from-blue-600 to-indigo-800' },
    { id: 'avatar_rocket', name: 'Cosmic Soarer', color: 'from-cyan-500 to-blue-600' },
    { id: 'avatar_brain', name: 'Neural Focus', color: 'from-purple-600 to-fuchsia-700' },
    { id: 'avatar_ninja', name: 'Silent Scholar', color: 'from-gray-700 to-slate-900' },
    { id: 'avatar_planet', name: 'Astral Sage', color: 'from-indigo-600 to-violet-800' },
    { id: 'avatar_phoenix', name: 'Streak Phoenix', color: 'from-orange-500 to-red-700' },
]

export function AvatarIcon({ id, className = 'w-full h-full' }: { id: string; className?: string }) {
    if (id === 'avatar_owl') {
        return (
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                <defs>
                    <linearGradient id="grad_owl" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1e3a8a" />
                        <stop offset="100%" stopColor="#312e81" />
                    </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="50" fill="url(#grad_owl)" />
                {/* Owl Body & Face */}
                <ellipse cx="50" cy="55" rx="35" ry="30" fill="#38bdf8" fillOpacity="0.15" />
                <path d="M50 35 L40 22 L32 25 L40 40 Z" fill="#60a5fa" />
                <path d="M50 35 L60 22 L68 25 L60 40 Z" fill="#60a5fa" />
                <circle cx="50" cy="55" r="32" fill="#1e1b4b" />
                {/* Eyes */}
                <circle cx="36" cy="48" r="12" fill="#fff" />
                <circle cx="36" cy="48" r="6" fill="#111827" />
                <circle cx="38" cy="46" r="2.5" fill="#fff" />
                <circle cx="64" cy="48" r="12" fill="#fff" />
                <circle cx="64" cy="48" r="6" fill="#111827" />
                <circle cx="66" cy="46" r="2.5" fill="#fff" />
                {/* Glasses bridge */}
                <rect x="44" y="46" width="12" height="4" fill="#fbbf24" rx="2" />
                <circle cx="36" cy="48" r="13" stroke="#fbbf24" strokeWidth="2.5" fill="none" />
                <circle cx="64" cy="48" r="13" stroke="#fbbf24" strokeWidth="2.5" fill="none" />
                {/* Beak */}
                <path d="M50 54 L45 62 L55 62 Z" fill="#f59e0b" />
                {/* Feathers detail */}
                <path d="M42 70 Q50 67 58 70" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M45 76 Q50 74 55 76" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
        )
    }

    if (id === 'avatar_rocket') {
        return (
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                <defs>
                    <linearGradient id="grad_rocket" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="50" fill="url(#grad_rocket)" />
                {/* Stars */}
                <circle cx="20" cy="30" r="1" fill="#fff" fillOpacity="0.7" />
                <circle cx="80" cy="25" r="1.5" fill="#fff" fillOpacity="0.9" />
                <circle cx="75" cy="70" r="1" fill="#fff" fillOpacity="0.6" />
                <circle cx="25" cy="75" r="1.2" fill="#fff" fillOpacity="0.8" />
                {/* Rocket Flame */}
                <path d="M38 72 Q50 95 62 72 Q50 82 38 72 Z" fill="#f97316" />
                <path d="M43 72 Q50 88 57 72 Z" fill="#f59e0b" />
                {/* Rocket Body */}
                <path d="M50 18 C38 40 38 65 38 72 L62 72 C62 65 62 40 50 18 Z" fill="#f8fafc" />
                {/* Fins */}
                <path d="M38 60 L24 72 L38 72 Z" fill="#ef4444" />
                <path d="M62 60 L76 72 L62 72 Z" fill="#ef4444" />
                <path d="M50 64 L46 72 L54 72 Z" fill="#ef4444" />
                {/* Nose Cone */}
                <path d="M50 18 C44 28 42 35 42 38 L58 38 C58 35 56 28 50 18 Z" fill="#ef4444" />
                {/* Window */}
                <circle cx="50" cy="46" r="6" fill="#38bdf8" stroke="#cbd5e1" strokeWidth="2.5" />
                <path d="M46 44 A 4.5 4.5 0 0 1 54 44" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
            </svg>
        )
    }

    if (id === 'avatar_brain') {
        return (
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                <defs>
                    <linearGradient id="grad_brain" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#7c3aed" />
                        <stop offset="100%" stopColor="#c026d3" />
                    </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="50" fill="url(#grad_brain)" />
                {/* Circuit Nodes backdrop */}
                <path d="M22 50 L35 50 L42 38" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />
                <path d="M78 50 L65 50 L58 62" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />
                <circle cx="22" cy="50" r="2.5" fill="#ffffff" fillOpacity="0.4" />
                <circle cx="78" cy="50" r="2.5" fill="#ffffff" fillOpacity="0.4" />
                {/* Brain Silhouette Left */}
                <path d="M48 24 C40 24 32 30 32 40 C32 43 33 46 35 48 C31 50 28 54 28 60 C28 66 33 70 38 72 C42 74 46 72 48 70 Z" fill="#fdf2f8" fillOpacity="0.1" />
                {/* Brain Silhouette Right */}
                <path d="M52 24 C60 24 68 30 68 40 C68 43 67 46 65 48 C69 50 72 54 72 60 C72 66 67 70 62 72 C58 74 54 72 52 70 Z" fill="#fdf2f8" fillOpacity="0.1" />
                {/* Brain neon pathways (Clip art glow style) */}
                <path d="M48 28 C41 28 36 33 36 40 Q36 44 38 46 Q33 48 33 54 C33 60 38 64 42 65 C45 66 48 64 48 62" stroke="#f472b6" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M52 28 C59 28 64 33 64 40 Q64 44 62 46 Q67 48 67 54 C67 60 62 64 58 65 C55 66 52 64 52 62" stroke="#f472b6" strokeWidth="3" strokeLinecap="round" fill="none" />
                {/* Center cortex line */}
                <path d="M50 25 L50 67" stroke="#fb7185" strokeWidth="3.5" strokeLinecap="round" />
                {/* Dynamic nodes */}
                <circle cx="36" cy="40" r="2" fill="#fff" />
                <circle cx="64" cy="40" r="2" fill="#fff" />
                <circle cx="42" cy="52" r="1.5" fill="#fff" />
                <circle cx="58" cy="52" r="1.5" fill="#fff" />
            </svg>
        )
    }

    if (id === 'avatar_ninja') {
        return (
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                <defs>
                    <linearGradient id="grad_ninja" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#374151" />
                        <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="50" fill="url(#grad_ninja)" />
                {/* Head Wrap */}
                <path d="M15 50 Q50 35 85 50 C85 68 78 80 50 82 C22 80 15 68 15 50 Z" fill="#1e293b" />
                {/* Mask Opening Cutout */}
                <path d="M28 47 Q50 43 72 47 Q65 57 50 57 Q35 57 28 47 Z" fill="#fbcfe8" />
                {/* Eyes - Glowing Focus */}
                <path d="M36 48 Q42 46 45 50" stroke="#facc15" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <path d="M64 48 Q58 46 55 50" stroke="#facc15" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <circle cx="41" cy="49" r="1" fill="#fff" />
                <circle cx="59" cy="49" r="1" fill="#fff" />
                {/* Headband tie behind */}
                <path d="M18 45 L5 40 L15 35 Z" fill="#1e293b" />
                <path d="M16 48 L6 53 L18 55 Z" fill="#1e293b" />
            </svg>
        )
    }

    if (id === 'avatar_planet') {
        return (
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                <defs>
                    <linearGradient id="grad_planet" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4f46e5" />
                        <stop offset="100%" stopColor="#6d28d9" />
                    </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="50" fill="url(#grad_planet)" />
                {/* Background stars */}
                <path d="M25 22 L27 26 L31 27 L27 28 L26 32 L25 28 L21 27 L25 26 Z" fill="#fef08a" fillOpacity="0.8" />
                <path d="M72 74 L73 76 L76 77 L73 78 L72 81 L71 78 L68 77 L71 76 Z" fill="#fef08a" fillOpacity="0.8" />
                {/* Planet Body */}
                <circle cx="50" cy="50" r="22" fill="#a78bfa" />
                <circle cx="44" cy="42" r="16" fill="#8b5cf6" />
                <circle cx="42" cy="40" r="3" fill="#6d28d9" />
                <circle cx="55" cy="52" r="4.5" fill="#6d28d9" />
                {/* Planet Ring Behind */}
                <path d="M22 56 Q36 32 78 44" stroke="#c084fc" strokeWidth="4.5" strokeLinecap="round" />
                {/* Planet Ring Front */}
                <path d="M22 56 Q64 68 78 44" stroke="#e9d5ff" strokeWidth="5.5" strokeLinecap="round" />
                {/* Tiny orbiting moon */}
                <circle cx="28" cy="38" r="3" fill="#cbd5e1" />
            </svg>
        )
    }

    // avatar_phoenix (or Flame)
    return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <defs>
                <linearGradient id="grad_phoenix" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ea580c" />
                    <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="50" fill="url(#grad_phoenix)" />
            {/* Flames backdrop */}
            <path d="M25 65 Q50 95 75 65 Q50 82 25 65 Z" fill="#f97316" fillOpacity="0.3" />
            {/* Phoenix Head & Wings */}
            <path d="M50 24 C54 36 65 42 75 42 C62 48 56 60 56 70 C56 74 54 76 50 76 C46 76 44 74 44 70 C44 60 38 48 25 42 C35 42 46 36 50 24 Z" fill="#facc15" />
            {/* Phoenix Inner Fire Core */}
            <path d="M50 36 C52 44 58 48 64 48 C56 52 53 60 53 66 Q50 70 47 66 C47 60 44 52 36 48 C42 48 48 44 50 36 Z" fill="#ff7e00" />
            {/* Sparkles */}
            <circle cx="50" cy="18" r="2" fill="#fff" />
            <circle cx="34" cy="30" r="1.5" fill="#fff" fillOpacity="0.8" />
            <circle cx="66" cy="30" r="1.5" fill="#fff" fillOpacity="0.8" />
        </svg>
    )
}
