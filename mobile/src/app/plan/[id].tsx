import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';
import { C, Gradients } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage, translateGoal, translateTasksArray } from '../../context/LanguageContext';
import { FadeInView, GlassCard, GradientText, GlowBadge, FloatingXp, AnimatedProgressBar } from '../../components/ui';
import { FileUploadSheet } from '../../components/FileUploadSheet';
import { TaskInteractionSheet } from '../../components/TaskInteractionSheet';
import { SwipeableTaskCard } from '../../components/SwipeableTaskCard';
import { FocusModeModal } from '../../components/FocusModeModal';
import { SocraticMicroDrillsModal } from '../../components/SocraticMicroDrillsModal';
import { API_BASE_URL } from '../../utils/api';

interface Task {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  status: 'pending' | 'completed';
  priority: number;
  duration_mins?: number;
  subject?: string;
  notes?: string;
  due_date: string;
  task_type: 'task' | 'void';
  pivoted_count: number;
  subtasks: any[];
}

const TOKEN_REWARD: Record<number, number> = {
  0: 0,
  1: 1,
  2: 1,
  3: 1,
  4: 2,
  5: 3,
};

function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return 'UNDATED';
  const todayStr = getLocalDateString(new Date());

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrow);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  if (dateStr === todayStr) return 'TODAY';
  if (dateStr === tomorrowStr) return 'TOMORROW';
  if (dateStr === yesterdayStr) return 'YESTERDAY';

  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const monthIndex = parseInt(parts[1], 10) - 1;
      const dayNum = parseInt(parts[2], 10);
      const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const mStr = MONTH_SHORT[monthIndex] || 'JUL';
      return `${mStr} ${dayNum}`;
    }
  } catch (e) {
    // fallback
  }

  return dateStr;
}

function getPriorityInfo(priority: number, t: (key: string) => string) {
  switch (priority) {
    case 5:
      return { label: t('task_card.p5') || 'P5 CRITICAL', color: C.rose };
    case 4:
      return { label: t('task_card.p4') || 'P4 HIGH', color: C.orange };
    case 3:
      return { label: t('task_card.p3') || 'P3 MEDIUM', color: C.amber };
    case 2:
      return { label: t('task_card.p2') || 'P2 LOW', color: C.electricBlue };
    default:
      return { label: t('task_card.p1') || 'P1 MINIMAL', color: C.textMuted };
  }
}

export default function PlanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { colors } = useTheme();
  const { t, locale } = useLanguage();

  const [goal, setGoal] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
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
    title: 'Study Session',
    duration: 25,
  });
  const [animatingTaskId, setAnimatingTaskId] = useState<string | null>(null);
  const [animatingXpValue, setAnimatingXpValue] = useState<number>(0);
  const [isEnriching, setIsEnriching] = useState(false);

  // Active Date Selection: Defaults to Today
  const todayStr = useMemo(() => getLocalDateString(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);
  const [showAllDates, setShowAllDates] = useState(false);

  const translatedGoal = useMemo(() => translateGoal(goal, locale), [goal, locale]);
  const translatedTasks = useMemo(() => translateTasksArray(tasks, locale), [tasks, locale]);

  // Trigger background enrichment for P3 tasks
  useEffect(() => {
    if (!id || tasks.length === 0) return;

    const hasPlaceholderP3 = tasks.some(
      (t: any) =>
        t.priority === 3 &&
        (t.subtasks || []).some(
          (st: any) =>
            st.id !== 'translations' &&
            (st.title?.toLowerCase().includes('practice exercise') ||
              st.title?.toLowerCase().includes('placeholder'))
        )
    );

    if (!hasPlaceholderP3 || isEnriching) return;

    setIsEnriching(true);

    const timeoutId = setTimeout(() => {
      setIsEnriching(false);
    }, 30000);

    fetch(`${API_BASE_URL}/api/plans/enrich-p3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: id }),
    })
      .then((res) => {
        if (res.ok) {
          fetchPlanData();
        }
      })
      .catch((err) => {
        console.error('Error enriching mobile plan tasks:', err);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setIsEnriching(false);
      });
  }, [id, tasks.length]);

  const fetchPlanData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: goalData, error: goalError } = await supabase
        .from('learning_goals')
        .select('*')
        .eq('id', id)
        .single();

      if (goalError || !goalData) {
        Alert.alert('ERROR', 'Failed to retrieve plan details');
        return;
      }
      setGoal(goalData);

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', id)
        .order('due_date', { ascending: true });

      setTasks(tasksData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanData();
  }, [id]);

  const changeDateByDelta = (deltaDays: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAllDates(false);

    const baseDate = selectedDate ? new Date(selectedDate) : new Date();
    baseDate.setDate(baseDate.getDate() + deltaDays);
    setSelectedDate(getLocalDateString(baseDate));
  };

  const handleToggleTask = async (taskId: string, currentStatus: string, priority: number) => {
    if (!userId) return;

    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    if (nextStatus === 'completed') {
      const baseXp = priority && priority > 0 ? priority * 10 + 10 : 10;
      setAnimatingTaskId(taskId);
      setAnimatingXpValue(baseXp);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        setAnimatingTaskId(null);
      }, 900);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus as any } : t))
    );

    const { error: taskError } = await supabase
      .from('tasks')
      .update({ status: nextStatus })
      .eq('id', taskId);

    if (taskError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('ERROR', 'Failed to update task');
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: currentStatus as any } : t))
      );
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, level, tokens_balance')
        .eq('id', userId)
        .single();

      if (profile) {
        const tokenDelta = TOKEN_REWARD[priority ?? 3] ?? 1;
        const baseXp = priority && priority > 0 ? priority * 10 + 10 : 10;

        let newTokens = profile.tokens_balance;
        let newXp = profile.xp;
        let newLevel = profile.level;

        if (nextStatus === 'completed') {
          newTokens += tokenDelta;
          newXp += baseXp;
          const xpNeeded = newLevel * 1000;
          if (newXp >= xpNeeded) {
            newXp -= xpNeeded;
            newLevel += 1;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('LEVEL UP!', `Congratulations! You reached Level ${newLevel}!`);
          }
        } else {
          newTokens = Math.max(0, newTokens - tokenDelta);
          newXp = Math.max(0, newXp - baseXp);
        }

        await supabase
          .from('profiles')
          .update({
            tokens_balance: newTokens,
            xp: newXp,
            level: newLevel,
          })
          .eq('id', userId);
      }
    } catch (e) {
      console.error('Failed to sync profile metrics:', e);
    }
  };

  const handleRescheduleTask = async (taskId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrow);

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, due_date: tomorrowStr } : t))
    );

    try {
      await supabase
        .from('tasks')
        .update({ due_date: tomorrowStr })
        .eq('id', taskId);
    } catch (e) {
      console.error('Failed to reschedule task:', e);
    }
  };

  // Filter tasks based on active date selection
  const filteredTasks = useMemo(() => {
    if (showAllDates) return translatedTasks;
    if (!selectedDate) return translatedTasks;
    return translatedTasks.filter((t) => t.due_date === selectedDate);
  }, [translatedTasks, selectedDate, showAllDates]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalCount = tasks.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const todayTaskCount = tasks.filter((t) => t.due_date === todayStr).length;

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

      {/* Top Header Navigation Bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderWidth: 1,
            borderColor: colors.glassBorder,
          }}
        >
          <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
          <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 }}>
            {t('plan.plans_back') || 'PLANS'}
          </Text>
        </TouchableOpacity>

        <GlowBadge label={t('plan.overall', { percent: completionRate }) || `${completionRate}% OVERALL`} colorScheme="emerald" />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* 1. Hero HUD Card */}
        <FadeInView delay={0} style={{ marginBottom: 16 }}>
          <GlassCard style={{ padding: 20, position: 'relative', overflow: 'hidden', borderColor: colors.glassBorder }} elevated>
            <LinearGradient
              colors={colors.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            <Text
              style={{
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 3.5,
                color: colors.primary,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              {t('plan.curriculum_arch') || 'CURRICULUM ARCHITECTURE'}
            </Text>

            <GradientText colors={colors.primaryGradient} style={{ fontSize: 22, fontWeight: '900', letterSpacing: 0.5, marginBottom: 12 }}>
              {translatedGoal?.title || goal?.title || t('plan.personal_plan') || 'Personal Learning Plan'}
            </GradientText>

            {/* Progress Bar */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                  {t('plan.syllabus_progress') || 'SYLLABUS PROGRESS'}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>
                  {t('plan.done', { completed: completedCount, total: totalCount }) || `${completedCount} / ${totalCount} DONE`}
                </Text>
              </View>
              <AnimatedProgressBar progress={completionRate / 100} colors={colors.primaryGradient} />
            </View>

            {/* Action Buttons Row */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setFocusModalVisible(true);
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: colors.primary,
                  paddingVertical: 10,
                  borderRadius: 14,
                }}
              >
                <Ionicons name="timer-outline" size={16} color="#050508" />
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#050508', letterSpacing: 0.5 }}>
                  {t('plan.focus_session') || 'FOCUS SESSION'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMaterialsOpen(!materialsOpen);
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderWidth: 1,
                  borderColor: colors.glassBorder,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Ionicons name="attach" size={16} color="#FFFFFF" />
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF' }}>
                  {t('plan.notes') || 'NOTES'}
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </FadeInView>

        {/* 2. Study Materials Sheet */}
        {materialsOpen && (
          <FadeInView delay={50} style={{ marginBottom: 16 }}>
            <GlassCard style={{ padding: 16, borderColor: colors.glassBorder }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '900',
                  color: colors.primary,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                {t('focus.curated_materials') || 'GROUNDING STUDY MATERIALS'}
              </Text>
              <FileUploadSheet planId={id} />
            </GlassCard>
          </FadeInView>
        )}

        {/* 3. Interactive Date Navigation Bar */}
        <FadeInView delay={70} style={{ marginBottom: 16 }}>
          <GlassCard
            style={{
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderColor: `${colors.primary}33`,
            }}
          >
            {/* Prev Day Button */}
            <TouchableOpacity
              onPress={() => changeDateByDelta(-1)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderWidth: 1,
                borderColor: colors.glassBorder,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Current Active Date Display */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedDate(todayStr);
                setShowAllDates(false);
              }}
              style={{ alignItems: 'center' }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '900',
                  color: colors.primary,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                }}
              >
                {showAllDates
                  ? (t('plan.all_dates_title') || 'ALL CURRICULUM DATES')
                  : selectedDate === todayStr
                  ? (t('plan.today') || 'TODAY')
                  : selectedDate}
              </Text>
              <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '700', marginTop: 2 }}>
                {showAllDates
                  ? (t('plan.all_dates_count', { count: tasks.length }) || `${tasks.length} total tasks`)
                  : selectedDate === todayStr
                  ? (t('plan.todays_agenda', { count: todayTaskCount }) || `Today's Agenda (${todayTaskCount} tasks)`)
                  : `${selectedDate}`}
              </Text>
            </TouchableOpacity>

            {/* Next Day Button */}
            <TouchableOpacity
              onPress={() => changeDateByDelta(1)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderWidth: 1,
                borderColor: colors.glassBorder,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </GlassCard>

          {/* Quick Date Shortcuts Row */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedDate(todayStr);
                setShowAllDates(false);
              }}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: !showAllDates && selectedDate === todayStr ? `${colors.primary}20` : 'rgba(255, 255, 255, 0.03)',
                borderWidth: 1,
                borderColor: !showAllDates && selectedDate === todayStr ? colors.primary : 'rgba(255, 255, 255, 0.08)',
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '900',
                  color: !showAllDates && selectedDate === todayStr ? colors.primary : colors.textMuted,
                  textTransform: 'uppercase',
                }}
              >
                {t('plan.today') || 'TODAY'} ({todayTaskCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAllDates(true);
              }}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: showAllDates ? `${colors.secondary}20` : 'rgba(255, 255, 255, 0.03)',
                borderWidth: 1,
                borderColor: showAllDates ? colors.secondary : 'rgba(255, 255, 255, 0.08)',
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '900',
                  color: showAllDates ? colors.secondary : colors.textMuted,
                  textTransform: 'uppercase',
                }}
              >
                {t('calendar.view_all') || 'ALL DATES'} ({tasks.length})
              </Text>
            </TouchableOpacity>
          </View>
        </FadeInView>

        {/* 4. Task Agenda Checklist */}
        <FadeInView delay={100}>
          {filteredTasks.length === 0 ? (
            <GlassCard style={{ padding: 24, alignItems: 'center', marginTop: 8, borderColor: colors.glassBorder }}>
              <Ionicons name="calendar-outline" size={28} color={colors.primary} style={{ marginBottom: 8 }} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '900',
                  color: '#FFFFFF',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                {t('plan.no_tasks_scheduled') || 'NO TASKS SCHEDULED FOR THIS DATE'}
              </Text>
              <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center', lineHeight: 14, marginBottom: 12 }}>
                Use the arrows above to switch dates or view your full curriculum agenda.
              </Text>
              <TouchableOpacity
                onPress={() => setShowAllDates(true)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: `${colors.primary}15`,
                  borderWidth: 1,
                  borderColor: colors.primary,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '900', color: colors.primary, textTransform: 'uppercase' }}>
                  {t('calendar.view_all') || 'VIEW ALL DATES'}
                </Text>
              </TouchableOpacity>
            </GlassCard>
          ) : (
            filteredTasks.map((task) => {
              const prioInfo = getPriorityInfo(task.priority, t);
              return (
                <View key={task.id} style={{ marginBottom: 8, position: 'relative' }}>
                  <SwipeableTaskCard
                    task={task}
                    onToggle={handleToggleTask}
                    onReschedule={handleRescheduleTask}
                    onPress={(t) => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedTask(t);
                      setSheetVisible(true);
                    }}
                    prioColor={prioInfo.color}
                    prioLabel={prioInfo.label}
                  />
                  {animatingTaskId === task.id && <FloatingXp value={animatingXpValue} />}
                </View>
              );
            })
          )}
        </FadeInView>
      </ScrollView>

      {/* Task Interaction Details Sheet */}
      <TaskInteractionSheet
        task={selectedTask}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onUpdateTask={(updated) => {
          setTasks((prev) =>
            prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
          );
          if (selectedTask && selectedTask.id === updated.id) {
            setSelectedTask((prev: any) => (prev ? { ...prev, ...updated } : null));
          }
        }}
        onStartFocus={(task) => {
          setFocusTask({
            id: task.id,
            title: task.title,
            subject: task.subject || goal?.title,
            priority: task.priority || 3,
            duration: task.duration_mins || 25,
            subtasks: task.subtasks || [],
            notes: task.notes || '',
            ai_hint: task.ai_hint,
          });
          setFocusModalVisible(true);
        }}
      />

      {/* Focus Mode Timer Modal */}
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
          setTasks((prev) =>
            prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
          );
        }}
        onCompleteSession={() => {
          setFocusModalVisible(false);
          setDrillModalVisible(true);
        }}
      />

      {/* Socratic Micro Drills Modal */}
      <SocraticMicroDrillsModal
        visible={drillModalVisible}
        onClose={() => {
          setDrillModalVisible(false);
          fetchPlanData();
        }}
        taskTitle={focusTask.title}
        completedMinutes={focusTask.duration}
        onDrillFinished={() => {
          fetchPlanData();
        }}
      />
    </View>
  );
}
