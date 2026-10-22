'use client'

import React, { useId } from 'react'

export interface LifePivotLogoSVGProps extends React.SVGProps<SVGSVGElement> {
    /** Custom primary gradient stop color. Defaults to var(--color-electric-blue, #00f0ff) */
    primaryColor?: string
    /** Custom secondary gradient stop color. Defaults to var(--color-neon-violet, #bd00ff) */
    secondaryColor?: string
    /** Whether to render an internal soft blur glow filter. Defaults to true */
    showGlow?: boolean
    /** Optional normalized sheen offset (-1 to 1) for 3D tilt specular highlight */
    sheenOffset?: number
}

export const LIFEPIVOT_LOGO_VIEWBOX = '20 45 500 340'

// 1. Main C-Loop + Diagonal Pivot Stem + Bottom Horizontal Tail
export const PATH_MAIN_LOOP =
    'M 34.5 344.5 L 110.0 344.5 C 155.0 344.5 189.0 326.0 213.0 284.0 L 251.0 205.0 C 271.0 164.0 301.0 135.0 334.5 114.5 C 336.5 113.0 336.5 110.5 334.0 108.5 C 317.0 93.0 294.0 83.0 268.0 83.0 C 202.0 83.0 152.0 136.0 152.0 206.0 C 152.0 240.0 163.0 270.0 182.0 293.0 L 167.0 306.5 C 143.0 279.0 130.0 244.0 130.0 206.0 C 130.0 124.0 190.0 61.0 268.0 61.0 C 302.0 61.0 332.0 74.0 351.0 95.0 C 360.0 105.0 360.0 122.0 349.0 133.0 C 316.0 156.0 286.0 186.0 265.0 227.0 L 236.0 287.0 C 210.0 338.0 166.0 366.5 108.0 366.5 L 34.5 366.5 Z'

// 2. Curved Arrow Shaft + Sharp Triangular Arrowhead
export const PATH_ARROW =
    'M 288.5 224.0 C 342.0 219.0 386.0 182.0 414.5 114.5 L 384.5 78.5 L 501.5 60.0 L 463.5 171.5 L 434.5 138.0 C 398.0 210.0 348.0 244.0 278.5 245.0 Z'

// 3. Bottom-Right Orbit Arc
export const PATH_BOTTOM_ARC =
    'M 426.5 187.5 C 433.0 228.0 420.0 274.0 393.0 312.0 C 365.0 351.0 318.0 368.0 270.0 364.5 C 250.0 363.0 232.0 357.0 217.5 348.0 L 232.0 331.5 C 245.0 339.0 261.0 343.0 278.0 343.5 C 319.0 345.0 358.0 326.0 381.0 293.0 C 401.0 265.0 408.0 236.0 407.0 214.5 Z'

/**
 * Pure Vector SVG representation of the official 3-piece LifePivot neon tube logo.
 * Faithfully reproduces the 3D neon tube body fills, bright luminous rim borders,
 * and contour-hugging neon bloom while dynamically adapting to theme CSS variables.
 */
export function LifePivotLogoSVG({
    primaryColor = 'var(--color-electric-blue, #00f0ff)',
    secondaryColor = 'var(--color-neon-violet, #bd00ff)',
    showGlow = true,
    className = '',
    style,
    ...props
}: LifePivotLogoSVGProps) {
    const rawId = useId()
    const safeId = rawId.replace(/[:]/g, '')

    const bodyGradMain = `lp-body-main-${safeId}`
    const bodyGradArrow = `lp-body-arrow-${safeId}`
    const bodyGradArc = `lp-body-arc-${safeId}`

    const rimGradMain = `lp-rim-main-${safeId}`
    const rimGradArrow = `lp-rim-arrow-${safeId}`
    const rimGradArc = `lp-rim-arc-${safeId}`
    const glowId = `lp-glow-${safeId}`

    // Bright luminous neon tube rim highlights (mixed with white so the edges pop in every theme)
    const brightPrimary = `color-mix(in srgb, ${primaryColor} 52%, #ffffff)`
    const brightSecondary = `color-mix(in srgb, ${secondaryColor} 55%, #ffd6f5)`

    // Rich 3D dark-core neon glass interior colors (creates strong contrast against the bright rim)
    const deepPrimary = `color-mix(in srgb, ${primaryColor} 68%, #0a0d24)`
    const deepMid = `color-mix(in srgb, ${primaryColor} 34%, color-mix(in srgb, ${secondaryColor} 66%, #140a2e))`
    const deepSecondary = `color-mix(in srgb, ${secondaryColor} 68%, #1e0728)`

    return (
        <svg
            viewBox={LIFEPIVOT_LOGO_VIEWBOX}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`overflow-visible select-none ${className}`}
            style={{ ...style }}
            aria-label="LifePivot"
            role="img"
            {...props}
        >
            <defs>
                {/* ── 3D Neon Tube Inner Body Gradients ── */}
                {/* Piece 1: Bottom-left (Primary) -> Top Loop (Secondary) */}
                <linearGradient id={bodyGradMain} x1="35" y1="360" x2="310" y2="70" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={deepPrimary} />
                    <stop offset="48%" stopColor={deepMid} />
                    <stop offset="100%" stopColor={deepSecondary} />
                </linearGradient>

                {/* Piece 2: Shaft (Secondary) -> Arrowhead (Mid-Primary Indigo/Cyan) */}
                <linearGradient id={bodyGradArrow} x1="280" y1="240" x2="495" y2="65" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={deepSecondary} />
                    <stop offset="55%" stopColor={deepMid} />
                    <stop offset="100%" stopColor={deepPrimary} />
                </linearGradient>

                {/* Piece 3: Bottom-left (Primary) -> Top-right (Secondary) */}
                <linearGradient id={bodyGradArc} x1="220" y1="355" x2="425" y2="190" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={deepPrimary} />
                    <stop offset="50%" stopColor={deepMid} />
                    <stop offset="100%" stopColor={deepSecondary} />
                </linearGradient>

                {/* ── Crisp Bright Neon Tube Rim Gradients ── */}
                <linearGradient id={rimGradMain} x1="35" y1="360" x2="320" y2="70" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={brightPrimary} />
                    <stop offset="45%" stopColor={brightPrimary} />
                    <stop offset="100%" stopColor={brightSecondary} />
                </linearGradient>

                <linearGradient id={rimGradArrow} x1="280" y1="240" x2="500" y2="60" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={brightSecondary} />
                    <stop offset="42%" stopColor={brightSecondary} />
                    <stop offset="100%" stopColor={brightPrimary} />
                </linearGradient>

                <linearGradient id={rimGradArc} x1="220" y1="355" x2="425" y2="190" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={brightPrimary} />
                    <stop offset="100%" stopColor={brightSecondary} />
                </linearGradient>

                {/* ── Contour-Hugging Neon Bloom Filter ── */}
                {showGlow && (
                    <filter id={glowId} x="-25%" y="-25%" width="150%" height="150%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
                        <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur2" />
                        <feMerge>
                            <feMergeNode in="blur2" />
                            <feMergeNode in="blur1" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                )}
            </defs>

            <g filter={showGlow ? `url(#${glowId})` : undefined}>
                {/* Piece 1: Main Loop + Diagonal Pivot + Horizontal Base */}
                <path
                    d={PATH_MAIN_LOOP}
                    fill={`url(#${bodyGradMain})`}
                    stroke={`url(#${rimGradMain})`}
                    strokeWidth="6"
                    strokeLinejoin="round"
                />

                {/* Piece 2: Curved Arrow Shaft + Arrowhead */}
                <path
                    d={PATH_ARROW}
                    fill={`url(#${bodyGradArrow})`}
                    stroke={`url(#${rimGradArrow})`}
                    strokeWidth="6"
                    strokeLinejoin="round"
                />

                {/* Piece 3: Bottom-Right Circular Arc */}
                <path
                    d={PATH_BOTTOM_ARC}
                    fill={`url(#${bodyGradArc})`}
                    stroke={`url(#${rimGradArc})`}
                    strokeWidth="6"
                    strokeLinejoin="round"
                />
            </g>
        </svg>
    )
}
