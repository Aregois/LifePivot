import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { HapticsEngine } from '../../utils/HapticsEngine';
import { storage as SecureStore } from '../../utils/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';
import { apiRequest } from '../../utils/api';
import {
  requestNotificationPermissions,
  scheduleDailyStudyReminder,
  cancelDailyStudyReminders,
} from '../../utils/notifications';
import { useTheme, AccentType } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  FadeInView,
  GlassCard,
  PremiumButton,
  GlowBadge,
  SegmentedControl,
  MetricCard,
  AnimatedProgressBar,
} from '../../components/ui';
import { ReactiveAvatarNative } from '../../components/ReactiveAvatarNative';
import { OnboardingTourModal } from '../../components/OnboardingTourModal';
import { WeeklyJourneyStrip } from '../../components/WeeklyJourneyStrip';
import { MasteryAchievementsCard } from '../../components/MasteryAchievementsCard';
import { VoidDayPlacementModal } from '../../components/VoidDayPlacementModal';
import {
  LocalizationSelectorModal,
  SupportedLocale,
  LANGUAGES,
} from '../../components/LocalizationSelectorModal';

type SegmentTab = 'MASTERY' | 'UTILITIES' | 'SETTINGS';
type PersonaType = 'feynman' | 'socrates' | 'stoic';

const getRankTitle = (lvl: number): string => {
  if (lvl >= 11) return '✦ TRANSCENDENT ✦';
  if (lvl >= 8) return '✦ GRANDMASTER ✦';
  if (lvl >= 5) return '✦ SAGE ✦';
  if (lvl >= 3) return '✦ SCHOLAR ✦';
  return '✦ ACOLYTE ✦';
};

const PERSONAS: { id: PersonaType; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'feynman', title: 'Richard Feynman', subtitle: 'Intuitive first-principles analogies', icon: 'bulb-outline' },
  { id: 'socrates', title: 'Socrates', subtitle: 'Probing inquiry & dialectic questions', icon: 'help-circle-outline' },
  { id: 'stoic', title: 'Marcus Aurelius', subtitle: 'Rigorous discipline & stoic focus', icon: 'shield-outline' },
];

const ACCENT_OPTIONS: { id: AccentType; name: string; color: string }[] = [
  { id: 'blue', name: 'Electric Blue', color: '#00F0FF' },
  { id: 'violet', name: 'Neon Purple', color: '#BD00FF' },
  { id: 'green', name: 'Zen Emerald', color: '#10B981' },
  { id: 'sunset', name: 'Sunset Amber', color: '#F59E0B' },
];

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { accent, setAccent, colors } = useTheme();
  const { locale: currentLocale, setLocale, t } = useLanguage();

  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Tab & Modal states
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0);
  const [tourVisible, setTourVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);

  // Persona & Notification preferences
  const [persona, setPersona] = useState<PersonaType>('feynman');
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(9);

  // Utilities state
  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [purchasingVoid, setPurchasingVoid] = useState(false);
  const [purchasingItem, setPurchasingItem] = useState<string | null>(null);

  // Mastery metrics computed from tasks
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [totalFocusMins, setTotalFocusMins] = useState(0);
  const [p5Completed, setP5Completed] = useState(0);
  const [hasReflection, setHasReflection] = useState(false);
  const [completedDates, setCompletedDates] = useState<string[]>([]);

  const fetchProfileAndStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');

        // 1. Fetch Profile
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (prof) {
          setProfile(prof);
          if (prof.persona_preference && ['feynman', 'socrates', 'stoic'].includes(prof.persona_preference)) {
            setPersona(prof.persona_preference as PersonaType);
          }
        }

        // 2. Fetch Tasks to compute stats
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id);

        if (tasks) {
          const completed = tasks.filter((t) => t.status === 'completed');
          setTotalCompleted(completed.length);
          setTotalFocusMins(completed.reduce((acc, t) => acc + (t.duration_mins ?? 30), 0));
          setP5Completed(completed.filter((t) => t.priority === 5).length);
          setHasReflection(completed.some((t) => t.reflection && t.reflection.length > 0));

          const dates = Array.from(new Set(completed.map((t) => t.due_date).filter(Boolean)));
          setCompletedDates(dates as string[]);
        }
      }

      const savedPersona = await SecureStore.getItemAsync('lifepivot_persona');
      if (savedPersona && ['feynman', 'socrates', 'stoic'].includes(savedPersona)) {
        setPersona(savedPersona as PersonaType);
      }
      const savedReminders = await SecureStore.getItemAsync('lifepivot_reminder_enabled');
      if (savedReminders) {
        setRemindersEnabled(savedReminders === 'true');
      }
      const savedHour = await SecureStore.getItemAsync('lifepivot_reminder_hour');
      if (savedHour) {
        setReminderHour(parseInt(savedHour, 10));
      }
    } catch (err) {
      console.warn('Error loading profile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileAndStats();
  }, [fetchProfileAndStats]);

  const onRefresh = useCallback(() => {
    fetchProfileAndStats(true);
  }, [fetchProfileAndStats]);

  const handleSelectLocale = async (newLoc: SupportedLocale) => {
    await setLocale(newLoc);
  };

  const handleSelectPersona = async (p: PersonaType) => {
    HapticsEngine.tier1.selection();
    setPersona(p);
    await SecureStore.setItemAsync('lifepivot_persona', p);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ persona_preference: p })
          .eq('id', user.id);
      }
    } catch (err) {
      console.warn('Failed to update persona preference:', err);
    }
  };

  const handleSelectAccent = async (a: AccentType) => {
    HapticsEngine.tier2.action();
    await setAccent(a);
  };

  const handleToggleReminder = async (enabled: boolean) => {
    HapticsEngine.tier1.selection();
    if (enabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'PERMISSIONS REQUIRED',
          'Please enable notifications in your iPhone Settings to receive daily study reminders.'
        );
        setRemindersEnabled(false);
        await SecureStore.setItemAsync('lifepivot_reminder_enabled', 'false');
        return;
      }
      setRemindersEnabled(true);
      await SecureStore.setItemAsync('lifepivot_reminder_enabled', 'true');
      try {
        await scheduleDailyStudyReminder(
          'LifePivot Daily Focus',
          1,
          totalCompleted > 0 ? 3 : 1,
          reminderHour,
          0
        );
      } catch {}
      HapticsEngine.tier3.success();
    } else {
      setRemindersEnabled(false);
      await SecureStore.setItemAsync('lifepivot_reminder_enabled', 'false');
      await cancelDailyStudyReminders();
      HapticsEngine.tier1.light();
    }
  };

  const handleSelectReminderHour = async (hour: number) => {
    HapticsEngine.tier1.selection();
    setReminderHour(hour);
    await SecureStore.setItemAsync('lifepivot_reminder_hour', hour.toString());
    if (remindersEnabled) {
      try {
        await scheduleDailyStudyReminder(
          'LifePivot Daily Focus',
          1,
          totalCompleted > 0 ? 3 : 1,
          hour,
          0
        );
      } catch {}
    }
  };

  /* ── In-App Utilities Handlers ── */
  const handleBuyShield = async () => {
    const tokens = profile?.tokens_balance ?? 0;
    const streakShields = profile?.streak_shields_count ?? 0;

    if (tokens < 15) {
      HapticsEngine.tier4.error();
      Alert.alert('INSUFFICIENT TOKENS', 'You need 15 tokens to purchase a Streak Shield.');
      return;
    }

    if (streakShields >= 2) {
      HapticsEngine.tier2.action();
      Alert.alert('SHIELDS FULL', 'You already have the maximum capacity of 2 Streak Shields equipped.');
      return;
    }

    HapticsEngine.tier2.action();
    Alert.alert(
      'EQUIP STREAK SHIELD',
      'Spend 15 tokens to equip a Streak Shield? It will automatically protect your study streak on your next missed day.',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'BUY (15 🪙)',
          onPress: async () => {
            setPurchasingItem('shield');
            try {
              const res = await apiRequest<{ success: boolean; message: string }>('/api/shop/purchase', {
                method: 'POST',
                body: JSON.stringify({ itemType: 'shield' }),
              });
              HapticsEngine.tier3.success();
              Alert.alert('SHIELD EQUIPPED', res.message || 'Streak Shield equipped successfully!');
              fetchProfileAndStats();
            } catch (err: any) {
              HapticsEngine.tier4.error();
              Alert.alert('PURCHASE FAILED', err.message || 'Could not equip Streak Shield. Please try again.');
            } finally {
              setPurchasingItem(null);
            }
          },
        },
      ]
    );
  };

  const handleBuyVoidDay = () => {
    const tokens = profile?.tokens_balance ?? 0;
    if (tokens < 10) {
      HapticsEngine.tier4.error();
      Alert.alert('INSUFFICIENT TOKENS', 'You need 10 tokens to schedule a Void Day.');
      return;
    }
    setVoidModalVisible(true);
  };

  const handleConfirmVoidPlacement = async (placement: 'tomorrow' | 'end') => {
    setPurchasingVoid(true);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/api/shop/purchase', {
        method: 'POST',
        body: JSON.stringify({ itemType: 'void', voidPlacement: placement }),
      });
      setVoidModalVisible(false);
      HapticsEngine.tier3.success();
      Alert.alert('VOID DAY SCHEDULED', res.message || 'Void Day successfully added to your schedule!');
      fetchProfileAndStats();
    } catch (err: any) {
      setVoidModalVisible(false);
      HapticsEngine.tier4.error();
      Alert.alert('ERROR', err.message || 'Failed to schedule Void Day');
    } finally {
      setPurchasingVoid(false);
    }
  };

  const handleBuyStreakRepair = async () => {
    const tokens = profile?.tokens_balance ?? 0;
    const currentStreak = profile?.current_streak ?? 0;
    const highStreak = profile?.high_streak ?? 0;

    if (tokens < 30) {
      HapticsEngine.tier4.error();
      Alert.alert('INSUFFICIENT TOKENS', 'You need 30 tokens to repair your streak.');
      return;
    }

    if (currentStreak > 0) {
      HapticsEngine.tier2.action();
      Alert.alert('STREAK ACTIVE', `Your current streak (${currentStreak} days) is active and does not need repair.`);
      return;
    }

    if (highStreak <= 0) {
      HapticsEngine.tier2.action();
      Alert.alert('NO STREAK RECORD', 'You do not have a previous high streak record to restore.');
      return;
    }

    HapticsEngine.tier2.action();
    Alert.alert(
      'REPAIR STREAK',
      `Spend 30 tokens to restore your broken streak to your record of ${highStreak} days?`,
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'REPAIR (30 🪙)',
          onPress: async () => {
            setPurchasingItem('repair');
            try {
              const res = await apiRequest<{ success: boolean; message: string }>('/api/shop/purchase', {
                method: 'POST',
                body: JSON.stringify({ itemType: 'repair' }),
              });
              HapticsEngine.tier3.success();
              Alert.alert('STREAK REPAIRED', res.message || `Streak restored to ${highStreak} days!`);
              fetchProfileAndStats();
            } catch (err: any) {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase
                  .from('profiles')
                  .update({
                    tokens_balance: tokens - 30,
                    current_streak: highStreak,
                  })
                  .eq('id', user.id);
                setProfile((prev: any) => ({
                  ...prev,
                  tokens_balance: tokens - 30,
                  current_streak: highStreak,
                }));
                HapticsEngine.tier3.success();
                Alert.alert('STREAK REPAIRED', `Streak restored to ${highStreak} days!`);
              }
            } finally {
              setPurchasingItem(null);
            }
          },
        },
      ]
    );
  };

  const handleBuyMultiplier = async () => {
    const tokens = profile?.tokens_balance ?? 0;
    const multiplierActive = profile?.multiplier_active ?? false;

    if (tokens < 15) {
      HapticsEngine.tier4.error();
      Alert.alert('INSUFFICIENT TOKENS', 'You need 15 tokens to activate a Focus Multiplier.');
      return;
    }

    if (multiplierActive) {
      HapticsEngine.tier2.action();
      Alert.alert('ALREADY ACTIVE', 'Focus Multiplier is already active for your next study session.');
      return;
    }

    HapticsEngine.tier2.action();
    Alert.alert(
      'ACTIVATE MULTIPLIER',
      'Spend 15 tokens to activate Focus Multiplier? Your next focus session and Socratic drill will grant double token and XP rewards.',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'ACTIVATE (15 🪙)',
          onPress: async () => {
            setPurchasingItem('multiplier');
            try {
              const res = await apiRequest<{ success: boolean; message: string }>('/api/shop/purchase', {
                method: 'POST',
                body: JSON.stringify({ itemType: 'multiplier' }),
              });
              HapticsEngine.tier3.success();
              Alert.alert('MULTIPLIER ACTIVE', res.message || 'Focus Multiplier activated for your next session!');
              fetchProfileAndStats();
            } catch (err: any) {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase
                  .from('profiles')
                  .update({
                    tokens_balance: tokens - 15,
                    multiplier_active: true,
                  })
                  .eq('id', user.id);
                setProfile((prev: any) => ({
                  ...prev,
                  tokens_balance: tokens - 15,
                  multiplier_active: true,
                }));
                HapticsEngine.tier3.success();
                Alert.alert('MULTIPLIER ACTIVE', 'Focus Multiplier activated for your next session!');
              }
            } finally {
              setPurchasingItem(null);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    HapticsEngine.tier2.action();
    Alert.alert(
      t('profile.logout') || 'SIGN OUT',
      'Are you sure you want to end your current session?',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'LOGOUT',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    HapticsEngine.tier4.warning();
    Alert.alert(
      'PERMANENT ACCOUNT DELETION',
      'Are you absolutely sure? This will permanently erase all your study plans, task history, streaks, XP, tokens, and account data. This action cannot be undone.',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'PERMANENTLY DELETE',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              HapticsEngine.tier4.error();
              await apiRequest('/api/profile/delete-account', {
                method: 'POST',
              });
              await SecureStore.deleteItemAsync('lifepivot_persona').catch(() => {});
              await supabase.auth.signOut();
              Alert.alert(
                'ACCOUNT ERASED',
                'Your account and all associated personal data have been completely deleted.',
                [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
              );
            } catch (err: any) {
              Alert.alert('DELETION FAILED', err?.message || 'Could not delete account. Please try again.');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !profile) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const xpNeeded = Math.max(100, level * 100);
  const xpProgress = Math.min(1, Math.max(0, xp) / xpNeeded);
  const currentStreak = profile?.current_streak ?? 0;
  const highStreak = profile?.high_streak ?? currentStreak;
  const tokens = profile?.tokens_balance ?? 0;
  const streakShields = profile?.streak_shields_count ?? 0;
  const multiplierActive = profile?.multiplier_active ?? false;
  const displayName = profile?.username || email.split('@')[0] || 'PATHSEEKER';
  const rankTitle = getRankTitle(level);

  const activeLangObj = LANGUAGES.find((l) => l.code === currentLocale) || LANGUAGES[0];
  const totalFocusHoursFormatted = (totalFocusMins / 60).toFixed(1);
  const dailyAvgMins = Math.round(totalFocusMins / Math.max(1, completedDates.length));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background Ambient Glows */}
      <View
        pointerEvents="none"
        style={[styles.ambientGlowTop, { backgroundColor: colors.primary }]}
      />
      <View
        pointerEvents="none"
        style={[styles.ambientGlowBottom, { backgroundColor: colors.secondary }]}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 84 : 88 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ================================================================= */}
        {/* 1. HERO IDENTITY CARD                                             */}
        {/* ================================================================= */}
        <FadeInView delay={0}>
          <LinearGradient
            colors={colors.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { borderColor: colors.glassBorder }]}
          >
            {/* Header row: User Avatar + Rank & Info */}
            <View style={styles.heroRow}>
              <View style={[styles.avatarWrapper, { borderColor: colors.glassBorderSpecular || colors.primary }]}>
                <ReactiveAvatarNative
                  size={68}
                  level={level}
                  streak={currentStreak}
                />
              </View>

              <View style={styles.heroDetails}>
                <View style={styles.roleBadgeRow}>
                  <Text style={[styles.roleBadge, { color: colors.primary }]}>
                    {profile?.is_subscribed ? 'PRO ARCHITECT' : 'PATHSEEKER'}
                  </Text>
                  {profile?.is_subscribed && (
                    <GlowBadge label="PRO ARCHITECT" colorScheme="violet" />
                  )}
                </View>

                <Text style={styles.userName} numberOfLines={1}>
                  {displayName}
                </Text>

                <Text style={[styles.rankTitleText, { color: colors.secondary }]}>
                  {rankTitle}
                </Text>
              </View>
            </View>

            {/* XP Progress Bar toward next rank */}
            <View style={styles.xpSection}>
              <View style={styles.xpTextRow}>
                <Text style={styles.xpLabel}>
                  {t('profile.xp_needed', { level: level + 1 }) || `PROGRESS TO LEVEL ${level + 1}`}
                </Text>
                <Text style={[styles.xpValue, { color: colors.primary }]}>{xp} / {xpNeeded} XP</Text>
              </View>
              <AnimatedProgressBar
                progress={xpProgress}
                colors={colors.primaryGradient}
              />
            </View>
          </LinearGradient>
        </FadeInView>

        {/* ================================================================= */}
        {/* 2. STATS OVERVIEW CARDS                                           */}
        {/* ================================================================= */}
        <FadeInView delay={50} style={styles.metricsRow}>
          <MetricCard
            icon="🪙"
            label={t('hud.gems') || 'TOKENS'}
            value={tokens}
            accentColor={colors.amber}
          />
          <MetricCard
            icon="🔥"
            label={t('hud.streak') || 'STREAK'}
            value={`${currentStreak} D`}
            accentColor={colors.orange}
          />
          <MetricCard
            icon="🛡️"
            label={t('profile.lives') || 'SHIELDS'}
            value={streakShields}
            accentColor={colors.primary}
          />
        </FadeInView>

        {/* ================================================================= */}
        {/* 3. SEGMENTED NAVIGATION CONTROLLER                                */}
        {/* ================================================================= */}
        <FadeInView delay={80} style={styles.segmentedContainer}>
          <SegmentedControl
            options={[
              t('profile.stats') || 'MASTERY',
              t('profile.utilities') || 'UTILITIES',
              t('profile.settings') || 'SETTINGS',
            ]}
            selectedIndex={activeSegmentIndex}
            onChange={(idx) => {
              HapticsEngine.tier1.selection();
              setActiveSegmentIndex(idx);
            }}
          />
        </FadeInView>

        {/* ================================================================= */}
        {/* 4. TAB 1: MASTERY & COGNITIVE ANALYTICS (Apple Fitness Style)     */}
        {/* ================================================================= */}
        {activeSegmentIndex === 0 && (
          <FadeInView delay={100}>
            {/* Apple Fitness-grade study metrics */}
            <View style={styles.analyticsGrid}>
              <GlassCard style={styles.analyticsCard}>
                <Text style={styles.analyticsCardLabel}>TOTAL FOCUS</Text>
                <Text style={[styles.analyticsCardValue, { color: colors.primary }]}>
                  {totalFocusHoursFormatted} <Text style={styles.analyticsCardUnit}>hrs</Text>
                </Text>
                <Text style={styles.analyticsCardSub}>Across all deep study sprints</Text>
              </GlassCard>

              <GlassCard style={styles.analyticsCard}>
                <Text style={styles.analyticsCardLabel}>DAILY AVERAGE</Text>
                <Text style={[styles.analyticsCardValue, { color: colors.secondary }]}>
                  {dailyAvgMins} <Text style={styles.analyticsCardUnit}>min/d</Text>
                </Text>
                <Text style={styles.analyticsCardSub}>On active study days</Text>
              </GlassCard>

              <GlassCard style={styles.analyticsCard}>
                <Text style={styles.analyticsCardLabel}>TASKS SECURED</Text>
                <Text style={[styles.analyticsCardValue, { color: colors.emerald }]}>
                  {totalCompleted}
                </Text>
                <Text style={styles.analyticsCardSub}>Curriculum items finished</Text>
              </GlassCard>

              <GlassCard style={styles.analyticsCard}>
                <Text style={styles.analyticsCardLabel}>DEEP FOCUS P5</Text>
                <Text style={[styles.analyticsCardValue, { color: colors.amber }]}>
                  {p5Completed}
                </Text>
                <Text style={styles.analyticsCardSub}>High-priority cognitive blocks</Text>
              </GlassCard>
            </View>

            {/* Weekly Journey Strip */}
            <WeeklyJourneyStrip
              completedDates={completedDates}
              currentStreak={currentStreak}
            />

            {/* Achievements Showcase with Claim System */}
            <MasteryAchievementsCard
              totalCompleted={totalCompleted}
              hasReflection={hasReflection}
              p5Completed={p5Completed}
              currentStreak={currentStreak}
              profile={profile}
              onProfileUpdate={(updatedProfile: any) => {
                setProfile(updatedProfile);
              }}
            />
          </FadeInView>
        )}

        {/* ================================================================= */}
        {/* 5. TAB 2: IN-APP UTILITIES & STORE                                */}
        {/* ================================================================= */}
        {activeSegmentIndex === 1 && (
          <FadeInView delay={100}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>SYLLABUS RESILIENCE & BOOSTS</Text>
            </View>

            <View style={styles.utilitiesList}>
              {/* Utility 1: Streak Shield (15 tokens) */}
              <GlassCard style={styles.utilityCard}>
                <View style={styles.utilityHeader}>
                  <View style={styles.utilityIconBox}>
                    <Text style={{ fontSize: 24 }}>🛡️</Text>
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={styles.utilityTitleRow}>
                      <Text style={styles.utilityName}>{t('shop.items.shield.title') || 'STREAK SHIELD'}</Text>
                      {streakShields >= 2 && <GlowBadge label="MAX (2/2)" colorScheme="violet" />}
                    </View>
                    <Text style={styles.utilityDesc}>
                      {t('shop.items.shield.desc') || 'Automatically absorbs 1 missed study day and safeguards your active streak. Maximum 2 equipped.'}
                    </Text>
                  </View>
                  <GlowBadge label="15 🪙" colorScheme="amber" />
                </View>

                <PremiumButton
                  title={
                    purchasingItem === 'shield'
                      ? 'EQUIPPING...'
                      : streakShields >= 2
                      ? 'SHIELDS AT CAPACITY (2/2)'
                      : `${t('shop.items.shield.title') || 'EQUIP SHIELD'} (15 🪙)`
                  }
                  onPress={handleBuyShield}
                  disabled={streakShields >= 2 || purchasingItem === 'shield'}
                  variant={streakShields >= 2 ? 'ghost' : 'primary'}
                  style={{ minHeight: 42, marginTop: 12 }}
                />
              </GlassCard>

              {/* Utility 2: Void Day (10 tokens) */}
              <GlassCard style={styles.utilityCard}>
                <View style={styles.utilityHeader}>
                  <View style={styles.utilityIconBox}>
                    <Text style={{ fontSize: 24 }}>🌌</Text>
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.utilityName}>{t('shop.items.void.title') || 'VOID DAY (REST)'}</Text>
                    <Text style={styles.utilityDesc}>
                      {t('shop.items.void.desc') || 'Injects an intentional rest day tomorrow or at plan completion. Shifts syllabus without streak penalty.'}
                    </Text>
                  </View>
                  <GlowBadge label="10 🪙" colorScheme="amber" />
                </View>

                <PremiumButton
                  title={
                    purchasingVoid
                      ? 'CONFIGURING...'
                      : `${t('shop.items.void.title') || 'SCHEDULE VOID DAY'} (10 🪙)`
                  }
                  onPress={handleBuyVoidDay}
                  disabled={purchasingVoid}
                  variant="primary"
                  style={{ minHeight: 42, marginTop: 12 }}
                />
              </GlassCard>

              {/* Utility 3: Streak Repair (30 tokens) */}
              <GlassCard style={styles.utilityCard}>
                <View style={styles.utilityHeader}>
                  <View style={styles.utilityIconBox}>
                    <Text style={{ fontSize: 24 }}>⚡</Text>
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={styles.utilityTitleRow}>
                      <Text style={styles.utilityName}>{t('shop.items.repair.title') || 'STREAK REPAIR'}</Text>
                      {currentStreak === 0 && highStreak > 0 && (
                        <GlowBadge label="REPAIRABLE" colorScheme="rose" glow />
                      )}
                    </View>
                    <Text style={styles.utilityDesc}>
                      {t('shop.items.repair.desc') || `Restores your broken streak back to your high streak (${highStreak} days) after an unexpected disruption.`}
                    </Text>
                  </View>
                  <GlowBadge label="30 🪙" colorScheme="amber" />
                </View>

                <PremiumButton
                  title={
                    purchasingItem === 'repair'
                      ? 'REPAIRING...'
                      : currentStreak > 0
                      ? 'STREAK ACTIVE'
                      : highStreak === 0
                      ? 'NO HIGH STREAK TO RESTORE'
                      : `${t('shop.items.repair.title') || 'REPAIR STREAK'} (${highStreak} D)`
                  }
                  onPress={handleBuyStreakRepair}
                  disabled={currentStreak > 0 || highStreak === 0 || purchasingItem === 'repair'}
                  variant={currentStreak === 0 && highStreak > 0 ? 'primary' : 'ghost'}
                  style={{ minHeight: 42, marginTop: 12 }}
                />
              </GlassCard>

              {/* Utility 4: Focus Multiplier (15 tokens) */}
              <GlassCard style={styles.utilityCard}>
                <View style={styles.utilityHeader}>
                  <View style={styles.utilityIconBox}>
                    <Text style={{ fontSize: 24 }}>✨</Text>
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={styles.utilityTitleRow}>
                      <Text style={styles.utilityName}>{t('shop.items.multiplier.title') || 'FOCUS MULTIPLIER'}</Text>
                      {multiplierActive && <GlowBadge label="ACTIVE" colorScheme="cyan" glow />}
                    </View>
                    <Text style={styles.utilityDesc}>
                      {t('shop.items.multiplier.desc') || 'Doubles both token and XP payouts for your next completed focus session and Socratic verification.'}
                    </Text>
                  </View>
                  <GlowBadge label="15 🪙" colorScheme="amber" />
                </View>

                <PremiumButton
                  title={
                    purchasingItem === 'multiplier'
                      ? 'ACTIVATING...'
                      : multiplierActive
                      ? 'MULTIPLIER ALREADY ACTIVE'
                      : `${t('shop.items.multiplier.title') || 'ACTIVATE 2X BOOST'} (15 🪙)`
                  }
                  onPress={handleBuyMultiplier}
                  disabled={multiplierActive || purchasingItem === 'multiplier'}
                  variant={multiplierActive ? 'ghost' : 'primary'}
                  style={{ minHeight: 42, marginTop: 12 }}
                />
              </GlassCard>
            </View>
          </FadeInView>
        )}

        {/* ================================================================= */}
        {/* 6. TAB 3: SETTINGS & ACCOUNT PREFERENCES                          */}
        {/* ================================================================= */}
        {activeSegmentIndex === 2 && (
          <FadeInView delay={100}>
            {/* Language Selector Trigger */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('profile.language') || 'INTERFACE LANGUAGE'}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                HapticsEngine.tier1.light();
                setLangModalVisible(true);
              }}
            >
              <GlassCard style={[styles.languageTriggerCard, { borderColor: colors.glassBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>{activeLangObj.flag}</Text>
                  <View>
                    <Text style={styles.langNameText}>{activeLangObj.nativeName}</Text>
                    <Text style={styles.langCodeText}>{activeLangObj.name} ({activeLangObj.code.toUpperCase()})</Text>
                  </View>
                </View>
                <View style={styles.langChangeBtn}>
                  <Text style={[styles.langChangeText, { color: colors.primary }]}>{t('common.change') || 'CHANGE'}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </View>
              </GlassCard>
            </TouchableOpacity>

            {/* Socratic Persona Preference Selector */}
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Text style={styles.sectionTitle}>{t('profile.tutor_persona') || 'SOCRATIC AI TUTOR PERSONA'}</Text>
            </View>
            <View style={styles.personaList}>
              {PERSONAS.map((item) => {
                const isSelected = persona === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={() => handleSelectPersona(item.id)}
                    style={[
                      styles.personaCard,
                      isSelected && {
                        borderColor: colors.primary,
                        backgroundColor: `${colors.primary}12`,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View
                        style={[
                          styles.personaIconBox,
                          isSelected && { backgroundColor: `${colors.primary}25` },
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={18}
                          color={isSelected ? colors.primary : colors.textSecondary}
                        />
                      </View>
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={[styles.personaTitle, isSelected && { color: '#FFFFFF' }]}>
                          {item.title}
                        </Text>
                        <Text style={styles.personaSubtitle}>{item.subtitle}</Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Theme Accent Selector */}
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Text style={styles.sectionTitle}>{t('profile.theme_accent') || 'THEME ACCENT'}</Text>
            </View>
            <GlassCard style={styles.accentGridCard}>
              <View style={styles.accentsRow}>
                {ACCENT_OPTIONS.map((item) => {
                  const isSelected = accent === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.7}
                      onPress={() => handleSelectAccent(item.id)}
                      style={[
                        styles.accentBtn,
                        isSelected && { borderColor: item.color, backgroundColor: `${item.color}1A` },
                      ]}
                    >
                      <View style={[styles.accentDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.accentLabel, isSelected && { color: '#FFFFFF', fontWeight: '900' }]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </GlassCard>

            {/* Daily Study Notifications */}
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Text style={styles.sectionTitle}>DAILY STUDY NOTIFICATIONS</Text>
            </View>
            <GlassCard style={styles.notificationsCard}>
              <View style={styles.notificationsToggleRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.notificationsToggleTitle}>DAILY STUDY ALERTS</Text>
                  <Text style={styles.notificationsToggleSubtitle}>
                    Receive a repeating daily nudge on your iPhone with your active curriculum tasks.
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleToggleReminder(!remindersEnabled)}
                  style={[
                    styles.toggleSwitch,
                    remindersEnabled && { backgroundColor: colors.primary },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      remindersEnabled && styles.toggleKnobActive,
                    ]}
                  />
                </TouchableOpacity>
              </View>

              {remindersEnabled && (
                <View style={styles.reminderHoursRow}>
                  <Text style={styles.reminderHoursLabel}>REMINDER TIME</Text>
                  <View style={styles.hoursChipsGrid}>
                    {[8, 9, 12, 18, 20].map((h) => {
                      const isSelected = reminderHour === h;
                      const label = h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`;
                      return (
                        <TouchableOpacity
                          key={h}
                          activeOpacity={0.7}
                          onPress={() => handleSelectReminderHour(h)}
                          style={[
                            styles.hourChip,
                            isSelected && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` },
                          ]}
                        >
                          <Text
                            style={[
                              styles.hourChipText,
                              isSelected && { color: colors.primary, fontWeight: '900' },
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </GlassCard>

            {/* Replay App Tour */}
            <View style={{ marginTop: 20 }}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  HapticsEngine.tier1.light();
                  setTourVisible(true);
                }}
                style={styles.tourButton}
              >
                <Ionicons name="compass-outline" size={20} color={colors.primary} />
                <Text style={[styles.tourButtonText, { color: colors.primary }]}>REPLAY ONBOARDING TOUR</Text>
              </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <View style={{ marginTop: 16, marginBottom: 16 }}>
              <PremiumButton
                title={t('profile.logout') || 'SIGN OUT'}
                onPress={handleLogout}
                variant="destructive"
              />
            </View>

            {/* Account Deletion / Danger Zone (Apple Guideline 5.1.1(v)) */}
            <View style={{ marginBottom: 36 }}>
              <GlassCard style={styles.dangerZoneCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons name="warning" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.dangerZoneTitle}>DANGER ZONE</Text>
                </View>
                <Text style={styles.dangerZoneDesc}>
                  Permanently delete your account and erase all study curriculums, streaks, and personal data. This cannot be undone.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleDeleteAccount}
                  style={styles.deleteAccountBtn}
                  disabled={updating}
                >
                  <Ionicons name="trash-outline" size={15} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.deleteAccountBtnText}>DELETE ACCOUNT & ERASE DATA</Text>
                </TouchableOpacity>
              </GlassCard>
            </View>
          </FadeInView>
        )}
      </ScrollView>

      {/* Localization Selector Modal */}
      <LocalizationSelectorModal
        visible={langModalVisible}
        currentLocale={currentLocale}
        onSelectLocale={handleSelectLocale}
        onClose={() => setLangModalVisible(false)}
      />

      {/* Onboarding Tour Modal */}
      <OnboardingTourModal
        visible={tourVisible}
        onClose={() => setTourVisible(false)}
        onStartPlan={() => {
          setTourVisible(false);
          router.push('/plan/create');
        }}
      />

      {/* Void Day Placement Modal */}
      <VoidDayPlacementModal
        visible={voidModalVisible}
        onClose={() => setVoidModalVisible(false)}
        onConfirm={handleConfirmVoidPlacement}
        loading={purchasingVoid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050508',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050508',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.08,
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: 40,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.05,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  heroDetails: {
    marginLeft: 16,
    flex: 1,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  userName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  rankTitleText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  xpSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  xpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  xpLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8A92A6',
    letterSpacing: 1.2,
  },
  xpValue: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  segmentedContainer: {
    marginBottom: 20,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  analyticsCard: {
    width: '48%',
    padding: 14,
  },
  analyticsCardLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#8A92A6',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  analyticsCardValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  analyticsCardUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A92A6',
  },
  analyticsCardSub: {
    fontSize: 10,
    color: '#8A92A6',
    marginTop: 4,
    lineHeight: 14,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#8A92A6',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  utilitiesList: {
    gap: 12,
    marginBottom: 24,
  },
  utilityCard: {
    padding: 16,
  },
  utilityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  utilityIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  utilityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  utilityName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  utilityDesc: {
    fontSize: 11,
    color: '#8A92A6',
    lineHeight: 16,
  },
  languageTriggerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  langNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  langCodeText: {
    fontSize: 11,
    color: '#8A92A6',
    marginTop: 2,
  },
  langChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  langChangeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  personaList: {
    gap: 8,
  },
  personaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  personaIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D1D5DB',
  },
  personaSubtitle: {
    fontSize: 10,
    color: '#8A92A6',
    marginTop: 2,
  },
  accentGridCard: {
    padding: 14,
  },
  accentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  accentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  accentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A92A6',
  },
  tourButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tourButtonText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  notificationsCard: {
    padding: 16,
    borderRadius: 18,
  },
  notificationsToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationsToggleTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  notificationsToggleSubtitle: {
    fontSize: 11,
    color: '#8A92A6',
    lineHeight: 15,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  reminderHoursRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  reminderHoursLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A92A6',
    letterSpacing: 1,
    marginBottom: 8,
  },
  hoursChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hourChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  hourChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A92A6',
  },
  dangerZoneCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  dangerZoneTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 1.5,
  },
  dangerZoneDesc: {
    fontSize: 11,
    color: '#8A92A6',
    lineHeight: 16,
    marginBottom: 14,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  deleteAccountBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 1,
  },
});
