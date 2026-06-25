import React from 'react'
import { View, Text } from 'react-native'
import { Shadows } from '../../constants/theme'

type BadgeColorScheme = 'amber' | 'emerald' | 'violet' | 'blue' | 'rose'

const colorMap: Record<BadgeColorScheme, { bg: string; border: string; text: string }> = {
    amber: { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', text: '#F59E0B' },
    emerald: { bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)', text: '#10B981' },
    violet: { bg: 'rgba(189,0,255,0.10)', border: 'rgba(189,0,255,0.25)', text: '#BD00FF' },
    blue: { bg: 'rgba(0,240,255,0.10)', border: 'rgba(0,240,255,0.25)', text: '#00F0FF' },
    rose: { bg: 'rgba(244,63,94,0.10)', border: 'rgba(244,63,94,0.25)', text: '#F43F5E' },
}

interface GlowBadgeProps {
    label: string
    colorScheme?: BadgeColorScheme
    glow?: boolean
}

export function GlowBadge({ label, colorScheme = 'amber', glow = false }: GlowBadgeProps) {
    const colors = colorMap[colorScheme]

    return (
        <View
            style={[
                {
                    backgroundColor: colors.bg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                },
                glow && Shadows.glowSmall(colors.text, 0.2),
            ]}
        >
            <Text
                style={{
                    fontSize: 9,
                    fontWeight: '900',
                    color: colors.text,
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                }}
            >
                {label}
            </Text>
        </View>
    )
}

export default GlowBadge;

