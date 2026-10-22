import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { HapticsEngine } from '../utils/HapticsEngine';
import { storage } from '../utils/storage';
import { C, Gradients, Shadows, Typography, BorderRadius } from '../constants/theme';
import { GradientText, PremiumButton } from './ui';
import { useTheme, type AccentType } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

interface OnboardingTourModalProps {
  visible: boolean;
  onClose: () => void;
  onStartPlan?: () => void;
}

export const OnboardingTourModal: React.FC<OnboardingTourModalProps> = ({
  visible,
  onClose,
  onStartPlan,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, accent, setAccent } = useTheme();
  const { t } = useLanguage();

  const [currentStep, setCurrentStep] = useState(0);

  // ── Step 0 Interactive Demo: Quest Subtask Toggle ────────────────────────
  const [demoSubtaskDone, setDemoSubtaskDone] = useState(false);
  const [showXpToast, setShowXpToast] = useState(false);

  // ── Step 1 Interactive Demo: Socratic Micro-Drill ─────────────────────────
  const [drillAnswer, setDrillAnswer] = useState<number | null>(null);

  // ── Step 2 Interactive Demo: Pivot Slide ──────────────────────────────────
  const [pivotSlid, setPivotSlid] = useState(false);

  const TOTAL_STEPS = 5;

  const handleFinish = useCallback(async () => {
    HapticsEngine.tier3.celebrate();
    try {
      await storage.setItem('lifepivot_has_seen_tutorial', 'true');
    } catch {
      /* ignore */
    }
    setCurrentStep(0);
    onClose();
  }, [onClose]);

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      HapticsEngine.tier1.tick();
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      HapticsEngine.tier1.tick();
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    HapticsEngine.tier1.light();
    handleFinish();
  };

  const handleLaunchPlan = async () => {
    await handleFinish();
    if (onStartPlan) {
      onStartPlan();
    } else {
      router.push('/plan/create');
    }
  };

  // Step 0: Toggle demo subtask
  const handleToggleDemoSubtask = () => {
    const nextState = !demoSubtaskDone;
    setDemoSubtaskDone(nextState);
    if (nextState) {
      HapticsEngine.tier3.celebrate();
      setShowXpToast(true);
      setTimeout(() => setShowXpToast(false), 3000);
    } else {
      HapticsEngine.tier1.light();
      setShowXpToast(false);
    }
  };

  // Step 1: Handle mini-drill selection
  const handleSelectDrill = (optionIdx: number) => {
    setDrillAnswer(optionIdx);
    if (optionIdx === 1) {
      HapticsEngine.tier3.success();
    } else {
      HapticsEngine.tier4.warning();
    }
  };

  // Step 2: Handle Pivot Slide
  const handlePerformPivot = () => {
    setPivotSlid(true);
    HapticsEngine.tier3.celebrate();
  };

  // Step 3: Handle Live Theme Select
  const handleThemeSelect = (colorKey: AccentType) => {
    HapticsEngine.tier1.tick();
    setAccent(colorKey);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      transparent={false}
      onRequestClose={handleSkip}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Dynamic Ambient Background Glow */}
        <View
          pointerEvents="none"
          style={[
            styles.ambientGlow,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.ambientGlowSecondary,
            {
              backgroundColor: colors.secondary,
            },
          ]}
        />

        {/* ── Top Header & Story Progress Bars ──────────────────────────────── */}
        <View
          style={[
            styles.headerContainer,
            {
              paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 44 : 20) + 8,
            },
          ]}
        >
          {/* Segmented iOS Stories Progress Bar */}
          <View style={styles.segmentedProgressBar}>
            {Array.from({ length: TOTAL_STEPS }).map((_, idx) => {
              const isFilled = idx <= currentStep;
              const isCurrent = idx === currentStep;
              return (
                <View
                  key={idx}
                  style={[
                    styles.segmentTrack,
                    isFilled && { backgroundColor: colors.primary },
                    isCurrent && {
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.8,
                      shadowRadius: 4,
                      elevation: 3,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Navigation Bar: Step Title & Skip */}
          <View style={styles.navRow}>
            <View style={styles.stepBadge}>
              <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.stepBadgeText, { color: colors.primary }]}>
                STEP {currentStep + 1} OF {TOTAL_STEPS}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSkip}
              style={styles.skipButton}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.skipButtonText}>Skip Tour</Text>
              <Ionicons name="close" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Main Scrollable Body ────────────────────────────────────────── */}
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom, 24) + 90,
            },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* STEP 0: Interactive Daily Quests */}
          {currentStep === 0 && (
            <Animated.View entering={FadeInDown.duration(350)} style={styles.stepWrapper}>
              <View style={styles.iconCircleOuter}>
                <View style={[styles.iconCircleInner, { borderColor: colors.primary }]}>
                  <Ionicons name="flash" size={32} color={colors.primary} />
                </View>
              </View>

              <GradientText colors={colors.primaryGradient} style={styles.headline}>
                Bite-Sized Daily Quests
              </GradientText>
              <Text style={styles.subheadline}>
                Turn intimidating subjects into clear, priority-calibrated daily tasks. Tap below to test completing a subtask!
              </Text>

              {/* Interactive Task Card Demo */}
              <View style={[styles.interactiveCard, { borderColor: colors.glassBorderStrong }]}>
                <View style={styles.taskCardHeader}>
                  <View style={[styles.priorityBadge, { backgroundColor: 'rgba(0, 240, 255, 0.15)' }]}>
                    <Ionicons name="flame" size={12} color={colors.primary} />
                    <Text style={[styles.priorityBadgeText, { color: colors.primary }]}>P4 HIGH IMPACT</Text>
                  </View>
                  <Text style={styles.xpRewardTag}>+150 XP · 1 TOKEN</Text>
                </View>

                <Text style={styles.demoTaskTitle}>Machine Learning: Loss Gradient</Text>
                <Text style={styles.demoTaskSub}>Estimated Focus: 25 mins deep sprint</Text>

                {/* Micro Progress Bar */}
                <View style={styles.demoProgressContainer}>
                  <View style={styles.demoProgressTrack}>
                    <View
                      style={[
                        styles.demoProgressFill,
                        {
                          width: demoSubtaskDone ? '100%' : '50%',
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.demoProgressText}>
                    {demoSubtaskDone ? '2/2 Completed (100%)' : '1/2 Completed (50%)'}
                  </Text>
                </View>

                {/* Subtask 1 (Already complete) */}
                <View style={styles.subtaskRow}>
                  <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                  <Text style={[styles.subtaskText, styles.subtaskTextChecked]}>
                    Derive loss function equations
                  </Text>
                </View>

                {/* Subtask 2 (Interactive tap target) */}
                <TouchableOpacity
                  onPress={handleToggleDemoSubtask}
                  style={[
                    styles.subtaskRow,
                    styles.subtaskInteractiveRow,
                    demoSubtaskDone && {
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      borderColor: 'rgba(16, 185, 129, 0.3)',
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={demoSubtaskDone ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={demoSubtaskDone ? '#10B981' : colors.primary}
                  />
                  <Text
                    style={[
                      styles.subtaskText,
                      demoSubtaskDone && styles.subtaskTextChecked,
                    ]}
                  >
                    Compute backprop step by hand
                  </Text>
                  <View style={styles.interactiveIndicator}>
                    <Text style={[styles.interactiveTapText, { color: colors.primary }]}>
                      {demoSubtaskDone ? 'Done! Tap to undo' : 'Tap to test!'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Floating XP Reward banner on completion */}
                {demoSubtaskDone && (
                  <Animated.View entering={FadeIn.duration(250)} style={styles.rewardBanner}>
                    <Ionicons name="sparkles" size={16} color="#F59E0B" />
                    <Text style={styles.rewardBannerText}>
                      +50 XP & 1 Token awarded! Momentum streak +1
                    </Text>
                  </Animated.View>
                )}
              </View>
            </Animated.View>
          )}

          {/* STEP 1: Interactive Socratic Micro-Drill */}
          {currentStep === 1 && (
            <Animated.View entering={FadeInDown.duration(350)} style={styles.stepWrapper}>
              <View style={styles.iconCircleOuter}>
                <View style={[styles.iconCircleInner, { borderColor: colors.secondary }]}>
                  <Ionicons name="school" size={32} color={colors.secondary} />
                </View>
              </View>

              <GradientText colors={colors.primaryGradient} style={styles.headline}>
                Socratic AI Micro-Drills
              </GradientText>
              <Text style={styles.subheadline}>
                Forget passive rereading. LifePivot tests your genuine comprehension with instant 3-question active recall drills.
              </Text>

              {/* Socratic Drill Simulation Card */}
              <View style={[styles.interactiveCard, { borderColor: 'rgba(189, 0, 255, 0.3)' }]}>
                <View style={styles.aiCoachHeader}>
                  <View style={[styles.aiCoachAvatar, { backgroundColor: colors.secondary }]}>
                    <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.aiCoachName}>Socratic Coach</Text>
                    <Text style={styles.aiCoachStatus}>Active Recall Checkpoint</Text>
                  </View>
                </View>

                <Text style={styles.drillQuestion}>
                  "Why does active recall result in 300% better long-term retention than passive reviewing?"
                </Text>

                {/* Option 0 (Distractor) */}
                <TouchableOpacity
                  onPress={() => handleSelectDrill(0)}
                  style={[
                    styles.drillOption,
                    drillAnswer === 0 && styles.drillOptionWrong,
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={styles.drillOptionLetter}>
                    <Text style={styles.drillOptionLetterText}>A</Text>
                  </View>
                  <Text style={styles.drillOptionText}>
                    It takes less time and requires zero mental friction.
                  </Text>
                </TouchableOpacity>

                {/* Option 1 (Correct) */}
                <TouchableOpacity
                  onPress={() => handleSelectDrill(1)}
                  style={[
                    styles.drillOption,
                    drillAnswer === 1 && styles.drillOptionCorrect,
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.drillOptionLetter, drillAnswer === 1 && { backgroundColor: '#10B981' }]}>
                    <Text style={styles.drillOptionLetterText}>B</Text>
                  </View>
                  <Text style={styles.drillOptionText}>
                    Retrieval forces neural pathways to reinforce memory traces.
                  </Text>
                </TouchableOpacity>

                {/* Feedback note */}
                {drillAnswer === 1 && (
                  <Animated.View entering={FadeIn.duration(200)} style={styles.drillFeedbackSuccess}>
                    <Ionicons name="checkmark-done-circle" size={18} color="#10B981" />
                    <Text style={styles.drillFeedbackTextSuccess}>
                      Exact! Socratic drills cement real intuition so knowledge actually sticks.
                    </Text>
                  </Animated.View>
                )}
                {drillAnswer === 0 && (
                  <Animated.View entering={FadeIn.duration(200)} style={styles.drillFeedbackWarning}>
                    <Ionicons name="alert-circle" size={18} color="#F59E0B" />
                    <Text style={styles.drillFeedbackTextWarning}>
                      Passive reviewing gives an illusion of mastery. Try selecting Option B!
                    </Text>
                  </Animated.View>
                )}
              </View>
            </Animated.View>
          )}

          {/* STEP 2: Guilt-Free Pivot Slide & Void Days */}
          {currentStep === 2 && (
            <Animated.View entering={FadeInDown.duration(350)} style={styles.stepWrapper}>
              <View style={styles.iconCircleOuter}>
                <View style={[styles.iconCircleInner, { borderColor: '#F59E0B' }]}>
                  <Ionicons name="shield-checkmark" size={32} color="#F59E0B" />
                </View>
              </View>

              <GradientText colors={['#F59E0B', '#EF4444']} style={styles.headline}>
                Zero-Guilt Pivot Slide
              </GradientText>
              <Text style={styles.subheadline}>
                Life happens. When emergencies strike, our algorithmic Pivot Engine shifts overdue tasks into scheduled Void Days so your streak is never destroyed.
              </Text>

              {/* Pivot Simulation Card */}
              <View style={[styles.interactiveCard, { borderColor: pivotSlid ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.3)' }]}>
                <View style={styles.pivotStatusRow}>
                  <View
                    style={[
                      styles.pivotStatusBadge,
                      {
                        backgroundColor: pivotSlid
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                      },
                    ]}
                  >
                    <Ionicons
                      name={pivotSlid ? 'shield-checkmark' : 'time-outline'}
                      size={12}
                      color={pivotSlid ? '#10B981' : '#EF4444'}
                    />
                    <Text
                      style={[
                        styles.pivotStatusBadgeText,
                        { color: pivotSlid ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      {pivotSlid ? 'REALIGNED & PROTECTED' : 'MISSED YESTERDAY (BUSY DAY)'}
                    </Text>
                  </View>

                  <View style={styles.streakBadge}>
                    <Ionicons name="flame" size={12} color="#F59E0B" />
                    <Text style={styles.streakBadgeText}>5-DAY STREAK</Text>
                  </View>
                </View>

                <Text style={styles.pivotTaskTitle}>Neuroscience: Synaptic Plasticity</Text>
                <Text style={styles.pivotTaskSub}>
                  {pivotSlid
                    ? 'Transferred onto Sunday Void Day buffer. No guilt, momentum intact.'
                    : 'Scheduled for yesterday. Tap button to safely slide without penalty!'}
                </Text>

                {!pivotSlid ? (
                  <TouchableOpacity
                    onPress={handlePerformPivot}
                    style={[styles.pivotActionButton, { backgroundColor: colors.primary }]}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="swap-horizontal" size={18} color="#050508" />
                    <Text style={styles.pivotActionButtonText}>SLIDE TO VOID DAY</Text>
                  </TouchableOpacity>
                ) : (
                  <Animated.View entering={FadeIn.duration(200)} style={styles.pivotSuccessBanner}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pivotSuccessTitle}>Streak Preserved</Text>
                      <Text style={styles.pivotSuccessDesc}>
                        Void Days protect your rest rhythm. No shame, no overwhelm.
                      </Text>
                    </View>
                  </Animated.View>
                )}
              </View>
            </Animated.View>
          )}

          {/* STEP 3: Live Theme & Rank Progression */}
          {currentStep === 3 && (
            <Animated.View entering={FadeInDown.duration(350)} style={styles.stepWrapper}>
              <View style={styles.iconCircleOuter}>
                <View style={[styles.iconCircleInner, { borderColor: colors.primary }]}>
                  <Ionicons name="color-palette" size={32} color={colors.primary} />
                </View>
              </View>

              <GradientText colors={colors.primaryGradient} style={styles.headline}>
                Reactive Themes & Ranks
              </GradientText>
              <Text style={styles.subheadline}>
                Earn XP and Tokens to rank up from Pathseeker to Grandmaster. Customize your entire interface with real-time reactive themes.
              </Text>

              {/* Theme Customizer Preview */}
              <View style={[styles.interactiveCard, { borderColor: colors.glassBorderStrong }]}>
                <Text style={styles.themePickerTitle}>TRY SWITCHING APP THEMES LIVE:</Text>

                <View style={styles.themeSwatchesRow}>
                  {/* Blue */}
                  <TouchableOpacity
                    onPress={() => handleThemeSelect('blue')}
                    style={[
                      styles.themeSwatch,
                      { borderColor: '#00F0FF' },
                      accent === 'blue' && styles.themeSwatchActive,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.swatchCircle, { backgroundColor: '#00F0FF' }]} />
                    <Text style={styles.swatchLabel}>Cyan</Text>
                  </TouchableOpacity>

                  {/* Violet */}
                  <TouchableOpacity
                    onPress={() => handleThemeSelect('violet')}
                    style={[
                      styles.themeSwatch,
                      { borderColor: '#BD00FF' },
                      accent === 'violet' && styles.themeSwatchActive,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.swatchCircle, { backgroundColor: '#BD00FF' }]} />
                    <Text style={styles.swatchLabel}>Violet</Text>
                  </TouchableOpacity>

                  {/* Green */}
                  <TouchableOpacity
                    onPress={() => handleThemeSelect('green')}
                    style={[
                      styles.themeSwatch,
                      { borderColor: '#10B981' },
                      accent === 'green' && styles.themeSwatchActive,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.swatchCircle, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.swatchLabel}>Emerald</Text>
                  </TouchableOpacity>

                  {/* Sunset */}
                  <TouchableOpacity
                    onPress={() => handleThemeSelect('sunset')}
                    style={[
                      styles.themeSwatch,
                      { borderColor: '#F97316' },
                      accent === 'sunset' && styles.themeSwatchActive,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.swatchCircle, { backgroundColor: '#F97316' }]} />
                    <Text style={styles.swatchLabel}>Sunset</Text>
                  </TouchableOpacity>
                </View>

                {/* Level HUD preview */}
                <View style={styles.rankHudPreview}>
                  <View style={styles.rankHudTop}>
                    <View style={styles.rankBadge}>
                      <Ionicons name="ribbon" size={14} color={colors.primary} />
                      <Text style={[styles.rankBadgeText, { color: colors.primary }]}>
                        LEVEL 3 · ACOLYTE
                      </Text>
                    </View>
                    <Text style={styles.rankTokensText}>🪙 24 TOKENS</Text>
                  </View>
                  <View style={styles.rankProgressBar}>
                    <View
                      style={[
                        styles.rankProgressFill,
                        { backgroundColor: colors.primary, width: '65%' },
                      ]}
                    />
                  </View>
                  <Text style={styles.rankXpText}>325 / 500 XP to Scholar</Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* STEP 4: Launchpad (Quickstart) */}
          {currentStep === 4 && (
            <Animated.View entering={FadeInDown.duration(350)} style={styles.stepWrapper}>
              <View style={styles.iconCircleOuter}>
                <View style={[styles.iconCircleInner, { borderColor: '#10B981' }]}>
                  <Ionicons name="rocket" size={32} color="#10B981" />
                </View>
              </View>

              <GradientText colors={colors.primaryGradient} style={styles.headline}>
                You Are Fully Calibrated!
              </GradientText>
              <Text style={styles.subheadline}>
                You now have all the tools to build steady learning momentum. Generate your personalized study roadmap or explore the hub right now.
              </Text>

              {/* Triad Summary Pillars */}
              <View style={[styles.interactiveCard, { borderColor: 'rgba(255, 255, 255, 0.12)' }]}>
                <View style={styles.summaryItem}>
                  <View style={[styles.summaryIconBox, { backgroundColor: 'rgba(0, 240, 255, 0.15)' }]}>
                    <Ionicons name="checkmark-done" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryItemTitle}>Daily Focused Quests</Text>
                    <Text style={styles.summaryItemSub}>Bite-sized goals with clear priority levels (P1-P5).</Text>
                  </View>
                </View>

                <View style={styles.summaryItem}>
                  <View style={[styles.summaryIconBox, { backgroundColor: 'rgba(189, 0, 255, 0.15)' }]}>
                    <Ionicons name="school" size={16} color={colors.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryItemTitle}>Socratic Active Recall</Text>
                    <Text style={styles.summaryItemSub}>Rapid comprehension checks that cement intuition.</Text>
                  </View>
                </View>

                <View style={styles.summaryItem}>
                  <View style={[styles.summaryIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Ionicons name="shield-checkmark" size={16} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryItemTitle}>Guilt-Free Consistency</Text>
                    <Text style={styles.summaryItemSub}>Automatic Pivot Engine protects your streak.</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* ── Fixed Bottom Actions ("Native Plus" iPhone dock) ───────────────── */}
        <View
          style={[
            styles.bottomDock,
            {
              paddingBottom: Math.max(insets.bottom, 20) + 8,
              backgroundColor: colors.background,
              borderTopColor: colors.glassBorderSubtle,
            },
          ]}
        >
          {currentStep === TOTAL_STEPS - 1 ? (
            <View style={styles.launchpadActions}>
              <TouchableOpacity
                onPress={handleLaunchPlan}
                style={[styles.primaryLaunchButton, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Ionicons name="sparkles" size={18} color="#050508" />
                <Text style={styles.primaryLaunchButtonText}>CREATE MY FIRST PLAN</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleFinish}
                style={styles.secondaryLaunchButton}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryLaunchButtonText}>Explore Dashboard</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.dockRow}>
              {currentStep > 0 ? (
                <TouchableOpacity
                  onPress={handleBack}
                  style={styles.backButton}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="arrow-back" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 44 }} />
              )}

              <TouchableOpacity
                onPress={handleNext}
                style={[styles.nextButton, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Text style={styles.nextButtonText}>
                  {currentStep === 0 && !demoSubtaskDone ? 'TRY DEMO OR CONTINUE' : 'CONTINUE'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#050508" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Styles                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050508',
  },
  ambientGlow: {
    position: 'absolute',
    top: -80,
    alignSelf: 'center',
    width: 340,
    height: 340,
    borderRadius: 170,
    opacity: 0.12,
  },
  ambientGlowSecondary: {
    position: 'absolute',
    bottom: 80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.08,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  segmentedProgressBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  segmentTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  skipButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  stepWrapper: {
    alignItems: 'center',
  },
  iconCircleOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  iconCircleInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  interactiveCard: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: 'rgba(20, 24, 36, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 18,
    ...Shadows.card,
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  xpRewardTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  demoTaskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  demoTaskSub: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 14,
  },
  demoProgressContainer: {
    marginBottom: 16,
  },
  demoProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  demoProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  demoProgressText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginBottom: 8,
  },
  subtaskInteractiveRow: {
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
  },
  subtaskText: {
    fontSize: 13,
    color: '#E5E7EB',
    fontWeight: '500',
    flex: 1,
  },
  subtaskTextChecked: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  interactiveIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  interactiveTapText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginTop: 6,
  },
  rewardBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
    flex: 1,
  },
  aiCoachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  aiCoachAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCoachName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiCoachStatus: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  drillQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6',
    lineHeight: 20,
    marginBottom: 14,
  },
  drillOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  drillOptionLetter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillOptionLetterText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  drillOptionText: {
    fontSize: 12,
    color: '#E5E7EB',
    flex: 1,
    lineHeight: 18,
  },
  drillOptionCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  drillOptionWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  drillFeedbackSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  drillFeedbackTextSuccess: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  drillFeedbackWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  drillFeedbackTextWarning: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  pivotStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pivotStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pivotStatusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  streakBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  pivotTaskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  pivotTaskSub: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 14,
  },
  pivotActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    marginTop: 4,
  },
  pivotActionButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#050508',
    letterSpacing: 1,
  },
  pivotSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pivotSuccessTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  pivotSuccessDesc: {
    fontSize: 11,
    color: '#D1D5DB',
    lineHeight: 16,
  },
  themePickerTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9CA3AF',
    letterSpacing: 1.5,
    marginBottom: 14,
    textAlign: 'center',
  },
  themeSwatchesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  themeSwatch: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 64,
  },
  themeSwatchActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  swatchCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: 6,
  },
  swatchLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rankHudPreview: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  rankHudTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  rankTokensText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  rankProgressBar: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  rankProgressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  rankXpText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    textAlign: 'right',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  summaryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  summaryItemSub: {
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  dockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.card,
  },
  nextButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#050508',
    letterSpacing: 0.8,
  },
  launchpadActions: {
    gap: 10,
  },
  primaryLaunchButton: {
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.card,
  },
  primaryLaunchButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#050508',
    letterSpacing: 1,
  },
  secondaryLaunchButton: {
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  secondaryLaunchButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D1D5DB',
  },
});
