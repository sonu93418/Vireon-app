// ============================================================
// VIREON MOBILE — DESIGN TOKENS
// Centralized theme constants for React Native
// ============================================================

export const COLORS = {
  // ─── Background Layers ──────────────────────────────────────
  bg: '#030712',
  primary: '#0F172A',
  secondary: '#111827',
  card: '#111827',
  cardLight: '#1A2332',

  // ─── Accent ──────────────────────────────────────────────────
  accentGreen: '#16A34A',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  // ─── Text ────────────────────────────────────────────────────
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: '#334155',

  // ─── Border ──────────────────────────────────────────────────
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.15)',
  borderGreen: 'rgba(22, 163, 74, 0.3)',

  // ─── Gradient Colors ──────────────────────────────────────────
  gradientStart: '#0F172A',
  gradientEnd: '#111827',
  greenGlow: 'rgba(22, 163, 74, 0.15)',

  // ─── Overlay ─────────────────────────────────────────────────
  overlay: 'rgba(3, 7, 18, 0.8)',
  overlayLight: 'rgba(15, 23, 42, 0.6)',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardLarge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
  },
  greenGlow: {
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const ANIMATION = {
  duration: { fast: 150, normal: 300, slow: 500 },
  spring: { damping: 15, stiffness: 200 },
  timing: { easing: 'ease-in-out' },
} as const;
