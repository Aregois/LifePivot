import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HapticsEngine } from '../utils/HapticsEngine';
import { C, BorderRadius } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import { GlassCard, GlowBadge } from './ui';

const SWIPE_THRESHOLD = 75;

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
}

interface SwipeableTaskCardProps {
  task: Task;
  onToggle: (taskId: string, currentStatus: string, priority: number) => void;
  onReschedule?: (taskId: string) => void;
  onPress: (task: Task) => void;
  prioColor?: string;
  prioLabel?: string;
}

export const SwipeableTaskCard: React.FC<SwipeableTaskCardProps> = ({
  task,
  onToggle,
  onReschedule,
  onPress,
  prioColor = C.electricBlue,
  prioLabel = '',
}) => {
  const { t } = useLanguage();
  const pan = useRef(new Animated.ValueXY()).current;
  const isTriggered = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dy) < 14;
      },
      onPanResponderGrant: () => {
        isTriggered.current = false;
      },
      onPanResponderMove: (_, gestureState) => {
        // Rubber-band resistance curve
        const dx = gestureState.dx;
        let clampedDx = dx;
        if (Math.abs(dx) > SWIPE_THRESHOLD) {
          const excess = Math.abs(dx) - SWIPE_THRESHOLD;
          const damped = SWIPE_THRESHOLD + excess * 0.45;
          clampedDx = dx > 0 ? damped : -damped;

          if (!isTriggered.current) {
            isTriggered.current = true;
            HapticsEngine.tier1.selection();
          }
        } else {
          isTriggered.current = false;
        }

        pan.setValue({ x: clampedDx, y: 0 });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe Right: Complete Task
          HapticsEngine.tier3.success();
          onToggle(task.id, task.status, task.priority);
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }).start();
        } else if (gestureState.dx < -SWIPE_THRESHOLD && onReschedule) {
          // Swipe Left: Reschedule to Tomorrow
          HapticsEngine.tier2.action();
          onReschedule(task.id);
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 8,
            tension: 45,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const isCompleted = task.status === 'completed';
  const subtasksCount = task.subtasks?.length || 0;
  const completedSubtasksCount = task.subtasks?.filter((st) => st.completed)?.length || 0;

  return (
    <View style={styles.cardContainer}>
      {/* Background Actions Layer */}
      <View style={styles.backgroundLayer}>
        <View style={styles.leftAction}>
          <Ionicons name="checkmark-circle" size={20} color={C.emerald} />
          <Text style={{ fontSize: 10, fontWeight: '800', color: C.emerald, marginLeft: 6, letterSpacing: 0.5 }}>
            {t('task_card.swipe_complete') || 'Complete'}
          </Text>
        </View>

        <View style={styles.rightAction}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: C.amber, marginRight: 6, letterSpacing: 0.5 }}>
            {t('task_card.swipe_tomorrow') || 'Reschedule'}
          </Text>
          <Ionicons name="time" size={20} color={C.amber} />
        </View>
      </View>

      {/* Swipeable Foreground Card */}
      <Animated.View
        style={[{ transform: [{ translateX: pan.x }] }]}
        {...panResponder.panHandlers}
      >
        <GlassCard
          style={[
            styles.foregroundCard,
            { borderColor: isCompleted ? 'rgba(16, 185, 129, 0.3)' : C.glassBorder },
          ]}
        >
          {/* Checkbox with accessible touch target */}
          <TouchableOpacity
            onPress={() => {
              HapticsEngine.tier2.action();
              onToggle(task.id, task.status, task.priority);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isCompleted }}
            style={[
              styles.checkbox,
              {
                borderColor: isCompleted ? C.emerald : 'rgba(255, 255, 255, 0.3)',
                backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
              },
            ]}
          >
            {isCompleted && <Ionicons name="checkmark" size={14} color={C.emerald} />}
          </TouchableOpacity>

          {/* Details Column */}
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.7}
            onPress={() => {
              HapticsEngine.tier1.selection();
              onPress(task);
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: isCompleted ? C.textMuted : '#FFFFFF',
                textDecorationLine: isCompleted ? 'line-through' : 'none',
                letterSpacing: -0.2,
                lineHeight: 20,
              }}
              numberOfLines={2}
            >
              {task.title}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
              {task.subject && <GlowBadge label={task.subject} colorScheme="violet" />}
              {task.duration_mins && (
                <View style={styles.metaChip}>
                  <Ionicons name="time-outline" size={11} color={C.textDim} />
                  <Text style={{ fontSize: 10, color: C.textDim, fontWeight: '600', marginLeft: 3 }}>
                    {t('common.mins', { count: task.duration_mins }) || `${task.duration_mins} mins`}
                  </Text>
                </View>
              )}
              {prioLabel ? (
                <View style={[styles.prioPill, { borderColor: `${prioColor}40`, backgroundColor: `${prioColor}15` }]}>
                  <View style={[styles.prioDot, { backgroundColor: prioColor }]} />
                  <Text style={{ fontSize: 9, color: prioColor, fontWeight: '800' }}>
                    {prioLabel}
                  </Text>
                </View>
              ) : null}
              {subtasksCount > 0 && (
                <View
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: '700', color: C.electricBlue }}>
                    {t('task_card.subtasks_count', { completed: completedSubtasksCount, total: subtasksCount }) || `Subtasks ${completedSubtasksCount}/${subtasksCount}`}
                  </Text>
                </View>
              )}
            </View>

            {task.notes && !isCompleted && (
              <Text style={{ fontSize: 11, color: C.textDim, marginTop: 4, lineHeight: 15 }} numberOfLines={1}>
                {task.notes}
              </Text>
            )}
          </TouchableOpacity>

          {/* Explicit Details Trigger Button */}
          <TouchableOpacity
            onPress={() => {
              HapticsEngine.tier1.selection();
              onPress(task);
            }}
            accessibilityRole="button"
            accessibilityLabel="Task details"
            style={styles.actionBtn}
          >
            <Ionicons name="ellipsis-vertical" size={14} color={C.electricBlue} />
          </TouchableOpacity>
        </GlassCard>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: 4,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    backgroundColor: '#0B0D17',
    borderRadius: BorderRadius.xl,
  },
  leftAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foregroundCard: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: BorderRadius.xl,
    backgroundColor: '#141824',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  prioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  prioDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
