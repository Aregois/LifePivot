import React, { useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { C, Shadows } from '../../constants/theme'
import { FadeInView, GlassCard, GradientText, GlowBadge, PremiumButton, EmptyStateCTA, PlanSkeletonList } from '../../components/ui'
import { supabase } from '../../utils/supabase'
import { PlanGeneratorLoader } from '../../components/plan/PlanGeneratorLoader'

export default function PlanPortal() {
    const router = useRouter()
    const [activePlans, setActivePlans] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [userLevel, setUserLevel] = useState<number>(1)
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [generationError, setGenerationError] = useState<string | null>(null)

    const fetchActivePlans = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data, error } = await supabase
                    .from('learning_goals')
                    .select('id, title, duration_days, created_at')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                if (data) {
                    setActivePlans(data)
                }

                // Fetch level and subscription status to handle progressive lock checks
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('level, is_subscribed')
                    .eq('id', user.id)
                    .single()
                if (profile) {
                    setUserLevel(profile.level)
                    setIsSubscribed(!!profile.is_subscribed)
                }
            }
        } catch (e) {
            console.error('Error fetching plans:', e)
        } finally {
            setLoading(false)
        }
    }

    useFocusEffect(
        React.useCallback(() => {
            fetchActivePlans()
        }, [])
    )

    return (
        <View style={{ flex: 1, backgroundColor: '#050508' }}>
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
                backgroundColor: '#00F0FF',
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
                backgroundColor: '#BD00FF',
                opacity: 0.05,
              }}
            />

            <ScrollView className="flex-1 px-5 pt-5">
                {/* Header intro */}
                <FadeInView delay={0} style={{ marginBottom: 28 }}>
                    <Text
                        style={{
                            fontSize: 10,
                            color: C.electricBlue,
                            fontWeight: '900',
                            letterSpacing: 3.5, // tracking-widest
                            textTransform: 'uppercase',
                            marginBottom: 4,
                        }}
                    >
                        LEARNING PORTAL
                    </Text>
                    <GradientText
                        style={{
                            fontSize: 24,
                            fontWeight: '900',
                            letterSpacing: -0.5, // tracking-tight
                            textTransform: 'uppercase',
                        }}
                    >
                        SYLLABUS CORE
                    </GradientText>
                </FadeInView>

            {/* CREATE PLAN CTA — ALWAYS VISIBLE */}
            <FadeInView delay={50} style={{ marginBottom: 12 }}>
                <PremiumButton
                    title="CREATE NEW PLAN +"
                    onPress={() => router.push('/plan/create')}
                    variant="primary"
                />
            </FadeInView>

            {/* Pro Curriculum Builder — secondary entry point */}
            <FadeInView delay={80} style={{ marginBottom: 24 }}>
                <TouchableOpacity
                    onPress={() => router.push('/plan/pro-curriculum')}
                    activeOpacity={0.8}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        paddingVertical: 12,
                        paddingHorizontal: 20,
                        borderRadius: 20,
                        backgroundColor: 'rgba(189, 0, 255, 0.06)',
                        borderWidth: 1,
                        borderColor: 'rgba(189, 0, 255, 0.15)',
                    }}
                >
                    <Ionicons name="school-outline" size={15} color="#BD00FF" style={{ opacity: 0.8 }} />
                    <Text style={{
                        fontSize: 11,
                        fontWeight: '900',
                        color: '#BD00FF',
                        opacity: 0.8,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                    }}>
                        🎓 Professional Curriculum Builder
                    </Text>
                </TouchableOpacity>
            </FadeInView>


            {/* Link cards — LOCKED FOR NEW USERS (progressive reveal) */}
            {userLevel >= 2 && (
                <>
                    <FadeInView delay={100} style={{ marginBottom: 16 }}>
                        <GlassCard
                            onPress={() => router.push('/workspaces')}
                            style={{
                                padding: 24,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <View style={{ marginRight: 16, backgroundColor: 'rgba(0, 240, 255, 0.05)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 240, 255, 0.15)' }}>
                                <Ionicons name="people" size={26} color={C.electricBlue} />
                            </View>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1, textTransform: 'uppercase' }}>
                                    STUDY COHORTS
                                </Text>
                                <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 14 }}>
                                    JOIN STUDENT GROUPS, SYNC XP, AND SOLVE TUTOR TASKS
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={C.electricBlue} />
                        </GlassCard>
                    </FadeInView>

                    <FadeInView delay={200} style={{ marginBottom: 32 }}>
                        <GlassCard
                            onPress={() => router.push('/marketplace')}
                            style={{
                                padding: 24,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <View style={{ marginRight: 16, backgroundColor: 'rgba(189, 0, 255, 0.05)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(189, 0, 255, 0.15)' }}>
                                <Ionicons name="grid" size={26} color={C.neonViolet} />
                            </View>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1, textTransform: 'uppercase' }}>
                                    PLAN MARKETPLACE
                                </Text>
                                <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 14 }}>
                                    BROWSE, BUY, AND IMPORT COMMUNITY CHOSEN STUDY SCHEMAS
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={C.neonViolet} />
                        </GlassCard>
                    </FadeInView>
                </>
            )}

            {/* Active Plans Section */}
            <FadeInView delay={300} style={{ marginBottom: 60, marginTop: userLevel < 2 ? 16 : 0 }}>
                <Text
                    style={{
                        fontSize: 10,
                        color: C.electricBlue,
                        fontWeight: '900',
                        letterSpacing: 3.5, // tracking-widest
                        textTransform: 'uppercase',
                        marginBottom: 12,
                    }}
                >
                    ACTIVE PERSONAL PLANS
                </Text>

                {loading ? (
                    <PlanSkeletonList />
                ) : activePlans.length === 0 ? (
                    <EmptyStateCTA
                        iconName="calendar"
                        title="No Active Plans Yet"
                        description="Formulate an AI-driven learning curriculum directly matching your goal to begin tracking."
                        buttonText="CREATE A PLAN"
                        onPress={() => router.push('/plan/create')}
                    />
                ) : (
                    <View style={{ gap: 12 }}>
                        {activePlans.map((plan, index) => {
                            const isPlanLocked = !isSubscribed && index > 0;
                            return (
                                <GlassCard
                                    key={plan.id}
                                    onPress={() => {
                                        if (isPlanLocked) {
                                            Alert.alert(
                                                "Unlock Unlimited Plans",
                                                "Upgrade to Solo Power to unlock all learning plans.",
                                                [
                                                    { text: "View Upgrades", onPress: () => router.push('/profile') },
                                                    { text: "Cancel", style: "cancel" }
                                                ]
                                            );
                                            return;
                                        }
                                        router.push({ pathname: '/plan/[id]', params: { id: plan.id } });
                                    }}
                                    style={{
                                        padding: 20,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        opacity: isPlanLocked ? 0.55 : 1,
                                    }}
                                >
                                    <View style={{ flex: 1, marginRight: 12 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' }} numberOfLines={1}>
                                            {plan.title}
                                        </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                                            <GlowBadge label={`${plan.duration_days} DAYS`} colorScheme="blue" />
                                            {isPlanLocked ? (
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                                                    <Ionicons name="lock-closed" size={10} color="#BD00FF" />
                                                    <Text style={{ fontSize: 9, color: '#BD00FF', marginLeft: 4, fontWeight: 'bold' }}>
                                                        PRO REQUIRED
                                                    </Text>
                                                </View>
                                            ) : (
                                                <Text style={{ fontSize: 9, color: C.textDim, marginLeft: 8 }}>
                                                    STARTED {new Date(plan.created_at).toLocaleDateString()}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    <Ionicons 
                                        name={isPlanLocked ? "lock-closed" : "chevron-forward"} 
                                        size={18} 
                                        color={isPlanLocked ? "#BD00FF" : C.electricBlue} 
                                    />
                                </GlassCard>
                            );
                        })}
                    </View>
                )}
            </FadeInView>
            </ScrollView>

            <PlanGeneratorLoader
                visible={isGenerating}
                error={generationError}
                onDismiss={() => {
                    setIsGenerating(false)
                    setGenerationError(null)
                }}
            />
        </View>
    )
}
