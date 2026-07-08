import { Platform } from 'react-native';

/* ────────────────────────────────────────────────────────────────────────── */
/*  LifePivot Design Tokens                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

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
    glassBg: 'rgba(255, 255, 255, 0.03)',
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
  display: {
    fontSize: 32,
    fontWeight: '900' as const,
    letterSpacing: -1.0,
    textTransform: 'uppercase' as const,
  },
  heading: {
    fontSize: 24,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontSize: 18,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '900' as const,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  overline: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
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
  button: 56,
  input: 56,
  badge: 28,
  tab: 48,
} as const;

/* ─── Animation ───────────────────────────────────────────────────────── */

export const AnimationConfig = {
  /** Spring configs for react-native-reanimated */
  spring: {
    gentle: { damping: 15, stiffness: 120, mass: 0.8 },
    bouncy: { damping: 12, stiffness: 180, mass: 0.6 },
    snappy: { damping: 20, stiffness: 300, mass: 0.5 },
  },
  /** Timing durations in ms */
  duration: {
    fast: 200,
    normal: 350,
    slow: 600,
    entrance: 650,
  },
  /** Stagger delay between list items */
  stagger: 80,
} as const;

/* ─── Platform ────────────────────────────────────────────────────────── */

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
