'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { Check, AlertCircle, Sparkles, Loader2, ArrowRight, RefreshCw, HelpCircle, Trophy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateSocraticMicroDrills, verifyMicroDrillAnswers } from '@/app/actions'
import { haptics } from '@/utils/haptics'
import { useLanguage } from './language-provider'

interface Question {
    question: string
    options: string[]
    correctOptionIndex: number
}

interface SocraticMicroDrillsProps {
    taskId: string
    onPass: () => void
    onSkip: () => void
}

export function SocraticMicroDrills({ taskId, onPass, onSkip }: SocraticMicroDrillsProps) {
    const { t } = useLanguage()
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIdx, setCurrentIdx] = useState(0)
    const [selectedAnswers, setSelectedAnswers] = useState<number[]>([-1, -1, -1])
    const [isPending, startTransition] = useTransition()
    const [isLoading, setIsLoading] = useState(true)
    const [drillError, setDrillError] = useState<string | null>(null)
    const [result, setResult] = useState<{
        passed: boolean
        correctCount: number
        totalCount: number
        results: { index: number; isCorrect: boolean; correctIndex: number }[]
    } | null>(null)

    const loadDrills = useCallback(() => {
        setIsLoading(true)
        setDrillError(null)
        setResult(null)
        setCurrentIdx(0)
        setSelectedAnswers([-1, -1, -1])

        startTransition(async () => {
            const res = await generateSocraticMicroDrills(taskId)
            setIsLoading(false)
            if ('error' in res && res.error) {
                setDrillError(res.error)
            } else if (res.drill && res.drill.questions) {
                setQuestions(res.drill.questions)
            } else {
                setDrillError(t('socratic.drill_offline'))
            }
        })
    }, [taskId, t])

    useEffect(() => {
        const timer = setTimeout(() => {
            loadDrills()
        }, 0)
        return () => clearTimeout(timer)
    }, [loadDrills])

    const handleSelectOption = (optIdx: number) => {
        haptics.light()
        setSelectedAnswers(prev => {
            const updated = [...prev]
            updated[currentIdx] = optIdx
            return updated
        })
    }

    const handleNext = () => {
        haptics.light()
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(idx => idx + 1)
        }
    }

    const handleBack = () => {
        haptics.light()
        if (currentIdx > 0) {
            setCurrentIdx(idx => idx - 1)
        }
    }

    const handleSubmit = () => {
        haptics.medium()
        setIsLoading(true)
        startTransition(async () => {
            const res = await verifyMicroDrillAnswers(taskId, selectedAnswers)
            setIsLoading(false)
            if ('error' in res && res.error) {
                setDrillError(res.error)
                return
            }

            if (res) {
                setResult({
                    passed: res.passed ?? false,
                    correctCount: res.correctCount ?? 0,
                    totalCount: res.totalCount ?? 3,
                    results: res.results || []
                })

                if (res.passed) {
                    haptics.medium()
                } else {
                    haptics.error()
                }
            }
        })
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4 animate-fade-in select-none">
                <Loader2 className="h-10 w-10 text-electric-blue animate-spin shadow-[0_0_15px_rgba(0,240,255,0.15)]" />
                <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">{t('socratic.formulating_drill')}</h4>
                    <p className="text-[10px] text-gray-500 font-mono tracking-widest mt-1 uppercase">{t('socratic.structuring_mcqs')}</p>
                </div>
            </div>
        )
    }

    if (drillError) {
        return (
            <div className="bg-rose-500/5 border border-rose-500/20 p-6 rounded-3xl text-center select-none max-w-sm mx-auto">
                <AlertCircle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
                <h4 className="text-sm font-black text-white uppercase">{t('socratic.drill_offline')}</h4>
                <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">{drillError}</p>
                <div className="flex items-center gap-3 mt-5">
                    <button
                        onClick={loadDrills}
                        className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10"
                    >
                        {t('socratic.try_again')}
                    </button>
                    <button
                        onClick={onSkip}
                        className="flex-1 py-3 rounded-xl bg-rose-500 text-white text-xs font-black uppercase tracking-wider hover:opacity-90"
                    >
                        {t('socratic.skip_drill')}
                    </button>
                </div>
            </div>
        )
    }

    if (result) {
        return (
            <div className="w-full max-w-md mx-auto select-none">
                <AnimatePresence mode="wait">
                    {result.passed ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-[#121626]/80 border border-emerald-500/20 p-8 rounded-[2.5rem] text-center shadow-2xl flex flex-col items-center gap-6"
                        >
                            <div className="h-14 w-14 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-bounce">
                                <Trophy className="h-7 w-7" />
                            </div>
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">{t('socratic.drill_completed')}</span>
                                <h2 className="text-2xl font-black tracking-tight text-white mt-1 uppercase italic">{t('socratic.verify_success')}</h2>
                            </div>
                            <p className="text-gray-400 text-xs leading-relaxed max-w-xs">
                                {t('socratic.success_desc')}
                            </p>
                            <button
                                onClick={onPass}
                                className="w-full py-4.5 rounded-xl bg-emerald-500 text-black font-black text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                            >
                                {t('socratic.collect_rewards')}
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="fail"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-[#121626]/80 border border-rose-500/20 p-6 sm:p-8 rounded-[2.5rem] text-center shadow-2xl flex flex-col items-center gap-6"
                        >
                            <div className="h-14 w-14 bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.25)] animate-pulse">
                                <AlertCircle className="h-7 w-7" />
                            </div>
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-400">{t('socratic.drill_failed')}</span>
                                <h2 className="text-2xl font-black tracking-tight text-white mt-1 uppercase italic">{t('socratic.comprehension_gaps')}</h2>
                            </div>
                            
                            <div className="w-full text-left space-y-3.5">
                                <p className="text-gray-400 text-xs leading-relaxed text-center">
                                    {t('socratic.score_desc').replace('{score}', `${result.correctCount} / ${result.totalCount}`)}
                                </p>
                                
                                <div className="bg-black/30 border border-white/5 p-4 rounded-2xl space-y-2">
                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">{t('socratic.review_hint_title')}</span>
                                    <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                                        {t('socratic.review_hint_desc')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={loadDrills}
                                    className="flex-1 py-4 rounded-xl bg-[#1C2033] hover:bg-[#232942] border border-white/5 text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    {t('socratic.retry_drill')}
                                </button>
                                <button
                                    onClick={onSkip}
                                    className="flex-1 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-black uppercase tracking-wider text-gray-400 hover:text-white"
                                >
                                    {t('socratic.skip_standard_reward')}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )
    }

    const currentQuestion = questions[currentIdx]
    const currentAnswer = selectedAnswers[currentIdx]

    return (
        <div className="w-full max-w-md mx-auto bg-[#121626]/40 border border-white/5 rounded-[2.5rem] p-6 shadow-xl flex flex-col gap-6 select-none animate-fade-in relative z-10">
            {/* Header progress info */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <HelpCircle className="h-4.5 w-4.5 text-electric-blue" />
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">{t('socratic.concept_verification')}</span>
                </div>
                <span className="bg-[#1C2033] border border-white/5 px-3 py-1 rounded-full text-[10px] font-black text-gray-400 tracking-wider">
                    {t('socratic.question_count').replace('{index}', (currentIdx + 1).toString()).replace('{total}', questions.length.toString())}
                </span>
            </div>

            {/* Question title */}
            <div className="min-h-[50px] flex items-center">
                <h3 className="text-sm font-extrabold text-white leading-relaxed">
                    {currentQuestion.question}
                </h3>
            </div>

            {/* Options list */}
            <div className="flex flex-col gap-2.5">
                {currentQuestion.options.map((opt, oIdx) => {
                    const isSelected = currentAnswer === oIdx
                    return (
                        <button
                            key={oIdx}
                            onClick={() => handleSelectOption(oIdx)}
                            className={`p-4 rounded-2xl border text-left text-xs font-bold leading-relaxed transition-all active:scale-[0.99] flex items-center justify-between ${
                                isSelected
                                    ? 'bg-electric-blue/10 border-electric-blue text-electric-blue shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                                    : 'bg-black/20 border-white/5 hover:border-white/10 text-gray-300'
                            }`}
                            style={{
                                borderWidth: isSelected ? '2px' : '1px',
                            }}
                        >
                            <span>{opt}</span>
                            {isSelected && <Check className="h-4 w-4 text-electric-blue shrink-0 ml-2" />}
                        </button>
                    )
                })}
            </div>

            {/* Step navigation actions */}
            <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                <button
                    onClick={handleBack}
                    disabled={currentIdx === 0}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                    {t('socratic.back')}
                </button>

                {currentIdx < questions.length - 1 ? (
                    <button
                        onClick={handleNext}
                        disabled={currentAnswer === -1}
                        className="px-5 py-2.5 bg-electric-blue text-black font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 shadow-md shadow-electric-blue/20"
                    >
                        {t('socratic.next_question')}
                        <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={selectedAnswers.includes(-1)}
                        className="px-5 py-2.5 bg-gradient-to-r from-electric-blue to-neon-violet text-white font-black text-xs uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-md shadow-neon-violet/20"
                    >
                        {t('socratic.verify_answers')}
                    </button>
                )}
            </div>
        </div>
    )
}
