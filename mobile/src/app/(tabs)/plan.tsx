import React, { useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
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

                // Fetch level to handle progressive lock checks
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('level')
                    .eq('id', user.id)
                    .single()
                if (profile) {
                    setUserLevel(profile.level)
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
            <FadeInView delay={50} style={{ marginBottom: 16 }}>
                <GlassCard
                    onPress={() => router.push('/plan/create')}
                    style={{
                        padding: 24,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'rgba(0, 240, 255, 0.03)',
                        borderColor: 'rgba(0, 240, 255, 0.2)'
                    }}
                >
                    <View style={{ marginRight: 16, backgroundColor: 'rgba(0, 240, 255, 0.1)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 240, 255, 0.3)' }}>
                        <Ionicons name="sparkles" size={26} color="#00F0FF" />
                    </View>
                    <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1, textTransform: 'uppercase' }}>
                            CREATE CUSTOM PLAN
                        </Text>
                        <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 14 }}>
                            FORGE AN AI-DRIVEN INDIVIDUAL STUDY SYLLABUS DIRECTLY FOR YOUR GOAL
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#00F0FF" />
                </GlassCard>
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
                        {activePlans.map((plan) => (
                            <GlassCard
                                key={plan.id}
                                onPress={() => router.push({ pathname: '/plan/[id]', params: { id: plan.id } })}
                                style={{
                                    padding: 20,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <View style={{ flex: 1, marginRight: 12 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' }} numberOfLines={1}>
                                        {plan.title}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                                        <GlowBadge label={`${plan.duration_days} DAYS`} colorScheme="blue" />
                                        <Text style={{ fontSize: 9, color: C.textDim, marginLeft: 8 }}>
                                            STARTED {new Date(plan.created_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={C.electricBlue} />
                            </GlassCard>
                        ))}
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
