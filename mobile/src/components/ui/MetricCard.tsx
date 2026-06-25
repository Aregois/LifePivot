import React from 'react';
import { View, Text, type ViewStyle } from 'react-native';
import { C, Shadows } from '../../constants/theme';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  style?: ViewStyle;
  accentColor?: string;
}

export function MetricCard({ label, value, icon, style, accentColor }: MetricCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: C.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: C.glassBorderSubtle,
          padding: 16,
          flex: 1,
          ...Shadows.card,
        },
        style,
      ]}
    >
      {icon && <View style={{ marginBottom: 8 }}>{icon}</View>}
      <Text
        style={{
          color: C.textDim,
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: accentColor ?? '#FFFFFF',
          fontSize: 18,
          fontWeight: '900',
          letterSpacing: 1,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default MetricCard;

