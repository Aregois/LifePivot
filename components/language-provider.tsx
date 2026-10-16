'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { TRANSLATIONS, Locale, selectPluralRule, interpolate } from '@/utils/translations'
import { updateActiveGoalsLanguage } from '@/app/actions'

interface LanguageContextProps {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: (path: string, params?: Record<string, string | number>) => string
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
    formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string
    formatCurrency: (value: number, currency?: string) => string
    isRTL: boolean
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined)

// Flatten a nested dictionary into dot-notated keys for O(1) lookups
import { createClient } from '@/utils/supabase/client'

function flattenDictionary(obj: Record<string, any>, prefix = ''): Record<string, string> {
    const flattened: Record<string, string> = {}
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        if (Array.isArray(value)) {
            value.forEach((item, index) => {
                if (item && typeof item === 'object') {
                    Object.assign(flattened, flattenDictionary(item, `${fullKey}.${index}`))
                } else if (typeof item === 'string') {
                    flattened[`${fullKey}.${index}`] = item
                }
            })
        } else if (value && typeof value === 'object') {
            Object.assign(flattened, flattenDictionary(value, fullKey))
        } else if (typeof value === 'string') {
            flattened[fullKey] = value
        }
    }
    return flattened
}

// Pre-flatten all locales on module load
const FLATTENED_LOCALES: Record<Locale, Record<string, string>> = {
    en: flattenDictionary(TRANSLATIONS.en),
    es: flattenDictionary(TRANSLATIONS.es),
    ru: flattenDictionary(TRANSLATIONS.ru),
    fr: flattenDictionary(TRANSLATIONS.fr),
    hy: flattenDictionary(TRANSLATIONS.hy),
    ja: flattenDictionary(TRANSLATIONS.ja),
    zh: flattenDictionary(TRANSLATIONS.zh),
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('en')

    useEffect(() => {
        try {
            const savedLocale = localStorage.getItem('lifepivot-locale') as Locale
            if (savedLocale && TRANSLATIONS[savedLocale]) {
                setLocaleState(savedLocale)
            } else {
                const supabase = createClient()
                supabase.auth.getUser().then(({ data: { user } }) => {
                    if (user) {
                        supabase.from('profiles').select('language').eq('id', user.id).single().then(({ data }) => {
                            if (data?.language && TRANSLATIONS[data.language as Locale]) {
                                setLocaleState(data.language as Locale)
                                localStorage.setItem('lifepivot-locale', data.language)
                            } else {
                                const browserLang = navigator.language?.slice(0, 2) as Locale
                                if (browserLang && TRANSLATIONS[browserLang]) {
                                    setLocaleState(browserLang)
                                }
                            }
                        })
                    } else {
                        const browserLang = navigator.language?.slice(0, 2) as Locale
                        if (browserLang && TRANSLATIONS[browserLang]) {
                            setLocaleState(browserLang)
                        }
                    }
                })
            }
        } catch {
            // In case of restricted localStorage access
        }
    }, [])

    const setLocale = useCallback(async (newLocale: Locale) => {
        if (TRANSLATIONS[newLocale]) {
            setLocaleState(newLocale)
            try {
                localStorage.setItem('lifepivot-locale', newLocale)
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    await supabase.from('profiles').update({ language: newLocale }).eq('id', user.id)
                }
                await updateActiveGoalsLanguage(newLocale)
            } catch (err) {
                console.error('Failed to update active goals language in DB:', err)
            }
        }
    }, [])

    const t = useCallback((path: string, params?: Record<string, string | number>): string => {
        const currentDict = FLATTENED_LOCALES[locale] || FLATTENED_LOCALES.en
        const fallbackDict = FLATTENED_LOCALES.en

        let template: string | undefined

        // Pluralization check if count is present
        if (params && typeof params.count === 'number') {
            const rule = selectPluralRule(params.count, locale)
            const pluralKey = `${path}_${rule}`
            template = currentDict[pluralKey] || fallbackDict[pluralKey]
        }

        // Standard exact lookup
        if (!template) {
            template = currentDict[path] || fallbackDict[path]
        }

        // If not found in dictionary, return empty string so `t('missing') || 'Fallback'` works
        if (!template) {
            return ''
        }

        return interpolate(template, params)
    }, [locale])

    const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions): string => {
        try {
            return new Intl.NumberFormat(locale, options).format(value)
        } catch {
            return String(value)
        }
    }, [locale])

    const formatDate = useCallback((value: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
        try {
            const d = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value
            return new Intl.DateTimeFormat(locale, options).format(d)
        } catch {
            return String(value)
        }
    }, [locale])

    const formatCurrency = useCallback((value: number, currency = 'USD'): string => {
        try {
            return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
        } catch {
            return `$${value}`
        }
    }, [locale])

    const value = useMemo<LanguageContextProps>(() => ({
        locale,
        setLocale,
        t,
        formatNumber,
        formatDate,
        formatCurrency,
        isRTL: false,
    }), [locale, setLocale, t, formatNumber, formatDate, formatCurrency])

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage(): LanguageContextProps {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}
