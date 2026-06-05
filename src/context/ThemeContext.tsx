import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, Typography, Spacing, Radius, Border } from '@/src/theme';
import { usePreferences } from './PreferencesContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThemeColors {
  // Brand / accent (identical in both modes):
  deepTide: string;
  calmWave: string;
  tealLight: string;
  warmSand: string;
  midnight: string;
  darkCard: string;
  softGold: string;
  goldLight: string;
  warmCoral: string;
  coralLight: string;
  darkText: string;
  midGray: string;
  white: string;
  transparent: string;
  // Semantic tokens (change between light / dark):
  background: string;     // main screen background
  surface: string;        // white card surface
  surfaceVariant: string; // teal-tinted card surface
  textPrimary: string;    // primary body text
  textSecondary: string;  // secondary / muted text
}

export type ScaledTypography = {
  [K in keyof typeof Typography]: {
    [P in keyof typeof Typography[K]]: typeof Typography[K][P];
  };
};

export interface ThemeContextValue {
  isDark: boolean;
  colors: ThemeColors;
  typography: ScaledTypography;
  fontScale: number;
}

// ─── Colour palettes ──────────────────────────────────────────────────────────

const LIGHT_COLORS: ThemeColors = {
  ...Colors,
  background: Colors.warmSand,
  surface: Colors.white,
  surfaceVariant: Colors.tealLight,
  textPrimary: Colors.darkText,
  textSecondary: Colors.midGray,
};

const DARK_COLORS: ThemeColors = {
  ...Colors,
  background: Colors.midnight,
  surface: Colors.darkCard,
  surfaceVariant: Colors.darkCard,
  textPrimary: Colors.warmSand,
  textSecondary: '#A0B8BC',
};

// ─── Typography scaling ───────────────────────────────────────────────────────

const FONT_SCALES: Record<'small' | 'medium' | 'large', number> = {
  small: 1.0,
  medium: 1.15,
  large: 1.30,
};

function buildTypography(scale: number): ScaledTypography {
  const result: any = {};
  for (const [key, val] of Object.entries(Typography)) {
    const entry: any = { ...val };
    if (typeof entry.fontSize === 'number') {
      entry.fontSize = Math.round(entry.fontSize * scale * 10) / 10;
    }
    if (key === 'body' && typeof entry.lineHeight === 'number') {
      entry.lineHeight = Math.round(entry.lineHeight * scale * 10) / 10;
    }
    result[key] = entry;
  }
  return result as ScaledTypography;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const { preferences } = usePreferences();

  const value = useMemo<ThemeContextValue>(() => {
    const darkModeSetting = preferences?.darkMode ?? 'system';
    const textSize = preferences?.textSize ?? 'medium';

    const isDark =
      darkModeSetting === 'dark'
        ? true
        : darkModeSetting === 'light'
        ? false
        : systemScheme === 'dark';

    const fontScale = FONT_SCALES[textSize];
    const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const typography = buildTypography(fontScale);

    return { isDark, colors, typography, fontScale };
  }, [preferences?.darkMode, preferences?.textSize, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
