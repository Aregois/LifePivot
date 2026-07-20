import { Plus } from 'lucide-react'
import { useLanguage } from './language-provider'

export function TodaysFocusHeader({ remainingSessions }: { remainingSessions: number }) {
    const { t } = useLanguage()
    return (
        <div className="flex items-center justify-between mb-6 px-6">
            <div className="flex flex-col">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">{t('plan.todays_focus')}</h2>
                <span className="text-sm text-gray-400">
                    {t('plan.sessions_remaining').replace('{count}', remainingSessions.toString())}
                </span>
            </div>

            <button className="h-10 w-10 rounded-full bg-[#1C2033] flex items-center justify-center hover:bg-[#252A40] transition-colors border border-white/5">
                <Plus className="h-5 w-5 text-gray-400" />
            </button>
        </div>
    )
}
