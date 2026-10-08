/* eslint-disable react-hooks/immutability */
import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { HapticsEngine } from '../../utils/HapticsEngine';
import { useTheme } from '../../context/ThemeContext';
import { AnimationConfig, BorderRadius, Spacing, Typography } from '../../constants/theme';

/* ────────────────────────────────────────────────────────────────────────── */
/*  SegmentedControl                                                         */
/*  iOS-style segmented control with an animated sliding spring indicator.   */
/* ────────────────────────────────────────────────────────────────────────── */

interface SegmentedControlProps {
  segments?: string[];
  options?: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  style?: ViewStyle;
}

export function SegmentedControl({
  segments,
  options,
  selectedIndex,
  onChange,
  style,
}: SegmentedControlProps) {
  const { colors } = useTheme();
  const items = segments ?? options ?? [];
  const segmentCount = items.length;

  /* ─── Animated indicator position ───────────────────────────────────── */
  const indicatorTranslate = useSharedValue(selectedIndex);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    indicatorTranslate.value = withSpring(
      selectedIndex,
      AnimationConfig.spring.tabSpring,
    );
  }, [selectedIndex, indicatorTranslate]);

  const segmentWidth = segmentCount > 0 ? containerWidth / segmentCount : 0;

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
        HapticsEngine.tier1.selection();
        onChange(index);
      }
    },
    [selectedIndex, onChange],
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.glassBorder,
        },
        style,
      ]}
      onLayout={handleLayout}
    >
      {/* Sliding indicator */}
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              width: Math.max(0, segmentWidth - 6),
              marginLeft: 3,
              backgroundColor: colors.card,
              borderColor: colors.glassBorder,
            },
            indicatorStyle,
          ]}
        />
      )}

      {/* Segment labels */}
      {items.map((label, index) => {
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
                { color: colors.inactive },
                isActive && [styles.segmentTextActive, { color: colors.primary }],
              ]}
              numberOfLines={1}
            >
              {label}
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
    borderRadius: BorderRadius.xl,
    padding: 3,
    borderWidth: 1,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 0,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    zIndex: 1,
    minHeight: 38,
  },
  segmentText: {
    ...Typography.footnote,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  segmentTextActive: {
    fontWeight: '800',
  },
});

export default SegmentedControl;
