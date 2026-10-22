'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Lock, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

export default function ResetPasswordPage() {
    const router = useRouter()
    const { t } = useLanguage()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password.length < 6) {
            setError(t('auth.password_min_length') || 'Password must be at least 6 characters.')
            return
        }
        if (password !== confirmPassword) {
            setError(t('auth.passwords_do_not_match') || 'Passwords do not match.')
            return
        }

        setLoading(true)
        try {
            const supabase = createClient()
            const { error: updateError } = await supabase.auth.updateUser({ password })
            if (updateError) {
                setError(updateError.message)
                setLoading(false)
                return
            }
            setSuccess(true)
            setTimeout(() => {
                router.replace('/plan')
            }, 2000)
        } catch (err: any) {
            setError(err?.message || 'Failed to update password. Please try again.')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-dvh bg-[#050508] text-white flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden">
            <div className="absolute -top-32 -left-32 w-80 h-80 bg-electric-blue/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-neon-violet/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md bg-white/[0.03] border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl relative z-10">
                <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('auth.back_to_login') || 'Back to Sign In'}
                </Link>

                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-electric-blue/15 border border-electric-blue/30 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-electric-blue" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-white">
                            {t('auth.reset_password_title') || 'Set New Password'}
                        </h1>
                        <p className="text-xs text-gray-400">
                            {t('auth.reset_password_subtitle') || 'Choose a strong password for your LifePivot account.'}
                        </p>
                    </div>
                </div>

                {success ? (
                    <div className="mt-6 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col items-center text-center gap-2">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                        <p className="text-sm font-bold text-emerald-300">
                            {t('auth.password_updated_success') || 'Password Updated Successfully'}
                        </p>
                        <p className="text-xs text-gray-400">
                            {t('auth.redirecting_to_dashboard') || 'Redirecting to your learning dashboard...'}
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        {error && (
                            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-300 text-xs">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                {t('auth.new_password') || 'New Password'}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    placeholder="••••••••"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 pr-11 text-base sm:text-sm text-white placeholder-gray-600 focus:outline-none focus:border-electric-blue/60 transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                {t('auth.confirm_password') || 'Confirm New Password'}
                            </label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                placeholder="••••••••"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-gray-600 focus:outline-none focus:border-electric-blue/60 transition-colors"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-electric-blue to-neon-violet text-black font-black text-xs uppercase tracking-widest shadow-lg shadow-electric-blue/20 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t('common.saving') || 'Updating...'}
                                </>
                            ) : (
                                t('auth.update_password_btn') || 'Update Password'
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
