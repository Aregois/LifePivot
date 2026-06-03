/**
 * Platform detection utilities for tailored "Native Plus" experiences.
 */
export function isIOS(): boolean {
    if (typeof window === 'undefined' || !window.navigator) return false

    const userAgent = window.navigator.userAgent || window.navigator.vendor || (window as any).opera

    // Check for iPhone/iPad/iPod
    const isMobileIOS = /iPhone|iPad|iPod/.test(userAgent)

    // Check for iPad on iOS 13+ (which reports as Macintosh)
    const isIPadOS = userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1

    return isMobileIOS || isIPadOS
}

export function isAndroid(): boolean {
    if (typeof window === 'undefined' || !window.navigator) return false
    return /Android/.test(window.navigator.userAgent)
}
