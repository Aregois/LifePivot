import React, { useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useDiscoverPlans, useImportPlan, useRatePlan } from '../../hooks/useMarketplace'
import { supabase } from '../../utils/supabase'
import { scheduleDailyStudyReminder } from '../../utils/notifications'
import { C, Shadows } from '../../constants/theme'
import { FadeInView, GlassCard, PremiumButton, GlowBadge, GradientText } from '../../components/ui'

export default function PlanSpecification() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const router = useRouter()
    const { data, isLoading } = useDiscoverPlans()
    const { mutate: importPlan, isPending: isImporting } = useImportPlan()
    const { mutate: ratePlan } = useRatePlan()
    const [selectedStars, setSelectedStars] = useState(5)

    const plans = data?.plans || []
    const plan = plans.find(p => p.id === id)

    const handleImport = () => {
        if (!plan) return
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        importPlan(plan.id, {
            onSuccess: async (res) => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

                // Asynchronously query task count and schedule daily reminder
                try {
                    const todayStr = new Date().toISOString().split('T')[0]
                    const { count } = await supabase
                        .from('tasks')
                        .select('*', { count: 'exact', head: true })
                        .eq('goal_id', res.goalId)
                        .eq('due_date', todayStr)
                    
                    const taskCount = count || 0
                    // Default to 8:00 AM daily reminder
                    await scheduleDailyStudyReminder(plan.title, 1, taskCount, 8, 0)
                } catch (notiErr) {
                    console.warn('Failed to schedule study reminder:', notiErr)
                }

                Alert.alert(
                    'SUCCESS', 
                    'This syllabus has been cloned to your profile tasks calendar!',
                    [
                        { 
                            text: 'OK', 
                            onPress: () => router.replace('/(tabs)/plan') 
                        }
                    ]
                )
            },
            onError: (err) => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                Alert.alert('IMPORT FAILED', err.message || 'Check token balance')
            }
        })
    }

    const handleSubmitRating = (ratingVal: number) => {
        if (!plan) return
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        setSelectedStars(ratingVal)
        ratePlan(
            { goalId: plan.id, rating: ratingVal },
            {
                onSuccess: (res) => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                    Alert.alert('RATED', `Plan rating updated to: ${res.rating}★`)
                }
            }
        )
    }

    if (isLoading || !plan) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050508' }}>
                <ActivityIndicator size="large" color="#00F0FF" />
            </View>
        )
    }

    const tokenCost = Number(plan.plan_metadata?.token_cost || 0)

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

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} style={{ flex: 1 }}>
                <FadeInView delay={0} style={{ marginBottom: 20 }}>
                    <GradientText style={{ fontSize: 24, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>
                        {plan.title}
                    </GradientText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                        <GlowBadge label={plan.level || 'BEGINNER'} colorScheme="blue" />
                        <Text style={{ color: C.inactive, marginHorizontal: 8, fontSize: 10 }}>•</Text>
                        <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
                            {plan.duration_days} DAYS STUDY
                        </Text>
                    </View>
                </FadeInView>

            {/* Price section */}
            <FadeInView delay={100} style={{ marginBottom: 24 }}>
                <GlassCard style={{ padding: 20 }} elevated>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={{ fontSize: 10, color: C.electricBlue, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                            MARKETPLACE STATUS
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="star" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                            <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF' }}>{plan.rating || '5.0'}</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1, textTransform: 'uppercase' }}>ENTRY PRICE</Text>
                        {tokenCost > 0 ? (
                            <GlowBadge label={`${tokenCost} TOKENS`} colorScheme="amber" glow />
                        ) : (
                            <GlowBadge label="FREE CLONE" colorScheme="emerald" />
                        )}
                    </View>

                    <PremiumButton
                        title={tokenCost > 0 ? 'PURCHASE & CLONE SYLLABUS' : 'CLONE SYLLABUS'}
                        onPress={handleImport}
                        variant="primary"
                        loading={isImporting}
                        disabled={isImporting}
                    />
                </GlassCard>
            </FadeInView>

            {/* Specification fields */}
            <FadeInView delay={200} style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 10, color: C.electricBlue, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                    CURRICULUM SPECIFICATIONS
                </Text>
                <GlassCard style={{ padding: 18 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <Text style={{ fontSize: 10, color: C.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 }}>INTENT PROFILE</Text>
                        <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '800', textTransform: 'uppercase' }}>{plan.goal_intent}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)', paddingTop: 14 }}>
                        <Text style={{ fontSize: 10, color: C.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 }}>COMMITMENT LEVEL</Text>
                        <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '800' }}>{plan.commitment_hours_per_week} HRS / WEEK</Text>
                    </View>
                </GlassCard>
            </FadeInView>

            {/* Rating Section */}
            <FadeInView delay={300} style={{ marginBottom: 40 }}>
                <Text style={{ fontSize: 10, color: C.electricBlue, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                    RATE THIS SPECIFICATION
                </Text>
                <GlassCard style={{ padding: 20, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity
                                key={star}
                                onPress={() => handleSubmitRating(star)}
                                style={{ padding: 4 }}
                            >
                                <Ionicons
                                    name={star <= selectedStars ? "star" : "star-outline"}
                                    size={28}
                                    color={star <= selectedStars ? "#F59E0B" : C.inactive}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={{ fontSize: 9, color: C.textMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                        TAP TO SUBMIT STAR RATING
                    </Text>
                </GlassCard>
            </FadeInView>
        </ScrollView>
      </View>
    )
}
