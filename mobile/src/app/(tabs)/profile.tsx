import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../../utils/supabase'
import { apiRequest } from '../../utils/api'
import { C, Gradients, Shadows } from '../../constants/theme'
import { FadeInView, GlassCard, PremiumButton, GlowBadge, AvatarMonogram } from '../../components/ui'

export default function Profile() {
    const router = useRouter()
    const [profile, setProfile] = useState<any>(null)
    const [email, setEmail] = useState('')
    const [linkedinUrl, setLinkedinUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [linkedinFocused, setLinkedinFocused] = useState(false)

    const fetchProfile = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            setEmail(user.email || '')
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()
            if (data) {
                setProfile(data)
                setLinkedinUrl(data.linkedin_url || '')
            }
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchProfile()
    }, [])

    const handleRoleToggle = async () => {
        if (!profile) return
        const nextRole = profile.role === 'student' ? 'tutor' : 'student'

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        setUpdating(true)
        try {
            const json = await apiRequest('/api/profile/role', {
                method: 'POST',
                body: JSON.stringify({
                    role: nextRole,
                    linkedinUrl: nextRole === 'tutor' ? linkedinUrl : '',
                }),
            })

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            Alert.alert('SUCCESS', `Your role has been updated to ${nextRole.toUpperCase()}`)
            setProfile(json.profile)
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert('ERROR', err.message || 'Verification failed')
        } finally {
            setUpdating(false)
        }
    }

    const handleLogout = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        await supabase.auth.signOut()
        router.replace('/(auth)/login')
    }

    if (loading && !profile) {
        return (
            <View className="flex-1 justify-center items-center bg-[#050508]">
                <ActivityIndicator size="large" color="#00F0FF" />
            </View>
        )
    }

    const initials = profile?.username ? profile.username : email.split('@')[0] || 'LP'

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
            {/* Avatar Header */}
            <FadeInView delay={0} style={{ alignItems: 'center', marginBottom: 28 }}>
                <AvatarMonogram
                    name={initials}
                    size={72}
                    showRing={profile?.is_subscribed}
                    ringColor={C.neonViolet}
                />
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFFFFF', marginTop: 12, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    {profile?.username || email.split('@')[0]}
                </Text>
                <View style={{ marginTop: 6 }}>
                    <GlowBadge label={`LVL ${profile?.level || 1}`} colorScheme="blue" glow />
                </View>
            </FadeInView>

            {/* Subscription status */}
            <FadeInView delay={100} style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 10, color: C.neonViolet, fontWeight: '900', letterSpacing: 3.5, textTransform: 'uppercase', marginBottom: 8 }}>
                    TIER STATE
                </Text>
                {profile?.is_subscribed ? (
                    <GlassCard style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
                        <LinearGradient
                            colors={['rgba(189, 0, 255, 0.08)', 'rgba(26, 31, 54, 0.1)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={{ textTransform: 'uppercase', fontWeight: '900', color: '#FFFFFF', fontSize: 13, letterSpacing: 1 }}>
                                    SOLO POWER SUBSCRIPTION ACTIVE
                                </Text>
                                <Text style={{ fontSize: 9, color: C.neonViolet, fontWeight: '900', textTransform: 'uppercase', marginTop: 4, letterSpacing: 1 }}>
                                    UNLIMITED CURRICULUM UNLOCKED
                                </Text>
                            </View>
                            <GlowBadge label="POWER" colorScheme="violet" glow />
                        </View>
                    </GlassCard>
                ) : (
                    <GlassCard
                        onPress={() => router.push('/modal/subscribe')}
                        style={{ padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={{ fontWeight: '800', color: C.textDim, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                                STANDARD TIER (1 ACTIVE GOAL)
                            </Text>
                            <Text style={{ fontSize: 10, color: C.electricBlue, fontWeight: '900', textTransform: 'uppercase', marginTop: 4, letterSpacing: 1 }}>
                                UPGRADE TO POWER TIER
                            </Text>
                        </View>
                        <GlowBadge label="FREE" colorScheme="emerald" />
                    </GlassCard>
                )}
            </FadeInView>

            {/* Profile specifications */}
            <FadeInView delay={200} style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 10, color: C.electricBlue, fontWeight: '900', letterSpacing: 3.5, textTransform: 'uppercase', marginBottom: 8 }}>
                    IDENTITY
                </Text>
                <GlassCard style={{ padding: 18 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <Text style={{ fontSize: 10, color: C.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 }}>EMAIL</Text>
                        <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '800' }}>{email}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)', paddingTop: 14 }}>
                        <Text style={{ fontSize: 10, color: C.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 }}>CURRENT ROLE</Text>
                        <GlowBadge label={profile?.role || 'student'} colorScheme={profile?.role === 'tutor' ? 'violet' : 'blue'} />
                    </View>
                </GlassCard>
            </FadeInView>

            {/* Role Manager */}
            <FadeInView delay={300} style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 10, color: C.neonViolet, fontWeight: '900', letterSpacing: 3.5, textTransform: 'uppercase', marginBottom: 8 }}>
                    TUTOR SETTINGS
                </Text>
                <GlassCard style={{ padding: 20 }}>
                    {profile?.role === 'student' ? (
                        <View>
                            <Text style={{ fontSize: 10, color: C.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, lineHeight: 14, marginBottom: 12 }}>
                                INPUT LINKEDIN TO REQUEST VERIFIED TUTOR STATUS
                            </Text>
                            <TextInput
                                value={linkedinUrl}
                                onChangeText={setLinkedinUrl}
                                placeholder="https://linkedin.com/in/username"
                                placeholderTextColor={C.placeholder}
                                onFocus={() => setLinkedinFocused(true)}
                                onBlur={() => setLinkedinFocused(false)}
                                style={{
                                    backgroundColor: 'rgba(5, 5, 8, 0.6)',
                                    borderWidth: 1,
                                    borderColor: linkedinFocused ? C.electricBlue : C.glassBorder,
                                    borderRadius: 12,
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    color: '#FFFFFF',
                                    fontWeight: '600',
                                    fontSize: 12,
                                    marginBottom: 16,
                                }}
                            />
                            <PremiumButton
                                title="BECOME COHORT TUTOR"
                                onPress={handleRoleToggle}
                                variant="primary"
                                loading={updating}
                                disabled={updating}
                            />
                        </View>
                    ) : (
                        <View>
                            <Text style={{ fontSize: 10, color: C.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, lineHeight: 14, marginBottom: 16 }}>
                                YOU ARE RUNNING IN TUTOR MODE. YOU CAN NOW CREATE WORKSPACES & INJECT STUDY PLANS.
                            </Text>
                            <PremiumButton
                                title="TOGGLE BACK TO STUDENT"
                                onPress={handleRoleToggle}
                                variant="destructive"
                                loading={updating}
                                disabled={updating}
                            />
                        </View>
                    )}
                </GlassCard>
            </FadeInView>

            {/* Logout */}
            <FadeInView delay={400} style={{ marginBottom: 40 }}>
                <PremiumButton
                    title="LOGOUT"
                    onPress={handleLogout}
                    variant="destructive"
                />
            </FadeInView>
            </ScrollView>
        </View>
    )
}
