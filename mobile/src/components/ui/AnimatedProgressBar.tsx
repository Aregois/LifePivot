import React, { useEffect } from 'react';
import { View, StyleSheet, type DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { C, Gradients, AnimationConfig, Shadows } from '../../constants/theme';

/* ────────────────────────────────────────────────────────────────────────── */
/*  AnimatedProgressBar                                                      */
/*  Gradient-filled progress bar that springs to its value on mount.         */
/* ────────────────────────────────────────────────────────────────────────── */

interface AnimatedProgressBarProps {
  /** Value between 0 and 1 */
  progress: number;
  /** Track height in px */
  height?: number;
  /** Gradient colors for the fill */
  colors?: readonly string[];
  /** Delay before animation starts (ms) */
  delay?: number;
}

export function AnimatedProgressBar({
  progress,
  height = 8,
  colors = [...Gradients.xpBar],
  delay = 0,
}: AnimatedProgressBarProps) {
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
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <Animated.View
        style={[
          styles.fillWrapper,
          { borderRadius: height / 2 },
          fillStyle,
          Shadows.glowSmall(colors[0] ?? C.electricBlue, 0.25),
        ]}
      >
        <LinearGradient
          colors={colors as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFill, { borderRadius: height / 2 }]}
        />
      </Animated.View>
    </View>
  );
}

export default AnimatedProgressBar;

const styles = StyleSheet.create({
  track: {
    backgroundColor: C.background,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.glassBorderSubtle,
  },
  fillWrapper: {
    height: '100%',
    overflow: 'hidden',
  },
});
