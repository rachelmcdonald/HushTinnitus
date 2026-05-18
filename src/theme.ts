// Section 4 — Hush Tinnitus design tokens

export const Colors = {
  // Primary palette
  deepTide: '#0D4F5C',
  calmWave: '#5DCAA5',
  tealLight: '#E1F5EE',
  warmSand: '#F5F1EB',

  // Dark mode
  midnight: '#0D2B33',
  darkCard: '#1A3D4A',

  // Premium
  softGold: '#C49A6C',
  goldLight: '#FEF7F0',

  // Alerts
  warmCoral: '#B85450',
  coralLight: '#FAECEC',

  // Text
  darkText: '#1A2B2B',
  midGray: '#666666',

  // Utility
  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

// TFI severity grade colour mapping (Section 4.5)
export const TFISeverityColors = {
  notSignificant: {
    background: '#E1F5EE',
    text: '#085041',
  },
  small: {
    background: '#D4EDDA',
    text: '#1A5C3A',
  },
  moderate: {
    background: '#FEF7F0',
    text: '#8A6030',
  },
  big: {
    background: '#FAECEC',
    text: '#7A2A28',
  },
  veryBig: {
    background: '#FAECE7',
    text: '#7A2A28',
  },
} as const;

// Typography — system font stack: SF Pro (iOS), Roboto (Android)
export const Typography = {
  display: {
    fontSize: 28,
    fontWeight: '400' as const,
    letterSpacing: -0.56, // -0.02em at 28px
  },
  heading1: {
    fontSize: 20,
    fontWeight: '500' as const,
  },
  heading2: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 22.4, // 1.6 × 14px
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
  micro: {
    fontSize: 11,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.55, // 0.05em at 11px
  },
} as const;

// Spacing — base unit 4px, all multiples of 4
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

// Border radius
export const Radius = {
  chip: 8,
  card: 12,
  modal: 20,
} as const;

// Border
export const Border = {
  width: 0.5,
} as const;

// Animation durations (ms)
export const Duration = {
  micro: 150,
  standard: 250,
  breathingInhale: 4000,
  breathingHold: 7000,
  breathingExhale: 8000,
} as const;

// Tab bar styling
export const TabBar = {
  activeTintColor: Colors.deepTide,
  inactiveTintColor: Colors.midGray,
  backgroundColor: Colors.warmSand,
  borderTopColor: Colors.midGray + '30',
  borderTopWidth: Border.width,
} as const;
