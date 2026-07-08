import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FadeInView } from './FadeInView';
import { PremiumButton } from './PremiumButton';
import { C, Spacing, BorderRadius, Typography, IconSize, Colors } from '../../constants/theme';

interface EmptyStateCTAProps {
  /** Feather icon name to display */
  iconName: keyof typeof Feather.glyphMap;
  /** Primary heading string */
  title: string;
  /** Explanatory subtext description */
  description: string;
  /** Label for the action button (optional) */
  buttonText?: string;
  /** Action callback when the primary button is pressed (optional) */
  onPress?: () => void;
}

export const EmptyStateCTA = React.memo(function EmptyStateCTA({
  iconName,
  title,
  description,
  buttonText,
  onPress,
}: EmptyStateCTAProps) {
  const hasButton = !!(buttonText && onPress);

  return (
    <FadeInView delay={Spacing.two} style={styles.container}>
      <View 
        style={styles.iconContainer}
        accessibilityRole="image"
        accessibilityLabel={`${title} empty state icon`}
      >
        <Feather name={iconName} size={IconSize.xl} color={C.electricBlue} />
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
          variant="primary"
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
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
  },
  title: {
    ...Typography.title,
    color: Colors.dark.text, // standard pure white
    marginBottom: Spacing.two,
    textAlign: 'center',
  },
  description: {
    ...Typography.caption,
    color: C.textDim, // slate/dim text
    textAlign: 'center',
    marginBottom: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  button: {
    width: '100%',
    // High premium touch targets (minHeight: 56) are controlled by PremiumButton & ComponentHeight.button
  },
});



export default EmptyStateCTA;
