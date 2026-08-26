'use client'

import { useState, useEffect } from 'react'
import { useEconomy } from './economy-provider'
import { createClient } from '@/utils/supabase/client'
import { AvatarIcon } from './avatar-icons'
import { Sparkles } from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { motion } from 'framer-motion'

type CompanionMood = 'focused' | 'nervous' | 'fallen'

export function ReactiveAvatar() {
    const { avatarId, tokens } = useEconomy()
    const [mood, setMood] = useState<CompanionMood>('focused')
    const [overdueCount, setOverdueCount] = useState(0)
    const [mounted, setMounted] = useState(false)

    // Acceleration/Tilt simulation on hover
    const [rotateX, setRotateX] = useState(0)
    const [rotateY, setRotateY] = useState(0)

    useEffect(() => {
        setMounted(true)
        checkMood()
    }, [tokens])

    const checkMood = async () => {
        const supabase = createClient()
        const todayStr = new Date().toISOString().split('T')[0]

        // Fetch overdue tasks
        const { data: overdue } = await supabase
            .from('tasks')
            .select('id')
            .eq('status', 'pending')
            .neq('task_type', 'void')
            .lt('due_date', todayStr)

        const count = overdue?.length ?? 0
        setOverdueCount(count)

        if (tokens === 0 && count > 0) {
            setMood('fallen')
        } else if (count > 0) {
            setMood('nervous')
        } else {
            setMood('focused')
        }
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const card = e.currentTarget
        const box = card.getBoundingClientRect()
        const x = e.clientX - box.left - box.width / 2
        const y = e.clientY - box.top - box.height / 2
        setRotateX(-y / 4)
        setRotateY(x / 4)
    }

    const handleMouseLeave = () => {
        setRotateX(0)
        setRotateY(0)
    }

    if (!mounted) return null

    // Determine visual tokens matching the mood
    let haloColor = 'border-electric-blue/40 shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]'
    let moodBadge = 'Focused'
    let moodBadgeColor = 'text-electric-blue bg-electric-blue/10 border-electric-blue/20'
    let tooltip = 'Click companion to review status.'

    if (mood === 'nervous') {
        haloColor = 'border-orange-500/50 shadow-[0_0_25px_rgba(249,115,22,0.4)] animate-pulse'
        moodBadge = 'Nervous'
        moodBadgeColor = 'text-orange-400 bg-orange-500/10 border-orange-500/20'
        tooltip = 'PENDING OVERDUE TASKS! Complete tasks to restore focus.'
    } else if (mood === 'fallen') {
        haloColor = 'border-rose-500/50 shadow-[0_0_25px_rgba(239,68,68,0.4)]'
        moodBadge = 'Exhausted'
        moodBadgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20'
        tooltip = '0 Lives remaining. Complete tasks to restore heart balance.'
    }

    return (
        <div className="flex flex-col items-center gap-3">
            {/* Parallax Interactive Widget */}
            <motion.div
                title={tooltip}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={() => {
                    haptics.light()
                }}
                style={{
                    transformStyle: 'preserve-3d',
                    rotateX: rotateX,
                    rotateY: rotateY,
                }}
                className={`relative w-20 h-20 rounded-full border-2 bg-[#0B0D17] flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all duration-150 ${haloColor}`}
            >
                <div className="w-[72px] h-[72px] rounded-full overflow-hidden z-10">
                    <AvatarIcon id={avatarId} />
                </div>

                {/* Sparkling dots on Zen mood */}
                {mood === 'focused' && (
                    <div className="absolute inset-0 pointer-events-none z-0">
                        <Sparkles className="h-4 w-4 text-electric-blue absolute -top-1 -right-1 animate-pulse" />
                    </div>
                )}

                {/* Overdue Alert icon overlay */}
                {mood === 'nervous' && (
                    <div className="absolute -top-1 -right-1 bg-orange-500 border border-black h-5 w-5 rounded-full flex items-center justify-center z-25 shadow-[0_0_10px_rgba(249,115,22,0.6)]">
                        <span className="text-[10px] font-black text-black">{overdueCount}</span>
                    </div>
                )}
            </motion.div>

            {/* Mood Badge indicator */}
            <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border select-none ${moodBadgeColor}`}>
                {moodBadge}
            </span>
        </div>
    )
}
