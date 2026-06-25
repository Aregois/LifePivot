import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { C, AnimationConfig, BorderRadius } from '../../constants/theme';

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

  // We can't use LayoutAnimation or measure here — we compute
  // position as a fraction of total width and render via flex.

  const indicatorTranslate = useSharedValue(selectedIndex);

  React.useEffect(() => {
    indicatorTranslate.value = withSpring(
      selectedIndex,
      AnimationConfig.spring.snappy,
    );
  }, [selectedIndex, indicatorTranslate]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: indicatorTranslate.value * segmentWidth,
      },
    ],
  }));

  // We use a ref-based approach: indicator width = 100% / segmentCount
  // But since useAnimatedStyle can't do %, we rely on the parent
  // onLayout to get the actual width.

  const [containerWidth, setContainerWidth] = React.useState(0);
  const segmentWidth = containerWidth / segmentCount;

  const handleLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      setContainerWidth(e.nativeEvent.layout.width);
    },
    [],
  );

  const handlePress = useCallback(
    (index: number) => {
      if (index !== selectedIndex) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
              width: segmentWidth - 4, // account for container padding
              marginLeft: 2,
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
    backgroundColor: C.card,
    borderRadius: BorderRadius.xl,
    padding: 4,
    borderWidth: 1,
    borderColor: C.glassBorderSubtle,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    backgroundColor: C.headerBg,
    borderRadius: BorderRadius.lg,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    zIndex: 1,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.inactive,
  },
  segmentTextActive: {
    color: C.electricBlue,
  },
});

export default SegmentedControl;

