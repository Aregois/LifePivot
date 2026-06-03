'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { Send, Bot, User, Loader2, Volume2, VolumeX, ChevronDown } from 'lucide-react'
import { sendSocraticMessage } from '@/app/actions'
import { speakText, stopSpeaking } from '@/utils/tts'
import { useEconomy } from './economy-provider'
import { createClient } from '@/utils/supabase/client'
import { haptics } from '@/utils/haptics'
import type { Task } from '@/utils/types'
import { useLanguage } from './language-provider'

interface Message {
    role: 'user' | 'model'
    text: string
}

export function DesktopTutorPanel() {
    const { t } = useLanguage()
    const { activeChatTask, setActiveChatTask } = useEconomy()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [displayedReply, setDisplayedReply] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [speakingMsgIndex, setSpeakingMsgIndex] = useState<number | null>(null)
    const [persona, setPersona] = useState<string>('feynman')
    
    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Listen for custom event to focus input
    useEffect(() => {
        const handleFocusInput = () => {
            inputRef.current?.focus()
        }
        window.addEventListener('focus-tutor-input', handleFocusInput)
        return () => window.removeEventListener('focus-tutor-input', handleFocusInput)
    }, [])

    // Load preferred persona on mount
    useEffect(() => {
        const prefPersona = localStorage.getItem('lifepivot_persona') || 'feynman'
        setPersona(prefPersona)
    }, [])

    // Query a default active chat task if none selected
    useEffect(() => {
        if (!activeChatTask) {
            const supabase = createClient()
            supabase.from('tasks')
                .select('*')
                .eq('status', 'pending')
                .order('due_date', { ascending: true })
                .limit(1)
                .then(({ data }) => {
                    if (data && data.length > 0) {
                        setActiveChatTask(data[0] as Task)
                    }
                })
        }
    }, [activeChatTask, setActiveChatTask])

    // Scroll to bottom when messages or typing updates
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, displayedReply])

    // Clean audio on unmount
    useEffect(() => {
        return () => {
            stopSpeaking()
        }
    }, [])

    const handlePersonaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const p = e.target.value
        setPersona(p)
        localStorage.setItem('lifepivot_persona', p)
        haptics.light()
    }

    const handleToggleSpeech = (index: number, text: string) => {
        if (speakingMsgIndex === index) {
            stopSpeaking()
            setSpeakingMsgIndex(null)
        } else {
            speakText(
                text,
                () => setSpeakingMsgIndex(index),
                () => setSpeakingMsgIndex(null),
                () => setSpeakingMsgIndex(null)
            )
        }
    }

    const animateReply = (text: string, onDone: () => void) => {
        setIsTyping(true)
        setDisplayedReply('')
        let i = 0
        const iv = setInterval(() => {
            if (i < text.length) {
                setDisplayedReply(text.slice(0, i + 1))
                i++
            } else {
                clearInterval(iv)
                setIsTyping(false)
                onDone()
            }
        }, 15)
        return () => clearInterval(iv)
    }

    const handleSend = () => {
        const trimmed = input.trim()
        if (!trimmed || isPending || isTyping) return
        
        // If we don't have a task, we cannot use the Socratic prompt, so show error
        if (!activeChatTask) {
            setError(t('tutor.error_select'))
            return
        }

        setInput('')
        setError(null)
        const history = messages

        startTransition(async () => {
            const result = await sendSocraticMessage(activeChatTask.id, trimmed, history, undefined, persona)
            if ('error' in result && result.error) {
                setError(t('tutor.error_offline'))
                return
            }
            setMessages(prev => [...prev, { role: 'user', text: trimmed }])
            const reply = result.reply ?? ''
            animateReply(reply, () => {
                setMessages(prev => [...prev, { role: 'model', text: reply }])
                setDisplayedReply('')
            })
        })
    }

    return (
        <aside className="hidden lg:flex flex-col h-screen w-80 fixed right-0 top-0 bg-[#0E111F]/80 backdrop-blur-xl border-l border-white/5 z-50 select-none">
            {/* Top Glow Accent */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-electric-blue via-neon-violet to-electric-blue opacity-80 blur-[0.5px]"></div>
            
            {/* Header / Persona Selector */}
            <div className="p-4 border-b border-white/5 flex flex-col gap-3.5 relative z-10 bg-white/[0.01]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-[#1C2033] flex items-center justify-center border border-electric-blue/30 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                                <Bot className="h-5 w-5 text-electric-blue" />
                            </div>
                            {/* Animated Online Pulse */}
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0B0D17] animate-pulse shadow-[0_0_8px_#10b981]"></div>
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-white uppercase tracking-wider leading-tight">{t('tutor.buddy')}</h3>
                            <p className="text-[9px] font-black text-electric-blue uppercase tracking-widest mt-0.5">{t('tutor.title')}</p>
                        </div>
                    </div>
                </div>

                {/* Dropdown Select for Personas */}
                <div className="relative">
                    <select 
                        value={persona}
                        onChange={handlePersonaChange}
                        className="w-full appearance-none bg-black/30 border border-white/5 hover:border-white/10 rounded-xl py-2.5 pl-3 pr-10 text-[11px] font-extrabold text-gray-300 uppercase tracking-widest focus:outline-none focus:border-neon-violet/40 focus:ring-1 focus:ring-neon-violet/40 cursor-pointer transition-colors"
                    >
                        <option value="feynman">{t('tutor.feynman')}</option>
                        <option value="socrates">{t('tutor.socrates')}</option>
                        <option value="stoic">{t('tutor.aurelius')}</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                        <ChevronDown className="h-3.5 w-3.5" />
                    </div>
                </div>

                {/* Active Task Context Banner */}
                {activeChatTask ? (
                    <div className="px-3 py-2 rounded-lg bg-electric-blue/5 border border-electric-blue/15 flex flex-col gap-0.5 animate-fade-in">
                        <span className="text-[8px] font-black uppercase text-electric-blue tracking-widest">{t('tutor.active_context')}</span>
                        <span className="text-[10px] font-bold text-white truncate">{activeChatTask.title}</span>
                    </div>
                ) : (
                    <div className="px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15 flex flex-col gap-0.5 animate-fade-in">
                        <span className="text-[8px] font-black uppercase text-amber-500 tracking-widest">{t('tutor.context_pending')}</span>
                        <span className="text-[10px] font-medium text-gray-400">{t('tutor.no_task_selected')}</span>
                    </div>
                )}
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 no-scrollbar relative z-0">
                {/* Background ambient glow circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-neon-violet/5 rounded-full blur-[60px] pointer-events-none"></div>

                {messages.length === 0 && !isPending && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center pb-8 opacity-70 animate-fade-up">
                        <div className="h-12 w-12 rounded-2xl bg-electric-blue/5 border border-electric-blue/15 flex items-center justify-center shadow-inner">
                            <Bot className="h-6 w-6 text-electric-blue animate-float" />
                        </div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider max-w-[180px] leading-relaxed">
                            {t('tutor.guide_text')}
                        </p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-slide-right`}>
                        <div className={`h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center border ${
                            msg.role === 'user' 
                                ? 'bg-electric-blue/10 border-electric-blue/20' 
                                : 'bg-neon-violet/10 border-neon-violet/20'
                        }`}>
                            {msg.role === 'user' ? (
                                <User className="h-3 w-3 text-electric-blue" />
                            ) : (
                                <Bot className="h-3 w-3 text-neon-violet" />
                            )}
                        </div>
                        
                        <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[12px] leading-relaxed font-medium ${
                            msg.role === 'user' 
                                ? 'bg-electric-blue/10 border border-electric-blue/25 text-white rounded-tr-sm shadow-[0_0_15px_rgba(0,240,255,0.05)]' 
                                : 'bg-[#1C2033]/60 border border-white/5 text-gray-200 rounded-tl-sm shadow-md'
                        }`}>
                            {msg.text}
                        </div>

                        {msg.role === 'model' && (
                            <button
                                onClick={() => handleToggleSpeech(idx, msg.text)}
                                className={`self-end mb-0.5 h-6.5 w-6.5 rounded-lg flex items-center justify-center border transition-all ${
                                    speakingMsgIndex === idx 
                                        ? 'bg-neon-violet/20 border-neon-violet/30 text-neon-violet shadow-[0_0_8px_rgba(189,0,255,0.2)] animate-pulse' 
                                        : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/5'
                                } shrink-0 active:scale-90`}
                            >
                                {speakingMsgIndex === idx ? (
                                    <VolumeX className="h-3 w-3" />
                                ) : (
                                    <Volume2 className="h-3 w-3" />
                                )}
                            </button>
                        )}
                    </div>
                ))}

                {(isPending || isTyping) && (
                    <div className="flex gap-2.5 animate-pulse">
                        <div className="h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center border bg-neon-violet/10 border-neon-violet/20">
                            <Bot className="h-3 w-3 text-neon-violet" />
                        </div>
                        
                        <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-[#1C2033]/60 border border-white/5 text-gray-300 text-[12px] leading-relaxed shadow-md">
                            {isPending && !isTyping ? (
                                <span className="flex items-center gap-1.5 text-gray-500 italic text-[11px]">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    {t('tutor.thinking')}
                                </span>
                            ) : (
                                <span>
                                    {displayedReply}
                                    <span className="animate-pulse text-electric-blue">▋</span>
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] text-center font-black uppercase tracking-wider animate-fade-in">
                        {error}
                    </div>
                )}
                
                <div ref={bottomRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-white/5 bg-white/[0.01] relative z-10">
                <div className="relative flex items-center gap-2 bg-[#1C2033] border border-white/10 rounded-full px-3 py-1.5 focus-within:border-tertiary focus-within:ring-1 focus-within:ring-tertiary shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] transition-all">
                    <input 
                        ref={inputRef}
                        value={input} 
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder={t('tutor.placeholder')}
                        disabled={isPending || isTyping}
                        className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none py-1.5 pl-2" 
                    />
                    <button 
                        onClick={handleSend} 
                        disabled={!input.trim() || isPending || isTyping}
                        className="h-7 w-7 rounded-full bg-tertiary text-white hover:bg-white hover:text-tertiary transition-colors flex items-center justify-center disabled:opacity-30 disabled:hover:bg-tertiary disabled:hover:text-white shadow-[0_0_10px_rgba(189,0,255,0.6)] active:scale-95 shrink-0 animate-fade-in"
                    >
                        <Send className="h-3 w-3 fill-current" />
                    </button>
                </div>
            </div>
        </aside>
    )
}
