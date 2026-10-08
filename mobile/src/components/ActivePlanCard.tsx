import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { GlassCard, AnimatedProgressBar } from './ui';

export interface PlanStats {
  completed: number;
  total: number;
  todayPending: number;
  todayTotal: number;
  todayCompleted: number;
  currentDay: number;
}

export interface LearningGoal {
  id: string;
  title: string;
  duration_days: number;
  created_at: string;
  plan_metadata?: any;
  tasks?: any[];
}

interface ActivePlanCardProps {
  activeGoal: LearningGoal | null;
  stats: PlanStats | null;
  onOpenSwitcher: () => void;
  onOpenPortal: () => void;
}

export const ActivePlanCard: React.FC<ActivePlanCardProps> = ({
  activeGoal,
  stats,
  onOpenSwitcher,
  onOpenPortal,
}) => {
  const { t } = useLanguage();
  const { colors } = useTheme();

  if (!activeGoal || !stats) {
    return (
      <GlassCard elevated style={styles.emptyCard}>
        <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.primary}20` }]}>
          <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>{t('plan.no_tasks_scheduled') || 'NO ACTIVE CURRICULUM'}</Text>
        <Text style={styles.emptySubtitle}>
          {t('plan.interactive_roadmap') || 'Create or activate a study plan to unlock your daily syllabus and focus tracking.'}
        </Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onOpenPortal();
          }}
          style={[styles.emptyCta, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add-circle-outline" size={16} color="#050508" />
          <Text style={styles.emptyCtaText}>{t('creator.button_generate') || 'CREATE OR CHOOSE PLAN'}</Text>
        </TouchableOpacity>
      </GlassCard>
    );
  }

  const progress = stats.total > 0 ? stats.completed / stats.total : 0;
  const progressPercent = Math.round(progress * 100);
  const isTodayComplete = stats.todayTotal > 0 && stats.todayPending === 0;

  return (
    <View style={styles.container}>
      <GlassCard elevated style={[styles.card, { borderColor: colors.glassBorder }]}>
        {/* Subtle top ambient glow */}
        <View
          pointerEvents="none"
          style={[styles.ambientGlow, { backgroundColor: colors.primary }]}
        />

        {/* Card Header: Goal Metadata & Switcher Trigger */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={styles.badgeRow}>
              <Ionicons name="trending-up" size={14} color={colors.primary} />
              <Text style={[styles.overheadLabel, { color: colors.primary }]}>
                {t('dashboard.focus_session') || 'CURRENT PLAN'}
              </Text>
              <View style={styles.dotSeparator} />
              <Text style={styles.dayPill}>
                {t('plan.day_count', { day: stats.currentDay }) || `DAY ${stats.currentDay}`} / {activeGoal.duration_days}
              </Text>
            </View>
            <Text style={styles.goalTitle} numberOfLines={1}>
              {activeGoal.title}
            </Text>
          </View>

          {/* Switch Plan Button */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenSwitcher();
            }}
            style={[styles.switcherButton, { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }]}
            activeOpacity={0.8}
          >
            <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
            <Text style={[styles.switcherText, { color: colors.primary }]}>
              {t('plan.switch') || 'SWITCH'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Overall Completion Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>
              {t('dashboard.sessions_completed', { completed: stats.completed, total: stats.total }) ||
                `${stats.completed} OF ${stats.total} SESSIONS COMPLETED`}
            </Text>
            <Text style={[styles.progressPercent, { color: colors.primary }]}>{progressPercent}%</Text>
          </View>
          <AnimatedProgressBar
            progress={progress}
            colors={colors.primaryGradient}
          />
        </View>

        {/* Today's Session Status Pill Bar */}
        <View style={styles.footerRow}>
          <View style={styles.todayStatsContainer}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: isTodayComplete ? colors.emerald : colors.primary },
              ]}
            />
            <Text style={styles.todayStatsText}>
              {isTodayComplete
                ? t('focus.session_completed') || `ALL ${stats.todayTotal} SESSIONS DONE TODAY`
                : stats.todayTotal > 0
                ? `${stats.todayCompleted} / ${stats.todayTotal} ${t('plan.today') || 'TODAY'}`
                : t('plan.no_focus_sessions') || 'NO SESSIONS DUE TODAY'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenPortal();
            }}
            style={styles.portalLink}
            activeOpacity={0.7}
          >
            <Text style={[styles.portalLinkText, { color: colors.primary }]}>
              {t('plan.learning_map') || 'VIEW SYLLABUS'}
            </Text>
            <Ionicons name="chevron-forward" size={12} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  card: {
    padding: 18,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(20, 24, 36, 0.85)',
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.16)',
  },
  ambientGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.06,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  overheadLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 6,
  },
  dayPill: {
    fontSize: 9,
    fontWeight: '900',
    color: '#8A92A6',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  switcherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  switcherText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  progressSection: {
    marginVertical: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#8A92A6',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  progressPercent: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  todayStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  todayStatsText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A92A6',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  portalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  portalLinkText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 20,
    marginVertical: 4,
  },
  emptyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 13,
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
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 14,
  },
  emptyCtaText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#050508',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
