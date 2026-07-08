import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInLeft,
} from 'react-native-reanimated';
import { C, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { PremiumButton } from '../ui/PremiumButton';
import { supabase } from '../../utils/supabase';
import { API_BASE_URL } from '../../utils/api';
import * as Haptics from 'expo-haptics';

interface StreamedTask {
  id: string;
  title: string;
  priority: number;
  day: number;
  estimated_mins: number;
}

interface PlanGeneratorLoaderProps {
  visible: boolean;
  planParams?: {
    goal: string;
    level: string;
    dailyTime: string;
    style: string;
    userId: string;
  };
  onDismiss: () => void;
  onSuccess: (planId: string) => void;
}

const TICKER_MESSAGES = [
  "Analyzing your goal...",
  "Structuring your 30 days...",
  "Balancing difficulty tiers...",
  "Adding recovery days...",
  "Almost ready..."
];

function getPriorityStyles(priority: number) {
  switch (priority) {
    case 5:
      return { dot: '#EF4444', badgeBg: 'rgba(239, 68, 68, 0.1)', badgeText: '#F87171', label: 'P5 - DEEP THEORY' };
    case 4:
      return { dot: '#F59E0B', badgeBg: 'rgba(245, 158, 11, 0.1)', badgeText: '#FBBF24', label: 'P4 - HARD APPLICATION' };
    case 3:
      return { dot: '#3B82F6', badgeBg: 'rgba(59, 130, 246, 0.1)', badgeText: '#60A5FA', label: 'P3 - STANDARD' };
    case 2:
      return { dot: '#10B981', badgeBg: 'rgba(16, 185, 129, 0.1)', badgeText: '#34D399', label: 'P2 - THEORY OVERVIEW' };
    case 1:
      return { dot: '#6B7280', badgeBg: 'rgba(107, 114, 128, 0.1)', badgeText: '#9CA3AF', label: 'P1 - EXERCISES' };
    case 0:
    default:
      return { dot: '#4B5563', badgeBg: 'rgba(75, 85, 99, 0.2)', badgeText: '#9CA3AF', label: 'REST DAY' };
  }
}

export const PlanGeneratorLoader = React.memo(function PlanGeneratorLoader({
  visible,
  planParams,
  onDismiss,
  onSuccess,
}: PlanGeneratorLoaderProps) {
  const [tickerIndex, setTickerIndex] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [visibleTasks, setVisibleTasks] = useState<StreamedTask[]>([]);
  const [isReady, setIsReady] = useState(false);
  
  const progressVal = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Animated progress bar styles
  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressVal.value * 100}%`,
    };
  });

  // Ticker message cycling
  useEffect(() => {
    if (!visible || errorText || isReady) return;
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % TICKER_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [visible, errorText, isReady]);

  // Handle stream fetching
  const runStream = useCallback(async () => {
    if (!planParams) return;
    
    setErrorText(null);
    setIsReady(false);
    setVisibleTasks([]);
    progressVal.value = 0;
    progressVal.value = withTiming(0.95, { duration: 12000 });

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const response = await fetch(`${API_BASE_URL}/api/plans/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(planParams),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream not supported on this device');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let planId = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          const payload = trimmedLine.slice(6).trim();
          if (payload === '[DONE]') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            progressVal.value = withTiming(1.0, { duration: 250 });
            setIsReady(true);
            
            // Wait 800ms, then call onSuccess
            setTimeout(() => {
              onSuccess(planId);
            }, 800);
            return;
          }

          try {
            const data = JSON.parse(payload);
            if (data.error) {
              throw new Error(data.error);
            }

            if (data.planId) {
              planId = data.planId;
            } else {
              // Task object
              const newTask: StreamedTask = {
                id: Math.random().toString(36).substring(2, 9),
                title: data.title,
                priority: data.priority,
                day: data.day,
                estimated_mins: data.estimated_mins,
              };

              setVisibleTasks((prev) => {
                const next = [...prev, newTask];
                if (next.length > 4) {
                  return next.slice(next.length - 4);
                }
                return next;
              });

              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }
          } catch (e: any) {
            if (e.message?.includes('failed') || e.message?.includes('Generation')) {
              throw e;
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Mobile plan generation stream failed:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorText(err.message || 'Something went wrong building your plan.');
    }
  }, [planParams, progressVal, onSuccess]);

  useEffect(() => {
    if (visible) {
      runStream();
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [visible, runStream]);

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Logo */}
          <Text style={styles.logoText}>L I F E P I V O T</Text>

          {errorText ? (
            <View style={styles.contentCenter}>
              <View style={styles.errorIconContainer}>
                <Ionicons name="alert-circle" size={32} color="#EF4444" />
              </View>
              <Text style={styles.title}>GENERATION FAILED</Text>
              <Text style={styles.errorText}>{errorText}</Text>
              
              <View style={styles.buttonContainer}>
                <PremiumButton
                  title="TRY AGAIN"
                  onPress={runStream}
                  variant="primary"
                  style={{ width: '100%', minHeight: 44 }}
                />
                <PremiumButton
                  title="SKIP FOR NOW"
                  onPress={onDismiss}
                  variant="ghost"
                  style={{ width: '100%', minHeight: 44, marginTop: Spacing.two }}
                />
              </View>
            </View>
          ) : (
            <View style={styles.contentCenter}>
              {/* Ticker text */}
              <Text style={styles.tickerText}>
                {isReady ? "YOUR PLAN IS READY" : TICKER_MESSAGES[tickerIndex]}
              </Text>

              {/* Progress bar */}
              <View style={styles.progressBarTrack}>
                <Animated.View style={[styles.progressBarFill, progressStyle]} />
              </View>

              {/* Label */}
              <Text style={styles.label}>
                {isReady ? "DONE" : "YOUR PLAN IS BEING BUILT"}
              </Text>

              {/* Streaming Tasks Area (ScrollView auto-scrolls to latest) */}
              <View style={styles.streamContainer}>
                <ScrollView
                  ref={scrollViewRef}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                  {visibleTasks.map((t) => {
                    const stylesStyles = getPriorityStyles(t.priority);
                    return (
                      <Animated.View
                        key={t.id}
                        entering={FadeInLeft}
                        style={styles.taskCard}
                      >
                        {/* Dot */}
                        <View style={[styles.dot, { backgroundColor: stylesStyles.dot }]} />
                        
                        {/* Title and Badge */}
                        <View style={styles.taskContent}>
                          <Text numberOfLines={1} style={styles.taskTitle}>
                            {t.title}
                          </Text>
                          <View style={[styles.badge, { backgroundColor: stylesStyles.badgeBg }]}>
                            <Text style={[styles.badgeText, { color: stylesStyles.badgeText }]}>
                              {stylesStyles.label}
                            </Text>
                          </View>
                        </View>

                        {/* Day label */}
                        <Text style={styles.dayLabel}>DAY {t.day}</Text>
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
    backgroundColor: 'rgba(5, 5, 8, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  container: {
    padding: Spacing.five,
    borderRadius: BorderRadius.xxl,
    backgroundColor: '#10121a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#4B5563',
    letterSpacing: 4,
    marginBottom: Spacing.four,
  },
  contentCenter: {
    alignItems: 'center',
    width: '100%',
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginBottom: Spacing.four,
  },
  title: {
    ...Typography.title,
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
  },
  errorText: {
    ...Typography.body,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: Spacing.two,
    lineHeight: 18,
    fontSize: 13,
  },
  buttonContainer: {
    width: '100%',
    marginTop: Spacing.four,
  },
  tickerText: {
    ...Typography.body,
    color: '#00F0FF',
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 13,
    height: 20,
  },
  progressBarTrack: {
    width: '100%',
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: Spacing.three,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
    backgroundColor: '#00F0FF',
  },
  label: {
    fontSize: 9,
    fontWeight: '900',
    color: '#4B5563',
    letterSpacing: 2,
    marginTop: Spacing.two,
  },
  streamContainer: {
    width: '100%',
    height: 260,
    marginTop: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: BorderRadius.large,
    marginBottom: Spacing.two,
    width: '100%',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: Spacing.one,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '900',
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#4B5563',
  },
});

export default PlanGeneratorLoader;
