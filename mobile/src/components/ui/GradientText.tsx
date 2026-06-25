import React from 'react';
import { Text, type TextStyle, type StyleProp } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Gradients } from '../../constants/theme';

interface GradientTextProps {
  text?: string;
  children?: string;
  colors?: readonly string[];
  style?: StyleProp<TextStyle>;
}

export function GradientText({
  text,
  children,
  colors,
  style,
}: GradientTextProps) {
  const gradientColors = colors ?? Gradients.xpBar;
  const displayText = text ?? children ?? '';

  return (
    <MaskedView
      maskElement={
        <Text style={[{ fontSize: 22, fontWeight: '900', letterSpacing: 3 }, style]}>
          {displayText}
        </Text>
      }
    >
      <LinearGradient
        colors={gradientColors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[{ fontSize: 22, fontWeight: '900', letterSpacing: 3, opacity: 0 }, style]}>
          {displayText}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}

export default GradientText;

