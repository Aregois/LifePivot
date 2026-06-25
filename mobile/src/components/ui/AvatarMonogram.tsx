import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, Shadows, Gradients } from '../../constants/theme';

interface AvatarMonogramProps {
  name?: string;
  size?: number;
  showRing?: boolean;
  ringColor?: string;
}

function getInitials(name?: string): string {
  if (!name) return '??';
  // If it's an email, use first two chars of the local part
  const local = name.includes('@') ? name.split('@')[0] : name;
  const parts = local.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.substring(0, 2).toUpperCase();
}

export function AvatarMonogram({
  name,
  size = 72,
  showRing = false,
  ringColor,
}: AvatarMonogramProps) {
  const ringPad = showRing ? 4 : 0;
  const outerSize = size + ringPad * 2;
  const initials = getInitials(name);
  const finalRingColor = ringColor ?? C.neonViolet;

  return (
    <View
      style={{
        width: outerSize,
        height: outerSize,
        borderRadius: outerSize / 2,
        alignItems: 'center',
        justifyContent: 'center',
        ...(showRing && {
          borderWidth: 2,
          borderColor: finalRingColor,
          ...Shadows.glow(finalRingColor, 0.35),
        }),
      }}
    >
      <LinearGradient
        colors={[...Gradients.xpBar]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: C.surface,
            fontSize: size * 0.33,
            fontWeight: '900',
            letterSpacing: 2,
          }}
        >
          {initials}
        </Text>
      </LinearGradient>
    </View>
  );
}

export default AvatarMonogram;

