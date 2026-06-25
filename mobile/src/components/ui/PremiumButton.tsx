import React, { useCallback, type ReactNode } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { C, Gradients, AnimationConfig, BorderRadius, Shadows } from '../../constants/theme';

/* ────────────────────────────────────────────────────────────────────────── */
/*  PremiumButton                                                            */
/*  Primary CTA with gradient, ghost & destructive variants, plus haptics.   */
/* ────────────────────────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'destructive' | 'ghost';

interface PremiumButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PremiumButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}: PremiumButtonProps) {
  const scale = useSharedValue(1);

  const animatedScale = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, AnimationConfig.spring.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, AnimationConfig.spring.bouncy);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [disabled, loading, onPress]);

  const isDisabled = disabled || loading;

  /* ─── Variant-specific style + content color ────────────────────────── */

  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: {},
    destructive: {
      borderWidth: 1,
      borderColor: 'rgba(244, 63, 94, 0.2)',
      backgroundColor: 'rgba(244, 63, 94, 0.05)',
    },
    ghost: {
      borderWidth: 1,
      borderColor: 'rgba(0, 240, 255, 0.2)',
      backgroundColor: 'rgba(0, 240, 255, 0.10)',
    },
  };

  const textColors: Record<ButtonVariant, string> = {
    primary: '#050508',
    destructive: C.rose,
    ghost: C.electricBlue,
  };

  const spinnerColors: Record<ButtonVariant, string> = {
    primary: '#050508',
    destructive: C.rose,
    ghost: C.electricBlue,
  };

  /* ─── Inner content ─────────────────────────────────────────────────── */

  const content = (
    <View style={styles.inner}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={spinnerColors[variant]}
          style={styles.spinner}
        />
      ) : (
        <>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text
            style={[
              styles.label,
              { color: textColors[variant] },
            ]}
            numberOfLines={1}
          >
            {title.toUpperCase()}
          </Text>
        </>
      )}
    </View>
  );

  /* ─── Render ────────────────────────────────────────────────────────── */

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={isDisabled}
      style={[
        animatedScale,
        styles.container,
        variantStyles[variant],
        variant === 'primary' && Shadows.glowSmall(C.electricBlue, 0.2),
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={[...Gradients.primaryButton]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.lg }]}
        />
      ) : null}
      {content}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  label: {
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  iconWrapper: {
    marginRight: 8,
  },
  spinner: {
    marginVertical: 2,
  },
  disabled: {
    opacity: 0.45,
  },
});

export default PremiumButton;

