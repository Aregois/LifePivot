import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { HapticsEngine } from '../utils/HapticsEngine';
import { useLanguage } from '../context/LanguageContext';
import { C, Gradients } from '../constants/theme';
import { GlassCard, GradientText, GlowBadge, AnimatedProgressBar } from './ui';

const { width } = Dimensions.get('window');

export interface StudyTipCarouselModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => Promise<void> | void;
  rewardAmount?: number;
}

interface StudyTip {
  icon: string;
  tag: string;
  title: string;
  description: string;
  colorScheme: 'cyan' | 'violet' | 'amber' | 'emerald';
}

const STUDY_TIPS: StudyTip[] = [
  {
    icon: '🧠',
    tag: 'COGNITIVE SCIENCE',
    title: 'Active Recall Retrieval',
    description:
      'Testing your memory before re-reading notes creates 3x stronger neural pathways than passive review.',
    colorScheme: 'cyan',
  },
  {
    icon: '⏳',
    tag: 'LEARNING PROTOCOL',
    title: 'Spaced Interval Repetition',
    description:
      'Review concepts right when forgetting curves begin to steepen to achieve permanent long-term retention.',
    colorScheme: 'violet',
  },
  {
    icon: '🌌',
    tag: 'NEURAL CONSOLIDATION',
    title: 'Strategic Void Days',
    description:
      'Taking scheduled rest days allows your brain to organize memories into structural understanding without breaking streaks.',
    colorScheme: 'amber',
  },
  {
    icon: '⚡',
    tag: 'FEYNMAN TECHNIQUE',
    title: 'Conceptual Grounding',
    description:
      'If you cannot explain a concept in simple everyday terms, you have identified a fundamental knowledge gap.',
    colorScheme: 'emerald',
  },
  {
    icon: '🎯',
    tag: 'ENERGY ALIGNMENT',
    title: 'Priority Sequencing (P5/P4)',
    description:
      'Tackle highest-friction syllabus milestones at peak morning alertness for maximum compound gains.',
    colorScheme: 'cyan',
  },
];

const TOTAL_AD_SECONDS = 15;

export const StudyTipCarouselModal: React.FC<StudyTipCarouselModalProps> = ({
  visible,
  onClose,
  onComplete,
  rewardAmount = 5,
}) => {
  const { t } = useLanguage();
  const [secondsRemaining, setSecondsRemaining] = useState(TOTAL_AD_SECONDS);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!visible) return;

    setSecondsRemaining(TOTAL_AD_SECONDS);
    setSlideIndex(0);
    setIsCompleted(false);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsCompleted(true);
          HapticsEngine.tier3.success();
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, onComplete]);

  // Auto-advance study tip every 3 seconds
  useEffect(() => {
    if (!visible || secondsRemaining <= 0) return;
    const elapsed = TOTAL_AD_SECONDS - secondsRemaining;
    const currentSlide = Math.min(Math.floor(elapsed / 3), STUDY_TIPS.length - 1);
    setSlideIndex(currentSlide);
  }, [secondsRemaining, visible]);

  const defaultTip = STUDY_TIPS[slideIndex] || STUDY_TIPS[0];
  const localizedTag = t(`study_tips.tips.${slideIndex}.tag` as any);
  const localizedTitle = t(`study_tips.tips.${slideIndex}.title` as any);
  const localizedDesc = t(`study_tips.tips.${slideIndex}.description` as any);

  const currentTip = {
    icon: defaultTip.icon,
    colorScheme: defaultTip.colorScheme,
    tag: localizedTag && !localizedTag.startsWith('study_tips.') ? localizedTag : defaultTip.tag,
    title: localizedTitle && !localizedTitle.startsWith('study_tips.') ? localizedTitle : defaultTip.title,
    description: localizedDesc && !localizedDesc.startsWith('study_tips.') ? localizedDesc : defaultTip.description,
  };
  const progressRatio = (TOTAL_AD_SECONDS - secondsRemaining) / TOTAL_AD_SECONDS;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (isCompleted) onClose();
      }}
    >
      <View style={styles.overlay}>
        {/* Ambient Glows */}
        <View pointerEvents="none" style={styles.topGlow} />
        <View pointerEvents="none" style={styles.bottomGlow} />

        <GlassCard elevated style={styles.card}>
          {/* Header Bar */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View style={styles.liveDot} />
              <Text style={styles.headerLabel}>{t('study_tips.sponsored_insight' as any)}</Text>
            </View>

            <GlowBadge label={t('study_tips.tokens_reward' as any, { amount: rewardAmount })} colorScheme="amber" glow />
          </View>

          {/* Countdown & Progress bar */}
          <View style={styles.countdownContainer}>
            <View style={styles.timerCircle}>
              <Text style={styles.timerNumber}>{secondsRemaining}</Text>
              <Text style={styles.timerUnit}>SEC</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>
                  {isCompleted ? t('study_tips.reward_unlocked' as any) : t('study_tips.learning_interstitial' as any)}
                </Text>
                <Text style={styles.progressPercent}>
                  {Math.round(progressRatio * 100)}%
                </Text>
              </View>
              <AnimatedProgressBar progress={progressRatio} height={6} />
            </View>
          </View>

          {/* Study Tip Slide Carousel Card */}
          <View style={styles.tipSlideContainer}>
            <View style={styles.tipIconWrapper}>
              <Text style={{ fontSize: 32 }}>{currentTip.icon}</Text>
            </View>

            <GlowBadge
              label={currentTip.tag}
              colorScheme={currentTip.colorScheme}
              style={{ marginBottom: 8 }}
            />

            <Text style={styles.tipTitle}>{currentTip.title}</Text>
            <Text style={styles.tipDescription}>{currentTip.description}</Text>
          </View>

          {/* Slide Indicator Dots */}
          <View style={styles.dotsRow}>
            {STUDY_TIPS.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === slideIndex && styles.dotActive,
                  idx < slideIndex && styles.dotPassed,
                ]}
              />
            ))}
          </View>

          {/* Bottom CTA */}
          {isCompleted ? (
            <TouchableOpacity
              onPress={() => {
                HapticsEngine.tier1.light();
                onClose();
              }}
              style={styles.claimButton}
            >
              <LinearGradient
                colors={[...Gradients.primaryButton]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.claimButtonGradient}
              >
                <Ionicons name="checkmark-done" size={20} color="#050508" />
                <Text style={styles.claimButtonText}>
                  {t('study_tips.claim_reward' as any, { amount: rewardAmount })}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.waitingContainer}>
              <Ionicons name="time-outline" size={16} color={C.textDim} />
              <Text style={styles.waitingText}>
                {secondsRemaining}s
              </Text>
            </View>
          )}
        </GlassCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  topGlow: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#00F0FF',
    opacity: 0.08,
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#BD00FF',
    opacity: 0.08,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.amber,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: C.amber,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  timerCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: C.electricBlue,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  timerNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: C.electricBlue,
    lineHeight: 20,
  },
  timerUnit: {
    fontSize: 8,
    fontWeight: '900',
    color: C.textDim,
    letterSpacing: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  progressPercent: {
    fontSize: 10,
    fontWeight: '800',
    color: C.electricBlue,
  },
  tipSlideContainer: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'center',
  },
  tipIconWrapper: {
    marginBottom: 10,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  tipDescription: {
    fontSize: 12,
    color: C.textDim,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 18,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dotActive: {
    width: 18,
    backgroundColor: C.electricBlue,
  },
  dotPassed: {
    backgroundColor: C.emerald,
  },
  claimButton: {
    width: '100%',
  },
  claimButtonGradient: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  claimButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#050508',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  waitingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  waitingText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textDim,
    letterSpacing: 0.5,
  },
});
