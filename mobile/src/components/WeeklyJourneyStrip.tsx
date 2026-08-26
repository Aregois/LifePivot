import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, Shadows, Gradients } from '../constants/theme';
import { GlassCard, GlowBadge } from './ui';

interface WeeklyJourneyStripProps {
  completedDates?: string[];
  currentStreak?: number;
}

export const WeeklyJourneyStrip: React.FC<WeeklyJourneyStripProps> = ({
  completedDates = [],
  currentStreak = 0,
}) => {
  // Generate Monday-Sunday calendar nodes for the current week
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
  const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(today);
  monday.setDate(today.getDate() - distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const days = dayLabels.map((label, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = dateStr === todayStr;
    const isPast = d < today && !isToday;
    const isFuture = d > today && !isToday;
    const isCompleted = completedDates.includes(dateStr);

    return {
      label,
      dayNum: d.getDate(),
      dateStr,
      isToday,
      isPast,
      isFuture,
      isCompleted,
    };
  });

  const completedCount = days.filter((d) => d.isCompleted).length;

  return (
    <GlassCard style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="calendar-outline" size={16} color={C.electricBlue} style={{ marginRight: 6 }} />
          <Text style={styles.title}>WEEKLY JOURNEY</Text>
        </View>
        <GlowBadge
          label={`${completedCount}/7 DAYS`}
          colorScheme={completedCount >= 5 ? 'emerald' : 'blue'}
        />
      </View>

      {/* 7-Day Continuity Strip */}
      <View style={styles.stripContainer}>
        {/* Connecting line */}
        <View style={styles.connectingLine} />

        <View style={styles.nodesRow}>
          {days.map((day, idx) => {
            let nodeBg: string = 'rgba(255, 255, 255, 0.04)';
            let borderColor: string = 'rgba(255, 255, 255, 0.1)';
            let iconColor: string = C.textDim;

            if (day.isCompleted) {
              nodeBg = 'rgba(16, 185, 129, 0.2)';
              borderColor = C.emerald;
              iconColor = C.emerald;
            } else if (day.isToday) {
              nodeBg = 'rgba(0, 240, 255, 0.15)';
              borderColor = C.electricBlue;
              iconColor = C.electricBlue;
            }

            return (
              <View key={idx} style={styles.nodeWrapper}>
                <Text style={[styles.dayLabel, day.isToday && styles.todayLabel]}>
                  {day.label}
                </Text>

                <View
                  style={[
                    styles.nodeCircle,
                    { backgroundColor: nodeBg, borderColor },
                    day.isCompleted && styles.completedGlow,
                    day.isToday && styles.todayGlow,
                  ]}
                >
                  {day.isCompleted ? (
                    <Ionicons name="checkmark" size={14} color={C.emerald} />
                  ) : day.isToday ? (
                    <View style={styles.todayPulse} />
                  ) : (
                    <Text style={styles.dayNum}>{day.dayNum}</Text>
                  )}
                </View>

                {day.isToday && (
                  <View style={styles.todayPill}>
                    <Text style={styles.todayPillText}>TODAY</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Streak Continuity Info */}
      <View style={styles.footer}>
        <View style={styles.streakIndicator}>
          <Ionicons name="flame" size={14} color={C.amber} style={{ marginRight: 4 }} />
          <Text style={styles.streakText}>
            {currentStreak > 0
              ? `${currentStreak} DAY STREAK ACTIVE`
              : 'COMPLETE A SESSION TO IGNITE STREAK'}
          </Text>
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  stripContainer: {
    position: 'relative',
    marginVertical: 4,
  },
  connectingLine: {
    position: 'absolute',
    top: 32,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 0,
  },
  nodesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  nodeWrapper: {
    alignItems: 'center',
    width: 38,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.textDim,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  todayLabel: {
    color: C.electricBlue,
    fontWeight: '900',
  },
  nodeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textDim,
  },
  completedGlow: {
    shadowColor: C.emerald,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  todayGlow: {
    shadowColor: C.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  todayPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.electricBlue,
  },
  todayPill: {
    position: 'absolute',
    bottom: -16,
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  todayPillText: {
    fontSize: 7,
    fontWeight: '900',
    color: C.electricBlue,
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 10,
  },
  streakIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakText: {
    fontSize: 9,
    fontWeight: '900',
    color: C.textDim,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
