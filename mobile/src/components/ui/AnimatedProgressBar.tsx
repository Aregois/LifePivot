import React, { useEffect } from 'react';
import { View, StyleSheet, type DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { AnimationConfig, Shadows } from '../../constants/theme';

/* ────────────────────────────────────────────────────────────────────────── */
/*  AnimatedProgressBar                                                      */
/*  Gradient-filled progress bar with luminous leading edge glow.            */
/* ────────────────────────────────────────────────────────────────────────── */

interface AnimatedProgressBarProps {
  /** Value between 0 and 1 */
  progress: number;
  /** Track height in px */
  height?: number;
  /** Gradient colors for the fill */
  colors?: readonly string[];
  /** Single solid color fallback for the fill */
  color?: string;
  /** Delay before animation starts (ms) */
  delay?: number;
}

export function AnimatedProgressBar({
  progress,
  height = 8,
  colors,
  color,
  delay = 0,
}: AnimatedProgressBarProps) {
  const { colors: themeColors } = useTheme();
  const activeColors = colors ?? (color ? [color, color] : themeColors.primaryGradient);
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const widthPercent = useSharedValue(0);

  useEffect(() => {
    widthPercent.value = withDelay(
      delay,
      withSpring(clampedProgress, AnimationConfig.spring.gentle),
    );
  }, [clampedProgress, delay, widthPercent]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${widthPercent.value * 100}%` as DimensionValue,
  }));

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: 'rgba(5, 5, 8, 0.6)',
          borderColor: themeColors.glassBorderSubtle,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.fillWrapper,
          { borderRadius: height / 2 },
          fillStyle,
          Shadows.glowSmall(activeColors[0] ?? themeColors.primary, 0.35),
        ]}
      >
        <LinearGradient
          colors={activeColors as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFill, { borderRadius: height / 2 }]}
        />
        {/* Luminous leading edge cap */}
        <View
          style={[
            styles.leadingEdgeGlow,
            {
              backgroundColor: '#FFFFFF',
              width: height,
              height: height,
              borderRadius: height / 2,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

export default AnimatedProgressBar;

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  fillWrapper: {
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  leadingEdgeGlow: {
    position: 'absolute',
    right: 0,
    top: 0,
    opacity: 0.8,
  },
});
