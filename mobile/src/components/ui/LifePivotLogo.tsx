import React from 'react';
import { ViewStyle, TouchableOpacity } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  interpolate,
} from 'react-native-reanimated';
import { HapticsEngine } from '../../utils/HapticsEngine';
import { useTheme } from '../../context/ThemeContext';

export interface LifePivotLogoProps {
  /** Width in density-independent pixels. Default: 38 */
  size?: number;
  /** Whether the logo reacts to touch with spring squish & haptics. Default: true */
  interactive?: boolean;
  /** Whether to show the ambient breathing pulse glow. Default: true */
  showGlow?: boolean;
  /** Optional click callback */
  onPress?: () => void;
  style?: ViewStyle;
}

const VIEW_BOX = '20 45 500 340';

const PATH_MAIN_LOOP =
  'M 34.5 344.5 L 110.0 344.5 C 155.0 344.5 189.0 326.0 213.0 284.0 L 251.0 205.0 C 271.0 164.0 301.0 135.0 334.5 114.5 C 336.5 113.0 336.5 110.5 334.0 108.5 C 317.0 93.0 294.0 83.0 268.0 83.0 C 202.0 83.0 152.0 136.0 152.0 206.0 C 152.0 240.0 163.0 270.0 182.0 293.0 L 167.0 306.5 C 143.0 279.0 130.0 244.0 130.0 206.0 C 130.0 124.0 190.0 61.0 268.0 61.0 C 302.0 61.0 332.0 74.0 351.0 95.0 C 360.0 105.0 360.0 122.0 349.0 133.0 C 316.0 156.0 286.0 186.0 265.0 227.0 L 236.0 287.0 C 210.0 338.0 166.0 366.5 108.0 366.5 L 34.5 366.5 Z';

const PATH_ARROW =
  'M 288.5 224.0 C 342.0 219.0 386.0 182.0 414.5 114.5 L 384.5 78.5 L 501.5 60.0 L 463.5 171.5 L 434.5 138.0 C 398.0 210.0 348.0 244.0 278.5 245.0 Z';

const PATH_BOTTOM_ARC =
  'M 426.5 187.5 C 433.0 228.0 420.0 274.0 393.0 312.0 C 365.0 351.0 318.0 368.0 270.0 364.5 C 250.0 363.0 232.0 357.0 217.5 348.0 L 232.0 331.5 C 245.0 339.0 261.0 343.0 278.0 343.5 C 319.0 345.0 358.0 326.0 381.0 293.0 C 401.0 265.0 408.0 236.0 407.0 214.5 Z';

const MOBILE_THEME_MAP: Record<string, { body1: string; bodyMid: string; body2: string; rim1: string; rim2: string }> = {
  blue: { body1: '#0EA5E9', bodyMid: '#6366F1', body2: '#C026D3', rim1: '#67E8F9', rim2: '#F0ABFC' },
  violet: { body1: '#9333EA', bodyMid: '#C026D3', body2: '#E11D48', rim1: '#E879F9', rim2: '#FF80BF' },
  green: { body1: '#059669', bodyMid: '#0D9488', body2: '#0284C7', rim1: '#6EE7B7', rim2: '#67E8F9' },
  sunset: { body1: '#D97706', bodyMid: '#EA580C', body2: '#E11D48', rim1: '#FDE68A', rim2: '#FDA4AF' },
};

/**
 * Native 3-Piece Vector LifePivot Neon Tube Logo for iOS & Android.
 */
export const LifePivotLogo: React.FC<LifePivotLogoProps> = ({
  size = 38,
  interactive = true,
  showGlow = true,
  onPress,
  style,
}) => {
  const { accent } = useTheme();
  const height = Math.round(size * 0.68);
  const palette = MOBILE_THEME_MAP[accent] || MOBILE_THEME_MAP.blue;

  const scale = useSharedValue(1);
  const glowPulse = useSharedValue(0.45);

  React.useEffect(() => {
    if (!showGlow) return;
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1900 }),
        withTiming(0.45, { duration: 1900 })
      ),
      -1,
      true
    );
  }, [showGlow]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowColor: palette.rim1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: showGlow ? glowPulse.value : 0,
    shadowRadius: interpolate(glowPulse.value, [0.45, 0.9], [6, 14]),
  }));

  const handlePressIn = () => {
    if (!interactive) return;
    HapticsEngine.tier1.selection();
    scale.value = withSpring(0.9, { damping: 15, stiffness: 350 });
  };

  const handlePressOut = () => {
    if (!interactive) return;
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      disabled={!interactive}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[{ width: size, height, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Animated.View style={[{ width: size, height }, animatedContainerStyle]}>
        <Svg viewBox={VIEW_BOX} width={size} height={height}>
          <Defs>
            <LinearGradient id="lpNativeBodyMain" x1="35" y1="360" x2="310" y2="70" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={palette.body1} />
              <Stop offset="48%" stopColor={palette.bodyMid} />
              <Stop offset="100%" stopColor={palette.body2} />
            </LinearGradient>
            <LinearGradient id="lpNativeBodyArrow" x1="280" y1="240" x2="495" y2="65" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={palette.body2} />
              <Stop offset="55%" stopColor={palette.bodyMid} />
              <Stop offset="100%" stopColor={palette.body1} />
            </LinearGradient>
            <LinearGradient id="lpNativeBodyArc" x1="220" y1="355" x2="425" y2="190" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={palette.body1} />
              <Stop offset="50%" stopColor={palette.bodyMid} />
              <Stop offset="100%" stopColor={palette.body2} />
            </LinearGradient>

            <LinearGradient id="lpNativeRimMain" x1="35" y1="360" x2="320" y2="70" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={palette.rim1} />
              <Stop offset="45%" stopColor={palette.rim1} />
              <Stop offset="100%" stopColor={palette.rim2} />
            </LinearGradient>
            <LinearGradient id="lpNativeRimArrow" x1="280" y1="240" x2="500" y2="60" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={palette.rim2} />
              <Stop offset="42%" stopColor={palette.rim2} />
              <Stop offset="100%" stopColor={palette.rim1} />
            </LinearGradient>
            <LinearGradient id="lpNativeRimArc" x1="220" y1="355" x2="425" y2="190" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={palette.rim1} />
              <Stop offset="100%" stopColor={palette.rim2} />
            </LinearGradient>
          </Defs>

          <Path
            d={PATH_MAIN_LOOP}
            fill="url(#lpNativeBodyMain)"
            stroke="url(#lpNativeRimMain)"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <Path
            d={PATH_ARROW}
            fill="url(#lpNativeBodyArrow)"
            stroke="url(#lpNativeRimArrow)"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <Path
            d={PATH_BOTTOM_ARC}
            fill="url(#lpNativeBodyArc)"
            stroke="url(#lpNativeRimArc)"
            strokeWidth="6"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </TouchableOpacity>
  );
};
