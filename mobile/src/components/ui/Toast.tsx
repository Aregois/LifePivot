/* eslint-disable react-hooks/immutability */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { C, Spacing, BorderRadius, Typography, SemanticColors } from '../../constants/theme';
import { triggerHaptic } from '../../utils/haptics';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// Simple event listeners registry for Toast
type ToastCallback = (toast: ToastMessage) => void;
const listeners = new Set<ToastCallback>();

export const toastController = {
  show: (message: string, type: ToastType = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substring(7);
    const toast: ToastMessage = { id, type, message, duration };
    
    // Trigger corresponding haptic automatically
    switch (type) {
      case 'success':
        triggerHaptic.success();
        break;
      case 'error':
        triggerHaptic.error();
        break;
      case 'warning':
        triggerHaptic.warning();
        break;
      case 'info':
      default:
        triggerHaptic.light();
        break;
    }
    
    listeners.forEach(cb => cb(toast));
  },
  success: (message: string, duration?: number) => toastController.show(message, 'success', duration),
  info: (message: string, duration?: number) => toastController.show(message, 'info', duration),
  warning: (message: string, duration?: number) => toastController.show(message, 'warning', duration),
  error: (message: string, duration?: number) => toastController.show(message, 'error', duration),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [activeToast, setActiveToast] = useState<ToastMessage | null>(null);
  
  useEffect(() => {
    const handleToast = (toast: ToastMessage) => {
      setActiveToast(toast);
    };
    listeners.add(handleToast);
    return () => {
      listeners.delete(handleToast);
    };
  }, []);

  const handleDismiss = useCallback(() => {
    setActiveToast(null);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {activeToast && (
        <ToastContainer
          key={activeToast.id}
          toast={activeToast}
          onDismiss={handleDismiss}
        />
      )}
    </View>
  );
}

function ToastContainer({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Slide in
    translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 250 });

    // Slide out after duration
    const timeout = setTimeout(() => {
      translateY.value = withTiming(-100, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 }, () => {
        onDismiss();
      });
    }, toast.duration ?? 3000);

    return () => clearTimeout(timeout);
  }, [toast, onDismiss, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const iconName = {
    success: 'check-circle',
    info: 'info',
    warning: 'alert-triangle',
    error: 'x-circle',
  }[toast.type] as keyof typeof Feather.glyphMap;

  const iconColor = {
    success: SemanticColors.success,
    info: C.electricBlue,
    warning: SemanticColors.warning,
    error: SemanticColors.error,
  }[toast.type];

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <GlassToast type={toast.type}>
        <Feather name={iconName} size={20} color={iconColor} style={styles.icon} />
        <Text style={styles.message}>{toast.message}</Text>
      </GlassToast>
    </Animated.View>
  );
}

function GlassToast({ children, type }: { children: React.ReactNode; type: ToastType }) {
  const glowColor = {
    success: 'rgba(16, 185, 129, 0.15)',
    info: 'rgba(0, 240, 255, 0.15)',
    warning: 'rgba(245, 158, 11, 0.15)',
    error: 'rgba(244, 63, 94, 0.15)',
  }[type];

  return (
    <View style={[styles.toast, { borderColor: glowColor, backgroundColor: 'rgba(5, 5, 8, 0.85)' }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: Spacing.four,
    right: Spacing.four,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: '100%',
  },
  icon: {
    marginRight: Spacing.two,
  },
  message: {
    ...Typography.body,
    fontWeight: '700',
    color: '#ffffff',
    fontSize: 13,
  },
});
