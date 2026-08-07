// ============================================================
// VIREON MOBILE — DESIGN TOKENS
// Centralized theme constants for React Native
// ============================================================

export const COLORS = {
  // ─── Background Layers ──────────────────────────────────────
  bg: '#F4FAF6',
  primary: '#16A34A',
  secondary: '#DCFCE7',
  card: '#FFFFFF',
  cardLight: '#F0FDF4',

  // ─── Accent ──────────────────────────────────────────────────
  accentGreen: '#16A34A',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  // ─── Text ────────────────────────────────────────────────────
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textDisabled: '#94A3B8',

  // ─── Border ──────────────────────────────────────────────────
  border: 'rgba(22, 163, 74, 0.2)',
  borderStrong: 'rgba(22, 163, 74, 0.35)',
  borderGreen: 'rgba(22, 163, 74, 0.6)',

  // ─── Gradient Colors ──────────────────────────────────────────
  gradientStart: '#16A34A',
  gradientEnd: '#15803D',
  greenGlow: 'rgba(22, 163, 74, 0.25)',

  // ─── Overlay ─────────────────────────────────────────────────
  overlay: 'rgba(15, 23, 42, 0.5)',
  overlayLight: 'rgba(244, 250, 246, 0.8)',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,

  // Padding
  pagePadding: 16,
  cardPadding: 16,
  sectionGap: 24,
} as const;

export const FONT_SIZE = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const FONT_WEIGHT = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

export const SHADOW = {
  card: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  cardLarge: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 8,
  },
  greenGlow: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export const ANIMATION = {
  duration: { fast: 150, normal: 300, slow: 500 },
  spring: { damping: 15, stiffness: 200 },
  timing: { easing: 'ease-in-out' },
} as const;
