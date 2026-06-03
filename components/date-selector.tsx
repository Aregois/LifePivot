'use client'

import { useMemo, useLayoutEffect, useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { getLocalDateString, getSunday } from '@/utils/date-utils'
import { haptics } from '@/utils/haptics'
import { useLanguage } from './language-provider'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

interface DateSelectorProps {
    selectedDate: string
    onSelectDate: (date: string) => void
}

export function DateSelector({ selectedDate, onSelectDate }: DateSelectorProps) {
    const { locale, t } = useLanguage()
    // Initialize baseDate from selectedDate so we always start on the right week
    const [baseDate, setBaseDate] = useState(() => {
        const d = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date()
        return getSunday(d)
    })

    const scrollRef = useRef<HTMLDivElement>(null)
    const isAdjusting = useRef(false)
    const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
    const prevSelectedDate = useRef(selectedDate)

    // Sync baseDate when selectedDate changes (e.g. from Calendar navigation)
    useEffect(() => {
        if (selectedDate !== prevSelectedDate.current) {
            prevSelectedDate.current = selectedDate
            const sel = new Date(selectedDate + 'T00:00:00')
            const selSunday = getSunday(sel)
            // Only update baseDate if the week actually changed
            if (selSunday.getTime() !== baseDate.getTime()) {
                setBaseDate(selSunday)
            }
        }
    }, [selectedDate, baseDate])

    // Month label from middle of currently viewed week
    const currentMonthLabel = useMemo(() => {
        const midWeek = new Date(baseDate)
        midWeek.setDate(baseDate.getDate() + 3)
        return midWeek.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    }, [baseDate])

    // Generate 3 weeks: previous, current, next
    const weeks = useMemo(() => {
        return [-1, 0, 1].map((weekOffset) => {
            const weekStart = new Date(baseDate)
            weekStart.setDate(baseDate.getDate() + (weekOffset * 7))

            return Array.from({ length: 7 }, (_, dayIdx) => {
                const d = new Date(weekStart)
                d.setDate(weekStart.getDate() + dayIdx)
                return {
                    dayStr: d.toLocaleDateString(locale, { weekday: 'short' }),
                    num: d.getDate(),
                    isToday: getLocalDateString(d) === getLocalDateString(new Date()),
                    fullDate: getLocalDateString(d)
                }
            })
        })
    }, [baseDate])

    // Reset scroll to the middle panel (index 1 = current week)
    const centerScroll = useCallback(() => {
        if (!scrollRef.current) return
        const container = scrollRef.current
        const width = container.offsetWidth

        // Disable snap before programmatic scroll
        container.style.scrollSnapType = 'none'
        container.scrollLeft = width

        // Re-enable snap after paint
        requestAnimationFrame(() => {
            if (!scrollRef.current) return
            scrollRef.current.style.scrollSnapType = 'x mandatory'
            setTimeout(() => {
                isAdjusting.current = false
            }, 120)
        })
    }, [])

    useIsomorphicLayoutEffect(() => {
        centerScroll()
        window.addEventListener('resize', centerScroll)
        return () => window.removeEventListener('resize', centerScroll)
    }, [baseDate, centerScroll])

    // Detect when user swipes to prev/next week
    const handleScroll = useCallback(() => {
        if (!scrollRef.current || isAdjusting.current) return

        if (scrollTimeout.current) clearTimeout(scrollTimeout.current)

        scrollTimeout.current = setTimeout(() => {
            if (!scrollRef.current) return

            const sl = Math.round(scrollRef.current.scrollLeft)
            const width = scrollRef.current.offsetWidth
            if (width === 0) return

            // Swiped to previous week
            if (sl < 20) {
                isAdjusting.current = true
                haptics.light()
                setBaseDate(prev => {
                    const next = new Date(prev)
                    next.setDate(prev.getDate() - 7)
                    return next
                })
            }
            // Swiped to next week
            else if (sl > (width * 2) - 20) {
                isAdjusting.current = true
                haptics.light()
                setBaseDate(prev => {
                    const next = new Date(prev)
                    next.setDate(prev.getDate() + 7)
                    return next
                })
            }
        }, 120)
    }, [])

    return (
        <div className="w-full py-4 flex flex-col gap-4 select-none overflow-hidden bg-transparent">
            {/* Header: Month & View All */}
            <div className="flex justify-between items-center px-6">
                <h2 className="text-lg font-bold text-white tracking-wide">
                    {currentMonthLabel}
                </h2>

                <Link
                    href="/calendar"
                    onClick={() => haptics.light()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C2033]/80 border border-white/5 hover:bg-white/10 transition-colors group shadow-lg active:scale-95"
                    style={{ touchAction: 'manipulation' }}
                >
                    <Calendar className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#00FFFF] transition-colors" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">
                        {t('calendar.view_all')}
                    </span>
                </Link>
            </div>

            {/* Week strip with snap scrolling */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="w-full overflow-x-auto no-scrollbar snap-x snap-mandatory overscroll-x-contain"
                style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
            >
                <div className="flex">
                    {weeks.map((week, wIdx) => (
                        <div
                            key={wIdx}
                            className="w-full shrink-0 snap-start px-4 box-border"
                        >
                            <div className="grid grid-cols-7 gap-1 w-full">
                                {week.map((d) => {
                                    const isSelected = selectedDate === d.fullDate

                                    return (
                                        <button
                                            key={d.fullDate}
                                            type="button"
                                            onClick={() => {
                                                haptics.medium()
                                                onSelectDate(d.fullDate)
                                            }}
                                            className="flex flex-col items-center justify-center py-2 bg-transparent border-none outline-none"
                                            style={{ touchAction: 'manipulation' }}
                                        >
                                            {/* 
                                              relative is ALWAYS on so the today-dot 
                                              has a positioned ancestor at all times 
                                            */}
                                            <div
                                                className={[
                                                    'relative flex flex-col items-center justify-center',
                                                    'w-full aspect-[1/1.5] max-w-[54px] rounded-[24px]',
                                                    'border cursor-pointer',
                                                    'transition-[background-color,border-color,box-shadow] duration-150',
                                                    'active:scale-90',
                                                    isSelected
                                                        ? 'bg-[#00FFFF] border-[#00FFFF] shadow-[0_0_16px_rgba(0,255,255,0.35)]'
                                                        : 'bg-[#1C2033]/50 border-white/5 hover:bg-[#1C2033]',
                                                ].join(' ')}
                                            >
                                                <span
                                                    className={`text-[10px] font-bold uppercase tracking-wider mb-1 pointer-events-none ${isSelected ? 'text-black/60' : 'text-gray-500'
                                                        }`}
                                                >
                                                    {d.dayStr}
                                                </span>
                                                <span
                                                    className={`text-xl font-black pointer-events-none ${isSelected ? 'text-black' : 'text-white'
                                                        }`}
                                                >
                                                    {d.num}
                                                </span>

                                                {/* Today dot — always has a relative parent now */}
                                                {d.isToday && !isSelected && (
                                                    <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[#00FFFF] shadow-[0_0_8px_rgba(0,255,255,0.8)] pointer-events-none" />
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div >
    )
}