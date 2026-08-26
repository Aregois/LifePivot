import React from 'react';
import {
  View,
  Platform,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';
import { BorderRadius, Shadows } from '../../constants/theme';

export interface GlassViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'dark' | 'light' | 'default' | 'prominent' | 'extraDark';
  border?: boolean;
  borderColor?: string;
  borderRadius?: number;
  elevated?: boolean;
  glowColor?: string;
}

/**
 * GlassView: High-performance cross-platform frosted glass surface.
 * - iOS: Uses native hardware-accelerated BlurView.
 * - Android / Web: Uses obsidian translucent backdrop with optimized alpha compositing.
 */
export const GlassView: React.FC<GlassViewProps> = ({
  children,
  style,
  intensity = 35,
  tint = 'dark',
  border = true,
  borderColor,
  borderRadius = BorderRadius.xl,
  elevated = false,
  glowColor,
}) => {
  const { colors } = useTheme();

  const activeBorderColor = borderColor || colors.glassBorder;

  const containerStyle: ViewStyle = {
    borderRadius,
    overflow: 'hidden',
    ...(border && {
      borderWidth: 1,
      borderColor: activeBorderColor,
    }),
    ...(elevated && Shadows.card),
    ...(glowColor && Shadows.glowSmall(glowColor, 0.2)),
  };

  if (Platform.OS === 'ios') {
    const blurTint = tint === 'extraDark' ? 'dark' : (tint as 'dark' | 'light' | 'default' | 'prominent');
    return (
      <View style={[containerStyle, style]}>
        <BlurView
          intensity={intensity}
          tint={blurTint}
          style={StyleSheet.absoluteFill}
        />
        {/* Subtle obsidian glass tint overlay */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(5, 5, 8, 0.45)' },
          ]}
          pointerEvents="none"
        />
        {children}
      </View>
    );
  }

  // Android & Web fallback
  return (
    <View
      style={[
        containerStyle,
        {
          backgroundColor: 'rgba(20, 24, 36, 0.88)',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export default GlassView;
