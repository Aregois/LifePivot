import React, { useState } from 'react'
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { useDiscoverPlans, PublicPlan } from '../../hooks/useMarketplace'
import { C, Gradients } from '../../constants/theme'
import { FadeInView, GlassCard, SegmentedControl, GlowBadge } from '../../components/ui'

export default function MarketplaceIndex() {
    const router = useRouter()
    const [activeSortIndex, setActiveSortIndex] = useState(0) // 0: created_at, 1: rating
    const sortBy = activeSortIndex === 0 ? 'created_at' : 'rating'
    const { data, isLoading, refetch } = useDiscoverPlans(sortBy, 'desc')

    const plans = data?.plans || []

    const handleSelectSegment = (idx: number) => {
        setActiveSortIndex(idx)
    }

    const renderPlanItem = ({ item, index }: { item: PublicPlan; index: number }) => {
        const tokenCost = Number(item.plan_metadata?.token_cost || 0)
        
        return (
            <FadeInView delay={index * 50}>
                <GlassCard
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        router.push(`/marketplace/${item.id}`)
                    }}
                    style={{ padding: 18, marginBottom: 12 }}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' }} numberOfLines={1}>
                                {item.title}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                                <GlowBadge label={item.level || 'BEGINNER'} colorScheme="blue" />
                                <Text style={{ color: C.inactive, marginHorizontal: 8, fontSize: 10 }}>•</Text>
                                <Text style={{ fontSize: 10, color: C.textDim, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
                                    {item.duration_days} DAYS
                                </Text>
                            </View>
                        </View>
                        {tokenCost > 0 ? (
                            <GlowBadge label={`${tokenCost} TOKENS`} colorScheme="amber" glow />
                        ) : (
                            <GlowBadge label="FREE" colorScheme="emerald" />
                        )}
                    </View>

                    {/* Rating & Author details */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.03)', paddingTop: 12 }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
                            CREATED BY: {item.profiles?.id.slice(0, 8) || 'COMMUNITY'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="star" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                            <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF' }}>{item.rating || '5.0'}</Text>
                        </View>
                    </View>
                </GlassCard>
            </FadeInView>
        )
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#050508' }}>
            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
                {/* Segment Controls */}
                <FadeInView delay={0} style={{ marginBottom: 18 }}>
                    <SegmentedControl
                        segments={['NEWEST ARRIVALS', 'TOP RATED']}
                        selectedIndex={activeSortIndex}
                        onChange={handleSelectSegment}
                    />
                </FadeInView>

                {isLoading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#00F0FF" />
                    </View>
                ) : (
                    <FlatList
                        data={plans}
                        renderItem={renderPlanItem}
                        keyExtractor={item => item.id}
                        refreshControl={
                            <RefreshControl
                                refreshing={isLoading}
                                onRefresh={refetch}
                                tintColor="#00F0FF"
                                colors={['#00F0FF']}
                            />
                        }
                        contentContainerStyle={{ paddingBottom: 80 }}
                        ListEmptyComponent={
                            <FadeInView delay={100} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
                                <Ionicons name="grid-outline" size={48} color={C.inactive} />
                                <Text style={{ color: C.textDim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 12 }}>
                                    NO PLANS IN DISCOVERY
                                </Text>
                            </FadeInView>
                        }
                    />
                )}
            </View>
        </View>
    )
}
