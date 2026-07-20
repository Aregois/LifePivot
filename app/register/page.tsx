'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2 } from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

// ─── Password Strength ───────────────────────────────────────────────────────
type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong'

function getPasswordStrength(pw: string): PasswordStrength {
    if (!pw) return 'empty'
    const hasNumber = /\d/.test(pw)
    if (pw.length >= 12 && hasNumber) return 'strong'
    if (pw.length >= 8 && hasNumber) return 'medium'
    return 'weak'
}

const STRENGTH_CONFIG: Record<PasswordStrength, { label: string; color: string; width: string }> = {
    empty:  { label: '',        color: 'bg-white/10',    width: 'w-0' },
    weak:   { label: 'Weak',   color: 'bg-red-500',     width: 'w-1/3' },
    medium: { label: 'Medium', color: 'bg-yellow-400',  width: 'w-2/3' },
    strong: { label: 'Strong', color: 'bg-emerald-400', width: 'w-full' },
}

function PasswordStrengthBar({ strength }: { strength: PasswordStrength }) {
    if (strength === 'empty') return null
    const cfg = STRENGTH_CONFIG[strength]
    return (
        <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-white/[0.07] overflow-hidden">
                <motion.div
                    className={`h-full rounded-full ${cfg.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: cfg.width }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider ${strength === 'weak' ? 'text-red-400' : strength === 'medium' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                {cfg.label}
            </span>
        </div>
    )
}

// ─── Error Toast ─────────────────────────────────────────────────────────────
function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
    useEffect(() => {
        const t = setTimeout(onDismiss, 6000)
        return () => clearTimeout(t)
    }, [message, onDismiss])

    return (
        <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/25 p-3.5"
            role="alert"
        >
            <span className="mt-0.5 shrink-0 h-4 w-4 rounded-full border border-red-400/40 flex items-center justify-center text-[10px] font-black text-red-400">!</span>
            <span className="flex-1 text-xs text-red-400 font-medium leading-snug">{message}</span>
            <button onClick={onDismiss} className="shrink-0 text-red-400/50 hover:text-red-300 transition-colors text-xs font-black">✕</button>
        </motion.div>
    )
}

// ─── Field Error ─────────────────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
    return (
        <AnimatePresence>
            {msg && (
                <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[11px] text-red-400 ml-1 font-medium"
                >
                    {msg}
                </motion.p>
            )}
        </AnimatePresence>
    )
}

// ─── Validation ──────────────────────────────────────────────────────────────
interface FormErrors {
    name?: string
    email?: string
    password?: string
    confirm?: string
}

function validate(name: string, email: string, password: string, confirm: string): FormErrors {
    const errors: FormErrors = {}
    if (!name.trim() || name.trim().length < 2) errors.name = 'Full name must be at least 2 characters.'
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.'
    if (!password) errors.password = 'Password is required.'
    else if (password.length < 8) errors.password = 'Must be at least 8 characters.'
    else if (!/\d/.test(password)) errors.password = 'Must contain at least one number.'
    if (!confirm) errors.confirm = 'Please confirm your password.'
    else if (confirm !== password) errors.confirm = 'Passwords do not match.'
    return errors
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RegisterPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const urlMessage = searchParams.get('message')

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
    const [toastMsg, setToastMsg] = useState<string | null>(urlMessage)
    const [loading, setLoading] = useState(false)
    const [confirmationSent, setConfirmationSent] = useState(false)

    const strength = getPasswordStrength(password)

    useEffect(() => {
        if (urlMessage) setToastMsg(urlMessage)
    }, [urlMessage])

    const clearError = (key: keyof FormErrors) => setFieldErrors(p => ({ ...p, [key]: undefined }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const errors = validate(name, email, password, confirm)
        if (Object.keys(errors).length > 0) {
            haptics.light()
            setFieldErrors(errors)
            return
        }
        setFieldErrors({})
        setLoading(true)
        haptics.medium()

        try {
            const supabase = createClient()
            const siteUrl = process.env.NEXT_PUBLIC_APP_URL ||
                (typeof window !== 'undefined' ? window.location.origin : 'https://lifepivot.vercel.app')
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: { full_name: name.trim() },
                    // Points the confirmation email to /auth/callback so
                    // the session is properly created and onboarding is triggered.
                    emailRedirectTo: `${siteUrl}/auth/callback`,
                },
            })
            if (error) {
                setToastMsg(error.message)
                setLoading(false)
            } else if (data.session) {
                // Auto-confirmed (e.g. email confirmation disabled in Supabase)
                router.push('/onboarding')
            } else {
                // Confirmation email sent
                setLoading(false)
                setConfirmationSent(true)
            }
        } catch {
            setToastMsg('Something went wrong. Please try again.')
            setLoading(false)
        }
    }

    // ── Email confirmation pending screen ────────────────────────────────────
    if (confirmationSent) {
        return (
            <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-black/50 p-4">
                <div className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-violet opacity-20 blur-[100px]" />
                <div className="pointer-events-none absolute top-1/2 left-1/2 h-48 w-48 -translate-x-1/3 -translate-y-1/3 rounded-full bg-electric-blue opacity-20 blur-[80px]" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="glass-card relative z-10 w-full max-w-md rounded-2xl p-8 shadow-2xl text-center flex flex-col items-center gap-5"
                >
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-neon-violet to-electric-blue flex items-center justify-center border border-white/10 shadow-[0_0_24px_rgba(var(--accent-rgb),0.3)]">
                        <Mail className="w-7 h-7 text-white" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <h1 className="title-glow text-xl font-bold text-white">Check your inbox</h1>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            We sent a confirmation link to{' '}
                            <span className="text-electric-blue font-bold">{email}</span>
                        </p>
                        <p className="text-xs text-gray-500 leading-relaxed mt-1">
                            Click the link in the email to activate your account and start your onboarding. The link expires in 24 hours.
                        </p>
                    </div>

                    <div className="w-full border-t border-white/5 pt-4 flex flex-col gap-3">
                        <p className="text-[11px] text-gray-600">
                            Didn&apos;t receive it? Check your spam folder.
                        </p>
                        <button
                            onClick={() => setConfirmationSent(false)}
                            className="text-xs text-gray-500 hover:text-gray-300 transition-colors font-bold uppercase tracking-widest"
                        >
                            ← Back to registration
                        </button>
                    </div>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-black/50 p-4">

            {/* Ambient glow */}
            <div className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-violet opacity-20 blur-[100px]" />
            <div className="pointer-events-none absolute top-1/2 left-1/2 h-48 w-48 -translate-x-1/3 -translate-y-1/3 rounded-full bg-electric-blue opacity-20 blur-[80px]" />

            <div className="glass-card relative z-10 w-full max-w-md rounded-2xl p-8 shadow-2xl">

                {/* Header */}
                <div className="mb-7 text-center">
                    <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-gradient-to-tr from-neon-violet to-electric-blue flex items-center justify-center border border-white/10 shadow-[0_0_20px_rgba(var(--violet-rgb),0.3)]">
                        <span className="text-xl font-black text-white">LP</span>
                    </div>
                    <h1 className="title-glow text-2xl font-bold tracking-tight text-white mb-1.5">
                        Create Your Account
                    </h1>
                    <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black">
                        Start your self-mastery journey
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

                    {/* Full Name */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1" htmlFor="reg-name">
                            Full Name
                        </label>
                        <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
                            <input
                                id="reg-name"
                                name="full_name"
                                type="text"
                                value={name}
                                onChange={e => { setName(e.target.value); clearError('name') }}
                                placeholder="Alex Chen"
                                autoComplete="name"
                                className={`glass w-full rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${fieldErrors.name ? 'border-red-500/60 focus:ring-1 focus:ring-red-500/60' : 'focus:border-electric-blue focus:ring-1 focus:ring-electric-blue'}`}
                            />
                        </div>
                        <FieldError msg={fieldErrors.name} />
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1" htmlFor="reg-email">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
                            <input
                                id="reg-email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); clearError('email') }}
                                placeholder="astronaut@space.com"
                                autoComplete="email"
                                className={`glass w-full rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${fieldErrors.email ? 'border-red-500/60 focus:ring-1 focus:ring-red-500/60' : 'focus:border-electric-blue focus:ring-1 focus:ring-electric-blue'}`}
                            />
                        </div>
                        <FieldError msg={fieldErrors.email} />
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1" htmlFor="reg-password">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
                            <input
                                id="reg-password"
                                name="password"
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={e => { setPassword(e.target.value); clearError('password') }}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                className={`glass w-full rounded-lg pl-10 pr-10 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${fieldErrors.password ? 'border-red-500/60 focus:ring-1 focus:ring-red-500/60' : 'focus:border-neon-violet focus:ring-1 focus:ring-neon-violet'}`}
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
                        <PasswordStrengthBar strength={strength} />
                        <FieldError msg={fieldErrors.password} />
                    </div>

                    {/* Confirm Password */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1" htmlFor="reg-confirm">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
                            <input
                                id="reg-confirm"
                                name="confirm_password"
                                type={showConfirm ? 'text' : 'password'}
                                value={confirm}
                                onChange={e => { setConfirm(e.target.value); clearError('confirm') }}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                className={`glass w-full rounded-lg pl-10 pr-10 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${fieldErrors.confirm ? 'border-red-500/60 focus:ring-1 focus:ring-red-500/60' : 'focus:border-neon-violet focus:ring-1 focus:ring-neon-violet'}`}
                            />
                            <button
                                type="button"
                                onClick={() => { haptics.light(); setShowConfirm(v => !v) }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                            >
                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <FieldError msg={fieldErrors.confirm} />
                    </div>

                    {/* Error Toast */}
                    <AnimatePresence>
                        {toastMsg && <ErrorToast message={toastMsg} onDismiss={() => setToastMsg(null)} />}
                    </AnimatePresence>

                    {/* Submit */}
                    <button
                        id="register-btn"
                        type="submit"
                        disabled={loading}
                        className="group relative mt-1 flex w-full justify-center items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-neon-violet/20 to-electric-blue/20 border border-neon-violet/20 px-4 py-3.5 text-sm font-black text-white transition-all hover:from-neon-violet/30 hover:to-electric-blue/30 hover:shadow-[0_0_20px_rgba(var(--violet-rgb),0.25)] active:scale-[0.98] disabled:opacity-60 min-h-[44px]"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <span className="relative z-10 font-black uppercase tracking-wider text-xs">Create Account</span>
                                <ArrowRight className="w-3.5 h-3.5 relative z-10 group-hover:translate-x-0.5 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                {/* Sign in link */}
                <div className="border-t border-white/5 pt-4 mt-4 text-center">
                    <p className="text-xs text-gray-500">
                        Already have an account?{' '}
                        <Link href="/login" onClick={() => haptics.light()} className="text-electric-blue font-bold hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
