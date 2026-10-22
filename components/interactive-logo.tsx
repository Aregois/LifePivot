'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import { LifePivotLogoSVG } from './lifepivot-logo-svg'
import { haptics } from '../utils/haptics'

export type LogoStatus = 'normal' | 'focus' | 'streak' | 'pivot'
export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number

export interface InteractiveLogoProps {
    /** Preset size or custom pixel width */
    size?: LogoSize
    /** Ambient state for the living pulse */
    status?: LogoStatus
    /** Enable 3D tilt and spring squish physics */
    interactive?: boolean
    /** Show the living ambient pulse glow */
    showGlow?: boolean
    /** Enable device gyroscope tilt on supported mobile devices */
    enableGyro?: boolean
    /** Enable Easter Egg on rapid triple-tap */
    enableEasterEgg?: boolean
    /** Optional click/tap handler */
    onClick?: () => void
    /** Extra wrapper CSS classes */
    className?: string
    /** Optional custom stop colors (overriding theme palette) */
    primaryColor?: string
    secondaryColor?: string
}

const SIZE_MAP: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', { w: number; h: number }> = {
    xs: { w: 24, h: 17 },
    sm: { w: 30, h: 21 },
    md: { w: 38, h: 26 },
    lg: { w: 60, h: 41 },
    xl: { w: 110, h: 75 }
}

const THEME_NEON_PAIRINGS: Record<string, { primary: string; secondary: string }> = {
    blue: { primary: '#00f0ff', secondary: '#d946ef' },
    violet: { primary: '#bd00ff', secondary: '#ff00a0' },
    green: { primary: '#10b981', secondary: '#00e5ff' },
    sunset: { primary: '#fbbf24', secondary: '#f43f5e' }
}

/**
 * Interactive LifePivot 3-Piece Neon Tube Logo.
 * Features:
 *  1. Pure geometric 3-piece vector SVG matching the official neon tube emblem.
 *  2. Multi-tone 3D neon tube gradients & bright luminous rims that adapt to every theme.
 *  3. Living Ambient Pulse: contour-hugging neon bloom with rhythmic respiration (zero circular background smudges).
 *  4. 3D Spring Tilt: responsive pointer/touch tilt + mobile gyroscope parallax.
 *  5. 4-Tier Tactile Engine feedback: haptic tick + micro-acoustic click on press.
 *  6. Combo Tap Easter Egg: 360° holographic flip with celebratory neon sparks.
 */
export function InteractiveLogo({
    size = 'md',
    status = 'normal',
    interactive = true,
    showGlow = true,
    enableGyro = true,
    enableEasterEgg = true,
    onClick,
    className = '',
    primaryColor,
    secondaryColor
}: InteractiveLogoProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [tapCount, setTapCount] = useState(0)
    const [isFlipping, setIsFlipping] = useState(false)
    const [sparks, setSparks] = useState<Array<{ id: number; angle: number; dist: number }>>([])
    const [activeAccent, setActiveAccent] = useState<string>('blue')
    const lastTapTimeRef = useRef(0)

    // Sync with theme changes (both via localStorage and documentElement style mutations)
    useEffect(() => {
        if (typeof window === 'undefined') return

        const syncTheme = () => {
            const stored = localStorage.getItem('lifepivot_accent')
            const cssPrimary = document.documentElement.style.getPropertyValue('--color-electric-blue').trim()
            if (cssPrimary === '#f59e0b' || stored === 'sunset') setActiveAccent('sunset')
            else if (cssPrimary === '#10b981' || stored === 'green') setActiveAccent('green')
            else if (cssPrimary === '#bd00ff' || stored === 'violet') setActiveAccent('violet')
            else setActiveAccent('blue')
        }

        syncTheme()

        const observer = new MutationObserver(syncTheme)
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] })
        window.addEventListener('storage', syncTheme)
        return () => {
            observer.disconnect()
            window.removeEventListener('storage', syncTheme)
        }
    }, [])

    // Calculate dimensions (500:340 aspect ratio)
    const dimensions = typeof size === 'number'
        ? { w: size, h: Math.round(size * 0.68) }
        : SIZE_MAP[size] || SIZE_MAP.md

    // ── 3D Spring Tilt Physics ──
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    const springConfig = { stiffness: 340, damping: 22, mass: 0.6 }
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [18, -18]), springConfig)
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-18, 18]), springConfig)

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!interactive || isFlipping) return
        const el = containerRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const normX = (e.clientX - rect.left) / rect.width - 0.5
        const normY = (e.clientY - rect.top) / rect.height - 0.5
        mouseX.set(Math.max(-0.6, Math.min(0.6, normX)))
        mouseY.set(Math.max(-0.6, Math.min(0.6, normY)))
    }, [interactive, isFlipping, mouseX, mouseY])

    const handlePointerLeave = useCallback(() => {
        if (!interactive) return
        mouseX.set(0)
        mouseY.set(0)
    }, [interactive, mouseX, mouseY])

    // Mobile Gyroscope Parallax (DeviceOrientation)
    useEffect(() => {
        if (!enableGyro || !interactive || typeof window === 'undefined') return

        const handleOrientation = (e: DeviceOrientationEvent) => {
            if (e.gamma === null || e.beta === null) return
            const clampedGamma = Math.max(-25, Math.min(25, e.gamma)) / 25
            const clampedBeta = Math.max(15, Math.min(65, e.beta)) - 40
            const normBeta = Math.max(-25, Math.min(25, clampedBeta)) / 25

            mouseX.set(clampedGamma * 0.4)
            mouseY.set(normBeta * 0.4)
        }

        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleOrientation, { passive: true })
            return () => window.removeEventListener('deviceorientation', handleOrientation)
        }
    }, [enableGyro, interactive, mouseX, mouseY])

    const handlePressDown = () => {
        if (!interactive) return
        haptics.tier1.selection()
    }

    const handleClick = () => {
        if (!interactive) {
            onClick?.()
            return
        }

        const now = Date.now()
        const isRapid = now - lastTapTimeRef.current < 450
        lastTapTimeRef.current = now

        const nextCount = isRapid ? tapCount + 1 : 1
        setTapCount(nextCount)

        if (enableEasterEgg && nextCount >= 3) {
            setIsFlipping(true)
            haptics.tier3.celebrate()

            const newSparks = Array.from({ length: 8 }).map((_, i) => ({
                id: Date.now() + i,
                angle: (i / 8) * Math.PI * 2,
                dist: Math.random() * 24 + 28
            }))
            setSparks(newSparks)

            setTimeout(() => {
                setIsFlipping(false)
                setTapCount(0)
                setSparks([])
            }, 800)
        } else {
            haptics.tier1.tick()
        }

        onClick?.()
    }

    const themeColors = THEME_NEON_PAIRINGS[activeAccent] || THEME_NEON_PAIRINGS.blue

    // Status overrides for special ambient states
    const resolvedPrimary = primaryColor || (
        status === 'focus' ? '#00f0ff' :
        status === 'streak' ? '#fbbf24' :
        status === 'pivot' ? '#f43f5e' :
        themeColors.primary
    )
    const resolvedSecondary = secondaryColor || (
        status === 'focus' ? '#2af598' :
        status === 'streak' ? '#f43f5e' :
        status === 'pivot' ? '#bd00ff' :
        themeColors.secondary
    )

    return (
        <div
            ref={containerRef}
            className={`relative inline-flex items-center justify-center cursor-pointer select-none shrink-0 ${className}`}
            style={{
                width: dimensions.w,
                height: dimensions.h,
                perspective: 800,
                WebkitTapHighlightColor: 'transparent'
            }}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerDown={handlePressDown}
            onClick={handleClick}
            role="button"
            tabIndex={interactive ? 0 : -1}
            aria-label="LifePivot Logo"
        >
            {/* ── 3D Tilting & Living Pulse Container ── */}
            <motion.div
                className="relative w-full h-full flex items-center justify-center"
                style={{
                    rotateX: isFlipping ? 0 : rotateX,
                    rotateY: isFlipping ? 0 : rotateY,
                    transformStyle: 'preserve-3d'
                }}
                whileHover={interactive ? { scale: 1.08 } : undefined}
                whileTap={interactive ? { scale: 0.90 } : undefined}
                animate={
                    isFlipping
                        ? { rotateY: 360 }
                        : showGlow
                        ? {
                              filter: [
                                  'drop-shadow(0 0 4px rgba(var(--accent-rgb, 0,240,255), 0.35))',
                                  'drop-shadow(0 0 11px rgba(var(--accent-rgb, 0,240,255), 0.75))',
                                  'drop-shadow(0 0 4px rgba(var(--accent-rgb, 0,240,255), 0.35))'
                              ]
                          }
                        : undefined
                }
                transition={
                    isFlipping
                        ? { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }
                        : {
                              duration: status === 'focus' ? 2.2 : 3.8,
                              repeat: Infinity,
                              ease: 'easeInOut'
                          }
                }
            >
                <LifePivotLogoSVG
                    primaryColor={resolvedPrimary}
                    secondaryColor={resolvedSecondary}
                    showGlow={showGlow}
                    className="w-full h-full object-contain"
                />

                {/* ── Easter Egg Sparkle Particles ── */}
                <AnimatePresence>
                    {sparks.map(spark => (
                        <motion.span
                            key={spark.id}
                            initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                            animate={{
                                scale: [0, 1.2, 0],
                                x: Math.cos(spark.angle) * spark.dist,
                                y: Math.sin(spark.angle) * spark.dist,
                                opacity: [1, 0.85, 0]
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            style={{ backgroundColor: resolvedPrimary }}
                            className="absolute w-1.5 h-1.5 rounded-full pointer-events-none shadow-[0_0_8px_currentColor]"
                        />
                    ))}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}
