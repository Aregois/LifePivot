import React, { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { useWorkspaces, useJoinWorkspace, Workspace } from '../../hooks/useWorkspaces'
import { supabase } from '../../utils/supabase'
import { C, Gradients, Shadows } from '../../constants/theme'
import { FadeInView, GlassCard, SegmentedControl, AvatarMonogram, GlowBadge, PremiumButton, EmptyStateCTA, WorkspaceSkeletonList, AnimatedProgressBar } from '../../components/ui'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import { HapticsEngine } from '../../utils/HapticsEngine'

export default function WorkspacesIndex() {
    const router = useRouter()
    const { colors } = useTheme()
    const { t } = useLanguage()
    const { data, isLoading, refetch } = useWorkspaces()
    const { mutate: joinWorkspace, isPending: isJoining } = useJoinWorkspace()
    const [activeTabIndex, setActiveTabIndex] = useState(0) // 0: joined, 1: discover
    const [userRole, setUserRole] = useState<'student' | 'tutor'>('student')
    const [userLevel, setUserLevel] = useState(2)
    const [xp, setXp] = useState(0)
    const [loadingLevel, setLoadingLevel] = useState(true)

    // Fetch user profile details on mount
    React.useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                supabase
                    .from('profiles')
                    .select('role, level, xp')
                    .eq('id', user.id)
                    .single()
                    .then(({ data: profile }) => {
                        if (profile) {
                            setUserRole(profile.role as 'student' | 'tutor')
                            setUserLevel(profile.level ?? 1)
                            setXp(profile.xp ?? 0)
                        }
                        setLoadingLevel(false)
                    })
            } else {
                setLoadingLevel(false)
            }
        })
    }, [])

    const workspaces = data?.workspaces || []
    const joinedWorkspaces = workspaces.filter(ws => ws.isJoined)
    const discoverWorkspaces = workspaces.filter(ws => !ws.isJoined)
    const filteredWorkspaces = activeTabIndex === 0 ? joinedWorkspaces : discoverWorkspaces

    const handleJoin = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        joinWorkspace(id, {
            onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                router.push(`/workspaces/${id}`)
            },
            onError: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            }
        })
    }

    const renderWorkspaceItem = ({ item, index }: { item: Workspace; index: number }) => {
        const canEnter = item.isJoined || item.isCreator
        
        return (
            <FadeInView delay={index * 50}>
                <GlassCard style={{ padding: 18, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center', marginRight: 8 }}>
                            <AvatarMonogram
                                name={item.name}
                                size={40}
                                showRing={item.is_premium}
                                ringColor={C.amber}
                            />
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text
                                    style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' }}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.8}
                                >
                                    {item.name}
                                </Text>
                                <Text
                                    style={{ fontSize: 9, color: C.textDim, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.8}
                                >
                                    {item.isCreator ? t('workspaces.owned_by_you') : t('workspaces.creator', { creator: item.creator_id.slice(0, 8) })}
                                </Text>
                            </View>
                        </View>
                        {item.is_premium && (
                            <GlowBadge label={t('marketplace.tokens', { count: item.token_cost })} colorScheme="amber" glow />
                        )}
                    </View>

                    <View style={{ marginTop: 6 }}>
                        {canEnter ? (
                            <PremiumButton
                                title={t('workspaces.enter_hub')}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                    router.push(`/workspaces/${item.id}`)
                                }}
                                variant="ghost"
                                style={{ minHeight: 40 }}
                            />
                        ) : (
                            <PremiumButton
                                title={item.is_premium ? t('workspaces.join_for_tokens', { count: item.token_cost }) : t('workspaces.join_cohort')}
                                onPress={() => handleJoin(item.id)}
                                variant="primary"
                                disabled={isJoining}
                                loading={isJoining}
                                style={{ minHeight: 40 }}
                            />
                        )}
                    </View>
                </GlassCard>
            </FadeInView>
        )
    }

    if (!loadingLevel && userLevel < 2) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 20 }}>
                <EmptyStateCTA
                    iconName="lock"
                    title={t('workspaces.locked_title')}
                    description={t('workspaces.locked_desc')}
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
                {/* Segmented Tab Toggle */}
                <FadeInView delay={0} style={{ marginBottom: 18 }}>
                    <SegmentedControl
                        segments={[`${t('workspaces.tab_joined')} (${joinedWorkspaces.length})`, `${t('workspaces.tab_discover')} (${discoverWorkspaces.length})`]}
                        selectedIndex={activeTabIndex}
                        onChange={setActiveTabIndex}
                    />
                </FadeInView>

                {isLoading ? (
                    <WorkspaceSkeletonList />
                ) : (
                    <FlatList
                        data={filteredWorkspaces}
                        keyExtractor={item => item.id}
                        renderItem={renderWorkspaceItem}
                        removeClippedSubviews={true}
                        initialNumToRender={10}
                        windowSize={5}
                        maxToRenderPerBatch={10}
                        refreshControl={
                            <RefreshControl
                                refreshing={isLoading}
                                onRefresh={refetch}
                                tintColor="#00F0FF"
                                colors={['#00F0FF']}
                            />
                        }
                        contentContainerStyle={{ paddingBottom: 110 }}
                        ListEmptyComponent={
                            <EmptyStateCTA
                                iconName={activeTabIndex === 0 ? "users" : "compass"}
                                title={activeTabIndex === 0 ? t('workspaces.empty_joined_title') : t('workspaces.empty_discover_title')}
                                description={activeTabIndex === 0 
                                    ? t('workspaces.empty_joined_desc')
                                    : t('workspaces.empty_discover_desc')
                                }
                                buttonText={activeTabIndex === 0 
                                    ? t('workspaces.tab_discover') 
                                    : (userRole === 'tutor' ? t('workspaces.create_cohort') : undefined)
                                }
                                onPress={activeTabIndex === 0 
                                    ? () => setActiveTabIndex(1) 
                                    : (userRole === 'tutor' ? () => router.push('/workspaces/create') : undefined)
                                }
                            />
                        }
                    />
                )}
            </View>

            {/* Custom Glow Floating Action Button */}
            {userRole === 'tutor' && (
                <View
                    style={[
                        {
                            position: 'absolute',
                            right: 24,
                            bottom: Platform.OS === 'ios' ? 104 : 80,
                            borderRadius: 28,
                            width: 56,
                            height: 56,
                            overflow: 'hidden',
                            zIndex: 99,
                        },
                        Shadows.glow(C.electricBlue, 0.4),
                    ]}
                >
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                            router.push('/workspaces/create')
                        }}
                        activeOpacity={0.8}
                        style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
                    >
                        <LinearGradient
                            colors={[...Gradients.primaryButton]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        />
                        <Ionicons name="add" size={28} color="#050508" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    )
}
