import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeInLeft,
  FadeIn,
} from 'react-native-reanimated';
import { Spacing, BorderRadius, Typography } from '../../constants/theme';
import { PremiumButton } from '../ui/PremiumButton';
import { supabase } from '../../utils/supabase';
import { API_BASE_URL } from '../../utils/api';
import { HapticsEngine } from '../../utils/HapticsEngine';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage, translateTaskTitle } from '../../context/LanguageContext';

interface StreamedTask {
  id: string;
  title: string;
  priority: number;
  day: number;
  estimated_mins: number;
}

export interface PlanGeneratorLoaderProps {
  visible: boolean;
  error?: string | null;
  planParams?: {
    goal: string;
    level: string;
    dailyTime: string;
    style: string;
    userId: string;
    duration?: number;
    intent?: string;
    language?: string;
  };
  onDismiss: () => void;
  onSuccess?: (planId: string) => void;
}

function getPriorityBadgeInfo(priority: number, t: (key: string) => string) {
  switch (priority) {
    case 5:
      return {
        dot: '#EF4444',
        badgeBg: 'rgba(239, 68, 68, 0.12)',
        badgeText: '#F87171',
        label: t('task_card.p5') || 'P5 - DEEP THEORY',
      };
    case 4:
      return {
        dot: '#F59E0B',
        badgeBg: 'rgba(245, 158, 11, 0.12)',
        badgeText: '#FBBF24',
        label: t('task_card.p4') || 'P4 - HARD APPLICATION',
      };
    case 3:
      return {
        dot: '#3B82F6',
        badgeBg: 'rgba(59, 130, 246, 0.12)',
        badgeText: '#60A5FA',
        label: t('task_card.p3') || 'P3 - STANDARD',
      };
    case 2:
      return {
        dot: '#10B981',
        badgeBg: 'rgba(16, 185, 129, 0.12)',
        badgeText: '#34D399',
        label: t('task_card.p2') || 'P2 - THEORY OVERVIEW',
      };
    case 1:
      return {
        dot: '#6B7280',
        badgeBg: 'rgba(107, 114, 128, 0.12)',
        badgeText: '#9CA3AF',
        label: t('task_card.p1') || 'P1 - EXERCISES',
      };
    case 0:
    default:
      return {
        dot: '#6366F1',
        badgeBg: 'rgba(99, 102, 241, 0.15)',
        badgeText: '#A5B4FC',
        label: t('plan.void_day') || 'VOID DAY',
      };
  }
}

/**
 * High-End "Native Plus" AI Architect Orbital Core Animation
 */
const AiArchitectOrb = React.memo(function AiArchitectOrb({
  isReady,
  colors,
}: {
  isReady: boolean;
  colors: any;
}) {
  const orbitRotation1 = useSharedValue(0);
  const orbitRotation2 = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.8);
  const auraScale = useSharedValue(1);

  useEffect(() => {
    // 1. Orbital Ring 1: Clockwise continuous rotation
    orbitRotation1.value = withRepeat(
      withTiming(360, { duration: 9000, easing: Easing.linear }),
      -1,
      false
    );

    // 2. Orbital Ring 2: Counter-Clockwise rotation
    orbitRotation2.value = withRepeat(
      withTiming(-360, { duration: 13000, easing: Easing.linear }),
      -1,
      false
    );

    // 3. Neural Core Breathing Pulse
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1400, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        withTiming(0.96, { duration: 1400, easing: Easing.bezier(0.4, 0, 0.2, 1) })
      ),
      -1,
      true
    );

    // 4. Glow Aura Breath
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 1400, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        withTiming(0.45, { duration: 1400, easing: Easing.bezier(0.4, 0, 0.2, 1) })
      ),
      -1,
      true
    );

    auraScale.value = withRepeat(
      withSequence(
        withTiming(1.22, { duration: 2000, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        withTiming(1.0, { duration: 2000, easing: Easing.bezier(0.4, 0, 0.2, 1) })
      ),
      -1,
      true
    );
  }, [orbitRotation1, orbitRotation2, pulseScale, pulseOpacity, auraScale]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitRotation1.value}deg` }],
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitRotation2.value}deg` }],
  }));

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isReady ? withTiming(1.15, { duration: 400 }) : pulseScale.value }],
  }));

  const auraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isReady ? withTiming(1.35, { duration: 400 }) : auraScale.value }],
    opacity: isReady ? withTiming(1, { duration: 400 }) : pulseOpacity.value,
  }));

  const primaryColor = colors.primary || '#00F0FF';
  const secondaryColor = colors.secondary || '#BD00FF';

  return (
    <View style={styles.orbContainer}>
      {/* Outer Glow Aura */}
      <Animated.View
        style={[
          styles.glowAura,
          {
            backgroundColor: isReady ? '#10B981' : primaryColor,
          },
          auraStyle,
        ]}
      />

      {/* Outer Orbital Ring with node dot */}
      <Animated.View
        style={[
          styles.outerRing,
          {
            borderColor: isReady ? 'rgba(16, 185, 129, 0.35)' : `${primaryColor}40`,
          },
          ring1Style,
        ]}
      >
        <View
          style={[
            styles.orbitalNode,
            {
              backgroundColor: isReady ? '#10B981' : primaryColor,
              shadowColor: primaryColor,
            },
          ]}
        />
      </Animated.View>

      {/* Inner Orbital Ring with node dot */}
      <Animated.View
        style={[
          styles.innerRing,
          {
            borderColor: isReady ? 'rgba(16, 185, 129, 0.45)' : `${secondaryColor}50`,
          },
          ring2Style,
        ]}
      >
        <View
          style={[
            styles.orbitalNodeSecondary,
            {
              backgroundColor: isReady ? '#34D399' : secondaryColor,
              shadowColor: secondaryColor,
            },
          ]}
        />
      </Animated.View>

      {/* Central Neural AI Core */}
      <Animated.View
        style={[
          styles.centralCore,
          {
            backgroundColor: isReady ? 'rgba(16, 185, 129, 0.2)' : 'rgba(20, 24, 36, 0.85)',
            borderColor: isReady ? '#10B981' : `${primaryColor}60`,
          },
          coreStyle,
        ]}
      >
        <Ionicons
          name={isReady ? 'checkmark-circle' : 'sparkles'}
          size={24}
          color={isReady ? '#10B981' : primaryColor}
        />
      </Animated.View>
    </View>
  );
});

export const PlanGeneratorLoader = React.memo(function PlanGeneratorLoader({
  visible,
  planParams,
  onDismiss,
  onSuccess,
}: PlanGeneratorLoaderProps) {
  const { colors } = useTheme();
  const { t, locale } = useLanguage();

  const [tickerIndex, setTickerIndex] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [visibleTasks, setVisibleTasks] = useState<StreamedTask[]>([]);
  const [isReady, setIsReady] = useState(false);

  const progressVal = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const planIdRef = useRef<string>('');
  const isFinishedRef = useRef<boolean>(false);

  const tickerMessages = [
    t('plan_loader.ticker_1') || 'Analyzing your goal & domain...',
    t('plan_loader.ticker_2') || 'Structuring your milestones...',
    t('plan_loader.ticker_3') || 'Balancing difficulty tiers...',
    t('plan_loader.ticker_4') || 'Adding recovery void days...',
    t('plan_loader.ticker_5') || 'Synthesizing daily curriculum...',
    t('plan_loader.ticker_6') || 'Finalizing learning path...',
  ];

  // Animated progress bar styles
  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, Math.max(0, progressVal.value * 100))}%`,
  }));

  // Ticker message cycling
  useEffect(() => {
    if (!visible || errorText || isReady) return;
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % tickerMessages.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [visible, errorText, isReady, tickerMessages.length]);

  // Clean stream cleanup
  const cleanupRequest = useCallback(() => {
    if (xhrRef.current) {
      try {
        xhrRef.current.abort();
      } catch {}
      xhrRef.current = null;
    }
  }, []);

  // Complete and trigger success callback
  const completeSuccessfully = useCallback(
    (targetPlanId: string) => {
      if (isFinishedRef.current) return;
      isFinishedRef.current = true;
      progressVal.value = withTiming(1, { duration: 400 });
      HapticsEngine.tier3.success();
      setIsReady(true);

      setTimeout(() => {
        if (targetPlanId && onSuccess) {
          onSuccess(targetPlanId);
        }
      }, 850);
    },
    [onSuccess, progressVal]
  );

  // Universal React Native & Web Stream Fetcher
  const runStream = useCallback(async () => {
    if (!planParams) return;

    cleanupRequest();
    isFinishedRef.current = false;
    planIdRef.current = '';
    setErrorText(null);
    setIsReady(false);
    setVisibleTasks([]);
    setTickerIndex(0);
    progressVal.value = 0;
    progressVal.value = withTiming(0.92, { duration: 15000 });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Construct robust XMLHttpRequest stream listener
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      const url = `${API_BASE_URL}/api/plans/generate`;
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'text/event-stream');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      let seenIndex = 0;
      let lineBuffer = '';

      const handleDataLine = (dataStr: string) => {
        if (dataStr === '[DONE]') {
          if (planIdRef.current) {
            completeSuccessfully(planIdRef.current);
          }
          return;
        }

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.type === 'start' && parsed.planId) {
            planIdRef.current = parsed.planId;
          } else if (parsed.planId && !planIdRef.current) {
            planIdRef.current = parsed.planId;
          }

          if (parsed.type === 'task' || (parsed.title && parsed.day !== undefined)) {
            const taskObj: StreamedTask = {
              id: parsed.task?.id || parsed.id || `task_${parsed.day || 1}_${Date.now()}`,
              title: parsed.task?.title || parsed.title || '',
              priority: parsed.task?.priority !== undefined ? parsed.task.priority : (parsed.priority ?? 3),
              day: parsed.task?.day !== undefined ? parsed.task.day : (parsed.day ?? 1),
              estimated_mins: parsed.task?.estimated_mins || parsed.estimated_mins || 45,
            };

            HapticsEngine.tier1.light();
            setVisibleTasks((prev) => {
              // Avoid duplicate task keys
              if (prev.some((p) => p.id === taskObj.id || (p.day === taskObj.day && p.title === taskObj.title))) {
                return prev;
              }
              return [...prev, taskObj];
            });
          } else if (parsed.type === 'done') {
            const finalPlanId = parsed.planId || planIdRef.current;
            if (finalPlanId) {
              completeSuccessfully(finalPlanId);
            }
          } else if (parsed.type === 'error' || parsed.error) {
            throw new Error(parsed.error || 'Plan generation failed');
          }
        } catch (parseErr) {
          // Non-fatal parse warning for incomplete chunks
        }
      };

      const parseChunks = () => {
        const text = xhr.responseText || '';
        if (text.length <= seenIndex) return;

        const newChunk = text.slice(seenIndex);
        seenIndex = text.length;

        lineBuffer += newChunk;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || '';

        for (const rawLine of lines) {
          const trimmed = rawLine.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.replace(/^data:\s*/, '');
          handleDataLine(payload);
        }
      };

      xhr.onprogress = () => {
        parseChunks();
      };

      xhr.onreadystatechange = async () => {
        if (xhr.readyState === 3) {
          parseChunks();
        } else if (xhr.readyState === 4) {
          parseChunks();

          if (isFinishedRef.current) return;

          if (xhr.status >= 200 && xhr.status < 300) {
            if (planIdRef.current) {
              completeSuccessfully(planIdRef.current);
            } else {
              // Fallback query if plan was created
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  const { data: latestGoals } = await supabase
                    .from('learning_goals')
                    .select('id')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1);

                  if (latestGoals && latestGoals.length > 0) {
                    completeSuccessfully(latestGoals[0].id);
                    return;
                  }
                }
              } catch {}
              completeSuccessfully(planIdRef.current || 'success');
            }
          } else if (xhr.status !== 0) {
            // Status non-zero error
            let errorMsg = 'Failed to generate plan. Please try again.';
            try {
              const errData = JSON.parse(xhr.responseText);
              if (errData.error) errorMsg = errData.error;
            } catch {}

            // Resilient check: did backend actually create the tasks?
            if (planIdRef.current) {
              const { count } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('goal_id', planIdRef.current);

              if (count && count > 0) {
                completeSuccessfully(planIdRef.current);
                return;
              }
            }

            console.error('Plan stream error response:', xhr.status, xhr.responseText);
            HapticsEngine.tier4.error();
            setErrorText(errorMsg);
          }
        }
      };

      xhr.onerror = async () => {
        if (isFinishedRef.current) return;

        // Check if plan actually got saved in Supabase
        if (planIdRef.current) {
          try {
            const { count } = await supabase
              .from('tasks')
              .select('*', { count: 'exact', head: true })
              .eq('goal_id', planIdRef.current);

            if (count && count > 0) {
              completeSuccessfully(planIdRef.current);
              return;
            }
          } catch {}
        }

        console.error('Plan stream network error');
        HapticsEngine.tier4.error();
        setErrorText(t('common.error') || 'Network error while generating plan. Please try again.');
      };

      xhr.send(JSON.stringify(planParams));
    } catch (err: any) {
      if (isFinishedRef.current) return;
      console.error('Plan stream initialization error:', err);
      HapticsEngine.tier4.error();
      setErrorText(err.message || t('common.error') || 'Failed to initialize curriculum stream.');
    }
  }, [planParams, cleanupRequest, completeSuccessfully, progressVal, t]);

  useEffect(() => {
    if (visible && planParams) {
      runStream();
    } else {
      cleanupRequest();
    }
    return () => {
      cleanupRequest();
    };
  }, [visible, planParams, runStream, cleanupRequest]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDismiss}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlayBg || 'rgba(5, 5, 8, 0.85)' }]}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.cardElevated || colors.card || '#141824',
              borderColor: colors.glassBorderStrong || colors.glassBorder || 'rgba(255, 255, 255, 0.12)',
            },
          ]}
        >
          {/* LifePivot Architect Monogram Badge */}
          <Text style={[styles.logoText, { color: colors.textMuted || '#9CA3AF' }]}>
            {t('plan_loader.architect_badge') || 'LIFEPIVOT AI ARCHITECT'}
          </Text>

          {errorText ? (
            <Animated.View entering={FadeIn} style={styles.contentCenter}>
              <View style={styles.errorIconContainer}>
                <Ionicons name="alert-circle" size={36} color="#EF4444" />
              </View>
              <Text style={styles.title}>{t('plan_loader.status_failed') || 'GENERATION FAILED'}</Text>
              <Text style={styles.errorText}>{errorText}</Text>

              <View style={styles.buttonContainer}>
                <PremiumButton
                  title={t('plan_loader.btn_try_again') || 'TRY AGAIN'}
                  onPress={runStream}
                  variant="primary"
                  style={{ width: '100%', minHeight: 46 }}
                />
                <PremiumButton
                  title={t('plan_loader.btn_skip') || 'SKIP FOR NOW'}
                  onPress={onDismiss}
                  variant="ghost"
                  style={{ width: '100%', minHeight: 46, marginTop: Spacing.two }}
                />
              </View>
            </Animated.View>
          ) : (
            <View style={styles.contentCenter}>
              {/* Native Plus AI Loading Animation */}
              <AiArchitectOrb isReady={isReady} colors={colors} />

              {/* Dynamic Animated Ticker text */}
              <View style={styles.tickerWrapper}>
                <Text
                  numberOfLines={1}
                  style={[styles.tickerText, { color: isReady ? '#10B981' : colors.primary || '#00F0FF' }]}
                >
                  {isReady ? t('plan_loader.status_ready') || 'YOUR PLAN IS READY' : tickerMessages[tickerIndex]}
                </Text>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBarTrack}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    { backgroundColor: isReady ? '#10B981' : colors.primary || '#00F0FF' },
                    progressStyle,
                  ]}
                />
              </View>

              {/* Status Label */}
              <Text style={[styles.label, { color: colors.textMuted || '#9CA3AF' }]}>
                {isReady
                  ? t('common.done') || 'READY'
                  : t('plan_loader.status_building') || 'YOUR PLAN IS BEING BUILT'}
              </Text>

              {/* Real-time Streaming Tasks Area */}
              <View
                style={[
                  styles.streamContainer,
                  {
                    borderColor: colors.glassBorder || 'rgba(255, 255, 255, 0.08)',
                    backgroundColor: colors.surface || 'rgba(11, 13, 23, 0.6)',
                  },
                ]}
              >
                <ScrollView
                  ref={scrollViewRef}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                  {visibleTasks.map((taskItem) => {
                    const badgeInfo = getPriorityBadgeInfo(taskItem.priority, t);
                    const localizedTitle = translateTaskTitle(taskItem.title, locale);

                    return (
                      <Animated.View
                        key={taskItem.id}
                        entering={FadeInLeft.duration(300)}
                        style={[
                          styles.taskCard,
                          {
                            borderColor: colors.glassBorder || 'rgba(255, 255, 255, 0.08)',
                            backgroundColor: colors.card || '#141824',
                          },
                        ]}
                      >
                        {/* Glowing Dot */}
                        <View style={[styles.dot, { backgroundColor: badgeInfo.dot }]} />

                        {/* Title and Priority Badge */}
                        <View style={styles.taskContent}>
                          <Text numberOfLines={1} style={styles.taskTitle}>
                            {localizedTitle}
                          </Text>
                          <View style={[styles.badge, { backgroundColor: badgeInfo.badgeBg }]}>
                            <Text style={[styles.badgeText, { color: badgeInfo.badgeText }]}>
                              {badgeInfo.label}
                            </Text>
                          </View>
                        </View>

                        {/* Day indicator */}
                        <Text style={[styles.dayLabel, { color: colors.textMuted || '#9CA3AF' }]}>
                          {t('plan_loader.day') || t('dashboard.day') || 'DAY'} {taskItem.day}
                        </Text>
                      </Animated.View>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  container: {
    padding: Spacing.five,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
  },
  logoText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: Spacing.three,
    textTransform: 'uppercase',
  },
  contentCenter: {
    alignItems: 'center',
    width: '100%',
  },
  orbContainer: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.two,
  },
  glowAura: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.18,
  },
  outerRing: {
    position: 'absolute',
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  orbitalNode: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: -4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  innerRing: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  orbitalNodeSecondary: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginBottom: -3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  centralCore: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  tickerWrapper: {
    height: 22,
    marginTop: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickerText: {
    ...Typography.body,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: Spacing.two,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: Spacing.two,
    textTransform: 'uppercase',
  },
  streamContainer: {
    width: '100%',
    height: 220,
    marginTop: Spacing.three,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: Spacing.two,
    justifyContent: 'flex-end',
    flexGrow: 1,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.two,
    width: '100%',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: Spacing.two,
  },
  taskContent: {
    flex: 1,
    marginRight: Spacing.two,
  },
  taskTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginTop: 3,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '900',
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginBottom: Spacing.three,
  },
  title: {
    ...Typography.title,
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  errorText: {
    ...Typography.body,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: Spacing.two,
    lineHeight: 18,
    fontSize: 12,
  },
  buttonContainer: {
    width: '100%',
    marginTop: Spacing.four,
  },
});

export default PlanGeneratorLoader;
