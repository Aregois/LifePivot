import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * HapticsEngine: 4-Tier centralized haptic feedback manager.
 * Fully cross-platform safe — silently ignores triggers on web & simulators.
 */
export const HapticsEngine = {
  // ── Tier 1: Subtle Navigation & Discrete Touch ─────────────────────────
  tier1: {
    selection: () => {
      if (Platform.OS === 'web') return;
      Haptics.selectionAsync().catch(() => {});
    },
    tick: () => {
      if (Platform.OS === 'web') return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
    light: () => {
      if (Platform.OS === 'web') return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
  },

  // ── Tier 2: Meaningful Actions & State Changes ─────────────────────────
  tier2: {
    medium: () => {
      if (Platform.OS === 'web') return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    },
    toggle: () => {
      if (Platform.OS === 'web') return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    },
    action: () => {
      if (Platform.OS === 'web') return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    },
  },

  // ── Tier 3: Milestones, Level-Ups & Rewards ────────────────────────────
  tier3: {
    success: () => {
      if (Platform.OS === 'web') return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    },
    heavy: () => {
      if (Platform.OS === 'web') return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    },
    celebrate: () => {
      if (Platform.OS === 'web') return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }, 150);
    },
  },

  // ── Tier 4: Critical Warnings, Locks & Errors ──────────────────────────
  tier4: {
    warning: () => {
      if (Platform.OS === 'web') return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    },
    error: () => {
      if (Platform.OS === 'web') return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    },
    lock: () => {
      if (Platform.OS === 'web') return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    },
  },

  // Direct convenience aliases
  selection: () => {
    if (Platform.OS === 'web') return;
    Haptics.selectionAsync().catch(() => {});
  },
  light: () => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium: () => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  heavy: () => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  success: () => {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warning: () => {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
  error: () => {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};

export default HapticsEngine;
