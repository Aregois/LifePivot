/* eslint-disable react-hooks/immutability */
import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { triggerHaptic } from '../../utils/haptics';
import { C, AnimationConfig, BorderRadius, Spacing, Typography } from '../../constants/theme';

/* ────────────────────────────────────────────────────────────────────────── */
/*  SegmentedControl                                                         */
/*  iOS-style segmented control with an animated sliding indicator.          */
/* ────────────────────────────────────────────────────────────────────────── */

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  style?: ViewStyle;
}

export function SegmentedControl({
  segments,
  selectedIndex,
  onChange,
  style,
}: SegmentedControlProps) {
  const segmentCount = segments.length;

  /* ─── Animated indicator position ───────────────────────────────────── */

  const indicatorTranslate = useSharedValue(selectedIndex);

  React.useEffect(() => {
    indicatorTranslate.value = withSpring(
      selectedIndex,
      AnimationConfig.spring.snappy,
    );
  }, [selectedIndex, indicatorTranslate]);

  const [containerWidth, setContainerWidth] = React.useState(0);
  const segmentWidth = containerWidth / segmentCount;

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: indicatorTranslate.value * segmentWidth,
      },
    ],
  }));

  const handleLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      setContainerWidth(e.nativeEvent.layout.width);
    },
    [],
  );

  const handlePress = useCallback(
    (index: number) => {
      if (index !== selectedIndex) {
        triggerHaptic.selection();
        onChange(index);
      }
    },
    [selectedIndex, onChange],
  );

  return (
    <View
      style={[styles.container, style]}
      onLayout={handleLayout}
    >
      {/* Sliding indicator */}
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              width: segmentWidth - 8, // account for container padding (Spacing.one = 4px on each side)
              marginLeft: Spacing.one,
            },
            indicatorStyle,
          ]}
        />
      )}

      {/* Segment labels */}
      {segments.map((label, index) => {
        const isActive = index === selectedIndex;
        return (
          <Pressable
            key={label}
            onPress={() => handlePress(index)}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.segmentText,
                isActive && styles.segmentTextActive,
              ]}
              numberOfLines={1}
            >
              {label.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: C.background, // Obsidian Background
    borderRadius: BorderRadius.xxl,
    padding: Spacing.one,
    borderWidth: 1,
    borderColor: C.glassBorderSubtle,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: Spacing.one,
    bottom: Spacing.one,
    left: 0,
    backgroundColor: C.card, // Contrasting segment indicator
    borderRadius: BorderRadius.xxl,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two, // Standardised vertical padding (8px)
    zIndex: 1,
    minHeight: 44, // Touch target height
  },
  segmentText: {
    ...Typography.overline,
    fontWeight: '900',
    color: C.inactive,
  },
  segmentTextActive: {
    color: C.electricBlue,
  },
});

export default SegmentedControl;
