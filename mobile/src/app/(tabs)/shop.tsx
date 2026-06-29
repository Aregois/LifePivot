import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { supabase } from '../../utils/supabase'
import { apiRequest } from '../../utils/api'
import { C, Gradients, Shadows } from '../../constants/theme'
import { FadeInView, GlassCard, PremiumButton, GlowBadge, EmptyStateCTA, AnimatedProgressBar } from '../../components/ui'

export default function Shop() {
    const router = useRouter()
    const [tokens, setTokens] = useState(0)
    const [level, setLevel] = useState(2)
    const [xp, setXp] = useState(0)
    const [loading, setLoading] = useState(false)
    const [adPlaying, setAdPlaying] = useState(false)
    const [adCountdown, setAdCountdown] = useState(15)
    const [cooldownSecs, setCooldownSecs] = useState(0)
    const [earnError, setEarnError] = useState<string | null>(null)
    const [earnSuccess, setEarnSuccess] = useState(false)
    const [loadingSession, setLoadingSession] = useState(false)

    const fetchTokens = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('tokens_balance, last_ad_reward_at, level, xp')
                .eq('id', user.id)
                .single()
            if (data) {
                setTokens(data.tokens_balance)
                setLevel(data.level ?? 1)
                setXp(data.xp ?? 0)
                if (data.last_ad_reward_at) {
                    const lastReward = new Date(data.last_ad_reward_at).getTime()
                    const elapsed = Date.now() - lastReward
                    const sixtyMinutes = 60 * 60 * 1000
                    if (elapsed < sixtyMinutes) {
                        setCooldownSecs(Math.ceil((sixtyMinutes - elapsed) / 1000))
                    }
                }
            }
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchTokens()
    }, [])

    // React-safe countdown timer for ad reward cooldown
    useEffect(() => {
        if (cooldownSecs <= 0) return
        const timer = setTimeout(() => {
            setCooldownSecs(prev => Math.max(0, prev - 1))
        }, 1000)
        return () => clearTimeout(timer)
    }, [cooldownSecs])

    const handleBuyItem = (name: string, cost: number) => {
        if (tokens < cost) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert('INSUFFICIENT TOKENS', `You need ${cost} tokens to purchase ${name}.`)
            return
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        Alert.alert(
            'CONFIRM PURCHASE',
            `Spend ${cost} tokens on ${name}?`,
            [
                { text: 'CANCEL', style: 'cancel' },
                {
                    text: 'BUY',
                    onPress: async () => {
                        const { data: { user } } = await supabase.auth.getUser()
                        if (user) {
                            const { error } = await supabase
                                .from('profiles')
                                .update({ tokens_balance: tokens - cost })
                                .eq('id', user.id)

                            if (error) {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                                Alert.alert('ERROR', 'Purchase failed')
                            } else {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                                Alert.alert('SUCCESS', `${name} purchased!`)
                                setTokens(tokens - cost)
                            }
                        }
                    }
                }
            ]
        )
    }

    const handleEarnTokens = async () => {
        if (cooldownSecs > 0 || adPlaying || loadingSession) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
            return
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        setLoadingSession(true)
        setEarnError(null)

        try {
            // 1. Get signed ad session token
            let sessionToken: string
            try {
                const sessionJson = await apiRequest<{ sessionToken: string }>(
                    '/api/tokens/ad-session',
                    { method: 'POST' }
                )
                sessionToken = sessionJson.sessionToken
            } catch (err: any) {
                // apiRequest throws with the server's error message;
                // the backend embeds cooldownRemaining in the error payload
                // when returning 429, so surface it to the user.
                if (err.message?.includes('cooldown') || err.message?.includes('429')) {
                    setCooldownSecs(3600)
                } else {
                    throw err
                }
                setLoadingSession(false)
                return
            }

            // 2. Play ad (15 s countdown)
            setLoadingSession(false)
            setAdPlaying(true)
            setAdCountdown(15)

            let remaining = 15
            const intervalId = setInterval(async () => {
                remaining -= 1
                setAdCountdown(remaining)

                if (remaining <= 0) {
                    clearInterval(intervalId)

                    // 3. Redeem reward
                    try {
                        const rewardJson = await apiRequest<{ newTokensBalance: number }>(
                            '/api/tokens/reward',
                            {
                                method: 'POST',
                                body: JSON.stringify({ sessionToken }),
                            }
                        )
                        setAdPlaying(false)
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                        setEarnSuccess(true)
                        setTokens(rewardJson.newTokensBalance ?? tokens + 5)
                        setCooldownSecs(3600)
                        setTimeout(() => setEarnSuccess(false), 3000)
                    } catch (err: any) {
                        setAdPlaying(false)
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                        setEarnError(err.message || 'Failed to collect reward')
                        setTimeout(() => setEarnError(null), 3000)
                    }
                }
            }, 1000)

        } catch (err: any) {
            console.error('Error starting ad session:', err)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            setEarnError(err.message || 'Failed to initialize ad')
            setLoadingSession(false)
            setTimeout(() => setEarnError(null), 3000)
        }
    }

    const formatCooldown = (secs: number) => {
        const m = Math.floor(secs / 60)
        const s = secs % 60
        return m > 0 ? `${m}m ${s}s` : `${s}s`
    }

    if (!loading && level < 2) {
        return (
            <View style={{ flex: 1, backgroundColor: '#050508', justifyContent: 'center', padding: 20 }}>
                <EmptyStateCTA
                    iconName="lock"
                    title="Exchange Store Locked"
                    description="Reach Level 2 to unlock the Exchange Store and purchase items with your study tokens."
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

            <ScrollView className="flex-1 px-5 pt-5">
                {/* Wallet HUD Display */}
                <FadeInView delay={0} style={{ marginBottom: 24 }}>
                    <GlassCard
                        style={{
                            padding: 20,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <View>
                            <Text
                                style={{
                                    fontSize: 10,
                                    color: C.electricBlue,
                                    fontWeight: '900',
                                    letterSpacing: 3.5, // tracking-widest
                                    textTransform: 'uppercase',
                                }}
                            >
                                YOUR EXCHANGE WALLET
                            </Text>
                        <Text
                            style={{
                                fontSize: 11,
                                color: C.textSecondary,
                                marginTop: 4,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                            }}
                        >
                            SPEND PATH TOKENS HERE
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#F59E0B', marginRight: 8 }}>
                            {tokens}
                        </Text>
                        <GlowBadge label="TOKENS" colorScheme="amber" glow />
                    </View>
                </GlassCard>
            </FadeInView>

            {/* Earn Tokens via Ad */}
            <FadeInView delay={80} style={{ marginBottom: 20 }}>
                <GlassCard style={{ padding: 18 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                        <Text style={{ fontSize: 22 }}>🎬</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontWeight: '900', color: C.electricBlue, letterSpacing: -0.5, textTransform: 'uppercase' }}>EARN FREE TOKENS</Text>
                            <Text style={{ fontSize: 9, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>WATCH A SHORT AD · EARN 5 TOKENS</Text>
                        </View>
                        <GlowBadge label="+5 🪙" colorScheme="amber" />
                    </View>

                    {earnSuccess === true ? (
                        <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>✅ +5 TOKENS ADDED TO YOUR WALLET!</Text>
                    ) : null}
                    {earnError !== null && earnError !== '' ? (
                        <Text style={{ fontSize: 10, color: '#F43F5E', fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>{earnError}</Text>
                    ) : null}
                    {cooldownSecs > 0 ? (
                        <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>⏱ NEXT AD AVAILABLE IN {formatCooldown(cooldownSecs)}</Text>
                    ) : null}

                    <PremiumButton
                        title={
                            loadingSession 
                                ? 'INITIALIZING AD...' 
                                : cooldownSecs > 0 
                                ? `COOLDOWN — ${formatCooldown(cooldownSecs)}` 
                                : '▶  WATCH AD FOR 5 TOKENS'
                        }
                        onPress={handleEarnTokens}
                        variant={cooldownSecs > 0 || loadingSession ? 'ghost' : 'primary'}
                        disabled={cooldownSecs > 0 || loadingSession}
                        style={{ minHeight: 44 }}
                    />
                </GlassCard>
            </FadeInView>

            {/* Shop items */}
            <FadeInView delay={100} style={{ marginBottom: 12 }}>
                <Text
                    style={{
                        fontSize: 10,
                        color: C.electricBlue,
                        fontWeight: '900',
                        letterSpacing: 3.5, // tracking-widest
                        textTransform: 'uppercase',
                    }}
                >
                    AVAILABLE CUSTOMIZATIONS
                </Text>
            </FadeInView>

            <View style={{ gap: 12, marginBottom: 32 }}>
                <FadeInView delay={150}>
                    <GlassCard style={{ padding: 18 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, textTransform: 'uppercase' }}>
                                    STREAK SHIELD 🛡️
                                </Text>
                                <Text style={{ fontSize: 10, color: C.textSecondary, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 14 }}>
                                    PROTECTS YOUR STUDY STREAK ON MISSED DAYS
                                </Text>
                            </View>
                            <GlowBadge label="30 TOKENS" colorScheme="amber" />
                        </View>
                        <PremiumButton
                            title="PURCHASE SHIELD"
                            onPress={() => handleBuyItem('Streak Shield', 30)}
                            variant="ghost"
                            style={{ minHeight: 40 }}
                        />
                    </GlassCard>
                </FadeInView>

                <FadeInView delay={250}>
                    <GlassCard style={{ padding: 18 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1, textTransform: 'uppercase' }}>
                                    COSMIC PROFILE BORDER ✨
                                </Text>
                                <Text style={{ fontSize: 10, color: C.textSecondary, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 14 }}>
                                    EXCLUSIVE SPACE THEMED AVATAR RING
                                </Text>
                            </View>
                            <GlowBadge label="100 TOKENS" colorScheme="amber" />
                        </View>
                        <PremiumButton
                            title="PURCHASE BORDER"
                            onPress={() => handleBuyItem('Cosmic Profile Border', 100)}
                            variant="ghost"
                            style={{ minHeight: 40 }}
                        />
                    </GlassCard>
                </FadeInView>
            </View>
        </ScrollView>

            {/* Ad Playing Modal */}
            <Modal visible={adPlaying} transparent animationType="fade">
                <View style={{
                    flex: 1, backgroundColor: 'rgba(0,0,0,0.9)',
                    justifyContent: 'center', alignItems: 'center'
                }}>
                    <GlassCard style={{ padding: 40, alignItems: 'center', width: '80%' }}>
                        <Text style={{ fontSize: 36, marginBottom: 16 }}>🎬</Text>
                        <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>AD PLAYING</Text>
                        <Text style={{ fontSize: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 24 }}>SUPPORT LIFEPIVOT · EARN 5 TOKENS</Text>
                        {/* Countdown ring */}
                        <View style={{
                            width: 64, height: 64, borderRadius: 32,
                            borderWidth: 3, borderColor: C.electricBlue,
                            justifyContent: 'center', alignItems: 'center',
                            shadowColor: C.electricBlue, shadowOpacity: 0.4, shadowRadius: 12
                        }}>
                            <Text style={{ fontSize: 24, fontWeight: '900', color: C.electricBlue }}>{adCountdown}</Text>
                        </View>
                    </GlassCard>
                </View>
            </Modal>
        </View>
    )
}
