import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { HapticsEngine } from '../../utils/HapticsEngine';
import { storage as SecureStore } from '../../utils/storage';
import { supabase } from '../../utils/supabase';
import { C, Gradients, Shadows, Typography } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage, translateGoal, translateGoalsArray, translateTasksArray } from '../../context/LanguageContext';
import {
  FadeInView,
  GlassCard,
  GradientText,
  AnimatedProgressBar,
  MetricCard,
  AvatarMonogram,
} from '../../components/ui';
import { ActivePlanCard, LearningGoal, PlanStats } from '../../components/ActivePlanCard';
import { ActivePlanSwitcherModal } from '../../components/ActivePlanSwitcherModal';
import { DailyTasksHub, TaskItem } from '../../components/DailyTasksHub';
import { TaskInteractionSheet } from '../../components/TaskInteractionSheet';
import { FocusModeModal } from '../../components/FocusModeModal';
import { SocraticMicroDrillsModal } from '../../components/SocraticMicroDrillsModal';

/* ────────────────────────────────────────────────────────────────────────── */
/*  Helpers & Constants                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

const ACTIVE_GOAL_STORAGE_KEY = 'lifepivot_active_goal_id';

function getRankTitle(level: number, t?: (key: string) => string): string {
  if (level >= 11) return t?.('dashboard.level_titles.grandmaster') || 'GRANDMASTER';
  if (level >= 8) return t?.('dashboard.level_titles.sage') || 'SAGE';
  if (level >= 5) return t?.('dashboard.level_titles.scholar') || 'SCHOLAR';
  if (level >= 3) return t?.('dashboard.level_titles.acolyte') || 'ACOLYTE';
  return t?.('dashboard.level_titles.pathseeker') || 'PATHSEEKER';
}

function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const TOKEN_REWARD: Record<number, number> = {
  5: 3,
  4: 2,
  3: 1,
  2: 1,
  1: 1,
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Storage Helper                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

async function getStoredActiveGoalId(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(ACTIVE_GOAL_STORAGE_KEY);
      }
      return null;
    }
    return await SecureStore.getItemAsync(ACTIVE_GOAL_STORAGE_KEY);
  } catch (err) {
    console.error('Error reading stored active goal id:', err);
    return null;
  }
}

async function setStoredActiveGoalId(id: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(ACTIVE_GOAL_STORAGE_KEY, id);
      }
      return;
    }
    await SecureStore.setItemAsync(ACTIVE_GOAL_STORAGE_KEY, id);
  } catch (err) {
    console.error('Error saving stored active goal id:', err);
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Dashboard Screen                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // User Profile and DB entities
  const [profile, setProfile] = useState<any>(null);
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { colors } = useTheme();
  const { t, locale } = useLanguage();

  // Breathing animation for Quick Timer CTA
  const timerGlowOpacity = useSharedValue(0.35);

  useEffect(() => {
    timerGlowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500 }),
        withTiming(0.35, { duration: 1500 })
      ),
      -1,
      true
    );
  }, [timerGlowOpacity]);

  const breathingGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: timerGlowOpacity.value,
  }));

  // Modals state
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [focusModalVisible, setFocusModalVisible] = useState(false);
  const [drillModalVisible, setDrillModalVisible] = useState(false);
  const [focusTask, setFocusTask] = useState<{
    id?: string;
    title: string;
    subject?: string;
    priority?: number;
    duration: number;
    subtasks?: any[];
    notes?: string;
    ai_hint?: string;
  }>({
    title: 'Daily Deep Focus Sprint',
    duration: 25,
  });

  const todayStr = useMemo(() => getLocalDateString(new Date()), []);

  /* ── 1. Data Fetching ─────────────────────────────────────────────────── */

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch Learning Goals
      const { data: goalsData } = await supabase
        .from('learning_goals')
        .select('id, title, duration_days, created_at, plan_metadata')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const loadedGoals: LearningGoal[] = goalsData || [];
      setGoals(loadedGoals);

      // Resolve stored active goal ID & heal stale pointer
      const storedId = await getStoredActiveGoalId();
      if (storedId && loadedGoals.some((g) => g.id === storedId)) {
        setActiveGoalId(storedId);
      } else if (loadedGoals.length > 0) {
        const fallbackId = loadedGoals[0].id;
        setActiveGoalId(fallbackId);
        await setStoredActiveGoalId(fallbackId);
      } else {
        setActiveGoalId(null);
        await setStoredActiveGoalId('');
      }

      // Fetch Tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);

      if (tasksData) {
        setTasks(tasksData);
      }
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData(true);
    }, [fetchDashboardData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData(true);
  };

  /* ── 2. Active Goal & Statistics Resolution ───────────────────────────── */

  const activeGoal = useMemo(() => {
    if (!goals.length) return null;
    if (activeGoalId) {
      const match = goals.find((g) => g.id === activeGoalId);
      if (match) return match;
    }
    return goals[0] || null;
  }, [goals, activeGoalId]);

  const translatedGoals = useMemo(() => translateGoalsArray(goals, locale), [goals, locale]);
  const translatedActiveGoal = useMemo(() => translateGoal(activeGoal, locale), [activeGoal, locale]);
  const translatedTasks = useMemo(() => translateTasksArray(tasks, locale), [tasks, locale]);

  const activeGoalStats = useMemo<PlanStats | null>(() => {
    if (!activeGoal) return null;

    const goalTasks = tasks.filter(
      (t) => t.goal_id === activeGoal.id && t.task_type !== 'void'
    );
    const completed = goalTasks.filter((t) => t.status === 'completed').length;
    const total = goalTasks.length;

    const todayGoalTasks = goalTasks.filter((t) => t.due_date === todayStr);
    const todayPending = todayGoalTasks.filter((t) => t.status === 'pending').length;
    const todayTotal = todayGoalTasks.length;
    const todayCompleted = todayTotal - todayPending;

    // Day calculation
    const start = new Date(activeGoal.created_at);
    start.setHours(0, 0, 0, 0);
    const today = new Date(todayStr + 'T00:00:00');
    const currentDay = Math.max(
      1,
      Math.min(
        Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        activeGoal.duration_days
      )
    );

    return {
      completed,
      total,
      todayPending,
      todayTotal,
      todayCompleted,
      currentDay,
    };
  }, [activeGoal, tasks, todayStr]);

  /* ── 3. Action Handlers ───────────────────────────────────────────────── */

  const handleSelectGoal = async (goalId: string) => {
    setActiveGoalId(goalId);
    await setStoredActiveGoalId(goalId);
  };

  const handleToggleTask = async (
    taskId: string,
    currentStatus: string,
    priority: number
  ) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    // Optimistic local state update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as any } : t))
    );

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) {
        console.error('Failed to toggle task in Supabase:', error);
        fetchDashboardData(true);
        return;
      }

      // Profile XP & Token Calculation
      if (profile) {
        const tokenDelta = TOKEN_REWARD[priority ?? 3] ?? 1;
        const baseXp = priority && priority > 0 ? priority * 10 + 10 : 10;
        let newTokens = profile.tokens_balance;
        let newXp = profile.xp;
        let newLevel = profile.level;

        if (newStatus === 'completed') {
          newTokens += tokenDelta;
          newXp += baseXp;
          const xpNeeded = newLevel * 100;
          if (newXp >= xpNeeded) {
            newLevel += 1;
            newXp -= xpNeeded;
          }
        } else {
          newTokens = Math.max(0, newTokens - tokenDelta);
          newXp = Math.max(0, newXp - baseXp);
        }

        // Update profile in DB
        await supabase
          .from('profiles')
          .update({
            tokens_balance: newTokens,
            xp: newXp,
            level: newLevel,
          })
          .eq('id', profile.id);

        setProfile((prev: any) => ({
          ...prev,
          tokens_balance: newTokens,
          xp: newXp,
          level: newLevel,
        }));
      }
    } catch (e) {
      console.error('Error toggling task:', e);
    }
  };

  const handleOpenTaskDetails = (task: TaskItem) => {
    setSelectedTask(task);
    setSheetVisible(true);
  };

  const handleUpdateTask = (updatedTask: Partial<TaskItem> & { id: string }) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
    );
    if (selectedTask && selectedTask.id === updatedTask.id) {
      setSelectedTask((prev) => (prev ? { ...prev, ...updatedTask } : null));
    }
  };

  const handleStartFocus = (task?: TaskItem) => {
    if (task) {
      setFocusTask({
        id: task.id,
        title: task.title,
        subject: task.subject,
        priority: task.priority || 3,
        duration: task.duration_mins || 25,
        subtasks: task.subtasks || [],
        notes: task.notes || '',
        ai_hint: task.ai_hint,
      });
    } else {
      const firstPending = tasks.find(
        (t) => t.due_date === todayStr && t.status === 'pending'
      );
      if (firstPending) {
        setFocusTask({
          id: firstPending.id,
          title: firstPending.title,
          subject: firstPending.subject,
          priority: firstPending.priority || 3,
          duration: firstPending.duration_mins || 25,
          subtasks: firstPending.subtasks || [],
          notes: firstPending.notes || '',
          ai_hint: firstPending.ai_hint,
        });
      } else {
        setFocusTask({
          title: activeGoal ? `${activeGoal.title} Focus Sprint` : 'Daily Deep Focus Sprint',
          duration: 25,
        });
      }
    }
    setFocusModalVisible(true);
  };

  /* ── 4. Loading State ─────────────────────────────────────────────────── */

  if (loading && !profile) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  /* ── 5. Derived Values ────────────────────────────────────────────────── */

  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const xpNeeded = Math.max(1, level * 100);
  const xpProgress = Math.min(1, Math.max(0, xp / xpNeeded));
  const tokensBalance = profile?.tokens_balance ?? 0;
  const streak = profile?.current_streak ?? 0;
  const displayName = profile?.username || 'PATHSEEKER';
  const isSubscribed = profile?.is_subscribed ?? false;

  /* ── 6. Render ────────────────────────────────────────────────────────── */

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      {/* Background Ambient Glows */}
      <View
        pointerEvents="none"
        style={[
          styles.topAmbientGlow,
          { backgroundColor: colors.primary, opacity: 0.06 },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.bottomAmbientGlow,
          { backgroundColor: colors.secondary, opacity: 0.05 },
        ]}
      />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        className="flex-1"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 84 : 88 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Hero Welcome Card ────────────────────────────────────── */}
        <FadeInView delay={0} style={{ marginBottom: 16 }}>
          <LinearGradient
            colors={colors.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, Shadows.elevated, { borderColor: colors.glassBorder }]}
          >
            {/* Decorative Glow Orb */}
            <View pointerEvents="none" style={[styles.heroOrb, { backgroundColor: colors.primary }]} />

            <View style={styles.heroContentRow}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={[styles.heroOverhead, { color: colors.primary }]}>
                  LIFEPIVOT OS • {getRankTitle(level, t)}
                </Text>

                <GradientText
                  colors={colors.primaryGradient}
                  style={styles.heroTitle}
                >
                  {displayName}
                </GradientText>

                <Text style={styles.heroSubtitle}>
                  {activeGoalStats && activeGoalStats.todayPending > 0
                    ? (t('dashboard.sessions_left', { count: activeGoalStats.todayPending }) || `${activeGoalStats.todayPending} focus sessions scheduled today.`)
                    : activeGoalStats && activeGoalStats.todayTotal > 0
                    ? (t('focus.session_completed') || 'All scheduled sessions secured.')
                    : (t('focus.ready') || 'Ready for your next focus sprint.')}
                </Text>

                {/* Status Indicator & Focus Trigger */}
                <View style={styles.heroActionsRow}>
                  <View style={styles.statusIndicatorRow}>
                    <View style={[styles.onlineDot, { backgroundColor: colors.emerald }]} />
                    <Text style={[styles.statusText, { color: colors.emerald }]}>
                      {t('focus.focusing') || 'Focused'}
                    </Text>
                  </View>

                  <Animated.View
                    style={[
                      styles.heroFocusBtnWrapper,
                      Shadows.glowSmall(colors.primary, 0.4),
                      breathingGlowStyle,
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        HapticsEngine.tier2.action();
                        handleStartFocus();
                      }}
                      style={[styles.heroFocusBtn, { backgroundColor: colors.primary }]}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="timer-outline" size={14} color="#050508" />
                      <Text style={styles.heroFocusBtnText}>{t('focus.timer_tab') || 'QUICK TIMER'}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>

              <AvatarMonogram
                name={displayName}
                size={56}
                showRing={isSubscribed}
              />
            </View>
          </LinearGradient>
        </FadeInView>

        {/* ── 2. Metrics Row ──────────────────────────────────────────── */}
        <FadeInView delay={100} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <MetricCard
              icon="🪙"
              label={t('hud.gems') || 'TOKENS'}
              value={tokensBalance}
              accentColor={colors.amber}
            />
            <MetricCard
              icon="🔥"
              label={t('hud.streak') || 'STREAK'}
              value={`${streak} ${t('marketplace.days') || 'D'}`}
              accentColor={colors.orange}
            />
            <MetricCard
              icon="⚡"
              label={t('hud.level') || 'LEVEL'}
              value={`${t('hud.level') || 'LVL'} ${level}`}
              accentColor={colors.primary}
            />
          </View>
        </FadeInView>

        {/* ── 3. Level 1 Milestone Checkpoint Gate vs Full Dashboard ──── */}
        {level < 2 ? (
          <FadeInView delay={200} style={{ marginBottom: 16 }}>
            <GlassCard elevated style={[styles.checkpointCard, { borderColor: colors.glassBorder }]}>
              <View style={[styles.checkpointIconBox, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="flash" size={28} color={colors.primary} />
              </View>

              <Text style={styles.checkpointTitle}>{t('socratic.milestone_checkpoint') || 'LEVEL 1 MILESTONE GATE'}</Text>
              <Text style={styles.checkpointSubtitle}>
                {t('socratic.intro_desc') ||
                  'Complete your initial curriculum focus sessions and reach Level 2 (1,000 XP) to unlock the full Daily Tasks Hub, Exchange Store, and Socratic drills.'}
              </Text>

              {/* Progress to Level 2 */}
              <View style={styles.checkpointProgressContainer}>
                <View style={styles.checkpointProgressHeader}>
                  <Text style={styles.checkpointProgressLabel}>
                    {t('profile.xp_needed', { level: 2 }) || 'PROGRESS TO LEVEL 2'}
                  </Text>
                  <Text style={[styles.checkpointProgressValue, { color: colors.primary }]}>
                    {xp} / {xpNeeded} XP
                  </Text>
                </View>
                <AnimatedProgressBar
                  progress={xpProgress}
                  colors={colors.primaryGradient}
                />
              </View>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/plan');
                }}
                style={[styles.checkpointCtaBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Ionicons name="compass-outline" size={16} color="#050508" />
                <Text style={styles.checkpointCtaText}>{t('plan.learning_map') || 'OPEN PLAN PORTAL'}</Text>
              </TouchableOpacity>
            </GlassCard>
          </FadeInView>
        ) : (
          <>
            {/* ── 4. Dynamic Active Plan Card ─────────────────────────── */}
            <FadeInView delay={200} style={{ marginBottom: 16 }}>
              <ActivePlanCard
                activeGoal={translatedActiveGoal}
                stats={activeGoalStats}
                onOpenSwitcher={() => setSwitcherVisible(true)}
                onOpenPortal={() => router.push('/plan')}
              />
            </FadeInView>

            {/* ── 5. Today's Daily Tasks Hub ──────────────────────────── */}
            <FadeInView delay={300} style={{ marginBottom: 16 }}>
              <DailyTasksHub
                tasks={translatedTasks}
                todayStr={todayStr}
                onToggleTask={handleToggleTask}
                onOpenTaskDetails={handleOpenTaskDetails}
                onStartFocus={handleStartFocus}
                onOpenPlanPortal={() => router.push('/plan')}
              />
            </FadeInView>
          </>
        )}

        {/* ── 6. XP Progress & Rank HUD ────────────────────────────────── */}
        <FadeInView delay={400} style={{ marginBottom: 16 }}>
          <GlassCard elevated style={styles.hudCard}>
            <View style={styles.hudHeader}>
              <Text style={styles.hudTitle}>EXPERIENCE POINTS</Text>
              <Text style={styles.hudXpValue}>{xp} / {xpNeeded} XP</Text>
            </View>

            <AnimatedProgressBar
              progress={xpProgress}
              colors={Gradients.xpBar}
            />

            <Text style={styles.hudRankTitle}>
              ✦ {getRankTitle(level, t)} ✦
            </Text>
          </GlassCard>
        </FadeInView>
      </ScrollView>

      {/* ── Modals ────────────────────────────────────────────────────── */}

      {/* Active Plan Switcher Modal */}
      <ActivePlanSwitcherModal
        visible={switcherVisible}
        onClose={() => setSwitcherVisible(false)}
        goals={translatedGoals}
        activeGoalId={activeGoalId}
        onSelectGoal={handleSelectGoal}
        onCreateNewPlan={() => router.push('/plan/create')}
      />

      {/* Task Interaction Details Sheet */}
      <TaskInteractionSheet
        task={selectedTask}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onUpdateTask={handleUpdateTask}
        onStartFocus={handleStartFocus}
      />

      {/* Fullscreen Focus Mode Timer Modal */}
      <FocusModeModal
        visible={focusModalVisible}
        onClose={() => setFocusModalVisible(false)}
        taskId={focusTask.id}
        taskTitle={focusTask.title}
        subject={focusTask.subject}
        priority={focusTask.priority}
        subtasks={focusTask.subtasks}
        notes={focusTask.notes}
        aiHint={focusTask.ai_hint}
        initialMinutes={focusTask.duration}
        onUpdateTask={(updated) => {
          handleUpdateTask(updated as TaskItem);
        }}
        onCompleteSession={(mins) => {
          setFocusModalVisible(false);
          setDrillModalVisible(true);
        }}
      />

      {/* Socratic Micro Drills Modal */}
      <SocraticMicroDrillsModal
        visible={drillModalVisible}
        onClose={() => {
          setDrillModalVisible(false);
          fetchDashboardData(true);
        }}
        taskTitle={focusTask.title}
        completedMinutes={focusTask.duration}
        onDrillFinished={() => {
          fetchDashboardData(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#050508',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050508',
  },
  topAmbientGlow: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#00F0FF',
    opacity: 0.05,
  },
  bottomAmbientGlow: {
    position: 'absolute',
    bottom: 120,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#BD00FF',
    opacity: 0.05,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: C.glassBorderSubtle,
    overflow: 'hidden',
  },
  heroOrb: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: C.electricBlue,
    opacity: 0.05,
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroOverhead: {
    color: C.electricBlue,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  heroSubtitle: {
    ...Typography.subhead,
    color: '#9CA3AF',
    marginTop: 6,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroFocusBtnWrapper: {
    borderRadius: 12,
  },
  heroFocusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  heroFocusBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#050508',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  checkpointCard: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 24, 36, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
  },
  checkpointIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  checkpointTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  checkpointSubtitle: {
    fontSize: 12,
    color: C.textDim,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  checkpointProgressContainer: {
    width: '100%',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 20,
  },
  checkpointProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  checkpointProgressLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: C.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  checkpointProgressValue: {
    fontSize: 11,
    fontWeight: '900',
    color: C.electricBlue,
  },
  checkpointCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: C.electricBlue,
    width: '100%',
    justifyContent: 'center',
  },
  checkpointCtaText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#050508',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  hudCard: {
    padding: 16,
    borderRadius: 20,
  },
  hudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  hudTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  hudXpValue: {
    fontSize: 10,
    fontWeight: '900',
    color: C.inactive,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  hudRankTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: C.neonViolet,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 12,
    textAlign: 'center',
  },
});
