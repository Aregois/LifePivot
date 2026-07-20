'use client'

import { login, forgotPassword } from './actions'
import { useLanguage } from '@/components/language-provider'
import { useSearchParams } from 'next/navigation'
import { Locale, LANGUAGE_NAMES } from '@/utils/translations'
import { Globe, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { createClient } from '@/utils/supabase/client'
import { useState, useTransition, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

// ─── Validation ──────────────────────────────────────────────────────────────
function validateLoginForm(email: string, password: string) {
    const errors: { email?: string; password?: string } = {}
    if (!email.trim()) errors.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.'
    if (!password) errors.password = 'Password is required.'
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters.'
    return errors
}

// ─── Error Toast ─────────────────────────────────────────────────────────────
function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 5000)
        return () => clearTimeout(timer)
    }, [message, onDismiss])

    return (
        <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/25 p-3.5 text-sm text-red-400"
            role="alert"
        >
            <span className="mt-0.5 shrink-0 h-4 w-4 rounded-full border border-red-400/40 flex items-center justify-center text-[10px] font-black">!</span>
            <span className="flex-1 text-xs font-medium leading-snug">{message}</span>
            <button onClick={onDismiss} className="shrink-0 text-red-400/50 hover:text-red-300 transition-colors text-xs font-black">✕</button>
        </motion.div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
    const { t, locale, setLocale } = useLanguage()
    const searchParams = useSearchParams()
    const urlMessage = searchParams.get('message')

    const [googlePending, setGooglePending] = useState(false)
    const [forgotMode, setForgotMode] = useState(false)
    const [forgotEmail, setForgotEmail] = useState('')
    const [forgotSent, setForgotSent] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Form state
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
    const [toastMsg, setToastMsg] = useState<string | null>(urlMessage)
    const formRef = useRef<HTMLFormElement>(null)

    // Show URL-injected message as toast on first render
    useEffect(() => {
        if (urlMessage) setToastMsg(urlMessage)
    }, [urlMessage])

    const handleGoogleSignIn = async () => {
        haptics.medium()
        setGooglePending(true)
        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/auth/callback` },
            })
            if (error) {
                setToastMsg('Could not connect to Google. Please try again.')
                setGooglePending(false)
            }
        } catch {
            setToastMsg('Could not connect to Google. Please try again.')
            setGooglePending(false)
        }
    }

    const handleForgotPassword = () => {
        if (!forgotEmail.trim()) return
        haptics.medium()
        startTransition(async () => {
            await forgotPassword(forgotEmail.trim())
            setForgotSent(true)
        })
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        const errors = validateLoginForm(email, password)
        if (Object.keys(errors).length > 0) {
            e.preventDefault()
            haptics.light()
            setFieldErrors(errors)
        } else {
            setFieldErrors({})
        }
    }

    return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-black/50 p-4">

            {/* Ambient glow */}
            <div className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-violet opacity-20 blur-[100px]" />
            <div className="pointer-events-none absolute top-1/2 left-1/2 h-48 w-48 -translate-x-1/3 -translate-y-1/3 rounded-full bg-electric-blue opacity-20 blur-[80px]" />

            <div className="glass-card relative z-10 w-full max-w-md rounded-2xl p-8 shadow-2xl">

                {/* Language Picker */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-xl px-2.5 py-1">
                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                    <select
                        value={locale}
                        onChange={(e) => { haptics.light(); setLocale(e.target.value as Locale) }}
                        className="bg-transparent text-gray-300 font-bold border-none outline-none cursor-pointer text-[11px] uppercase tracking-wider"
                    >
                        {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                            <option key={code} value={code} className="bg-[#141824] text-white">{name}</option>
                        ))}
                    </select>
                </div>

                {/* Header */}
                <div className="mb-8 text-center pt-4">
                    <h1 className="title-glow text-3xl font-bold tracking-tight text-white mb-2">
                        {t('auth.title')}
                    </h1>
                    <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black">
                        {t('auth.subtitle')}
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {/* ── FORGOT PASSWORD MODE ── */}
                    {forgotMode ? (
                        <motion.div key="forgot" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-5">
                            {forgotSent ? (
                                <div className="text-center py-4 flex flex-col gap-3">
                                    <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                        <Mail className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <p className="text-white font-bold text-sm">Check your inbox</p>
                                    <p className="text-gray-400 text-xs">Password reset link sent to <span className="text-electric-blue">{forgotEmail}</span></p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Your Email</label>
                                        <input
                                            type="email"
                                            value={forgotEmail}
                                            onChange={e => setForgotEmail(e.target.value)}
                                            placeholder="astronaut@space.com"
                                            className="glass rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-electric-blue focus:outline-none focus:ring-1 focus:ring-electric-blue transition-all"
                                        />
                                    </div>
                                    <button
                                        onClick={handleForgotPassword}
                                        disabled={isPending || !forgotEmail.trim()}
                                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-electric-blue/10 border border-electric-blue/20 px-4 py-3 text-xs font-black text-electric-blue uppercase tracking-widest hover:bg-electric-blue/20 transition-all disabled:opacity-50"
                                    >
                                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => { setForgotMode(false); setForgotSent(false) }}
                                className="text-xs text-gray-500 hover:text-gray-300 transition-colors text-center font-bold uppercase tracking-widest"
                            >
                                ← Back to Sign In
                            </button>
                        </motion.div>

                    ) : (
                        /* ── MAIN SIGN IN MODE ── */
                        <motion.div key="main" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-5">

                            {/* Google OAuth Button */}
                            <button
                                id="google-signin-btn"
                                onClick={handleGoogleSignIn}
                                disabled={googlePending}
                                className="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-white/[0.06] border border-white/[0.08] px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/[0.10] hover:border-white/20 active:scale-[0.98] disabled:opacity-60 shadow-sm min-h-[44px]"
                            >
                                {googlePending ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                ) : (
                                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                )}
                                <span className="text-[11px] font-black uppercase tracking-widest">Continue with Google</span>
                            </button>

                            {/* Divider */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-white/[0.06]" />
                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">or continue with email</span>
                                <div className="flex-1 h-px bg-white/[0.06]" />
                            </div>

                            {/* Email / Password form */}
                            <form ref={formRef} className="flex flex-col gap-4" onSubmit={handleSubmit}>

                                {/* Email */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1" htmlFor="login-email">
                                        {t('auth.email')}
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
                                        <input
                                            id="login-email"
                                            name="email"
                                            type="email"
                                            value={email}
                                            onChange={e => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: undefined })) }}
                                            placeholder="astronaut@space.com"
                                            className={`glass w-full rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${fieldErrors.email ? 'border-red-500/60 focus:ring-1 focus:ring-red-500/60' : 'focus:border-electric-blue focus:ring-1 focus:ring-electric-blue'}`}
                                            autoComplete="email"
                                        />
                                    </div>
                                    <AnimatePresence>
                                        {fieldErrors.email && (
                                            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-[11px] text-red-400 ml-1 font-medium">
                                                {fieldErrors.email}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Password */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1" htmlFor="login-password">
                                        {t('auth.password')}
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
                                        <input
                                            id="login-password"
                                            name="password"
                                            type={showPw ? 'text' : 'password'}
                                            value={password}
                                            onChange={e => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: undefined })) }}
                                            placeholder="••••••••"
                                            className={`glass w-full rounded-lg pl-10 pr-10 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${fieldErrors.password ? 'border-red-500/60 focus:ring-1 focus:ring-red-500/60' : 'focus:border-neon-violet focus:ring-1 focus:ring-neon-violet'}`}
                                            autoComplete="current-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => { haptics.light(); setShowPw(v => !v) }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                            aria-label={showPw ? 'Hide password' : 'Show password'}
                                        >
                                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <AnimatePresence>
                                        {fieldErrors.password && (
                                            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-[11px] text-red-400 ml-1 font-medium">
                                                {fieldErrors.password}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                    <button
                                        type="button"
                                        onClick={() => { haptics.light(); setForgotMode(true) }}
                                        className="self-end text-[10px] text-gray-600 hover:text-electric-blue transition-colors font-bold uppercase tracking-widest"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>

                                {/* Error Toast */}
                                <AnimatePresence>
                                    {toastMsg && (
                                        <ErrorToast message={toastMsg} onDismiss={() => setToastMsg(null)} />
                                    )}
                                </AnimatePresence>

                                {/* Submit */}
                                <div className="mt-1 flex flex-col gap-3">
                                    <button
                                        id="login-btn"
                                        type="submit"
                                        formAction={login}
                                        className="group relative flex w-full justify-center items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-electric-blue/20 to-neon-violet/20 border border-electric-blue/20 px-4 py-3.5 text-sm font-black text-white transition-all hover:from-electric-blue/30 hover:to-neon-violet/30 hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)] active:scale-[0.98] min-h-[44px]"
                                    >
                                        <span className="relative z-10 font-black uppercase tracking-wider text-xs">{t('auth.login')}</span>
                                        <ArrowRight className="w-3.5 h-3.5 relative z-10 group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                </div>
                            </form>

                            {/* Register link */}
                            <div className="border-t border-white/5 pt-4 text-center">
                                <p className="text-xs text-gray-500">
                                    Don&apos;t have an account?{' '}
                                    <Link href="/register" onClick={() => haptics.light()} className="text-electric-blue font-bold hover:underline">
                                        Create one →
                                    </Link>
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
