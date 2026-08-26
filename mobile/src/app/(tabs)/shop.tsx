import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HapticsEngine } from '../../utils/HapticsEngine';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';
import { apiRequest } from '../../utils/api';
import { C, Gradients } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  FadeInView,
  GlassCard,
  PremiumButton,
  GlowBadge,
  AnimatedProgressBar,
  GradientText,
} from '../../components/ui';
import { VoidDayPlacementModal } from '../../components/VoidDayPlacementModal';
import { StudyTipCarouselModal } from '../../components/StudyTipCarouselModal';

function getRankTitle(level: number): string {
  if (level >= 11) return 'GRANDMASTER';
  if (level >= 8) return 'SAGE';
  if (level >= 5) return 'SCHOLAR';
  if (level >= 3) return 'ACOLYTE';
  return 'PATHSEEKER';
}

export default function ShopScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useLanguage();

  // User & Wallet State
  const [tokens, setTokens] = useState(0);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [streakShields, setStreakShields] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [highStreak, setHighStreak] = useState(0);
  const [multiplierActive, setMultiplierActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Rewarded Ad State
  const [adModalVisible, setAdModalVisible] = useState(false);
  const [currentSessionToken, setCurrentSessionToken] = useState<string | null>(null);
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const [earnError, setEarnError] = useState<string | null>(null);
  const [earnSuccess, setEarnSuccess] = useState(false);
  const [loadingAdSession, setLoadingAdSession] = useState(false);

  // Void Day Modal State
  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [purchasingVoid, setPurchasingVoid] = useState(false);

  // Utility purchasing loader
  const [purchasingItem, setPurchasingItem] = useState<string | null>(null);

  /* ── 1. Fetch Profile Data ─────────────────────────────────────────────── */

  const fetchProfileData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select(
            'tokens_balance, level, xp, streak_shields_count, current_streak, high_streak, multiplier_active, last_ad_reward_at'
          )
          .eq('id', user.id)
          .single();

        if (data) {
          setTokens(data.tokens_balance ?? 0);
          setLevel(data.level ?? 1);
          setXp(data.xp ?? 0);
          setStreakShields(data.streak_shields_count ?? 0);
          setCurrentStreak(data.current_streak ?? 0);
          setHighStreak(data.high_streak ?? 0);
          setMultiplierActive(data.multiplier_active ?? false);

          if (data.last_ad_reward_at) {
            const lastReward = new Date(data.last_ad_reward_at).getTime();
            const elapsed = Date.now() - lastReward;
            const sixtyMinutes = 60 * 60 * 1000;
            if (elapsed < sixtyMinutes) {
              setCooldownSecs(Math.ceil((sixtyMinutes - elapsed) / 1000));
            } else {
              setCooldownSecs(0);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error loading shop profile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfileData();
  };

  /* ── 2. Cooldown Timer Countdown ───────────────────────────────────────── */

  useEffect(() => {
    if (cooldownSecs <= 0) return;
    const timer = setTimeout(() => {
      setCooldownSecs((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownSecs]);

  const formatCooldown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  /* ── 3. Rewarded Ad Handling ───────────────────────────────────────────── */

  const handleStartAd = async () => {
    if (cooldownSecs > 0 || loadingAdSession) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoadingAdSession(true);
    setEarnError(null);

    try {
      // 1. Request signed ad session token
      const sessionJson = await apiRequest<{ sessionToken: string; cooldownRemaining?: number }>(
        '/api/tokens/ad-session',
        { method: 'POST' }
      );

      setCurrentSessionToken(sessionJson.sessionToken);
      setLoadingAdSession(false);
      setAdModalVisible(true);
    } catch (err: any) {
      console.error('Ad session request error:', err);
      if (err.message?.includes('cooldown') || err.message?.includes('429')) {
        setCooldownSecs(3600);
      } else {
        setEarnError(err.message || 'Failed to start ad session');
        setTimeout(() => setEarnError(null), 3000);
      }
      setLoadingAdSession(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleCompleteAdReward = async () => {
    if (!currentSessionToken) return;

    try {
      const rewardJson = await apiRequest<{ newTokensBalance: number; rewardedAmount: number }>(
        '/api/tokens/reward',
        {
          method: 'POST',
          body: JSON.stringify({ sessionToken: currentSessionToken }),
        }
      );

      setTokens(rewardJson.newTokensBalance ?? tokens + 5);
      setCooldownSecs(3600);
      setEarnSuccess(true);
      setAdModalVisible(false);
      setCurrentSessionToken(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setEarnSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error claiming ad reward:', err);
      setAdModalVisible(false);
      setCurrentSessionToken(null);
      setEarnError(err.message || 'Failed to redeem reward');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => setEarnError(null), 3000);
    }
  };

  /* ── 4. Utility Purchases ─────────────────────────────────────────────── */

  // a. Streak Shield (15 tokens, cap 2)
  const handleBuyShield = async () => {
    if (tokens < 15) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('INSUFFICIENT TOKENS', 'You need 15 tokens to purchase a Streak Shield.');
      return;
    }

    if (streakShields >= 2) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('SHIELDS FULL', 'You already have the maximum capacity of 2 Streak Shields equipped.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('SHIELD EQUIPPED', res.message || 'Streak Shield equipped successfully!');
              fetchProfileData();
            } catch (err: any) {
              // Client fallback
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase
                  .from('profiles')
                  .update({
                    tokens_balance: tokens - 15,
                    streak_shields_count: streakShields + 1,
                  })
                  .eq('id', user.id);
                setTokens(tokens - 15);
                setStreakShields(streakShields + 1);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('SHIELD EQUIPPED', 'Streak Shield successfully activated!');
              }
            } finally {
              setPurchasingItem(null);
            }
          },
        },
      ]
    );
  };

  // b. Void Day (10 tokens, opens placement modal)
  const handleBuyVoidDay = () => {
    if (tokens < 10) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('VOID DAY SCHEDULED', res.message || 'Void Day successfully added to your schedule!');
      fetchProfileData();
    } catch (err: any) {
      setVoidModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('ERROR', err.message || 'Failed to schedule Void Day');
    } finally {
      setPurchasingVoid(false);
    }
  };

  // c. Streak Repair (30 tokens, restores broken streak)
  const handleBuyStreakRepair = async () => {
    if (tokens < 30) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('INSUFFICIENT TOKENS', 'You need 30 tokens to repair your streak.');
      return;
    }

    if (currentStreak > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('STREAK ACTIVE', `Your current streak (${currentStreak} days) is active and does not need repair.`);
      return;
    }

    if (highStreak <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('NO STREAK RECORD', 'You do not have a previous high streak record to restore.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('STREAK REPAIRED', res.message || `Streak restored to ${highStreak} days!`);
              fetchProfileData();
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
                setTokens(tokens - 30);
                setCurrentStreak(highStreak);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  // d. Focus Multiplier (15 tokens, doubles rewards for next session)
  const handleBuyMultiplier = async () => {
    if (tokens < 15) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('INSUFFICIENT TOKENS', 'You need 15 tokens to activate a Focus Multiplier.');
      return;
    }

    if (multiplierActive) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('ALREADY ACTIVE', 'Focus Multiplier is already active for your next study session.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('MULTIPLIER ACTIVE', res.message || 'Focus Multiplier activated for your next session!');
              fetchProfileData();
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
                setTokens(tokens - 15);
                setMultiplierActive(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  const isLocked = level < 2;
  const xpRequirement = Math.max(100, level * 100);
  const xpProgress = Math.min(1, Math.max(0, xp) / xpRequirement);
  const rankTitle = getRankTitle(level);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background Ambient Glows */}
      <View
        pointerEvents="none"
        style={[styles.topGlow, { backgroundColor: colors.primary, opacity: 0.05 }]}
      />
      <View
        pointerEvents="none"
        style={[styles.bottomGlow, { backgroundColor: colors.secondary, opacity: 0.04 }]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 84 : 88 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* 1. Wallet & Rank HUD Display */}
        <FadeInView delay={0}>
          <GlassCard elevated style={[styles.hudCard, { borderColor: colors.glassBorder }]}>
            <View style={styles.hudHeaderRow}>
              <View>
                <Text style={[styles.hudSubtitle, { color: colors.primary }]}>{t('shop.exchange') || 'EXCHANGE VAULT'}</Text>
                <Text style={styles.hudTitle}>{t('shop.wallet') || 'PATH TOKENS'}</Text>
              </View>
              <GlowBadge
                label={`✦ ${rankTitle} ✦`}
                colorScheme={level >= 5 ? 'violet' : level >= 3 ? 'cyan' : 'amber'}
                glow
              />
            </View>

            <View style={styles.hudBalanceRow}>
              <View style={styles.balanceGroup}>
                <Text style={styles.tokenAmount}>{tokens}</Text>
                <GlowBadge label={`${t('hud.gems') || 'TOKENS'} 🪙`} colorScheme="amber" />
              </View>

              <View style={styles.statsGroup}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>{t('hud.level') || 'LEVEL'}</Text>
                  <Text style={styles.statValue}>{level}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>{t('profile.lives') || 'SHIELDS'}</Text>
                  <Text style={styles.statValue}>{streakShields}/2 🛡️</Text>
                </View>
                {multiplierActive && (
                  <>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>BUFF</Text>
                      <Text style={[styles.statValue, { color: colors.primary }]}>2X ⚡</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </GlassCard>
        </FadeInView>

        {/* 2. Level 2 Lock Gate Card (if level < 2) */}
        {isLocked && (
          <FadeInView delay={60} style={{ marginTop: 16 }}>
            <GlassCard elevated style={[styles.lockGateCard, { borderColor: colors.glassBorder }]}>
              <View style={styles.lockHeader}>
                <View style={[styles.lockIconCircle, { backgroundColor: `${colors.amber}20` }]}>
                  <Ionicons name="lock-closed" size={24} color={colors.amber} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lockTitle}>{t('socratic.milestone_checkpoint') || 'LEVEL 2 CHECKPOINT REQUIRED'}</Text>
                  <Text style={styles.lockSubtitle}>
                    {t('socratic.intro_desc') ||
                      `Reach Level 2 (${xpRequirement} XP) to unlock item transactions and utility purchases.`}
                  </Text>
                </View>
              </View>

              {/* XP Progress towards Level 2 */}
              <View style={styles.xpProgressContainer}>
                <View style={styles.xpTextRow}>
                  <Text style={styles.xpProgressLabel}>{t('profile.xp_needed', { level: 2 }) || 'PROGRESS TO LEVEL 2'}</Text>
                  <Text style={[styles.xpProgressValue, { color: colors.primary }]}>{xp} / {xpRequirement} XP</Text>
                </View>
                <AnimatedProgressBar progress={xpProgress} height={8} colors={colors.primaryGradient} />
              </View>

              <PremiumButton
                title={t('plan.learning_map') || 'EARN XP IN PLAN PORTAL'}
                onPress={() => router.push('/(tabs)/calendar')}
                variant="primary"
                style={{ marginTop: 16 }}
              />
            </GlassCard>
          </FadeInView>
        )}

        {/* 3. Rewarded Ad Token Earner */}
        <FadeInView delay={100} style={{ marginTop: 20 }}>
          <GlassCard style={[styles.adCard, { borderColor: colors.glassBorder }]}>
            <View style={styles.adHeaderRow}>
              <View style={styles.adIconWrapper}>
                <Text style={{ fontSize: 26 }}>🎬</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.adTitle}>{t('profile.claim_reward') || 'EARN FREE TOKENS'}</Text>
                <Text style={styles.adSubtitle}>
                  WATCH A 15-SECOND STUDY INSIGHT · EARN 5 TOKENS
                </Text>
              </View>
              <GlowBadge label="+5 🪙" colorScheme="amber" glow />
            </View>

            {earnSuccess && (
              <View style={styles.adSuccessNotice}>
                <Ionicons name="checkmark-circle" size={16} color={colors.emerald} />
                <Text style={[styles.adSuccessText, { color: colors.emerald }]}>+5 TOKENS CREDITED TO YOUR WALLET!</Text>
              </View>
            )}

            {earnError && (
              <View style={styles.adErrorNotice}>
                <Ionicons name="alert-circle" size={16} color={colors.rose} />
                <Text style={[styles.adErrorText, { color: colors.rose }]}>{earnError}</Text>
              </View>
            )}

            {cooldownSecs > 0 && !earnSuccess && (
              <Text style={styles.cooldownText}>
                ⏱ NEXT AD READY IN {formatCooldown(cooldownSecs)}
              </Text>
            )}

            <PremiumButton
              title={
                loadingAdSession
                  ? 'PREPARING AD SESSION...'
                  : cooldownSecs > 0
                  ? `COOLDOWN — ${formatCooldown(cooldownSecs)}`
                  : '▶  WATCH INSIGHT (+5 TOKENS)'
              }
              onPress={handleStartAd}
              disabled={cooldownSecs > 0 || loadingAdSession}
              variant={cooldownSecs > 0 || loadingAdSession ? 'ghost' : 'primary'}
              style={{ minHeight: 46, marginTop: 12 }}
            />
          </GlassCard>
        </FadeInView>

        {/* 4. In-App Utilities Catalog */}
        <FadeInView delay={140} style={{ marginTop: 28, marginBottom: 12 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('shop.exchange') || 'SYLLABUS UTILITIES'}</Text>
            <Text style={styles.sectionSubtitle}>ACTIVE BOOSTS & RESILIENCE</Text>
          </View>
        </FadeInView>

        <View style={styles.utilitiesList}>
          {/* Utility 1: Streak Shield (15 tokens) */}
          <FadeInView delay={180}>
            <GlassCard style={[styles.utilityCard, { borderColor: colors.glassBorder }]}>
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
                    {t('shop.items.shield.desc') || 'Protects your active study streak automatically if you miss a calendar day. Hard cap of 2.'}
                  </Text>
                </View>
                <GlowBadge label="15 🪙" colorScheme="amber" />
              </View>

              <PremiumButton
                title={
                  purchasingItem === 'shield'
                    ? 'EQUIPPING...'
                    : streakShields >= 2
                    ? 'SHIELDS AT CAPACITY'
                    : isLocked
                    ? 'LOCKED (LEVEL 2)'
                    : `${t('shop.items.shield.title') || 'EQUIP SHIELD'} (15 🪙)`
                }
                onPress={handleBuyShield}
                disabled={isLocked || streakShields >= 2 || purchasingItem === 'shield'}
                variant={streakShields >= 2 || isLocked ? 'ghost' : 'primary'}
                style={{ minHeight: 42, marginTop: 12 }}
              />
            </GlassCard>
          </FadeInView>

          {/* Utility 2: Void Day (10 tokens) */}
          <FadeInView delay={220}>
            <GlassCard style={[styles.utilityCard, { borderColor: colors.glassBorder }]}>
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
                    : isLocked
                    ? 'LOCKED (LEVEL 2)'
                    : `${t('shop.items.void.title') || 'SCHEDULE VOID DAY'} (10 🪙)`
                }
                onPress={handleBuyVoidDay}
                disabled={isLocked || purchasingVoid}
                variant={isLocked ? 'ghost' : 'primary'}
                style={{ minHeight: 42, marginTop: 12 }}
              />
            </GlassCard>
          </FadeInView>

          {/* Utility 3: Streak Repair (30 tokens) */}
          <FadeInView delay={260}>
            <GlassCard style={[styles.utilityCard, { borderColor: colors.glassBorder }]}>
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
                    : isLocked
                    ? 'LOCKED (LEVEL 2)'
                    : currentStreak > 0
                    ? 'STREAK ACTIVE'
                    : highStreak === 0
                    ? 'NO HIGH STREAK TO RESTORE'
                    : `${t('shop.items.repair.title') || 'REPAIR STREAK'} (${highStreak} D)`
                }
                onPress={handleBuyStreakRepair}
                disabled={isLocked || currentStreak > 0 || highStreak === 0 || purchasingItem === 'repair'}
                variant={currentStreak === 0 && highStreak > 0 && !isLocked ? 'primary' : 'ghost'}
                style={{ minHeight: 42, marginTop: 12 }}
              />
            </GlassCard>
          </FadeInView>

          {/* Utility 4: Focus Multiplier (15 tokens) */}
          <FadeInView delay={300}>
            <GlassCard style={[styles.utilityCard, { borderColor: colors.glassBorder }]}>
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
                    : isLocked
                    ? 'LOCKED (LEVEL 2)'
                    : `${t('shop.items.multiplier.title') || 'ACTIVATE 2X BOOST'} (15 🪙)`
                }
                onPress={handleBuyMultiplier}
                disabled={isLocked || multiplierActive || purchasingItem === 'multiplier'}
                variant={multiplierActive || isLocked ? 'ghost' : 'primary'}
                style={{ minHeight: 42, marginTop: 12 }}
              />
            </GlassCard>
          </FadeInView>
        </View>
      </ScrollView>

      {/* Void Day Placement Modal */}
      <VoidDayPlacementModal
        visible={voidModalVisible}
        onClose={() => setVoidModalVisible(false)}
        onConfirm={handleConfirmVoidPlacement}
        loading={purchasingVoid}
      />

      {/* Rewarded Ad 15s Study Tip Carousel Modal */}
      <StudyTipCarouselModal
        visible={adModalVisible}
        onClose={() => {
          setAdModalVisible(false);
          setCurrentSessionToken(null);
        }}
        onComplete={handleCompleteAdReward}
        rewardAmount={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050508',
  },
  topGlow: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#00F0FF',
    opacity: 0.05,
  },
  bottomGlow: {
    position: 'absolute',
    bottom: 100,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#BD00FF',
    opacity: 0.05,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 48,
  },
  hudCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
  },
  hudHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  hudSubtitle: {
    fontSize: 9,
    fontWeight: '900',
    color: C.electricBlue,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  hudTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  hudBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tokenAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: -1,
  },
  statsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: C.textDim,
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 10,
  },
  lockGateCard: {
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    backgroundColor: 'rgba(245, 158, 11, 0.03)',
  },
  lockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  lockIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  lockTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  lockSubtitle: {
    fontSize: 10,
    color: C.textDim,
    lineHeight: 14,
    marginTop: 2,
  },
  xpProgressContainer: {
    gap: 6,
  },
  xpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpProgressLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: C.textDim,
    letterSpacing: 1,
  },
  xpProgressValue: {
    fontSize: 9,
    fontWeight: '900',
    color: C.amber,
  },
  adCard: {
    padding: 18,
    borderRadius: 20,
  },
  adHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 240, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.12)',
  },
  adTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: C.electricBlue,
    letterSpacing: 0.5,
  },
  adSubtitle: {
    fontSize: 9,
    color: C.textDim,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  adSuccessNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    justifyContent: 'center',
  },
  adSuccessText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.emerald,
    letterSpacing: 0.5,
  },
  adErrorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    justifyContent: 'center',
  },
  adErrorText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.rose,
  },
  cooldownText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.amber,
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: C.electricBlue,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: C.textDim,
    letterSpacing: 1,
  },
  utilitiesList: {
    gap: 14,
  },
  utilityCard: {
    padding: 18,
    borderRadius: 20,
  },
  utilityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  utilityIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  utilityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  utilityName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  utilityDesc: {
    fontSize: 11,
    color: C.textDim,
    lineHeight: 16,
    marginTop: 4,
  },
});
