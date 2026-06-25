import React, { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { useWorkspaces, useJoinWorkspace, Workspace } from '../../hooks/useWorkspaces'
import { supabase } from '../../utils/supabase'
import { C, Gradients, Shadows } from '../../constants/theme'
import { FadeInView, GlassCard, SegmentedControl, AvatarMonogram, GlowBadge, PremiumButton } from '../../components/ui'

export default function WorkspacesIndex() {
    const router = useRouter()
    const { data, isLoading, refetch } = useWorkspaces()
    const { mutate: joinWorkspace, isPending: isJoining } = useJoinWorkspace()
    const [activeTabIndex, setActiveTabIndex] = useState(0) // 0: joined, 1: discover
    const [userRole, setUserRole] = useState<'student' | 'tutor'>('student')

    // Fetch user profile role on mount
    React.useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()
                    .then(({ data: profile }) => {
                        if (profile) setUserRole(profile.role as any)
                    })
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

    return (
        <View style={{ flex: 1, backgroundColor: '#050508' }}>
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
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#00F0FF" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredWorkspaces}
                        keyExtractor={item => item.id}
                        renderItem={renderWorkspaceItem}
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
                            <FadeInView delay={100} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
                                <Ionicons name="people-outline" size={48} color={C.inactive} />
                                <Text style={{ color: C.textDim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 12 }}>
                                    NO COHORTS FOUND
                                </Text>
                            </FadeInView>
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
