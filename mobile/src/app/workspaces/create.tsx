import React, { useState } from 'react'
import { View, Text, TextInput, Switch, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { HapticsEngine } from '../../utils/HapticsEngine'
import { useCreateWorkspace } from '../../hooks/useWorkspaces'
import { C } from '../../constants/theme'
import { FadeInView, GlassCard, PremiumButton } from '../../components/ui'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'

export default function CreateWorkspace() {
    const router = useRouter()
    const { colors } = useTheme()
    const { t } = useLanguage()
    const { mutate: createWS, isPending } = useCreateWorkspace()
    const [name, setName] = useState('')
    const [isPremium, setIsPremium] = useState(false)
    const [tokenCost, setTokenCost] = useState('50')
    const [error, setError] = useState<string | null>(null)
    const [nameFocused, setNameFocused] = useState(false)
    const [tokenFocused, setTokenFocused] = useState(false)

    const handleCreate = () => {
        const trimmedName = name.trim()
        if (!trimmedName) {
            setError(t('workspaces.create_name_required'))
            HapticsEngine.tier4.error()
            return
        }

        HapticsEngine.tier2.action()
        setError(null)
        createWS(
            {
                name: trimmedName,
                isPremium,
                tokenCost: isPremium ? Number(tokenCost || 0) : 0
            },
            {
                onSuccess: () => {
                    HapticsEngine.tier3.success()
                    router.back() // Go back to workspaces listing
                },
                onError: (err) => {
                    HapticsEngine.tier4.error()
                    setError(err.message || t('workspaces.create_failed'))
                }
            }
        )
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Background Ambient Glows */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -100,
                right: -100,
                width: 320,
                height: 320,
                borderRadius: 160,
                backgroundColor: colors.primary,
                opacity: 0.05,
              }}
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                bottom: 120,
                left: -100,
                width: 320,
                height: 320,
                borderRadius: 160,
                backgroundColor: colors.secondary,
                opacity: 0.05,
              }}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 32 }}>
                    <FadeInView delay={0}>
                        <GlassCard style={{ padding: 20, marginBottom: 24, borderColor: colors.glassBorder }}>
                            {/* Cohort Name */}
                            <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '900', letterSpacing: 3.5, textTransform: 'uppercase', marginBottom: 8 }}>
                                {t('workspaces.create_title')}
                            </Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder={t('workspaces.create_placeholder')}
                                placeholderTextColor={colors.placeholder}
                                onFocus={() => setNameFocused(true)}
                                onBlur={() => setNameFocused(false)}
                                style={{
                                    backgroundColor: colors.card,
                                    borderWidth: 1,
                                    borderColor: nameFocused ? colors.primary : colors.glassBorder,
                                    borderRadius: 12,
                                    paddingHorizontal: 16,
                                    paddingVertical: 14,
                                    color: '#FFFFFF',
                                    fontWeight: '600',
                                    fontSize: 13,
                                    marginBottom: 20,
                                }}
                            />

                            {/* Switch Row */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flex: 1, marginRight: 16 }}>
                                    <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '900', letterSpacing: 3.5, textTransform: 'uppercase' }}>
                                        {t('workspaces.create_premium_label')}
                                    </Text>
                                    <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 13 }}>
                                        {t('workspaces.create_premium_desc')}
                                    </Text>

                                </View>
                                <Switch
                                    value={isPremium}
                                    onValueChange={(val) => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                        setIsPremium(val)
                                    }}
                                    trackColor={{ false: '#050508', true: C.electricBlue }}
                                    thumbColor={isPremium ? '#0E111F' : '#3A4155'}
                                />
                            </View>
                        </GlassCard>
                    </FadeInView>

                    {/* Premium Token Input Card */}
                    {isPremium && (
                        <FadeInView delay={100}>
                            <GlassCard style={{ padding: 20, marginBottom: 24 }}>
                                <Text style={{ fontSize: 10, color: C.electricBlue, fontWeight: '900', letterSpacing: 3.5, textTransform: 'uppercase', marginBottom: 8 }}>
                                    {t('workspaces.create_token_cost')}
                                </Text>
                                <TextInput
                                    value={tokenCost}
                                    onChangeText={setTokenCost}
                                    keyboardType="numeric"
                                    placeholder="50"
                                    placeholderTextColor={C.placeholder}
                                    onFocus={() => setTokenFocused(true)}
                                    onBlur={() => setTokenFocused(false)}
                                    style={{
                                        backgroundColor: 'rgba(5, 5, 8, 0.6)',
                                        borderWidth: 1,
                                        borderColor: tokenFocused ? C.electricBlue : C.glassBorder,
                                        borderRadius: 12,
                                        paddingHorizontal: 16,
                                        paddingVertical: 14,
                                        color: '#FFFFFF',
                                        fontWeight: '600',
                                        fontSize: 13,
                                    }}
                                />
                            </GlassCard>
                        </FadeInView>
                    )}

                    {error && (
                        <FadeInView delay={0}>
                            <Text style={{ color: C.rose, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, fontSize: 10, textAlign: 'center', marginBottom: 20 }}>
                                {error}
                            </Text>
                        </FadeInView>
                    )}

                    <FadeInView delay={150}>
                        <PremiumButton
                            title={t('workspaces.create_button')}
                            onPress={handleCreate}
                            variant="primary"
                            loading={isPending}
                            disabled={isPending}
                        />
                    </FadeInView>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    )
}
