'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2, GraduationCap, BookOpenCheck, Globe } from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { Locale, LANGUAGE_NAMES } from '@/utils/translations'

type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong'

function getPasswordStrength(pw: string): PasswordStrength {
    if (!pw) return 'empty'
    const hasNumber = /\d/.test(pw)
    if (pw.length >= 12 && hasNumber) return 'strong'
    if (pw.length >= 8 && hasNumber) return 'medium'
    return 'weak'
}

function PasswordStrengthBar({ strength }: { strength: PasswordStrength }) {
    const { t } = useLanguage()
    if (strength === 'empty') return null

    const STRENGTH_CONFIG: Record<PasswordStrength, { label: string; color: string; width: string }> = {
        empty:  { label: '', color: 'bg-white/10', width: 'w-0' },
        weak:   { label: t('auth.password_weak'), color: 'bg-red-500', width: 'w-1/3' },
        medium: { label: t('auth.password_medium'), color: 'bg-yellow-400', width: 'w-2/3' },
        strong: { label: t('auth.password_strong'), color: 'bg-emerald-400', width: 'w-full' },
    }

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

interface FormErrors {
    name?: string
    email?: string
    password?: string
    confirm?: string
}

export default function RegisterPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const urlMessage = searchParams.get('message')
    const { t, locale, setLocale } = useLanguage()

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [role, setRole] = useState<'student' | 'tutor'>('student')
    const [showPw, setShowPw] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
    const [toastMsg, setToastMsg] = useState<string | null>(urlMessage)
    const [loading, setLoading] = useState(false)

    const strength = getPasswordStrength(password)

    useEffect(() => {
        if (urlMessage) setToastMsg(urlMessage)
    }, [urlMessage])

    const clearError = (key: keyof FormErrors) => setFieldErrors(p => ({ ...p, [key]: undefined }))

    const validateForm = (n: string, e: string, p: string, c: string): FormErrors => {
        const errors: FormErrors = {}
        if (!n.trim() || n.trim().length < 2) errors.name = t('auth.err_name_short')
        if (!e.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) errors.email = t('auth.err_email_invalid')
        if (!p) errors.password = t('auth.err_password_short')
        else if (p.length < 6) errors.password = t('auth.err_password_short')
        if (!c) errors.confirm = t('auth.err_confirm_empty')
        else if (c !== p) errors.confirm = t('auth.err_password_mismatch')
        return errors
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const errors = validateForm(name, email, password, confirm)
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
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: { 
                        full_name: name.trim(),
                        role: role
                    },
                },
            })
            if (error) {
                setToastMsg(error.message)
                setLoading(false)
            } else if (data.session) {
                router.push('/onboarding')
            } else {
                setToastMsg(t('auth.account_created'))
                setLoading(false)
                setTimeout(() => {
                    router.push('/login')
                }, 1500)
            }
        } catch {
            setToastMsg('Something went wrong. Please try again.')
            setLoading(false)
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
                        {Object.entries(LANGUAGE_NAMES).map(([code, langName]) => (
                            <option key={code} value={code} className="bg-[#141824] text-white">{langName}</option>
                        ))}
                    </select>
                </div>

                {/* Header */}
                <div className="mb-6 text-center pt-2">
                    <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-gradient-to-tr from-neon-violet to-electric-blue flex items-center justify-center border border-white/10 shadow-[0_0_20px_rgba(var(--violet-rgb),0.3)]">
                        <span className="text-xl font-black text-white">LP</span>
                    </div>
                    <h1 className="title-glow text-2xl font-bold tracking-tight text-white mb-1">
                        {t('auth.create_account')}
                    </h1>
                    <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black">
                        {t('auth.join_platform')}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

                    {/* Role Selector (Student vs Tutor) */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                            {t('auth.account_type')}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => { haptics.light(); setRole('student') }}
                                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                                    role === 'student'
                                        ? 'bg-electric-blue/15 border-electric-blue text-white shadow-[0_0_12px_rgba(var(--accent-rgb),0.2)]'
                                        : 'bg-white/[0.03] border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                            >
                                <GraduationCap className="w-4 h-4 text-electric-blue" />
                                {t('auth.role_student')}
                            </button>
                            <button
                                type="button"
                                onClick={() => { haptics.light(); setRole('tutor') }}
                                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                                    role === 'tutor'
                                        ? 'bg-neon-violet/15 border-neon-violet text-white shadow-[0_0_12px_rgba(var(--violet-rgb),0.2)]'
                                        : 'bg-white/[0.03] border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                            >
                                <BookOpenCheck className="w-4 h-4 text-neon-violet" />
                                {t('auth.role_tutor')}
                            </button>
                        </div>
                    </div>

                    {/* Full Name */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1" htmlFor="reg-name">
                            {t('auth.full_name')}
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
                            {t('auth.email')}
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
                            <input
                                id="reg-email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); clearError('email') }}
                                placeholder="yourname@domain.com"
                                autoComplete="email"
                                className={`glass w-full rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${fieldErrors.email ? 'border-red-500/60 focus:ring-1 focus:ring-red-500/60' : 'focus:border-electric-blue focus:ring-1 focus:ring-electric-blue'}`}
                            />
                        </div>
                        <FieldError msg={fieldErrors.email} />
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1" htmlFor="reg-password">
                            {t('auth.password')}
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
                            {t('auth.confirm_password')}
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
                        className="group relative mt-2 flex w-full justify-center items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-neon-violet/20 to-electric-blue/20 border border-neon-violet/20 px-4 py-3.5 text-sm font-black text-white transition-all hover:from-neon-violet/30 hover:to-electric-blue/30 hover:shadow-[0_0_20px_rgba(var(--violet-rgb),0.25)] active:scale-[0.98] disabled:opacity-60 min-h-[44px]"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <span className="relative z-10 font-black uppercase tracking-wider text-xs">{t('auth.create_account')}</span>
                                <ArrowRight className="w-3.5 h-3.5 relative z-10 group-hover:translate-x-0.5 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                {/* Sign in link */}
                <div className="border-t border-white/5 pt-4 mt-4 text-center">
                    <p className="text-xs text-gray-500">
                        {t('auth.have_account')}{' '}
                        <Link href="/login" onClick={() => haptics.light()} className="text-electric-blue font-bold hover:underline">
                            {t('auth.login')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
