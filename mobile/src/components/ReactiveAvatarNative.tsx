import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

interface ReactiveAvatarNativeProps {
  size?: number;
  level?: number;
  streak?: number;
}

export const ReactiveAvatarNative: React.FC<ReactiveAvatarNativeProps> = ({
  size = 56,
  level = 1,
  streak = 0,
}) => {
  const { colors } = useTheme();
  const isHighStreak = streak >= 7;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.cardElevated || colors.card,
        },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="avatarGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
            <Stop offset="100%" stopColor={colors.secondary} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Base Glow Circle */}
        <Circle
          cx="50"
          cy="50"
          r="46"
          fill={colors.card}
          stroke="url(#avatarGlow)"
          strokeWidth={isHighStreak ? 4 : 2}
        />

        {/* Pathseeker Helmet / Core Crest */}
        <Path
          d="M50 20 L75 40 L65 75 L35 75 L25 40 Z"
          fill="none"
          stroke={colors.primary}
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Visor Eye Glow */}
        <Path
          d="M36 45 Q50 38 64 45"
          fill="none"
          stroke={isHighStreak ? colors.amber : colors.secondary}
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Level Gem Emblem */}
        <Circle cx="50" cy="62" r="5" fill={level >= 5 ? colors.secondary : colors.primary} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default ReactiveAvatarNative;
