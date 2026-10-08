import React, { useState } from 'react'
import { View, Text, ScrollView, Alert, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import * as Haptics from 'expo-haptics'
import { HapticsEngine } from '../../utils/HapticsEngine'
import { useSubscribe } from '../../hooks/useSubscription'
import { supabase } from '../../utils/supabase'
import { C, Shadows } from '../../constants/theme'
import { FadeInView, GlassCard, PremiumButton, GradientText } from '../../components/ui'
import { useTheme } from '../../context/ThemeContext'

export default function SubscribeModal() {
    const router = useRouter()
    const { colors } = useTheme()
    const { mutate: subscribe, isPending } = useSubscribe()
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
    const [restoring, setRestoring] = useState(false)

    const handleSubscribe = () => {
        HapticsEngine.tier2.action()
        // Trigger mock checkout transaction
        subscribe(
            { mockSuccess: true, transactionId: `iap-mock-${Date.now()}` },
            {
                onSuccess: () => {
                    HapticsEngine.tier3.success()
                    Alert.alert(
                        'POWER UNLOCKED',
                        'Welcome to the Solo Power tier! Your customization features are now active.',
                        [{ text: 'AWESOME', onPress: () => router.back() }]
                    )
                },
                onError: (err) => {
                    HapticsEngine.tier4.error()
                    Alert.alert('TRANSACTION FAILED', err.message || 'Payment processing error')
                }
            }
        )
    }

    const handleRestorePurchases = async () => {
        HapticsEngine.tier1.selection()
        setRestoring(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setRestoring(false)
                Alert.alert('NOT SIGNED IN', 'Please sign in to restore your purchases.')
                return
            }
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_subscribed')
                .eq('id', user.id)
                .single()
            setRestoring(false)
            if (profile?.is_subscribed) {
                HapticsEngine.tier3.success()
                Alert.alert('PURCHASES RESTORED', 'Your Power Tier subscription is active and restored!', [
                    { text: 'CONTINUE', onPress: () => router.back() }
                ])
            } else {
                Alert.alert('NO ACTIVE SUBSCRIPTION', 'No active subscription was found on this account.')
            }
        } catch (err: any) {
            setRestoring(false)
            Alert.alert('RESTORE ERROR', err?.message || 'Could not restore purchases.')
        }
    }

    const selectPlan = (plan: 'monthly' | 'yearly') => {
        HapticsEngine.tier1.selection()
        setSelectedPlan(plan)
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

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48, justifyContent: 'space-between', minHeight: '100%' }} style={{ flex: 1 }}>
                <View>
                {/* Header title */}
                <FadeInView delay={0} style={{ alignItems: 'center', marginBottom: 24 }}>
                    <View style={{ backgroundColor: `${colors.secondary}15`, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: `${colors.secondary}33`, marginBottom: 12 }}>
                        <Ionicons name="diamond" size={32} color={colors.secondary} />
                    </View>
                    <GradientText
                        colors={colors.primaryGradient}
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
                    <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', lineHeight: 14 }}>
                        UNLEASH UNLIMITED STUDY EFFICIENCY & CUSTOMIZATIONS
                    </Text>
                </FadeInView>

                {/* Benefits List */}
                <FadeInView delay={100} style={{ marginBottom: 24 }}>
                    <GlassCard style={{ padding: 20, borderColor: colors.glassBorder }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
                            <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginRight: 12, marginTop: 1 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                    UNLIMITED ACTIVE PLANS
                                </Text>
                                <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 13 }}>
                                    TRACK MULTIPLE CURRICULUMS CONCURRENTLY (STANDARD LIMIT: 1 ACTIVE PLAN)
                                </Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.03)', paddingTop: 16, marginBottom: 16 }}>
                            <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginRight: 12, marginTop: 1 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                    NEON GLOW CUSTOMIZATIONS
                                </Text>
                                <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 13 }}>
                                    IRIDESCENT PROFILE BORDERS FOR YOUR REACTIVE AVATAR MONOGRAM
                                </Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.03)', paddingTop: 16 }}>
                            <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginRight: 12, marginTop: 1 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                    UNLIMITED SOCRATIC AI HINTS
                                </Text>
                                <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 13 }}>
                                    REAL-TIME FEYNMAN MENTAL MODELS & COMPREHENSION MICRO-DRILLS
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
                                borderColor: selectedPlan === 'monthly' ? colors.primary : colors.glassBorder,
                                backgroundColor: selectedPlan === 'monthly' ? `${colors.primary}12` : colors.card,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            },
                        ]}
                    >
                        <View>
                            <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                MONTHLY SUB
                            </Text>
                            <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                CANCEL ANYTIME
                            </Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: colors.primary }}>$9.99 / MO</Text>
                    </GlassCard>

                    <GlassCard
                        onPress={() => selectPlan('yearly')}
                        padded={false}
                        style={[
                            {
                                padding: 16,
                                borderWidth: 1.5,
                                borderColor: selectedPlan === 'yearly' ? colors.primary : colors.glassBorder,
                                backgroundColor: selectedPlan === 'yearly' ? `${colors.primary}12` : colors.card,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            },
                        ]}
                    >
                        <View>
                            <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                YEARLY SAVINGS (50% OFF)
                            </Text>
                            <Text style={{ fontSize: 9, color: colors.secondary, fontWeight: '900', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                BEST VALUE
                            </Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: colors.primary }}>$59.99 / YR</Text>
                    </GlassCard>
                </FadeInView>
            </View>

            {/* Apple/Google Pay trigger button */}
            <FadeInView delay={200} style={{ gap: 10 }}>
                <PremiumButton
                    title={selectedPlan === 'monthly' ? "SUBSCRIBE $9.99 / MO" : "SUBSCRIBE $59.99 / YR"}
                    onPress={handleSubscribe}
                    variant="primary"
                    loading={isPending}
                    disabled={isPending}
                />

                <TouchableOpacity
                    onPress={handleRestorePurchases}
                    activeOpacity={0.7}
                    style={{ alignSelf: 'center', paddingVertical: 8 }}
                    disabled={restoring}
                >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 1, textTransform: 'uppercase' }}>
                        {restoring ? 'RESTORING...' : 'RESTORE PURCHASES'}
                    </Text>
                </TouchableOpacity>

                <PremiumButton
                    title="NOT NOW"
                    onPress={() => {
                        HapticsEngine.tier1.light()
                        router.back()
                    }}
                    variant="ghost"
                />

                {/* Apple App Store Subscription & Legal Disclosures */}
                <View style={{ marginTop: 12, alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center', lineHeight: 13, paddingHorizontal: 8 }}>
                        Payment charged to your Apple ID upon purchase confirmation. Subscription renews automatically unless cancelled at least 24h before current period ends. Manage anytime in App Store Account Settings.
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                        <TouchableOpacity
                            onPress={() => WebBrowser.openBrowserAsync('https://lifepivot.app/privacy')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary, textDecorationLine: 'underline' }}>
                                Privacy Policy
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => WebBrowser.openBrowserAsync('https://lifepivot.app/terms')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary, textDecorationLine: 'underline' }}>
                                Terms of Use (EULA)
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </FadeInView>
        </ScrollView>
      </View>
    )
}

