'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { TRANSLATIONS, Locale } from '@/utils/translations'

interface LanguageContextProps {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: (path: string) => string
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('en')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const savedLocale = localStorage.getItem('lifepivot-locale') as Locale
        if (savedLocale && TRANSLATIONS[savedLocale]) {
            setLocaleState(savedLocale)
        } else {
            // Check browser preference
            const browserLang = navigator.language.slice(0, 2) as Locale
            if (TRANSLATIONS[browserLang]) {
                setLocaleState(browserLang)
            }
        }
        setMounted(true)
    }, [])

    const setLocale = (newLocale: Locale) => {
        if (TRANSLATIONS[newLocale]) {
            setLocaleState(newLocale)
            localStorage.setItem('lifepivot-locale', newLocale)
        }
    }

    const t = (path: string): string => {
        const parts = path.split('.')
        let current: any = TRANSLATIONS[locale]
        for (const part of parts) {
            if (current && current[part] !== undefined) {
                current = current[part]
            } else {
                // Try fallback to english
                let enCurrent: any = TRANSLATIONS['en']
                for (const enPart of parts) {
                    if (enCurrent && enCurrent[enPart] !== undefined) {
                        enCurrent = enCurrent[enPart]
                    } else {
                        return path
                    }
                }
                return typeof enCurrent === 'string' ? enCurrent : path
            }
        }
        return typeof current === 'string' ? current : path
    }

    // Render children with default locale on server to avoid hydration mismatch,
    // then sync with localStorage on client.
    return (
        <LanguageContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}
