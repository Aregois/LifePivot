import React, { useState, useEffect } from 'react'
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { useDiscoverPlans, PublicPlan } from '../../hooks/useMarketplace'
import { C, Gradients } from '../../constants/theme'
import { FadeInView, GlassCard, SegmentedControl, GlowBadge, EmptyStateCTA, AnimatedProgressBar, PremiumButton } from '../../components/ui'
import { supabase } from '../../utils/supabase'
import { useLanguage, translateGoalTitle } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import { HapticsEngine } from '../../utils/HapticsEngine'

export default function MarketplaceIndex() {
    const router = useRouter()
    const { colors } = useTheme()
    const { t, locale } = useLanguage()
    const [activeSortIndex, setActiveSortIndex] = useState(0) // 0: created_at, 1: rating
    const sortBy = activeSortIndex === 0 ? 'created_at' : 'rating'
    const { data, isLoading, refetch } = useDiscoverPlans(sortBy, 'desc')
    const [level, setLevel] = useState(2)
    const [xp, setXp] = useState(0)
    const [loadingLevel, setLoadingLevel] = useState(true)

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                supabase
                    .from('profiles')
                    .select('level, xp')
                    .eq('id', user.id)
                    .single()
                    .then(({ data }) => {
                        if (data) {
                            setLevel(data.level ?? 1)
                            setXp(data.xp ?? 0)
                        }
                        setLoadingLevel(false)
                    })
            } else {
                setLoadingLevel(false)
            }
        })
    }, [])

    const plans = data?.plans || []

    const handleSelectSegment = (idx: number) => {
        setActiveSortIndex(idx)
    }

    const renderPlanItem = ({ item, index }: { item: PublicPlan; index: number }) => {
        const tokenCost = Number(item.plan_metadata?.token_cost || 0)
        const localizedTitle = translateGoalTitle(item.title, locale)
        
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
                            <Text
                                style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' }}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.8}
                            >
                                {localizedTitle}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                                <GlowBadge label={item.level || t('marketplace.beginner')} colorScheme="blue" />
                                <Text style={{ color: C.inactive, marginHorizontal: 8, fontSize: 10 }}>•</Text>
                                <Text style={{ fontSize: 10, color: C.textDim, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
                                    {item.duration_days} {t('marketplace.days')}
                                </Text>
                            </View>
                        </View>
                        {tokenCost > 0 ? (
                            <GlowBadge label={t('marketplace.tokens', { count: tokenCost })} colorScheme="amber" glow />
                        ) : (
                            <GlowBadge label={t('marketplace.free')} colorScheme="emerald" />
                        )}
                    </View>

                    {/* Rating & Author details */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.03)', paddingTop: 12 }}>
                        <Text
                            style={{ fontSize: 9, fontWeight: '900', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1, flex: 1, marginRight: 8 }}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.8}
                        >
                            {t('marketplace.created_by', { author: item.profiles?.id.slice(0, 8) || 'COMMUNITY' })}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
                            <Ionicons name="star" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                            <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF' }}>{item.rating || '5.0'}</Text>
                        </View>
                    </View>
                </GlassCard>
            </FadeInView>
        )
    }

    if (!loadingLevel && level < 2) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 20 }}>
                <EmptyStateCTA
                    iconName="lock"
                    title={t('marketplace.locked_title')}
                    description={t('marketplace.locked_desc')}
                    buttonText={t('marketplace.back_dashboard')}
                    onPress={() => router.replace('/(tabs)')}
                />
                <View style={{ marginTop: 24, backgroundColor: colors.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
                            {t('marketplace.progress_level', { level: 2 })}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>{xp} / 1000 XP</Text>
                    </View>
                    <AnimatedProgressBar
                        progress={Math.min(1, Math.max(0, xp / 1000))}
                        colors={colors.primaryGradient}
                    />
                </View>
            </View>
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

            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
                {/* Segment Controls */}
                <FadeInView delay={0} style={{ marginBottom: 18 }}>
                    <SegmentedControl
                        segments={[t('marketplace.newest_arrivals'), t('marketplace.top_rated')]}
                        selectedIndex={activeSortIndex}
                        onChange={handleSelectSegment}
                    />
                </FadeInView>

                {isLoading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={colors.primary} />
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
                                tintColor={colors.primary}
                                colors={[colors.primary]}
                            />
                        }
                        contentContainerStyle={{ paddingBottom: 80 }}
                        ListEmptyComponent={
                            <FadeInView delay={100} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 }}>
                                <Ionicons name="grid-outline" size={40} color={colors.textMuted} style={{ marginBottom: 12 }} />
                                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, textAlign: 'center' }}>
                                    {t('marketplace.empty_title')}
                                </Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center', lineHeight: 16 }}>
                                    {t('marketplace.empty_desc')}
                                </Text>
                            </FadeInView>
                        }
                    />
                )}
            </View>
        </View>
    )
}

