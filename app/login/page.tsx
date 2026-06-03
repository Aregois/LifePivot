'use client'

import { login, signup } from './actions'
import { useLanguage } from '@/components/language-provider'
import { useSearchParams } from 'next/navigation'
import { Locale, LANGUAGE_NAMES } from '@/utils/translations'
import { Globe } from 'lucide-react'
import { haptics } from '@/utils/haptics'

export default function LoginPage() {
    const { t, locale, setLocale } = useLanguage()
    const searchParams = useSearchParams()
    const message = searchParams.get('message')

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black/50 p-4">

            {/* Animated glow effect behind the card */}
            <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-violet opacity-20 blur-[100px]"></div>
            <div className="absolute top-1/2 left-1/2 h-48 w-48 -translate-x-1/3 -translate-y-1/3 rounded-full bg-electric-blue opacity-20 blur-[80px]"></div>

            <div className="glass-card relative z-10 w-full max-w-md rounded-2xl p-8 shadow-2xl">
                
                {/* Language Picker in Top-Right */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-xl px-2.5 py-1 text-xs">
                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                    <select
                        value={locale}
                        onChange={(e) => {
                            haptics.light()
                            setLocale(e.target.value as Locale)
                        }}
                        className="bg-transparent text-gray-300 font-bold border-none outline-none cursor-pointer focus:ring-0 text-[11px] uppercase tracking-wider"
                    >
                        {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                            <option key={code} value={code} className="bg-[#141824] text-white">
                                {name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-8 text-center pt-4">
                    <h1 className="title-glow text-3xl font-bold tracking-tight text-white mb-2">
                        {t('auth.title')}
                    </h1>
                    <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black">
                        {t('auth.subtitle')}
                    </p>
                </div>

                <form className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1" htmlFor="email">
                            {t('auth.email')}
                        </label>
                        <input
                            className="glass rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-electric-blue focus:outline-none focus:ring-1 focus:ring-electric-blue transition-all"
                            id="email"
                            name="email"
                            type="email"
                            placeholder="astronaut@space.com"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1" htmlFor="password">
                            {t('auth.password')}
                        </label>
                        <input
                            className="glass rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-neon-violet focus:outline-none focus:ring-1 focus:ring-neon-violet transition-all"
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {message && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 text-center font-mono">
                            {message}
                        </div>
                    )}

                    <div className="mt-4 flex flex-col gap-3">
                        <button
                            formAction={login}
                            className="group relative flex w-full justify-center overflow-hidden rounded-lg bg-white/10 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/20 hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] cursor-pointer"
                        >
                            <span className="relative z-10 font-bold uppercase tracking-wider text-xs">{t('auth.login')}</span>
                            <div className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-r from-electric-blue/20 to-neon-violet/20"></div>
                        </button>
                        <button
                            formAction={signup}
                            className="w-full rounded-lg border border-white/10 bg-transparent px-4 py-3 text-sm font-medium text-gray-400 transition-all hover:bg-white/5 hover:text-white cursor-pointer"
                        >
                            {t('auth.signup')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
