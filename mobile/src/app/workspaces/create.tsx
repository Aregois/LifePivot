import React, { useState } from 'react'
import { View, Text, TextInput, Switch, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useCreateWorkspace } from '../../hooks/useWorkspaces'
import { C, Gradients, Shadows } from '../../constants/theme'
import { FadeInView, GlassCard, PremiumButton } from '../../components/ui'

export default function CreateWorkspace() {
    const router = useRouter()
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
            setError('Cohort name is required')
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            return
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        setError(null)
        createWS(
            {
                name: trimmedName,
                isPremium,
                tokenCost: isPremium ? Number(tokenCost || 0) : 0
            },
            {
                onSuccess: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                    router.back() // Go back to workspaces listing
                },
                onError: (err) => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                    setError(err.message || 'Failed to create cohort')
                }
            }
        )
    }

    return (
        <LinearGradient
            colors={[...Gradients.loginBg]}
            style={{ flex: 1 }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 32 }}>
                    <FadeInView delay={0}>
                        <GlassCard style={{ padding: 20, marginBottom: 24 }}>
                            {/* Cohort Name */}
                            <Text style={{ fontSize: 10, color: C.textDim, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                                COHORT TITLE
                            </Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g. Next.js Masters Group"
                                placeholderTextColor={C.placeholder}
                                onFocus={() => setNameFocused(true)}
                                onBlur={() => setNameFocused(false)}
                                style={{
                                    backgroundColor: 'rgba(5, 5, 8, 0.6)',
                                    borderWidth: 1,
                                    borderColor: nameFocused ? C.electricBlue : C.glassBorder,
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
                                    <Text style={{ fontSize: 10, color: C.textDim, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                                        PREMIUM ACCESS
                                    </Text>
                                    <Text style={{ fontSize: 9, color: C.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 13 }}>
                                        MEMBERS PAY TOKENS TO ENROLL
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
                                <Text style={{ fontSize: 10, color: C.textDim, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                                    TOKEN COST TO JOIN
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
                            title="CREATE COHORT"
                            onPress={handleCreate}
                            variant="primary"
                            loading={isPending}
                            disabled={isPending}
                        />
                    </FadeInView>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    )
}
