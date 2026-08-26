import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HapticsEngine } from '../utils/HapticsEngine';
import { C, Gradients } from '../constants/theme';
import { GradientText, PremiumButton } from './ui';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface OnboardingTourModalProps {
  visible: boolean;
  onClose: () => void;
}

export const OnboardingTourModal: React.FC<OnboardingTourModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);

  const STEPS = [
    {
      icon: 'layers-outline',
      title: 'ACTIVE PLAN & DAILY QUESTS',
      desc: 'LifePivot structures your academic goals into adaptive daily schedules with priority scaling (P1-P5), interactive subtasks, and Socratic AI hints.',
      color: colors.primary,
    },
    {
      icon: 'school-outline',
      title: 'SOCRATIC MICRO-DRILLS',
      desc: 'Solidify deep intuition after focus sprints with dynamic Gemini-powered 3-question active recall comprehension checks that reward XP and tokens.',
      color: colors.primary,
    },
    {
      icon: 'cube-outline',
      title: '3D CALENDAR & PIVOT SLIDE',
      desc: 'Missed a session? Algorithmic Pivot Slide dynamically shifts tasks into scheduled Void Days on the 3D grid to protect your momentum.',
      color: colors.secondary,
    },
    {
      icon: 'sparkles-outline',
      title: 'DYNAMIC REACTIVE THEMES',
      desc: 'Level up your profile to unlock and switch vibrant themes across the entire app interface in real time.',
      color: colors.amber,
    },
  ];

  const stepData = STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStep((prev) => prev + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCurrentStep(0);
      onClose();
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Background Ambient Glow */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -60,
            alignSelf: 'center',
            width: 280,
            height: 280,
            borderRadius: 140,
            backgroundColor: stepData.color,
            opacity: 0.08,
          }}
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.iconButton}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.stepCounter, { color: stepData.color }]}>
            STEP {currentStep + 1} OF {STEPS.length}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {/* Icon Circle */}
          <View style={[styles.iconCircle, { borderColor: stepData.color }]}>
            <Ionicons name={stepData.icon as any} size={48} color={stepData.color} />
          </View>

          {/* Title & Description */}
          <GradientText colors={colors.primaryGradient} style={styles.title}>
            {stepData.title}
          </GradientText>
          <Text style={styles.description}>{stepData.desc}</Text>

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            {STEPS.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === currentStep && { backgroundColor: stepData.color, width: 24 },
                ]}
              />
            ))}
          </View>

          <PremiumButton
            title={currentStep === STEPS.length - 1 ? 'BEGIN JOURNEY' : 'CONTINUE TOUR'}
            onPress={handleNext}
            variant="primary"
            style={{ width: '100%', marginTop: 32 }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050508',
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepCounter: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  content: {
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 14,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});
