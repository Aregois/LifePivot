'use client'

import { Trash2 } from 'lucide-react'
import { deletePlan } from '@/app/actions'
import { useTransition } from 'react'
import { useLanguage } from './language-provider'

export function ResetPlanButton() {
    const { t } = useLanguage()
    const [isPending, startTransition] = useTransition()

    const handleReset = () => {
        if (window.confirm(t('plan.reset_confirm'))) {
            startTransition(async () => {
                await deletePlan()
            })
        }
    }

    return (
        <button
            onClick={handleReset}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors text-sm font-bold border border-red-500/20"
        >
            <Trash2 className="h-4 w-4" />
            <span>{isPending ? t('plan.resetting') : t('plan.reset_button')}</span>
        </button>
    )
}
