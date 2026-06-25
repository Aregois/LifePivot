import React, { useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { C, Shadows } from '../../constants/theme'
import { FadeInView, GlassCard, GradientText, GlowBadge } from '../../components/ui'
import { supabase } from '../../utils/supabase'

export default function PlanPortal() {
    const router = useRouter()
    const [activePlans, setActivePlans] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

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
        <ScrollView className="flex-1 bg-[#050508] px-5 pt-5">
            {/* Header intro */}
            <FadeInView delay={0} style={{ marginBottom: 28 }}>
                <Text
                    style={{
                        fontSize: 10,
                        color: C.textDim,
                        fontWeight: '700',
                        letterSpacing: 2.5,
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
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                    }}
                >
                    SYLLABUS CORE
                </GradientText>
            </FadeInView>

            {/* Link cards */}
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

            {/* Active Plans Section */}
            <FadeInView delay={300} style={{ marginBottom: 60 }}>
                <Text
                    style={{
                        fontSize: 10,
                        color: C.textDim,
                        fontWeight: '700',
                        letterSpacing: 2.5,
                        textTransform: 'uppercase',
                        marginBottom: 12,
                    }}
                >
                    ACTIVE PERSONAL PLANS
                </Text>

                {loading ? (
                    <ActivityIndicator size="small" color={C.electricBlue} style={{ marginVertical: 20 }} />
                ) : activePlans.length === 0 ? (
                    <GlassCard style={{ padding: 24, alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, color: C.textMuted, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' }}>
                            NO ACTIVE PRIVATE PLANS YET
                        </Text>
                        <Text style={{ fontSize: 9, color: C.textDim, marginTop: 6, textAlign: 'center', lineHeight: 14 }}>
                            GO TO THE MARKETPLACE TO IMPORT A STUDY CURRICULUM.
                        </Text>
                    </GlassCard>
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
    )
}
