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

export default function WorkspacesIndex() {
    const router = useRouter()
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
                                <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' }} numberOfLines={1}>
                                    {item.name}
                                </Text>
                                <Text style={{ fontSize: 9, color: C.textDim, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }}>
                                    {item.isCreator ? 'OWNED BY YOU' : `CREATOR: ${item.creator_id.slice(0, 8)}`}
                                </Text>
                            </View>
                        </View>
                        {item.is_premium && (
                            <GlowBadge label={`${item.token_cost} tokens`} colorScheme="amber" glow />
                        )}
                    </View>

                    <View style={{ marginTop: 6 }}>
                        {canEnter ? (
                            <PremiumButton
                                title="ENTER HUB"
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                    router.push(`/workspaces/${item.id}`)
                                }}
                                variant="ghost"
                                style={{ minHeight: 40 }}
                            />
                        ) : (
                            <PremiumButton
                                title={item.is_premium ? `JOIN FOR ${item.token_cost} TOKENS` : 'JOIN COHORT'}
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
            <View style={{ flex: 1, backgroundColor: '#050508', justifyContent: 'center', padding: 20 }}>
                <EmptyStateCTA
                    iconName="lock"
                    title="Cohorts Locked"
                    description="Reach Level 2 to join student cohorts, view leaderboards, and coordinate with study peers."
                    buttonText="BACK TO DASHBOARD"
                    onPress={() => router.replace('/(tabs)')}
                />
                <View style={{ marginTop: 24, backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Progress to Level 2</Text>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: C.electricBlue }}>{xp} / 1000 XP</Text>
                    </View>
                    <AnimatedProgressBar
                        progress={Math.min(1, Math.max(0, xp / 1000))}
                        colors={Gradients.xpBar}
                    />
                </View>
            </View>
        )
    }

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

            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
                {/* Segmented Tab Toggle */}
                <FadeInView delay={0} style={{ marginBottom: 18 }}>
                    <SegmentedControl
                        segments={[`MY COHORTS (${joinedWorkspaces.length})`, `DISCOVER (${discoverWorkspaces.length})`]}
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
                                title={activeTabIndex === 0 ? "No Cohorts Joined" : "No Cohorts Found"}
                                description={activeTabIndex === 0 
                                    ? "Join a study group to sync XP, view progress charts, and solve assigned tutor tasks."
                                    : "There are no public cohorts available to join right now."
                                }
                                buttonText={activeTabIndex === 0 
                                    ? "DISCOVER COHORTS" 
                                    : (userRole === 'tutor' ? "CREATE COHORT" : undefined)
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
