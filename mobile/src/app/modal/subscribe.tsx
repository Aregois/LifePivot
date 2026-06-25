import React, { useState } from 'react'
import { View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useSubscribe } from '../../hooks/useSubscription'
import { C, Shadows } from '../../constants/theme'
import { FadeInView, GlassCard, PremiumButton, GradientText } from '../../components/ui'

export default function SubscribeModal() {
    const router = useRouter()
    const { mutate: subscribe, isPending } = useSubscribe()
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')

    const handleSubscribe = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        // Trigger mock checkout transaction
        subscribe(
            { mockSuccess: true, transactionId: `iap-mock-${Date.now()}` },
            {
                onSuccess: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                    Alert.alert(
                        'POWER UNLOCKED',
                        'Welcome to the Solo Power tier! Your customization features are now active.',
                        [{ text: 'AWESOME', onPress: () => router.back() }]
                    )
                },
                onError: (err) => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                    Alert.alert('TRANSACTION FAILED', err.message || 'Payment processing error')
                }
            }
        )
    }

    const selectPlan = (plan: 'monthly' | 'yearly') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        setSelectedPlan(plan)
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48, justifyContent: 'space-between', minHeight: '100%' }} style={{ flex: 1, backgroundColor: '#050508' }}>
            <View>
                {/* Header title */}
                <FadeInView delay={0} style={{ alignItems: 'center', marginBottom: 24 }}>
                    <View style={{ backgroundColor: 'rgba(189, 0, 255, 0.05)', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(189, 0, 255, 0.15)', marginBottom: 12 }}>
                        <Ionicons name="diamond" size={32} color={C.neonViolet} />
                    </View>
                    <GradientText
                        style={{
                            fontSize: 11,
                            fontWeight: '900',
                            letterSpacing: 4,
                            textTransform: 'uppercase',
                            marginBottom: 4,
                        }}
                    >
                        LIFEPIVOT POWER TIER
                    </GradientText>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                        UPGRADE STATUS
                    </Text>
                    <Text style={{ fontSize: 10, color: C.textDim, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', lineHeight: 14 }}>
                        UNLEASH UNLIMITED STUDY EFFICIENCY & CUSTOMIZATIONS
                    </Text>
                </FadeInView>

                {/* Benefits List */}
                <FadeInView delay={100} style={{ marginBottom: 24 }}>
                    <GlassCard style={{ padding: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
                            <Ionicons name="checkmark-circle" size={18} color={C.electricBlue} style={{ marginRight: 12, marginTop: 1 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                    UNLIMITED ACTIVE PLANS
                                </Text>
                                <Text style={{ fontSize: 9, color: C.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 13 }}>
                                    TRACK MULTIPLE CURRICULUMS CONCURRENTLY (STANDARD LIMIT: 1 ACTIVE PLAN)
                                </Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.03)', paddingTop: 16, marginBottom: 16 }}>
                            <Ionicons name="checkmark-circle" size={18} color={C.electricBlue} style={{ marginRight: 12, marginTop: 1 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                    NEON GLOW CUSTOMIZATIONS
                                </Text>
                                <Text style={{ fontSize: 9, color: C.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 13 }}>
                                    IRIDESCENT PROFILE BORDERS FOR YOUR REACTIVE AVATAR MONOGRAM
                                </Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.03)', paddingTop: 16 }}>
                            <Ionicons name="checkmark-circle" size={18} color={C.electricBlue} style={{ marginRight: 12, marginTop: 1 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                    EXCLUSIVE SYNTH SOUNDSCAPES
                                </Text>
                                <Text style={{ fontSize: 9, color: C.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 13 }}>
                                    UNLOCK ADVANCED WEB AUDIO OSCILLATORS (Zen Rain, Pink Noise)
                                </Text>
                            </View>
                        </View>
                    </GlassCard>
                </FadeInView>

                {/* Plan Toggle selector */}
                <FadeInView delay={150} style={{ marginBottom: 28, gap: 10 }}>
                    <GlassCard
                        onPress={() => selectPlan('monthly')}
                        padded={false}
                        style={[
                            {
                                padding: 16,
                                borderWidth: 1.5,
                                borderColor: selectedPlan === 'monthly' ? C.electricBlue : C.glassBorder,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            },
                            selectedPlan === 'monthly' && Shadows.glowSmall(C.electricBlue, 0.2),
                        ]}
                    >
                        <View>
                            <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                MONTHLY SUB
                            </Text>
                            <Text style={{ fontSize: 9, color: C.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                CANCEL ANYTIME
                            </Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: C.electricBlue }}>$9.99 / MO</Text>
                    </GlassCard>

                    <GlassCard
                        onPress={() => selectPlan('yearly')}
                        padded={false}
                        style={[
                            {
                                padding: 16,
                                borderWidth: 1.5,
                                borderColor: selectedPlan === 'yearly' ? C.electricBlue : C.glassBorder,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            },
                            selectedPlan === 'yearly' && Shadows.glowSmall(C.electricBlue, 0.2),
                        ]}
                    >
                        <View>
                            <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                YEARLY SAVINGS (50% OFF)
                            </Text>
                            <Text style={{ fontSize: 9, color: C.neonViolet, fontWeight: '900', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                BEST VALUE
                            </Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: C.electricBlue }}>$59.99 / YR</Text>
                    </GlassCard>
                </FadeInView>
            </View>

            {/* Apple/Google Pay Mock trigger button */}
            <FadeInView delay={200} style={{ gap: 10 }}>
                <PremiumButton
                    title="PAY WITH Apple / Google Pay"
                    onPress={handleSubscribe}
                    variant="primary"
                    loading={isPending}
                    disabled={isPending}
                />

                <PremiumButton
                    title="NOT NOW"
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        router.back()
                    }}
                    variant="ghost"
                />
            </FadeInView>
        </ScrollView>
    )
}
