import React, { useState, useMemo, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { HapticsEngine } from '../utils/HapticsEngine';
import { useTheme } from '../context/ThemeContext';
import { GlassCard } from './ui';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export interface CalendarDayInfo {
  dayNumber: number;
  dateStr: string;
  isToday: boolean;
  status: 'completed' | 'pending' | 'fractured' | 'void';
  taskCount: number;
}

interface CalendarGrid3DProps {
  taskDatesMap?: Record<string, { total: number; pending: number; completed: number }>;
  selectedDate?: string | null;
  onSelectDate?: (dateStr: string) => void;
  onTriggerPivot?: () => void;
}

interface DayCellProps {
  item: CalendarDayInfo | null;
  isSelected: boolean;
  primaryColor: string;
  emeraldColor: string;
  roseColor: string;
  onPress: (dateStr: string, status: CalendarDayInfo['status']) => void;
}

const DayCell = memo<DayCellProps>(({
  item,
  isSelected,
  primaryColor,
  emeraldColor,
  roseColor,
  onPress,
}) => {
  if (!item) {
    return <View style={styles.emptyCell} />;
  }

  let statusColor = '#374151';
  if (item.isToday) {
    statusColor = primaryColor;
  } else if (item.status === 'completed') {
    statusColor = emeraldColor;
  } else if (item.status === 'pending') {
    statusColor = '#60A5FA';
  } else if (item.status === 'fractured') {
    statusColor = roseColor;
  }

  return (
    <TouchableOpacity
      onPress={() => onPress(item.dateStr, item.status)}
      style={[
        styles.dayCell,
        {
          borderColor: isSelected
            ? primaryColor
            : item.isToday
            ? `${primaryColor}66`
            : 'rgba(255, 255, 255, 0.05)',
          backgroundColor: isSelected ? `${primaryColor}18` : 'rgba(255, 255, 255, 0.02)',
        },
      ]}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.dayNumberText,
          {
            color: item.isToday
              ? primaryColor
              : isSelected
              ? '#FFFFFF'
              : '#9CA3AF',
            fontWeight: item.isToday || isSelected ? '900' : '600',
          },
        ]}
      >
        {item.dayNumber}
      </Text>

      {item.taskCount > 0 && (
        <View style={styles.taskBadgeRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.taskCountText, { color: statusColor }]}>{item.taskCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

export const CalendarGrid3D: React.FC<CalendarGrid3DProps> = ({
  taskDatesMap = {},
  selectedDate,
  onSelectDate,
  onTriggerPivot,
}) => {
  const { colors } = useTheme();
  const [is3DMode, setIs3DMode] = useState<boolean>(false);
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());

  const container3DStyle = useAnimatedStyle(() => ({
    transform: is3DMode
      ? [{ perspective: 1000 }, { rotateX: '15deg' }, { scale: 0.96 }]
      : [{ perspective: 1000 }, { rotateX: '0deg' }, { scale: 1 }],
  }));

  const monthYearLabel = useMemo(() => {
    const MONTH_NAMES = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    const mName = MONTH_NAMES[currentMonthDate.getMonth()] || 'JULY';
    return `${mName} ${currentMonthDate.getFullYear()}`;
  }, [currentMonthDate]);

  const daysInMonthMatrix = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const todayStr = new Date().toISOString().split('T')[0];
    const matrix: (CalendarDayInfo | null)[] = [];

    for (let i = 0; i < firstDayIndex; i++) {
      matrix.push(null);
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      const yStr = dateObj.getFullYear();
      const mStr = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dStr = String(dateObj.getDate()).padStart(2, '0');
      const fullDate = `${yStr}-${mStr}-${dStr}`;

      const stats = taskDatesMap[fullDate] || { total: 0, pending: 0, completed: 0 };
      let status: CalendarDayInfo['status'] = 'void';
      if (stats.total > 0) {
        if (stats.pending === 0 && stats.completed > 0) status = 'completed';
        else if (fullDate < todayStr && stats.pending > 0) status = 'fractured';
        else status = 'pending';
      }

      matrix.push({
        dayNumber: d,
        dateStr: fullDate,
        isToday: fullDate === todayStr,
        status,
        taskCount: stats.total,
      });
    }

    return matrix;
  }, [currentMonthDate, taskDatesMap]);

  const changeMonth = (delta: number) => {
    HapticsEngine.tier1.tick();
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const handleDayPress = (dateStr: string, status: CalendarDayInfo['status']) => {
    HapticsEngine.tier1.selection();
    if (status === 'fractured' && onTriggerPivot) {
      onTriggerPivot();
    }
    if (onSelectDate) {
      onSelectDate(dateStr);
    }
  };

  return (
    <GlassCard elevated style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.subtitle, { color: colors.primary }]}>TEMPORAL SCHEDULE MATRIX</Text>
          <Text style={styles.title}>{monthYearLabel}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => changeMonth(-1)}
            style={styles.navBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => changeMonth(1)}
            style={styles.navBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              HapticsEngine.tier1.light();
              setIs3DMode(!is3DMode);
            }}
            style={[
              styles.toggleBtn,
              is3DMode && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons
              name="cube-outline"
              size={14}
              color={is3DMode ? colors.primary : '#9CA3AF'}
            />
            <Text
              style={[
                styles.toggleText,
                is3DMode && { color: colors.primary, fontWeight: '900' },
              ]}
            >
              {is3DMode ? '3D' : 'FLAT'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekday Headers */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((wd) => (
          <Text key={wd} style={styles.weekdayText}>
            {wd}
          </Text>
        ))}
      </View>

      {/* Grid Container */}
      <Animated.View style={[styles.gridContainer, container3DStyle]}>
        {daysInMonthMatrix.map((item, idx) => (
          <DayCell
            key={item ? item.dateStr : `empty-${idx}`}
            item={item}
            isSelected={item ? selectedDate === item.dateStr : false}
            primaryColor={colors.primary}
            emeraldColor={colors.emerald}
            roseColor={colors.rose}
            onPress={handleDayPress}
          />
        ))}
      </Animated.View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.emerald }]} />
          <Text style={styles.legendText}>COMPLETED</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#60A5FA' }]} />
          <Text style={styles.legendText}>SCHEDULED</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.rose }]} />
          <Text style={styles.legendText}>OVERDUE</Text>
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 24,
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  toggleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 1,
  },
  dayNumberText: {
    fontSize: 11,
    fontWeight: '700',
  },
  taskBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  taskCountText: {
    fontSize: 8,
    fontWeight: '900',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8A92A6',
    letterSpacing: 0.8,
  },
});

export default CalendarGrid3D;
