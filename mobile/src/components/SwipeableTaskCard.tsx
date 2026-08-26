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
import * as Haptics from 'expo-haptics';
import { C } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import { GlassCard, GlowBadge } from './ui';

const SWIPE_THRESHOLD = 70;

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

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 15;
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe Right: Complete Task
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onToggle(task.id, task.status, task.priority);
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        } else if (gestureState.dx < -SWIPE_THRESHOLD && onReschedule) {
          // Swipe Left: Reschedule to Tomorrow
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onReschedule(task.id);
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
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
          <Text style={{ fontSize: 9, fontWeight: '900', color: C.emerald, marginLeft: 4, letterSpacing: 1 }}>
            {t('task_card.swipe_complete') || 'COMPLETE'}
          </Text>
        </View>

        <View style={styles.rightAction}>
          <Text style={{ fontSize: 9, fontWeight: '900', color: C.amber, marginRight: 4, letterSpacing: 1 }}>
            {t('task_card.swipe_tomorrow') || 'RESCHEDULE'}
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
            { borderColor: isCompleted ? 'rgba(16, 185, 129, 0.25)' : C.glassBorder },
          ]}
        >
          {/* Checkbox */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggle(task.id, task.status, task.priority);
            }}
            style={[
              styles.checkbox,
              {
                borderColor: isCompleted ? C.emerald : 'rgba(255, 255, 255, 0.25)',
                backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              },
            ]}
          >
            {isCompleted && <Ionicons name="checkmark" size={14} color={C.emerald} />}
          </TouchableOpacity>

          {/* Details Column */}
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPress(task);
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: isCompleted ? C.textMuted : '#FFFFFF',
                textDecorationLine: isCompleted ? 'line-through' : 'none',
                letterSpacing: 0.2,
              }}
            >
              {task.title}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              {task.subject && <GlowBadge label={task.subject} colorScheme="violet" />}
              {task.duration_mins && (
                <Text style={{ fontSize: 9, color: C.textDim, fontWeight: '700' }}>
                  ⏳ {t('common.mins', { count: task.duration_mins }) || `${task.duration_mins} MINS`}
                </Text>
              )}
              <Text style={{ fontSize: 9, color: prioColor, fontWeight: '900' }}>
                {prioLabel}
              </Text>
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
                  <Text style={{ fontSize: 8, fontWeight: '800', color: C.electricBlue }}>
                    {t('task_card.subtasks_count', { completed: completedSubtasksCount, total: subtasksCount }) || `LIST ${completedSubtasksCount}/${subtasksCount}`}
                  </Text>
                </View>
              )}
            </View>

            {task.notes && !isCompleted && (
              <Text style={{ fontSize: 10, color: C.textDim, marginTop: 4, lineHeight: 14 }} numberOfLines={1}>
                {task.notes}
              </Text>
            )}
          </TouchableOpacity>

          {/* Explicit Details Trigger Button */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPress(task);
            }}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
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
    borderRadius: 16,
    overflow: 'hidden',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#0B0D17',
    borderRadius: 16,
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
    borderRadius: 16,
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
});
