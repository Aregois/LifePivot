import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Animated,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase';
import { C, Gradients, Shadows } from '../../constants/theme';
import { FadeInView, GlassCard, GradientText, GlowBadge, PremiumButton } from '../../components/ui';
import { TaskInteractionSheet } from '../../components/TaskInteractionSheet';

function FloatingXp({ value }: { value: number }) {
  const animValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [animValue]);

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [10, -45],
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  const scale = animValue.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.8, 1.2, 0.9],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 10,
        left: '45%',
        zIndex: 99,
        transform: [{ translateY }, { scale }],
        opacity,
      }}
    >
      <Text
        style={{
          color: '#00F0FF',
          fontWeight: '900',
          fontSize: 16,
          textShadowColor: 'rgba(0, 240, 255, 0.8)',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 8,
        }}
      >
        +{value} XP
      </Text>
    </Animated.View>
  );
}

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

function formatHeaderDate(dateStr: string): string {
  if (!dateStr || dateStr === 'No Date') return 'UNDATED TASKS';

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
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);

      return date
        .toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })
        .toUpperCase();
    }
  } catch (e) {
    // fallback to raw date
  }
  return dateStr.toUpperCase();
}

function getPriorityInfo(priority: number) {
  switch (priority) {
    case 5:
      return { label: 'CRITICAL', color: C.rose };
    case 4:
      return { label: 'HIGH', color: C.orange };
    case 3:
      return { label: 'MEDIUM', color: C.amber };
    case 2:
      return { label: 'LOW', color: C.electricBlue };
    default:
      return { label: 'MINIMAL', color: C.textMuted };
  }
}

export default function CalendarPortal() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [animatingTaskId, setAnimatingTaskId] = useState<string | null>(null);
  const [animatingXpValue, setAnimatingXpValue] = useState<number>(0);

  const fetchTasksData = async (silent = false) => {
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

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching calendar tasks:', error);
        return;
      }

      setTasks(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTasksData();
    }, [])
  );

  // Real-time synchronization
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('calendar_tasks_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          fetchTasksData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleToggleTask = async (
    taskId: string,
    currentStatus: 'pending' | 'completed',
    priority: number
  ) => {
    if (!userId) return;

    if (currentStatus === 'pending') {
      const baseXp = priority && priority > 0 ? priority * 10 + 10 : 0;
      setAnimatingTaskId(taskId);
      setAnimatingXpValue(baseXp);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        setAnimatingTaskId(null);
      }, 900);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    // Optimistic State Update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
    );

    // Update task status in database
    const { error: taskError } = await supabase
      .from('tasks')
      .update({ status: nextStatus })
      .eq('id', taskId);

    if (taskError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('ERROR', 'Failed to update task');
      // Revert state
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: currentStatus } : t))
      );
      return;
    }

    // Handle XP and token rewards
    try {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('xp, level, tokens_balance')
        .eq('id', userId)
        .single();

      if (!profileErr && profile) {
        const tokenDelta = TOKEN_REWARD[priority ?? 3] ?? 1;
        const baseXp = priority && priority > 0 ? priority * 10 + 10 : 0;

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

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTasksData(true);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050508' }}>
        <ActivityIndicator size="large" color="#00F0FF" />
      </View>
    );
  }

  // Group tasks by due date
  const groupedTasks: Record<string, Task[]> = {};
  tasks.forEach((task) => {
    const key = task.due_date || 'No Date';
    if (!groupedTasks[key]) {
      groupedTasks[key] = [];
    }
    groupedTasks[key].push(task);
  });

  // Sort dates (undated tasks go to the bottom)
  const sortedDates = Object.keys(groupedTasks).sort((a, b) => {
    if (a === 'No Date') return 1;
    if (b === 'No Date') return -1;
    return a.localeCompare(b);
  });

  if (tasks.length === 0) {
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
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00F0FF" />
          }
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}
          style={{ flex: 1 }}
        >
          <FadeInView style={{ alignItems: 'center', paddingHorizontal: 20, width: '100%' }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: 'rgba(0, 240, 255, 0.05)',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
                borderWidth: 1,
                borderColor: 'rgba(0, 240, 255, 0.15)',
              }}
            >
              <Ionicons name="calendar-outline" size={40} color={C.electricBlue} />
            </View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '900',
                color: '#FFFFFF',
                letterSpacing: -0.5,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              No Agenda Items
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: C.textSecondary,
                textAlign: 'center',
                lineHeight: 18,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 24,
              }}
            >
              You have no active learning tasks scheduled. Import a plan from the Plans or Exchange tab to begin!
            </Text>
            <PremiumButton
              title="EXPLORE SYLLABUS PLANS"
              onPress={() => router.push('/(tabs)/plan')}
              variant="primary"
              style={{ width: '100%', minHeight: 48 }}
            />
          </FadeInView>
        </ScrollView>
      </View>
    );
  }

  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
  const totalTasksCount = tasks.length;
  const completionPercentage =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

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

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00F0FF" />
        }
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          // Account for absolute-positioned bottom tabs
          paddingBottom: Platform.OS === 'ios' ? 120 : 96,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header section */}
        <FadeInView delay={0} style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 10,
              color: C.electricBlue,
              fontWeight: '900',
              letterSpacing: 3.5, // tracking-widest
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            AGENDA PLANNER
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <GradientText
              style={{
                fontSize: 24,
                fontWeight: '900',
                letterSpacing: -0.5, // tracking-tight
                textTransform: 'uppercase',
              }}
            >
              CALENDAR
            </GradientText>
            <GlowBadge label={`${completionPercentage}% DONE`} colorScheme="emerald" />
          </View>
        </FadeInView>

        {/* Agenda schedule */}
        <FadeInView delay={100}>
          {sortedDates.map((date) => (
            <View key={date} style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 10,
                  color: C.textDim,
                  fontWeight: '800',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  marginBottom: 12,
                  paddingLeft: 4,
                }}
              >
                {formatHeaderDate(date)}
              </Text>
              <View style={{ gap: 10 }}>
                {groupedTasks[date].map((task) => {
                  const prioInfo = getPriorityInfo(task.priority);
                  return (
                    <GlassCard
                      key={task.id}
                      style={{
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        borderColor:
                          task.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : C.glassBorder,
                      }}
                    >
                      {/* Checkbox */}
                      <TouchableOpacity
                        onPress={() => handleToggleTask(task.id, task.status, task.priority)}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: task.status === 'completed' ? '#10B981' : 'rgba(255,255,255,0.2)',
                          backgroundColor:
                            task.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {task.status === 'completed' && (
                          <Ionicons name="checkmark" size={14} color="#10B981" />
                        )}
                      </TouchableOpacity>

                      {/* Content */}
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedTask(task);
                          setSheetVisible(true);
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '800',
                            color: task.status === 'completed' ? C.textMuted : '#FFFFFF',
                            textDecorationLine: task.status === 'completed' ? 'line-through' : 'none',
                          }}
                        >
                          {task.title}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          {task.subject && <GlowBadge label={task.subject} colorScheme="violet" />}
                          {task.duration_mins && (
                            <Text style={{ fontSize: 9, color: C.textDim, fontWeight: '700' }}>
                              ⏳ {task.duration_mins} MINS
                            </Text>
                          )}
                          <Text style={{ fontSize: 9, color: prioInfo.color, fontWeight: '800' }}>
                            {prioInfo.label}
                          </Text>
                        </View>
                        {task.notes && task.status !== 'completed' && (
                          <Text style={{ fontSize: 10, color: C.textDim, marginTop: 6, lineHeight: 14 }}>
                            {task.notes}
                          </Text>
                        )}
                      </TouchableOpacity>
                      {animatingTaskId === task.id && (
                        <FloatingXp value={animatingXpValue} />
                      )}
                    </GlassCard>
                  );
                })}
              </View>
            </View>
          ))}
        </FadeInView>
      </ScrollView>
      <TaskInteractionSheet
        task={selectedTask}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}
