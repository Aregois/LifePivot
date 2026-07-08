/* eslint-disable react-hooks/immutability */
import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle, type DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Spacing, BorderRadius } from '../../constants/theme';
import { GlassCard } from './GlassCard';

interface SkeletonProps {
  width: number | string;
  height: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton = React.memo(function Skeleton({
  width,
  height,
  borderRadius = BorderRadius.sm,
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as DimensionValue,
          height: height as DimensionValue,
          borderRadius,
        },
        animatedStyle,
        style,
      ]}
      accessibilityLabel="Loading placeholder"
      accessibilityRole="progressbar"
    />
  );
});

/* ─── Plan list item skeleton ───────────────────────────────────────────── */

export const PlanSkeleton = React.memo(function PlanSkeleton() {
  return (
    <GlassCard 
      padded={false} 
      style={{
        padding: Spacing.three,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1, marginRight: Spacing.three }}>
        <Skeleton width={180} height={14} borderRadius={BorderRadius.sm} style={{ marginBottom: Spacing.two }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Skeleton width={60} height={18} borderRadius={BorderRadius.xxl} style={{ marginRight: Spacing.two }} />
          <Skeleton width={100} height={10} borderRadius={BorderRadius.sm} />
        </View>
      </View>
      <Skeleton width={18} height={18} borderRadius={BorderRadius.full} />
    </GlassCard>
  );
});

export const PlanSkeletonList = React.memo(function PlanSkeletonList() {
  return (
    <View style={{ gap: Spacing.three }}>
      <PlanSkeleton />
      <PlanSkeleton />
      <PlanSkeleton />
    </View>
  );
});

/* ─── Workspace list item skeleton ──────────────────────────────────────── */

export const WorkspaceSkeleton = React.memo(function WorkspaceSkeleton() {
  return (
    <GlassCard padded={false} style={{ padding: Spacing.three, marginBottom: Spacing.three }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.three }}>
        <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center', marginRight: Spacing.two }}>
          <Skeleton width={40} height={40} borderRadius={BorderRadius.full} />
          <View style={{ marginLeft: Spacing.three, flex: 1 }}>
            <Skeleton width={120} height={13} borderRadius={BorderRadius.sm} style={{ marginBottom: Spacing.one }} />
            <Skeleton width={80} height={9} borderRadius={BorderRadius.sm} />
          </View>
        </View>
      </View>
      <Skeleton width="100%" height={40} borderRadius={BorderRadius.xxl} style={{ marginTop: Spacing.one }} />
    </GlassCard>
  );
});

export const WorkspaceSkeletonList = React.memo(function WorkspaceSkeletonList() {
  return (
    <View>
      <WorkspaceSkeleton />
      <WorkspaceSkeleton />
      <WorkspaceSkeleton />
    </View>
  );
});

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
});

export default Skeleton;
