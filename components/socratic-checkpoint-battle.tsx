'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { Bot, User, Send, Loader2, Trophy, ShieldAlert, Sparkles, Shield, Heart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { startCheckpointBattle, sendCheckpointBattleMessage, resolveCheckpointBattle } from '@/app/actions'
import { haptics } from '@/utils/haptics'
import { useEconomy } from './economy-provider'
import { useLanguage } from './language-provider'

interface SocraticCheckpointBattleProps {
    goalId: string
    wallDate: string
    wallLabel: string
    onResolve?: () => void
}

interface Message {
    role: 'user' | 'model'
    text: string
}

export function SocraticCheckpointBattle({ goalId, wallDate, wallLabel, onResolve }: SocraticCheckpointBattleProps) {
    const handleResolve = () => {
        haptics.light()
        if (onResolve) {
            onResolve()
        } else {
            window.location.reload()
        }
    }
    const { setTokens } = useEconomy()
    const { t } = useLanguage()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isPending, startTransition] = useTransition()
    const [isLoadingInit, setIsLoadingInit] = useState(true)
    const [step, setStep] = useState<'intro' | 'battle' | 'passed' | 'failed'>('intro')
    const [turn, setTurn] = useState(1)
    const [battleResultText, setBattleResultText] = useState('')
    const [displayedReply, setDisplayedReply] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [comprehensionRating, setComprehensionRating] = useState(50) // starts neutral at 50%

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const chatContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, displayedReply])

    const startBattle = () => {
        haptics.medium()
        setStep('battle')
        setIsLoadingInit(true)
        startTransition(async () => {
            const res = await startCheckpointBattle(goalId, wallDate)
            setIsLoadingInit(false)
            if ('greeting' in res && res.greeting) {
                animateReply(res.greeting, () => {
                    setMessages([{ role: 'model', text: res.greeting }])
                    setDisplayedReply('')
                })
            }
        })
    }

    const animateReply = (text: string, onDone: () => void) => {
        setIsTyping(true)
        setDisplayedReply('')
        let i = 0
        const interval = setInterval(() => {
            if (i < text.length) {
                setDisplayedReply(text.slice(0, i + 1))
                i++
            } else {
                clearInterval(interval)
                setIsTyping(false)
                onDone()
            }
        }, 12)
        return () => clearInterval(interval)
    }

    const handleSend = () => {
        const trimmed = input.trim()
        if (!trimmed || isPending || isTyping) return

        setInput('')
        haptics.light()
        
        // Append user message immediately
        const updatedMessages = [...messages, { role: 'user', text: trimmed } as Message]
        setMessages(updatedMessages)

        startTransition(async () => {
            const res = await sendCheckpointBattleMessage(goalId, wallDate, trimmed, updatedMessages)
            if ('error' in res && res.error) {
                haptics.error()
                return
            }

            const reply = res.reply || "A connection anomaly occurred. Probing continues..."
            const rating = res.rating // 'Pass' | 'Fail' | null

            animateReply(reply, async () => {
                setMessages(prev => [...prev, { role: 'model', text: reply }])
                setDisplayedReply('')

                // Shift rating visual bar dynamically based on dialogue contents
                const textLower = reply.toLowerCase()
                if (textLower.includes('incorrect') || textLower.includes('evasive') || textLower.includes('cracks')) {
                    setComprehensionRating(prev => Math.max(15, prev - 15))
                } else if (textLower.includes('excellent') || textLower.includes('deep') || textLower.includes('correct')) {
                    setComprehensionRating(prev => Math.min(95, prev + 15))
                }

                if (rating === 'Pass' || rating === 'Fail') {
                    // Resolve battle state in Supabase DB
                    await resolveCheckpointBattle(goalId, wallDate, rating)
                    
                    if (rating === 'Pass') {
                        haptics.medium()
                        setStep('passed')
                        setTokens(prev => prev + 15)
                    } else {
                        haptics.error()
                        setTokens(prev => Math.max(0, prev - 2))
                        setStep('failed')
                    }
                    setBattleResultText(reply)
                } else {
                    setTurn(t => t + 1)
                }
            })
        })
    }

    return (
        <div className="fixed inset-0 z-[1000] bg-[#05060f]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 select-none">
            {/* Dark background particles */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#12071f]/40 via-[#05060f] to-[#041b24]/40 pointer-events-none" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[70vw] h-[30vh] bg-neon-violet/10 rounded-full blur-[140px] pointer-events-none" />

            <AnimatePresence mode="wait">
                {step === 'intro' && (
                    <motion.div
                        key="intro-panel"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative z-10 w-full max-w-md bg-[#121626]/80 border border-white/5 p-8 rounded-[2.5rem] text-center shadow-2xl flex flex-col items-center gap-6"
                    >
                        <div className="h-16 w-16 bg-neon-violet/10 border-2 border-neon-violet/30 rounded-2xl flex items-center justify-center text-neon-violet shadow-[0_0_25px_rgba(189,0,255,0.25)] animate-pulse">
                            <ShieldAlert className="h-8 w-8" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-neon-violet">{t('socratic.milestone_checkpoint')}</span>
                            <h2 className="text-3xl font-black tracking-tighter text-white mt-1 uppercase italic">{t('socratic.checkpoint_battle')}</h2>
                            <p className="text-xs text-gray-500 font-mono tracking-widest mt-0.5">{wallLabel}</p>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed">
                            {t('socratic.intro_desc')}
                        </p>
                        <div className="w-full bg-[#0a0e1a]/60 border border-white/5 rounded-2xl p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest flex flex-col gap-2.5 text-left">
                            <div className="flex items-center gap-2 text-white">
                                <span className="h-2 w-2 rounded-full bg-neon-violet" />
                                {t('socratic.conversational_rounds')}
                            </div>
                            <div className="flex items-center gap-2 text-white">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                {t('socratic.victory_rewards')}
                            </div>
                            <div className="flex items-center gap-2 text-white">
                                <span className="h-2 w-2 rounded-full bg-rose-500" />
                                {t('socratic.defeat_penalty')}
                            </div>
                        </div>
                        <button
                            onClick={startBattle}
                            className="w-full py-5 rounded-2xl bg-gradient-to-r from-neon-violet to-electric-blue text-white font-black text-sm tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_35px_rgba(189,0,255,0.35)]"
                        >
                            {t('socratic.enter_arena')}
                        </button>
                    </motion.div>
                )}

                {step === 'battle' && (
                    <motion.div
                        key="battle-panel"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="relative z-10 w-full max-w-lg bg-[#0e111f]/90 border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col h-[85vh] overflow-hidden"
                    >
                        {/* Battle Header */}
                        <div className="p-5 border-b border-white/5 bg-white/[0.01] shrink-0 flex flex-col gap-3 relative z-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-neon-violet/10 border border-neon-violet/30 flex items-center justify-center text-neon-violet shadow-[0_0_15px_rgba(189,0,255,0.15)]">
                                        <Bot className="h-5 w-5 animate-pulse" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black text-white uppercase tracking-wider">{t('socratic.nexus_grand_sage')}</h3>
                                        <p className="text-[8px] font-black text-neon-violet uppercase tracking-widest mt-0.5">{t('socratic.arena_examiner')}</p>
                                    </div>
                                </div>
                                <div className="bg-[#121626] border border-white/5 px-3.5 py-1.5 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    {t('socratic.round_count').replace('{turn}', turn.toString())}
                                </div>
                            </div>

                            {/* Dual HUD bars: turn progress & live comprehension estimate */}
                            <div className="grid grid-cols-2 gap-4 mt-2 select-none">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[8px] font-black text-gray-500 uppercase tracking-wider">
                                        <span>{t('socratic.round_timer')}</span>
                                        <span>{turn}/3</span>
                                    </div>
                                    <div className="w-full bg-[#05060f] h-2 rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className="h-full bg-gradient-to-r from-neon-violet to-electric-blue rounded-full transition-all duration-500"
                                            style={{ width: `${(turn / 3) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[8px] font-black text-gray-500 uppercase tracking-wider">
                                        <span>{t('socratic.comprehension_rating')}</span>
                                        <span>{comprehensionRating}%</span>
                                    </div>
                                    <div className="w-full bg-[#05060f] h-2 rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ 
                                                width: `${comprehensionRating}%`,
                                                background: comprehensionRating > 60 ? '#10b981' : comprehensionRating > 35 ? '#f59e0b' : '#ef4444',
                                                boxShadow: comprehensionRating > 60 ? '0 0 10px rgba(16,185,129,0.5)' : 'none'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dialogue Stream */}
                        <div
                            ref={chatContainerRef}
                            className="flex-1 p-5 overflow-y-auto space-y-4 relative z-0 no-scrollbar"
                        >
                            {isLoadingInit ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-60">
                                    <Loader2 className="h-8 w-8 text-neon-violet animate-spin" />
                                    <p className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">{t('socratic.consulting_syllabus')}</p>
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg, idx) => (
                                        <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>
                                            <div className={`h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center border ${
                                                msg.role === 'user'
                                                    ? 'bg-electric-blue/10 border-electric-blue/20 text-electric-blue'
                                                    : 'bg-neon-violet/10 border-neon-violet/20 text-neon-violet'
                                            }`}>
                                                {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                                            </div>

                                            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-[12px] leading-relaxed font-medium ${
                                                msg.role === 'user'
                                                    ? 'bg-electric-blue/10 border border-electric-blue/25 text-white rounded-tr-sm'
                                                    : 'bg-[#121626]/60 border border-white/5 text-gray-200 rounded-tl-sm shadow-md'
                                            }`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))}

                                    {(isPending || isTyping) && (
                                        <div className="flex gap-2.5">
                                            <div className="h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center border bg-neon-violet/10 border-neon-violet/20 text-neon-violet">
                                                <Bot className="h-3.5 w-3.5 animate-pulse" />
                                            </div>

                                            <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tl-sm bg-[#121626]/60 border border-white/5 text-gray-300 text-[12px] leading-relaxed shadow-md">
                                                {isPending && !isTyping ? (
                                                    <span className="flex items-center gap-1.5 text-gray-500 italic text-[11px]">
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        {t('socratic.sage_analyzing')}
                                                    </span>
                                                ) : (
                                                    <span>
                                                        {displayedReply}
                                                        <span className="animate-pulse text-neon-violet">▋</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input bar */}
                        <div className="p-4 border-t border-white/5 bg-white/[0.01] shrink-0">
                            <div className="relative flex items-center gap-2 bg-[#121626] border border-white/10 rounded-full px-3 py-1.5 focus-within:border-neon-violet/50 shadow-inner">
                                <input
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                                    placeholder={t('socratic.conceptual_justification_placeholder')}
                                    disabled={isPending || isTyping || isLoadingInit}
                                    className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none py-2 pl-2"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isPending || isTyping || isLoadingInit}
                                    className="h-8 w-8 rounded-full bg-neon-violet text-white hover:bg-white hover:text-neon-violet transition-all flex items-center justify-center disabled:opacity-30 shadow-lg active:scale-95 shrink-0"
                                >
                                    <Send className="h-3 w-3 fill-current" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 'passed' && (
                    <motion.div
                        key="passed-panel"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative z-10 w-full max-w-md bg-[#121626]/80 border border-emerald-500/20 p-8 rounded-[2.5rem] text-center shadow-2xl flex flex-col items-center gap-6"
                    >
                        <div className="h-16 w-16 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-bounce">
                            <Trophy className="h-8 w-8" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">{t('socratic.battle_resolved')}</span>
                            <h2 className="text-3xl font-black tracking-tighter text-white mt-1 uppercase italic">{t('socratic.checkpoint_cleared')}</h2>
                        </div>
                        
                        <p className="text-gray-300 text-xs font-medium leading-relaxed italic border-y border-white/5 py-4 px-2">
                            &ldquo;{battleResultText}&rdquo;
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4 w-full select-none">
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl py-3 text-center">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">{t('socratic.milestone_status')}</span>
                                <span className="text-emerald-400 font-extrabold text-sm block mt-0.5">{t('socratic.unlocked')}</span>
                            </div>
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl py-3 text-center">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">{t('socratic.rewards_granted')}</span>
                                <span className="text-emerald-400 font-extrabold text-sm block mt-0.5">+15 Tokens / +100 XP</span>
                            </div>
                        </div>
                        
                        <button
                            onClick={handleResolve}
                            className="w-full py-5 rounded-2xl bg-emerald-500 text-black font-black text-sm tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(16,185,129,0.25)]"
                        >
                            {t('socratic.return_command_center')}
                        </button>
                    </motion.div>
                )}

                {step === 'failed' && (
                    <motion.div
                        key="failed-panel"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative z-10 w-full max-w-md bg-[#121626]/80 border border-rose-500/20 p-8 rounded-[2.5rem] text-center shadow-2xl flex flex-col items-center gap-6"
                    >
                        <div className="h-16 w-16 bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.3)] animate-pulse">
                            <Heart className="h-8 w-8 text-rose-500 fill-rose-500/30" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-400">{t('socratic.battle_resolved')}</span>
                            <h2 className="text-3xl font-black tracking-tighter text-white mt-1 uppercase italic">{t('socratic.checkpoint_defeat')}</h2>
                        </div>
                        
                        <p className="text-gray-300 text-xs leading-relaxed italic border-y border-white/5 py-4 px-2">
                            &ldquo;{battleResultText}&rdquo;
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4 w-full select-none">
                            <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl py-3 text-center">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">{t('socratic.arena_status')}</span>
                                <span className="text-rose-400 font-extrabold text-sm block mt-0.5">{t('socratic.defeat')}</span>
                            </div>
                            <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl py-3 text-center">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">{t('socratic.cost_sustained')}</span>
                                <span className="text-rose-400 font-extrabold text-sm block mt-0.5">-2 Tokens</span>
                            </div>
                        </div>
                        
                        <button
                            onClick={handleResolve}
                            className="w-full py-5 rounded-2xl bg-rose-500 text-white font-black text-sm tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(244,63,94,0.25)]"
                        >
                            {t('socratic.return_review_syllabus')}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
