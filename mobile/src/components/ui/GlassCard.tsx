/* eslint-disable react-hooks/immutability */
import React, { useCallback } from 'react';
import { Pressable, type ViewStyle, type StyleProp, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { HapticsEngine } from '../../utils/HapticsEngine';
import { useTheme } from '../../context/ThemeContext';
import { Shadows, BorderRadius, Spacing, AnimationConfig } from '../../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GlassCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevated?: boolean;
  glowColor?: string;
  activeOpacity?: number;
  disabled?: boolean;
}

/**
 * GlassCard: Premium interactive obsidian glass card with Reanimated 4 spring scale physics.
 */
export function GlassCard({
  children,
  onPress,
  style,
  padded = true,
  elevated = false,
  glowColor,
  disabled = false,
}: GlassCardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedScale = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (disabled || !onPress) return;
    scale.value = withSpring(0.98, AnimationConfig.spring.scalePress);
  }, [disabled, onPress, scale]);

  const handlePressOut = useCallback(() => {
    if (disabled || !onPress) return;
    scale.value = withSpring(1, AnimationConfig.spring.bouncy);
  }, [disabled, onPress, scale]);

  const handlePress = useCallback(() => {
    if (disabled || !onPress) return;
    HapticsEngine.tier1.light();
    onPress();
  }, [disabled, onPress]);

  const cardStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderTopColor: colors.glassBorderSpecular || 'rgba(255, 255, 255, 0.14)',
    overflow: 'hidden',
    ...(elevated ? Shadows.elevated : Shadows.card),
    ...(glowColor && Shadows.glowSmall(glowColor, 0.2)),
    ...(padded && { padding: Spacing.four }),
  };

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        style={[cardStyle, animatedScale, style]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
}

export default GlassCard;
