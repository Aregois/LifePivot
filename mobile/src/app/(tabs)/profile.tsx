import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
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
import {
  LocalizationSelectorModal,
  SupportedLocale,
  LANGUAGES,
} from '../../components/LocalizationSelectorModal';

type SegmentTab = 'MASTERY' | 'SETTINGS' | 'COSMETICS';
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

const AVATAR_FRAMES = [
  { id: 'frame_standard', name: 'Standard Steel', color: 'rgba(255, 255, 255, 0.2)' },
  { id: 'frame_cyan', name: 'Obsidian Neon', color: '#00F0FF' },
  { id: 'frame_violet', name: 'Cyber Violet', color: '#BD00FF' },
  { id: 'frame_gold', name: 'Solar Gold', color: '#F59E0B' },
];

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { accent, setAccent, colors } = useTheme();
  const { locale: currentLocale, setLocale, t } = useLanguage();

  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [linkedinFocused, setLinkedinFocused] = useState(false);

  // Tab & Modal states
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0);
  const [tourVisible, setTourVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);

  // Persona & Frame preferences
  const [persona, setPersona] = useState<PersonaType>('feynman');
  const [selectedFrame, setSelectedFrame] = useState('frame_cyan');

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
          setLinkedinUrl(prof.linkedin_url || '');
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
      const savedFrame = await SecureStore.getItemAsync('lifepivot_frame');
      if (savedFrame) {
        setSelectedFrame(savedFrame);
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

  const handleSelectFrame = async (frameId: string) => {
    HapticsEngine.tier1.selection();
    setSelectedFrame(frameId);
    await SecureStore.setItemAsync('lifepivot_frame', frameId);
  };

  const handleRoleToggle = async () => {
    if (!profile) return;
    const nextRole = profile.role === 'student' ? 'tutor' : 'student';

    HapticsEngine.tier2.action();
    setUpdating(true);
    try {
      const json = await apiRequest('/api/profile/role', {
        method: 'POST',
        body: JSON.stringify({
          role: nextRole,
          linkedinUrl: nextRole === 'tutor' ? linkedinUrl : '',
        }),
      });

      HapticsEngine.tier3.success();
      Alert.alert('SUCCESS', `Your role has been updated to ${nextRole.toUpperCase()}`);
      setProfile(json.profile);
    } catch (err: any) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: updated, error } = await supabase
            .from('profiles')
            .update({
              role: nextRole,
              linkedin_url: nextRole === 'tutor' ? linkedinUrl : '',
            })
            .eq('id', user.id)
            .select()
            .single();

          if (!error && updated) {
            setProfile(updated);
            HapticsEngine.tier3.success();
            Alert.alert('SUCCESS', `Your role has been updated to ${nextRole.toUpperCase()}`);
          }
        }
      } catch (fbErr) {
        HapticsEngine.tier4.error();
        Alert.alert('ERROR', 'Role update failed');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    HapticsEngine.tier1.light();
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
  const displayName = profile?.username || email.split('@')[0] || 'PATHSEEKER';
  const rankTitle = getRankTitle(level);

  const activeLangObj = LANGUAGES.find((l) => l.code === currentLocale) || LANGUAGES[0];
  const activeFrameObj = AVATAR_FRAMES.find((f) => f.id === selectedFrame) || AVATAR_FRAMES[1];

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
              {/* Reactive Avatar */}
              <View style={[styles.avatarWrapper, { borderColor: activeFrameObj.color }]}>
                <ReactiveAvatarNative
                  size={68}
                  level={level}
                  streak={currentStreak}
                />
              </View>

              {/* User text details */}
              <View style={styles.heroDetails}>
                <View style={styles.roleBadgeRow}>
                  <Text style={[styles.roleBadge, { color: colors.primary }]}>
                    {profile?.role === 'tutor' ? 'VERIFIED TUTOR' : 'PATHSEEKER'}
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
            options={[t('profile.stats') || 'MASTERY', t('profile.settings') || 'SETTINGS', t('profile.theme_accent') || 'COSMETICS']}
            selectedIndex={activeSegmentIndex}
            onChange={(idx) => {
              HapticsEngine.tier1.selection();
              setActiveSegmentIndex(idx);
            }}
          />
        </FadeInView>

        {/* ================================================================= */}
        {/* 4. TAB 1: MASTERY & ACHIEVEMENTS                                  */}
        {/* ================================================================= */}
        {activeSegmentIndex === 0 && (
          <FadeInView delay={100}>
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
        {/* 5. TAB 2: SETTINGS & ACCOUNT                                      */}
        {/* ================================================================= */}
        {activeSegmentIndex === 1 && (
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

            {/* Student / Tutor Role Settings */}
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Text style={styles.sectionTitle}>TUTOR & COHORT PRIVILEGES</Text>
            </View>
            <GlassCard style={styles.roleCard}>
              {profile?.role === 'student' ? (
                <View>
                  <Text style={styles.roleDesc}>
                    INPUT LINKEDIN PROFILE URL TO REQUEST VERIFIED TUTOR COHORT PRIVILEGES.
                  </Text>
                  <TextInput
                    value={linkedinUrl}
                    onChangeText={setLinkedinUrl}
                    placeholder="https://linkedin.com/in/username"
                    placeholderTextColor={colors.placeholder}
                    onFocus={() => setLinkedinFocused(true)}
                    onBlur={() => setLinkedinFocused(false)}
                    style={[
                      styles.linkedinInput,
                      linkedinFocused && { borderColor: colors.primary },
                    ]}
                  />
                  <PremiumButton
                    title="VERIFY & BECOME COHORT TUTOR"
                    onPress={handleRoleToggle}
                    variant="primary"
                    loading={updating}
                    disabled={updating}
                  />
                </View>
              ) : (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.secondary} style={{ marginRight: 8 }} />
                    <Text style={styles.tutorActiveBadge}>TUTOR PRIVILEGES ACTIVE</Text>
                  </View>
                  <Text style={styles.roleDesc}>
                    You can create workspaces, lead cohorts, and push customized study tasks to enrolled students.
                  </Text>
                  <PremiumButton
                    title="SWITCH BACK TO STUDENT"
                    onPress={handleRoleToggle}
                    variant="destructive"
                    loading={updating}
                    disabled={updating}
                  />
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
            <View style={{ marginTop: 16, marginBottom: 32 }}>
              <PremiumButton
                title={t('profile.logout') || 'SIGN OUT'}
                onPress={handleLogout}
                variant="destructive"
              />
            </View>
          </FadeInView>
        )}

        {/* ================================================================= */}
        {/* 6. TAB 3: COSMETICS / WARDROBE TAB                                */}
        {/* ================================================================= */}
        {activeSegmentIndex === 2 && (
          <FadeInView delay={100}>
            {/* Active Aura Preview Card */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ACTIVE AURA PREVIEW</Text>
            </View>
            <GlassCard style={styles.auraPreviewCard}>
              <View style={[styles.auraCircle, { borderColor: activeFrameObj.color }]}>
                <ReactiveAvatarNative
                  size={96}
                  level={level}
                  streak={currentStreak}
                />
              </View>
              <Text style={styles.auraTitle}>
                {rankTitle}
              </Text>
              <Text style={styles.auraSubtitle}>
                Aura intensity scales automatically with your active study streak and mastery level.
              </Text>
            </GlassCard>

            {/* Avatar Frame Selector */}
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Text style={styles.sectionTitle}>AVATAR FRAME</Text>
            </View>
            <View style={styles.framesGrid}>
              {AVATAR_FRAMES.map((f) => {
                const isSelected = selectedFrame === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    activeOpacity={0.7}
                    onPress={() => handleSelectFrame(f.id)}
                    style={[
                      styles.frameBtn,
                      isSelected && { borderColor: f.color, backgroundColor: `${f.color}15` },
                    ]}
                  >
                    <View style={[styles.framePreviewRing, { borderColor: f.color }]}>
                      <Ionicons name="person" size={16} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.frameName, isSelected && { color: '#FFFFFF', fontWeight: '900' }]}>
                      {f.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color={colors.primary} style={{ marginTop: 2 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ height: 40 }} />
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
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.06,
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: 120,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.05,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 96,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
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
    marginRight: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  heroDetails: {
    flex: 1,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  roleBadge: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  userName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  rankTitleText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  xpSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  xpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  xpLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#8A92A6',
    letterSpacing: 1.5,
  },
  xpValue: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  segmentedContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#8A92A6',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  languageTriggerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  langNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  langCodeText: {
    fontSize: 10,
    color: '#8A92A6',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  langChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  langChangeText: {
    fontSize: 10,
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
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E1E4EA',
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
    gap: 8,
  },
  accentBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 6,
  },
  accentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  accentLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A92A6',
    textAlign: 'center',
  },
  roleCard: {
    padding: 16,
  },
  roleDesc: {
    fontSize: 11,
    color: '#8A92A6',
    lineHeight: 16,
    marginBottom: 14,
  },
  linkedinInput: {
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 12,
  },
  tutorActiveBadge: {
    fontSize: 11,
    fontWeight: '900',
    color: '#BD00FF',
    letterSpacing: 1,
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
  auraPreviewCard: {
    alignItems: 'center',
    padding: 24,
  },
  auraCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  auraTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  auraSubtitle: {
    fontSize: 10,
    color: '#8A92A6',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 15,
  },
  framesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  frameBtn: {
    width: '48%',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  framePreviewRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  frameName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A92A6',
  },
});
