import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticsEngine } from '../../utils/HapticsEngine';
import { supabase } from '../../utils/supabase';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage, translateTasksArray } from '../../context/LanguageContext';
import { FadeInView, GlassCard, GradientText, GlowBadge, FloatingXp } from '../../components/ui';
import { TaskInteractionSheet } from '../../components/TaskInteractionSheet';
import { CalendarGrid3D } from '../../components/CalendarGrid3D';
import { PivotRecoveryModal } from '../../components/PivotRecoveryModal';
import { SwipeableTaskCard } from '../../components/SwipeableTaskCard';
import { FocusModeModal } from '../../components/FocusModeModal';
import { SocraticMicroDrillsModal } from '../../components/SocraticMicroDrillsModal';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Task {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  subject?: string;
  duration_mins?: number;
  due_date: string;
  priority: number;
  task_type: 'task' | 'void';
  status: 'pending' | 'completed';
  pivoted_count: number;
  subtasks: Subtask[];
  notes?: string;
  resources?: any[];
  reflection?: string;
  ai_hint?: string;
  created_at?: string;
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

function formatDateHeader(dateStr: string, t: (key: string) => string, formatDate: (d: any, opts?: any) => string): string {
  const today = getLocalDateString();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = getLocalDateString(tomorrowDate);

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDateString(yesterdayDate);

  if (dateStr === today) return t('plan.today') || 'TODAY';
  if (dateStr === tomorrow) return t('calendar.tomorrow') || 'TOMORROW';
  if (dateStr === yesterday) return t('calendar.yesterday') || 'YESTERDAY';

  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return formatDate(d, { month: 'short', day: 'numeric' }).toUpperCase();
    }
  } catch (e) {
    // fallback
  }

  return dateStr.toUpperCase();
}

function getPriorityInfo(priority: number, t: (key: string) => string) {
  switch (priority) {
    case 5:
      return { label: t('task_card.p5') || 'P5 CRITICAL', color: '#F43F5E' };
    case 4:
      return { label: t('task_card.p4') || 'P4 HIGH', color: '#F97316' };
    case 3:
      return { label: t('task_card.p3') || 'P3 MEDIUM', color: '#F59E0B' };
    case 2:
      return { label: t('task_card.p2') || 'P2 LOW', color: '#00F0FF' };
    default:
      return { label: t('task_card.p1') || 'P1 MINIMAL', color: '#6B7280' };
  }
}

export default function CalendarPortal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, formatDate, locale } = useLanguage();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userTokens, setUserTokens] = useState<number>(0);
  const [hasStreakShield, setHasStreakShield] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [pivotModalVisible, setPivotModalVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [animatingTaskId, setAnimatingTaskId] = useState<string | null>(null);
  const [animatingXpValue, setAnimatingXpValue] = useState<number>(0);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  // Focus Mode & Drills Modal state
  const [focusModalVisible, setFocusModalVisible] = useState(false);
  const [drillModalVisible, setDrillModalVisible] = useState(false);
  const [focusTask, setFocusTask] = useState<{
    id?: string;
    title: string;
    subject?: string;
    priority?: number;
    duration: number;
    subtasks?: Subtask[];
    notes?: string;
    ai_hint?: string;
  }>({
    title: 'Study Sprint',
    duration: 25,
  });

  const fetchTasksData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }
      setUserId(user.id);

      const [tasksRes, profRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('tokens_balance, streak_shields_count').eq('id', user.id).single(),
      ]);

      if (tasksRes.data) {
        setTasks(tasksRes.data as Task[]);
      }
      if (profRes.data) {
        setUserTokens(profRes.data.tokens_balance ?? 0);
        setHasStreakShield((profRes.data.streak_shields_count ?? 0) > 0);
      }
    } catch (err) {
      console.warn('Calendar tasks fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      fetchTasksData(true);
    }, [fetchTasksData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTasksData(true);
  };

  const handleStartFocus = (task?: any) => {
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
      setFocusTask({
        title: 'Calendar Focus Sprint',
        duration: 25,
      });
    }
    setFocusModalVisible(true);
  };

  const handleUpdateTask = (updated: any) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
    );
    if (selectedTask && selectedTask.id === updated.id) {
      setSelectedTask((prev) => (prev ? { ...prev, ...updated } : null));
    }
  };

  const handleToggleTask = async (task: Task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const priority = task.priority ?? 1;
    const tokenDelta = TOKEN_REWARD[priority] ?? 1;
    const baseXp = priority > 0 ? priority * 10 + 10 : 10;

    // Optimistic local state update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    if (newStatus === 'completed') {
      setAnimatingTaskId(task.id);
      setAnimatingXpValue(baseXp);
      setTimeout(() => setAnimatingTaskId(null), 1200);
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      if (error) {
        console.error('Failed to toggle task in Supabase:', error);
        // Revert optimistic update
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
        );
        return;
      }

      if (userId) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('xp, tokens_balance, level')
          .eq('id', userId)
          .single();

        if (prof) {
          let newTokens = prof.tokens_balance || 0;
          let newXp = prof.xp || 0;
          let newLevel = prof.level || 1;

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

          await supabase
            .from('profiles')
            .update({
              xp: newXp,
              tokens_balance: newTokens,
              level: newLevel,
            })
            .eq('id', userId);
        }
      }
    } catch (err) {
      console.warn('Error toggling task status:', err);
    }
  };

  const handleRescheduleTask = async (task: Task, newDate: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, due_date: newDate, pivoted_count: (t.pivoted_count || 0) + 1 } : t))
    );

    try {
      await supabase
        .from('tasks')
        .update({
          due_date: newDate,
          pivoted_count: (task.pivoted_count || 0) + 1,
        })
        .eq('id', task.id);
    } catch (err) {
      console.warn('Error rescheduling task:', err);
    }
  };

  const translatedTasks = useMemo(() => translateTasksArray(tasks, locale), [tasks, locale]);

  // Group tasks by date
  const groupedTasks = useMemo(() => {
    const map: Record<string, Task[]> = {};
    const filtered = selectedDateFilter
      ? translatedTasks.filter((t) => t.due_date === selectedDateFilter)
      : translatedTasks;

    const sorted = [...filtered].sort((a, b) => {
      if (a.due_date === b.due_date) {
        return (b.priority || 1) - (a.priority || 1);
      }
      return a.due_date.localeCompare(b.due_date);
    });

    sorted.forEach((t) => {
      const dateKey = t.due_date || 'NO_DATE';
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(t);
    });

    return map;
  }, [translatedTasks, selectedDateFilter]);

  const datesList = useMemo(() => Object.keys(groupedTasks), [groupedTasks]);

  const overdueCount = useMemo(() => {
    const today = getLocalDateString();
    return tasks.filter((t) => t.due_date < today && t.status === 'pending').length;
  }, [tasks]);

  const availableVoidDays = useMemo(() => {
    const today = getLocalDateString();
    const count = tasks.filter((t) => t.task_type === 'void' && t.due_date >= today).length;
    return count > 0 ? count : 2;
  }, [tasks]);

  const handleToggleTaskId = async (taskId: string, currentStatus: string, priority: number) => {
    const t = tasks.find((item) => item.id === taskId);
    if (t) {
      handleToggleTask(t);
    }
  };

  const handleRescheduleTaskId = async (taskId: string) => {
    const today = getLocalDateString();
    const t = tasks.find((item) => item.id === taskId);
    if (t) {
      handleRescheduleTask(t, today);
    }
  };

  const taskDatesMap = useMemo(() => {
    const map: Record<string, { total: number; pending: number; completed: number }> = {};
    tasks.forEach((t) => {
      const d = t.due_date;
      if (!d) return;
      if (!map[d]) map[d] = { total: 0, pending: 0, completed: 0 };
      map[d].total += 1;
      if (t.status === 'completed') map[d].completed += 1;
      else map[d].pending += 1;
    });
    return map;
  }, [tasks]);

  if (loading && !refreshing && tasks.length === 0) {
    return (
      <View style={[styles.centerLoading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background Ambient Glow */}
      <View
        pointerEvents="none"
        style={[styles.ambientGlowTop, { backgroundColor: colors.primary }]}
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
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Top Header */}
        <FadeInView delay={0} style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerSubtitle, { color: colors.primary }]}>
              {t('nav.calendar') || 'TEMPORAL MATRIX'}
            </Text>
            <Text style={styles.headerTitle}>{t('plan.learning_map') || 'SCHEDULE & VOIDS'}</Text>
          </View>

          {overdueCount > 0 && (
            <TouchableOpacity
              onPress={() => {
                HapticsEngine.tier2.action();
                setPivotModalVisible(true);
              }}
              style={[styles.pivotTriggerBtn, { borderColor: colors.rose, backgroundColor: `${colors.rose}15` }]}
            >
              <Ionicons name="sparkles" size={14} color={colors.rose} />
              <Text style={[styles.pivotTriggerText, { color: colors.rose }]}>
                {overdueCount} {t('plan.falling_behind') || 'OVERDUE'}
              </Text>
            </TouchableOpacity>
          )}
        </FadeInView>

        {/* 3D Perspective Calendar Grid */}
        <FadeInView delay={50}>
          <CalendarGrid3D
            taskDatesMap={taskDatesMap}
            selectedDate={selectedDateFilter}
            onSelectDate={(date) => {
              setSelectedDateFilter((prev) => (prev === date ? null : date));
            }}
            onTriggerPivot={() => setPivotModalVisible(true)}
          />
        </FadeInView>

        {/* Filter Reset Chip */}
        {selectedDateFilter && (
          <FadeInView delay={80} style={styles.filterChipRow}>
            <TouchableOpacity
              onPress={() => {
                HapticsEngine.tier1.selection();
                setSelectedDateFilter(null);
              }}
              style={[styles.filterChip, { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }]}
            >
              <Text style={[styles.filterChipText, { color: colors.primary }]}>
                FILTER: {formatDateHeader(selectedDateFilter, t, formatDate)} ({t('shop.cancel') || 'CLEAR'})
              </Text>
              <Ionicons name="close-circle" size={16} color={colors.primary} />
            </TouchableOpacity>
          </FadeInView>
        )}

        {/* Tasks List by Date */}
        <FadeInView delay={100} style={{ marginTop: 16 }}>
          {datesList.length === 0 ? (
            <GlassCard style={[styles.emptyCard, { borderColor: colors.glassBorder }]}>
              <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{t('plan.no_tasks_scheduled') || 'NO SCHEDULED TASKS'}</Text>
              <Text style={styles.emptySubtitle}>
                {selectedDateFilter
                  ? t('plan.no_tasks_scheduled') || 'No tasks scheduled on this date.'
                  : t('plan.interactive_roadmap') || 'Forge a learning plan to generate your study timeline.'}
              </Text>
            </GlassCard>
          ) : (
            datesList.map((date) => (
              <View key={date} style={styles.dateGroup}>
                <Text style={[styles.dateGroupHeader, { color: colors.primary }]}>
                  {formatDateHeader(date, t, formatDate)}
                </Text>

                <View style={{ gap: 8 }}>
                  {groupedTasks[date].map((task) => {
                    const prioInfo = getPriorityInfo(task.priority, t);
                    return (
                      <View key={task.id} style={{ position: 'relative' }}>
                        <SwipeableTaskCard
                          task={task}
                          onToggle={handleToggleTaskId}
                          onReschedule={handleRescheduleTaskId}
                          onPress={(t) => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedTask(t);
                            setSheetVisible(true);
                          }}
                          prioColor={prioInfo.color}
                          prioLabel={prioInfo.label}
                        />
                        {animatingTaskId === task.id && (
                          <FloatingXp value={animatingXpValue} />
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </FadeInView>
      </ScrollView>

      {/* Task Interaction Details Sheet */}
      <TaskInteractionSheet
        task={selectedTask as any}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onUpdateTask={handleUpdateTask}
        onStartFocus={handleStartFocus}
      />

      {/* Pivot Slide Recovery Modal */}
      <PivotRecoveryModal
        visible={pivotModalVisible}
        overdueCount={overdueCount}
        availableVoidDays={availableVoidDays}
        userTokens={userTokens}
        hasStreakShield={hasStreakShield}
        onClose={() => {
          setPivotModalVisible(false);
          fetchTasksData(true);
        }}
      />

      {/* Focus Mode Modal */}
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
        onUpdateTask={handleUpdateTask}
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
          fetchTasksData(true);
        }}
        taskTitle={focusTask.title}
        completedMinutes={focusTask.duration}
        onDrillFinished={() => {
          fetchTasksData(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050508',
  },
  centerLoading: {
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
    opacity: 0.05,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 96,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  pivotTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  pivotTriggerText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  filterChipRow: {
    marginTop: 10,
    alignItems: 'flex-start',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#8A92A6',
    textAlign: 'center',
    lineHeight: 16,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateGroupHeader: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
});
