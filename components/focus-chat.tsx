'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { Send, X, Bot, User, Loader2, Volume2, VolumeX, AlertCircle } from 'lucide-react'
import { sendSocraticMessage } from '@/app/actions'
import { speakText, stopSpeaking } from '@/utils/tts'
import { haptics } from '@/utils/haptics'
import type { Task } from '@/utils/types'
import { useLanguage } from './language-provider'

interface Message { role: 'user' | 'model'; text: string }

interface FocusChatProps {
    task: Task | null
    goalTitle: string
    activeSubtaskTitle?: string
    onClose: () => void
    persona?: string
}

export function FocusChat({ task, goalTitle, activeSubtaskTitle, onClose, persona: initialPersona }: FocusChatProps) {
    const { t } = useLanguage()
    const [mounted, setMounted] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [displayedReply, setDisplayedReply] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [speakingMsgIndex, setSpeakingMsgIndex] = useState<number | null>(null)
    const [persona, setPersona] = useState<string>('feynman')
    
    const bottomRef = useRef<HTMLDivElement>(null)

    const personas = [
        { id: 'feynman', label: t('tutor.feynman') },
        { id: 'socrates', label: t('tutor.socrates') },
        { id: 'stoic', label: t('tutor.aurelius') },
    ]

    useEffect(() => {
        setMounted(true)
        const prefPersona = initialPersona || localStorage.getItem('lifepivot_persona') || 'feynman'
        setPersona(prefPersona)
        return () => {
            stopSpeaking() // Prevent audio leaks on close
        }
    }, [initialPersona])

    // Escape key handler
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, displayedReply])

    const handlePersonaChange = (p: string) => {
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
            if (i < text.length) { setDisplayedReply(text.slice(0, i + 1)); i++ }
            else { clearInterval(iv); setIsTyping(false); onDone() }
        }, 18)
        return () => clearInterval(iv)
    }

    const handleSend = () => {
        const trimmed = input.trim()
        if (!trimmed || isPending) return
        if (!task) {
            setError(t('tutor.error_select'))
            return
        }
        setInput('')
        setError(null)
        const history = messages
        setMessages(prev => [...prev, { role: 'user', text: trimmed }])
        startTransition(async () => {
            const result = await sendSocraticMessage(task.id, trimmed, history, activeSubtaskTitle, persona)
            if ('error' in result && result.error) {
                setError(t('tutor.error_council'))
                return
            }
            const reply = result.reply ?? ''
            animateReply(reply, () => {
                setMessages(prev => [...prev, { role: 'model', text: reply }])
                setDisplayedReply('')
            })
        })
    }

    if (!mounted) return null

    const chat = (
        <div className="fixed inset-0 z-[600] flex flex-col bg-[#080b14]/97 backdrop-blur-xl"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-white/5 shrink-0">
                <div className="flex-1 min-w-0 mr-3">
                    <p className="text-[10px] font-black text-electric-blue uppercase tracking-[0.2em]">{t('tutor.title')}</p>
                    <p className="text-white font-bold text-sm mt-0.5 truncate">{task ? task.title : t('tutor.companion')}</p>
                    {task && activeSubtaskTitle && <p className="text-[10px] text-gray-500 truncate">↳ {activeSubtaskTitle}</p>}
                </div>
                <button onClick={onClose}
                    className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 active:scale-95 transition-transform">
                    <X className="h-4 w-4 text-gray-400" />
                </button>
            </div>

            {/* Persona Selector pills */}
            <div className="flex items-center gap-2 px-5 py-2 border-b border-white/5 bg-white/[0.01] overflow-x-auto no-scrollbar shrink-0">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest shrink-0 mr-1 select-none">{t('tutor.persona')}</span>
                {personas.map(p => {
                    const isActive = persona === p.id
                    return (
                        <button
                            key={p.id}
                            onClick={() => handlePersonaChange(p.id)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-200 shrink-0 border ${
                                isActive 
                                    ? 'bg-electric-blue/15 border-electric-blue/35 text-electric-blue shadow-[0_0_10px_rgba(0,240,255,0.15)]' 
                                    : 'bg-white/5 border-white/5 text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            {p.label}
                        </button>
                    )
                })}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative">
                {/* Background ambient glow circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-neon-violet/5 rounded-full blur-[60px] pointer-events-none"></div>

                {!task ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center pb-8 px-6 animate-fade-up">
                        <div className="h-14 w-14 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-inner">
                            <AlertCircle className="h-7 w-7 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-white font-black uppercase tracking-wider text-xs">{t('tutor.no_context_title')}</p>
                            <p className="text-gray-400 text-xs mt-2 leading-relaxed max-w-[240px]">
                                {t('tutor.no_context_desc')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.length === 0 && !isPending && (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-center pb-8">
                                <div className="h-14 w-14 rounded-3xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center">
                                    <Bot className="h-7 w-7 text-electric-blue animate-float" />
                                </div>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider max-w-[240px] leading-relaxed">
                                    {t('tutor.guide_text')}
                                </p>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-slide-right`}>
                                <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center border ${msg.role === 'user' ? 'bg-electric-blue/10 border-electric-blue/20' : 'bg-neon-violet/10 border-neon-violet/20'}`}>
                                    {msg.role === 'user' ? <User className="h-3.5 w-3.5 text-electric-blue" /> : <Bot className="h-3.5 w-3.5 text-neon-violet" />}
                                </div>
                                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-xs leading-relaxed font-medium ${msg.role === 'user' ? 'bg-electric-blue/10 border border-electric-blue/25 text-white rounded-tr-sm shadow-[0_0_15px_rgba(0,240,255,0.05)]' : 'bg-[#1C2033]/60 border border-white/5 text-gray-200 rounded-tl-sm'}`}>
                                    {msg.text}
                                </div>
                                {msg.role === 'model' && (
                                    <button 
                                        onClick={() => handleToggleSpeech(i, msg.text)}
                                        className={`self-end mb-1 h-7 w-7 rounded-xl flex items-center justify-center border transition-all ${speakingMsgIndex === i ? 'bg-neon-violet/20 border-neon-violet/30 text-neon-violet shadow-[0_0_8px_rgba(189,0,255,0.2)]' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/5'} shrink-0 active:scale-90`}
                                    >
                                        {speakingMsgIndex === i ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                                    </button>
                                )}
                            </div>
                        ))}
                        {(isPending || isTyping) && (
                            <div className="flex gap-3 animate-pulse">
                                <div className="h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center border bg-neon-violet/10 border-neon-violet/20">
                                    <Bot className="h-3.5 w-3.5 text-neon-violet" />
                                </div>
                                <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tl-sm bg-[#1C2033]/60 border border-white/5 text-gray-200 text-xs leading-relaxed">
                                    {isPending && !isTyping ? (
                                        <span className="flex items-center gap-2 text-gray-500 italic text-[11px]">
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
                    </>
                )}
                {error && <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] text-center font-black uppercase tracking-wider">{error}</div>}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 pt-3 border-t border-white/5 shrink-0"
                style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
                <div className="flex items-center gap-3 bg-[#1C2033] border border-white/10 rounded-2xl px-4 py-2 focus-within:border-tertiary focus-within:ring-1 focus-within:ring-tertiary shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] transition-all">
                    <input 
                        value={input} 
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder={task ? t('tutor.placeholder') : t('tutor.select_task')}
                        disabled={isPending || !task}
                        className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none py-2 pl-1" 
                    />
                    <button 
                        onClick={handleSend} 
                        disabled={!input.trim() || isPending || !task}
                        className="h-8 w-8 rounded-xl bg-tertiary text-white hover:bg-white hover:text-tertiary transition-colors flex items-center justify-center disabled:opacity-30 disabled:hover:bg-tertiary disabled:hover:text-white shadow-[0_0_10px_rgba(189,0,255,0.6)] active:scale-95 shrink-0"
                    >
                        <Send className="h-3.5 w-3.5 fill-current" />
                    </button>
                </div>
            </div>
        </div>
    )

    return createPortal(chat, document.body)
}
