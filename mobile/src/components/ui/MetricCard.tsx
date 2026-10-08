import React from 'react';
import { View, Text, type ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Shadows, Spacing, BorderRadius, Typography } from '../../constants/theme';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  style?: ViewStyle;
  accentColor?: string;
}

export function MetricCard({ label, value, icon, style, accentColor }: MetricCardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: BorderRadius.xxl,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          borderTopColor: colors.glassBorderSpecular || 'rgba(255, 255, 255, 0.16)',
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
            color: colors.textMuted,
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
            color: accentColor ?? colors.textPrimary,
          }
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default MetricCard;
