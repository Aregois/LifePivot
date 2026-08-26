import { Plus } from 'lucide-react'
import { useLanguage } from './language-provider'

export function TodaysFocusHeader({ remainingSessions }: { remainingSessions: number }) {
    const { t } = useLanguage()
    return (
        <div className="flex items-center justify-between mb-4 px-4 sm:px-6">
            <div className="flex flex-col gap-0.5">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{t('plan.todays_focus')}</h2>
                <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-electric-blue" />
                    {t('plan.sessions_remaining').replace('{count}', remainingSessions.toString())}
                </span>
            </div>

            <button className="h-9 w-9 rounded-2xl bg-white/[0.04] flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all border border-white/10 shadow-sm">
                <Plus className="h-4 w-4 text-gray-300" />
            </button>
        </div>
    )
}
