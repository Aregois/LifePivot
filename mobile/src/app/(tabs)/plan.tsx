import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticsEngine } from '../../utils/HapticsEngine';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage, translateGoalsArray } from '../../context/LanguageContext';
import { FadeInView, GlassCard, GradientText, GlowBadge, PremiumButton, EmptyStateCTA, PlanSkeletonList } from '../../components/ui';
import { supabase } from '../../utils/supabase';

export default function PlanPortal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { t, locale } = useLanguage();
    const [activePlans, setActivePlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userLevel, setUserLevel] = useState<number>(1);
    const [isSubscribed, setIsSubscribed] = useState(false);

    const translatedPlans = useMemo(() => translateGoalsArray(activePlans, locale), [activePlans, locale]);

    const fetchActivePlans = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from('learning_goals')
                    .select('id, title, duration_days, created_at')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });
                if (data) {
                    setActivePlans(data);
                }

                // Fetch level and subscription status to handle progressive lock checks
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('level, is_subscribed')
                    .eq('id', user.id)
                    .single();
                if (profile) {
                    setUserLevel(profile.level);
                    setIsSubscribed(!!profile.is_subscribed);
                }
            }
        } catch (e) {
            console.error('Error fetching plans:', e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchActivePlans();
        }, [])
    );

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

            <ScrollView
                className="flex-1 px-5 pt-5"
                contentContainerStyle={{
                    paddingBottom: Platform.OS === 'ios' ? insets.bottom + 84 : 88,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header intro */}
                <FadeInView delay={0} style={{ marginBottom: 20 }}>
                    <Text
                        style={{
                            fontSize: 10,
                            color: colors.primary,
                            fontWeight: '900',
                            letterSpacing: 3.5,
                            textTransform: 'uppercase',
                            marginBottom: 4,
                        }}
                    >
                        {t('nav.plan') || 'LEARNING PORTAL'}
                    </Text>
                    <GradientText
                        colors={colors.primaryGradient}
                        style={{
                            fontSize: 24,
                            fontWeight: '900',
                            letterSpacing: -0.5,
                            textTransform: 'uppercase',
                        }}
                    >
                        {t('creator.title') || 'SYLLABUS CORE'}
                    </GradientText>
                </FadeInView>

            {/* CREATE PLAN CTA — ALWAYS VISIBLE */}
            <FadeInView delay={50} style={{ marginBottom: 12 }}>
                <PremiumButton
                    title={t('creator.button_generate') || 'CREATE NEW PLAN +'}
                    onPress={() => router.push('/plan/create')}
                    variant="primary"
                />
            </FadeInView>

            {/* Pro Curriculum Builder — secondary entry point */}
            <FadeInView delay={80} style={{ marginBottom: 20 }}>
                <TouchableOpacity
                    onPress={() => router.push('/plan/pro-curriculum')}
                    activeOpacity={0.8}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        paddingVertical: 12,
                        paddingHorizontal: 20,
                        borderRadius: 20,
                        backgroundColor: `${colors.secondary}15`,
                        borderWidth: 1,
                        borderColor: `${colors.secondary}30`,
                    }}
                >
                    <Ionicons name="school-outline" size={15} color={colors.secondary} style={{ opacity: 0.9 }} />
                    <Text style={{
                        fontSize: 11,
                        fontWeight: '900',
                        color: colors.secondary,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                    }}>
                        🎓 {t('pro_curriculum.title') || 'Professional Curriculum Builder'}
                    </Text>
                </TouchableOpacity>
            </FadeInView>

            {/* Cohorts & Marketplace Shortcuts */}
            <FadeInView delay={100} style={{ marginBottom: 14 }}>
                <GlassCard
                    onPress={() => router.push('/workspaces')}
                    style={{
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderColor: colors.glassBorder,
                    }}
                >
                    <View style={{ marginRight: 16, backgroundColor: `${colors.primary}15`, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: `${colors.primary}30` }}>
                        <Ionicons name="people" size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 }}>
                            {t('nav.cohorts') || 'Study Cohorts'}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, letterSpacing: -0.1, lineHeight: 16 }}>
                            {t('workspaces.subtitle') || 'Join student groups, sync XP, and solve tutor tasks'}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                </GlassCard>
            </FadeInView>

            <FadeInView delay={150} style={{ marginBottom: 20 }}>
                <GlassCard
                    onPress={() => router.push('/marketplace')}
                    style={{
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderColor: colors.glassBorder,
                    }}
                >
                    <View style={{ marginRight: 16, backgroundColor: `${colors.secondary}15`, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: `${colors.secondary}30` }}>
                        <Ionicons name="grid" size={22} color={colors.secondary} />
                    </View>
                    <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 }}>
                            {t('nav.marketplace') || 'Plan Marketplace'}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, letterSpacing: -0.1, lineHeight: 16 }}>
                            {t('marketplace.empty_desc') || 'Browse, buy, and import community chosen study schemas'}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
                </GlassCard>
            </FadeInView>

            {/* Active Plans Section */}
            <FadeInView delay={200} style={{ marginBottom: 60 }}>
                <Text
                    style={{
                        fontSize: 10,
                        color: colors.primary,
                        fontWeight: '900',
                        letterSpacing: 3.5,
                        textTransform: 'uppercase',
                        marginBottom: 12,
                    }}
                >
                    {t('dashboard.focus_session') || 'ACTIVE PERSONAL PLANS'}
                </Text>

                {loading ? (
                    <PlanSkeletonList />
                ) : activePlans.length === 0 ? (
                    <EmptyStateCTA
                        iconName="calendar"
                        title={t('plan.no_focus_sessions') || 'No Active Plans Yet'}
                        description={t('plan.interactive_roadmap') || 'Formulate an AI-driven learning curriculum directly matching your goal to begin tracking.'}
                        buttonText={t('creator.button_generate') || 'CREATE A PLAN'}
                        onPress={() => router.push('/plan/create')}
                    />
                ) : (
                    <View style={{ gap: 12 }}>
                        {translatedPlans.map((plan, index) => {
                            const isPlanLocked = !isSubscribed && index > 0;
                            const createdDateStr = plan.created_at ? plan.created_at.split('T')[0] : '';
                            return (
                                <GlassCard
                                    key={plan.id}
                                    onPress={() => {
                                        if (isPlanLocked) {
                                            Alert.alert(
                                                "Unlock Unlimited Plans",
                                                "Upgrade to Solo Power to unlock all learning plans.",
                                                [
                                                    { text: "View Upgrades", onPress: () => router.push('/profile') },
                                                    { text: "Cancel", style: "cancel" }
                                                ]
                                            );
                                            return;
                                        }
                                        router.push({ pathname: '/plan/[id]', params: { id: plan.id } });
                                    }}
                                    style={{
                                        padding: 18,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        opacity: isPlanLocked ? 0.55 : 1,
                                        borderColor: colors.glassBorder,
                                    }}
                                >
                                    <View style={{ flex: 1, marginRight: 12 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' }} numberOfLines={1}>
                                            {plan.title}
                                        </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                                            <GlowBadge label={`${plan.duration_days} ${t('plan.day_count', { day: '' }).trim() || 'DAYS'}`} colorScheme="blue" />
                                            {isPlanLocked ? (
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                                                    <Ionicons name="lock-closed" size={10} color={colors.secondary} />
                                                    <Text style={{ fontSize: 9, color: colors.secondary, marginLeft: 4, fontWeight: 'bold' }}>
                                                        PRO REQUIRED
                                                    </Text>
                                                </View>
                                            ) : (
                                                <Text style={{ fontSize: 9, color: colors.textMuted, marginLeft: 8 }}>
                                                    {t('plan.started_date', { date: createdDateStr }) || `STARTED ${createdDateStr}`}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                                </GlassCard>
                            );
                        })}
                    </View>
                )}
            </FadeInView>
            </ScrollView>
        </View>
    );
}
