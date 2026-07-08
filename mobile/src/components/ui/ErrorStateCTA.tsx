import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FadeInView } from './FadeInView';
import { PremiumButton } from './PremiumButton';
import { Spacing, BorderRadius, Typography, IconSize, SemanticColors } from '../../constants/theme';

interface ErrorStateCTAProps {
  /** Feather icon name to display (defaults to alert-triangle) */
  iconName?: keyof typeof Feather.glyphMap;
  /** Primary heading string */
  title: string;
  /** Explanatory subtext description */
  description: string;
  /** Label for the action retry button (optional) */
  buttonText?: string;
  /** Retry callback function (optional) */
  onPress?: () => void;
}

export const ErrorStateCTA = React.memo(function ErrorStateCTA({
  iconName = 'alert-triangle',
  title,
  description,
  buttonText,
  onPress,
}: ErrorStateCTAProps) {
  const hasButton = !!(buttonText && onPress);

  return (
    <FadeInView delay={Spacing.two} style={styles.container}>
      <View 
        style={styles.iconContainer}
        accessibilityRole="image"
        accessibilityLabel={`${title} error state icon`}
      >
        <Feather name={iconName} size={IconSize.xl} color={SemanticColors.error} />
      </View>
      
      <Text 
        style={styles.title}
        accessibilityRole="header"
      >
        {title}
      </Text>
      
      <Text style={styles.description}>
        {description}
      </Text>
      
      {hasButton && (
        <PremiumButton
          title={buttonText!}
          onPress={onPress!}
          variant="destructive"
          style={styles.button}
        />
      )}
    </FadeInView>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    borderRadius: BorderRadius.xxl,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconContainer: {
    marginBottom: Spacing.four,
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(244, 63, 94, 0.05)', // Translucent rose
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.15)',
  },
  title: {
    ...Typography.title,
    color: '#ffffff',
    marginBottom: Spacing.two,
    textAlign: 'center',
  },
  description: {
    ...Typography.caption,
    color: '#9CA3AF', // slate dim
    textAlign: 'center',
    marginBottom: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  button: {
    width: '100%',
  },
});

export default ErrorStateCTA;
