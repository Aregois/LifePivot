import React from 'react';
import { View, Text, type ViewStyle } from 'react-native';
import { C, Shadows, Spacing, BorderRadius, Typography } from '../../constants/theme';

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
          backgroundColor: C.background, // Obsidian Background
          borderRadius: BorderRadius.xxl,
          borderWidth: 1,
          borderColor: C.glassBorderSubtle,
          padding: Spacing.three,
          flex: 1,
          ...Shadows.card,
        },
        style,
      ]}
    >
      {icon && (
        <View style={{ marginBottom: Spacing.two }}>
          {typeof icon === 'string' ? <Text style={{ fontSize: 20 }}>{icon}</Text> : icon}
        </View>
      )}
      <Text
        style={[
          Typography.overline,
          {
            color: C.textDim,
            marginBottom: Spacing.one,
          }
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          Typography.title,
          {
            color: accentColor ?? '#FFFFFF',
          }
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default MetricCard;
