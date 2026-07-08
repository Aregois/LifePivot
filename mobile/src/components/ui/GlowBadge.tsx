import React from 'react'
import { View, Text } from 'react-native'
import { C, Spacing, BorderRadius, SemanticColors } from '../../constants/theme'

type BadgeColorScheme = 'amber' | 'emerald' | 'violet' | 'blue' | 'rose'

const colorMap: Record<BadgeColorScheme, { bg: string; border: string; text: string }> = {
    amber: { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', text: SemanticColors.warning },
    emerald: { bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)', text: SemanticColors.success },
    violet: { bg: 'rgba(189,0,255,0.10)', border: 'rgba(189,0,255,0.25)', text: C.neonViolet },
    blue: { bg: 'rgba(0,240,255,0.10)', border: 'rgba(0,240,255,0.25)', text: C.electricBlue },
    rose: { bg: 'rgba(244,63,94,0.10)', border: 'rgba(244,63,94,0.25)', text: SemanticColors.error },
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
                    borderRadius: BorderRadius.xxl,
                    paddingHorizontal: Spacing.three,
                    paddingVertical: Spacing.two,
                },
                glow && {
                    shadowColor: colorScheme === 'violet' ? C.neonViolet : colorScheme === 'blue' ? C.electricBlue : colors.text,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.45,
                    shadowRadius: 10,
                    elevation: 5,
                },
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
