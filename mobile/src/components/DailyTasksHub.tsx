import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HapticsEngine } from '../utils/HapticsEngine';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { GlassCard, GlowBadge, FloatingXp } from './ui';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskItem {
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
  pivoted_count?: number;
  subtasks?: Subtask[];
  notes?: string;
  resources?: any[];
  reflection?: string;
  created_at?: string;
  ai_hint?: string;
}

interface DailyTasksHubProps {
  tasks: TaskItem[];
  todayStr: string;
  onToggleTask: (taskId: string, currentStatus: string, priority: number) => Promise<void>;
  onOpenTaskDetails: (task: TaskItem) => void;
  onStartFocus: (task: TaskItem) => void;
  onOpenPlanPortal: () => void;
}

const PRIORITY_META: Record<number, { label: string; color: string; xp: number; tokens: number }> = {
  5: { label: 'P5 CRITICAL', color: '#F43F5E', xp: 60, tokens: 3 },
  4: { label: 'P4 HIGH', color: '#F97316', xp: 50, tokens: 2 },
  3: { label: 'P3 MEDIUM', color: '#F59E0B', xp: 40, tokens: 1 },
  2: { label: 'P2 LOW', color: '#00F0FF', xp: 30, tokens: 1 },
  1: { label: 'P1 MINIMAL', color: '#6B7280', xp: 20, tokens: 1 },
};

export const DailyTasksHub: React.FC<DailyTasksHubProps> = ({
  tasks,
  todayStr,
  onToggleTask,
  onOpenTaskDetails,
  onStartFocus,
  onOpenPlanPortal,
}) => {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const [animatingTaskId, setAnimatingTaskId] = useState<string | null>(null);
  const [animatingXpValue, setAnimatingXpValue] = useState<number>(0);

  // Filter tasks for today
  const todayTasks = tasks.filter(
    (t) => t.due_date === todayStr && t.task_type !== 'void'
  );
  const completedCount = todayTasks.filter((t) => t.status === 'completed').length;
  const totalCount = todayTasks.length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  const handleToggle = async (task: TaskItem) => {
    const isNowCompleting = task.status !== 'completed';
    const prio = task.priority || 3;
    const prioInfo = PRIORITY_META[prio] || PRIORITY_META[3];

    if (isNowCompleting) {
      HapticsEngine.tier3.celebrate();
      setAnimatingTaskId(task.id);
      setAnimatingXpValue(prioInfo.xp);
      setTimeout(() => {
        setAnimatingTaskId(null);
      }, 1100);
    } else {
      HapticsEngine.tier1.tick();
    }

    await onToggleTask(task.id, task.status, prio);
  };

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Ionicons name="flash" size={16} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.primary }]}>
            {t('profile.daily_quests') || 'DAILY QUESTS'}
          </Text>
        </View>

        <View style={[styles.counterBadge, { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }]}>
          <Text style={[styles.counterText, { color: colors.primary }]}>
            {completedCount} / {totalCount} {t('plan.completed') || 'DONE'}
          </Text>
        </View>
      </View>

      {/* Task List or Empty State */}
      {todayTasks.length === 0 ? (
        <GlassCard style={styles.emptyCard}>
          <View style={[styles.emptyIconCircle, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>{t('plan.no_focus_sessions') || 'NO SESSIONS SCHEDULED TODAY'}</Text>
          <Text style={styles.emptySubtitle}>
            {t('plan.no_tasks_scheduled') || 'Your schedule for today is clear. Review your curriculum to advance your study plan.'}
          </Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenPlanPortal();
            }}
            style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.emptyActionText}>{t('plan.learning_map') || 'OPEN PLAN PORTAL'}</Text>
            <Ionicons name="arrow-forward" size={14} color="#050508" />
          </TouchableOpacity>
        </GlassCard>
      ) : allDone ? (
        <View style={styles.allDoneContainer}>
          {/* List of completed tasks */}
          <View style={styles.taskList}>
            {todayTasks.map((task) => {
              const prioInfo = PRIORITY_META[task.priority] || PRIORITY_META[3];
              return (
                <View key={task.id} style={styles.taskItemWrapper}>
                  {animatingTaskId === task.id && <FloatingXp value={animatingXpValue} />}
                  <GlassCard style={[styles.taskCard, styles.taskCardCompleted]}>
                    <TouchableOpacity
                      onPress={() => handleToggle(task)}
                      style={[styles.checkbox, styles.checkboxCompleted, { backgroundColor: colors.emerald, borderColor: colors.emerald }]}
                    >
                      <Ionicons name="checkmark" size={14} color="#050508" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => onOpenTaskDetails(task)}
                      style={{ flex: 1 }}
                    >
                      <Text
                        style={[styles.taskTitle, styles.taskTitleCompleted]}
                        numberOfLines={1}
                      >
                        {task.title}
                      </Text>
                      <View style={styles.taskMetaRow}>
                        <GlowBadge label={prioInfo.label} colorScheme="emerald" />
                        {task.duration_mins && (
                          <Text style={styles.metaMutedText}>
                            ⏳ {task.duration_mins}M
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  </GlassCard>
                </View>
              );
            })}
          </View>

          {/* Celebration Box */}
          <GlassCard style={styles.celebrationCard}>
            <View style={styles.celebrationRow}>
              <View style={[styles.celebrationIconBox, { backgroundColor: `${colors.amber}20` }]}>
                <Ionicons name="trophy" size={20} color={colors.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.celebrationTitle}>
                  {t('focus.session_completed') || 'ALL DAILY SESSIONS COMPLETED!'}
                </Text>
                <Text style={styles.celebrationSubtitle}>
                  {t('socratic.comprehension_passed') || "You've secured today's milestone. Start a bonus sprint to build your streak."}
                </Text>
              </View>
            </View>
          </GlassCard>
        </View>
      ) : (
        <View style={styles.taskList}>
          {todayTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const prio = task.priority || 3;
            const prioInfo = PRIORITY_META[prio] || PRIORITY_META[3];
            const subtasksCount = task.subtasks?.length || 0;
            const completedSubtasks =
              task.subtasks?.filter((st) => st.completed)?.length || 0;

            return (
              <View key={task.id} style={styles.taskItemWrapper}>
                {animatingTaskId === task.id && <FloatingXp value={animatingXpValue} />}

                <GlassCard
                  style={[
                    styles.taskCard,
                    isCompleted && styles.taskCardCompleted,
                    { borderColor: isCompleted ? 'rgba(255, 255, 255, 0.04)' : colors.glassBorder },
                  ]}
                >
                  {/* Completion Checkbox */}
                  <TouchableOpacity
                    onPress={() => handleToggle(task)}
                    style={[
                      styles.checkbox,
                      isCompleted && [styles.checkboxCompleted, { backgroundColor: colors.emerald, borderColor: colors.emerald }],
                    ]}
                    activeOpacity={0.7}
                  >
                    {isCompleted && (
                      <Ionicons name="checkmark" size={14} color="#050508" />
                    )}
                  </TouchableOpacity>

                  {/* Task Summary & Metadata */}
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onOpenTaskDetails(task);
                    }}
                    style={{ flex: 1, marginRight: 8 }}
                  >
                    <Text
                      style={[
                        styles.taskTitle,
                        isCompleted && styles.taskTitleCompleted,
                      ]}
                      numberOfLines={1}
                    >
                      {task.title}
                    </Text>

                    <View style={styles.taskMetaRow}>
                      {task.subject && (
                        <GlowBadge label={task.subject} colorScheme="violet" />
                      )}
                      <Text
                        style={[
                          styles.prioText,
                          { color: isCompleted ? '#6B7280' : prioInfo.color },
                        ]}
                      >
                        {prioInfo.label}
                      </Text>
                      {task.duration_mins && (
                        <Text style={styles.metaMutedText}>
                          ⏳ {task.duration_mins}M
                        </Text>
                      )}
                      {subtasksCount > 0 && (
                        <View style={styles.subtaskPill}>
                          <Text style={styles.subtaskPillText}>
                            {completedSubtasks}/{subtasksCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Action Buttons: Quick Focus Mode & Details */}
                  <View style={styles.taskActionsRow}>
                    {!isCompleted && (
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          onStartFocus(task);
                        }}
                        style={[styles.focusActionBtn, { backgroundColor: colors.primary }]}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="play" size={12} color="#050508" />
                        <Text style={styles.focusActionText}>{t('task_card.btn_focus') || 'FOCUS'}</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onOpenTaskDetails(task);
                      }}
                      style={styles.detailsChevronBtn}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  counterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  counterText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#8A92A6',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 14,
  },
  emptyActionText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#050508',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  allDoneContainer: {
    gap: 10,
  },
  taskList: {
    gap: 8,
  },
  taskItemWrapper: {
    position: 'relative',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 24, 36, 0.85)',
    borderWidth: 1,
  },
  taskCardCompleted: {
    opacity: 0.6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxCompleted: {},
  taskTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  prioText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  metaMutedText: {
    fontSize: 9,
    color: '#8A92A6',
    fontWeight: '700',
  },
  subtaskPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  subtaskPillText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#9CA3AF',
  },
  taskActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  focusActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  focusActionText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#050508',
    letterSpacing: 1,
  },
  detailsChevronBtn: {
    padding: 4,
  },
  celebrationCard: {
    padding: 14,
    borderRadius: 16,
    marginTop: 4,
  },
  celebrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  celebrationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  celebrationSubtitle: {
    fontSize: 10,
    color: '#8A92A6',
    marginTop: 2,
    lineHeight: 14,
  },
});
