import { Platform, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Standard iPhone reference dimensions (iPhone 14 / 15 / 16 standard viewport)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

/** Responsive width scaling based on reference viewport */
export const scale = (size: number): number => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/** Responsive height scaling based on reference viewport */
export const verticalScale = (size: number): number => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

/** Moderate scaling with configurable factor (default 0.5) to avoid excessive scaling on tablets */
export const moderateScale = (size: number, factor = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

/** Clamped scaling to ensure minimum readability and maximum bound across all devices */
export const clampScale = (size: number, min: number, max: number): number => {
  return Math.min(Math.max(scale(size), min), max);
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#050508',
    surface: '#0B0D17',
    card: '#141824',
    headerBg: '#0E111F',
    heroFrom: '#1A1F36',
    heroTo: '#0B0D17',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',

    // Accent palette
    electricBlue: '#00F0FF',
    neonViolet: '#BD00FF',
    softCyan: '#7DF5FF',
    amber: '#F59E0B',
    emerald: '#10B981',
    rose: '#F43F5E',
    orange: '#F97316',

    // Glass
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    glassBorderSpecular: 'rgba(255, 255, 255, 0.16)',
    glassBg: 'rgba(255, 255, 255, 0.03)',
    glassBgLight: 'rgba(255, 255, 255, 0.06)',
    glassBgUltraThin: 'rgba(255, 255, 255, 0.02)',
    glassBorderSubtle: 'rgba(255, 255, 255, 0.05)',
    glassBorderFaint: 'rgba(255, 255, 255, 0.03)',

    // Semantic
    placeholder: '#3A4155',
    inactive: '#5A6178',
    textMuted: '#6B7280',
    textDim: '#9CA3AF',
  },
} as const;

/** Shorthand for the dark palette (default app theme) */
export const C = Colors.dark;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/* ─── Semantic Colors ───────────────────────────────────────────────────── */

export const SemanticColors = {
  success: '#10B981',
  warning: '#F59E0B',
  error: '#F43F5E',
  info: '#00F0FF',
} as const;

/* ─── Gradients ────────────────────────────────────────────────────────── */

export const Gradients = {
  hero: [C.heroFrom, C.heroTo] as const,
  heroBright: [C.heroFrom, '#0E111F'] as const,
  xpBar: [C.electricBlue, C.neonViolet] as const,
  primaryButton: [C.electricBlue, C.softCyan] as const,
  premiumBadge: [C.neonViolet, '#7C3AED'] as const,
  loginBg: ['#080A14', C.surface, '#050508'] as const,
  shimmer: ['transparent', 'rgba(255,255,255,0.06)', 'transparent'] as const,
} as const;

/* ─── Shadows ──────────────────────────────────────────────────────────── */

export const Shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  glow: (color: string, intensity = 0.4) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: intensity,
    shadowRadius: 20,
    elevation: 8,
  }),
  glowSmall: (color: string, intensity = 0.3) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: intensity,
    shadowRadius: 10,
    elevation: 4,
  }),
} as const;

/* ─── Typography Scale ─────────────────────────────────────────────────── */

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Typography = {
  // Apple HIG Hierarchy
  largeTitle: {
    fontSize: 34,
    fontWeight: '800' as const,
    lineHeight: 41,
    letterSpacing: 0.37,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: 0.36,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: 0.35,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 25,
    letterSpacing: 0.38,
  },
  display: {
    fontSize: 32,
    fontWeight: '900' as const,
    letterSpacing: -1.0,
  },
  heading: {
    fontSize: 24,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '800' as const,
    letterSpacing: 0.2,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  callout: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  subhead: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  footnote: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  overline: {
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
} as const;

/* ─── Spacing & Layout ────────────────────────────────────────────────── */

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  eight: 128,
} as const;

export const BorderRadius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
  full: 9999,
} as const;

/* ─── Icon Sizes & Component Heights ──────────────────────────────────── */

export const IconSize = {
  xs: 12,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
} as const;

export const ComponentHeight = {
  button: 52,
  buttonSmall: 38,
  input: 52,
  badge: 26,
  tab: 48,
  sheetHandle: 5,
} as const;

/* ─── Animation ───────────────────────────────────────────────────────── */

export const AnimationConfig = {
  /** Spring configs for react-native-reanimated conforming to Apple HIG */
  spring: {
    gentle: { damping: 18, stiffness: 140, mass: 0.9 },
    bouncy: { damping: 12, stiffness: 180, mass: 0.6 },
    snappy: { damping: 22, stiffness: 320, mass: 0.5 },
    scalePress: { damping: 20, stiffness: 360, mass: 0.4 },
    sheetSpring: { damping: 24, stiffness: 220, mass: 0.8 },
    tabSpring: { damping: 20, stiffness: 280, mass: 0.5 },
  },
  /** Timing durations in ms */
  duration: {
    fast: 180,
    normal: 300,
    slow: 550,
    entrance: 600,
  },
  /** Stagger delay between list items */
  stagger: 60,
} as const;

/* ─── Platform & Insets ────────────────────────────────────────────────── */

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
