/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 *
 * Color Palette (Dark Red/Black Theme):
 * - Primary Background:   #0D0D0D  (near-black)
 * - Card Background:      #1A1A1A  (dark gray)
 * - Element Background:   #222222  (medium dark)
 * - Selected Background:  #2A2A2A  (lighter dark)
 * - Border:               #2A2A2A  (subtle border)
 * - Accent (Primary):     #E53935  (vibrant red)
 * - Accent (Dark):        #C62828  (pressed/hover red)
 * - Text Primary:         #FFFFFF  (white)
 * - Text Secondary:       #9E9E9E  (medium gray)
 * - Text Tertiary:        #6B7280  (dim gray)
 */

import '@/global.css';

import { Platform } from 'react-native';

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
    background: '#0D0D0D',
    backgroundElement: '#1A1A1A',
    backgroundSelected: '#2A2A2A',
    textSecondary: '#9E9E9E',
  },
} as const;

/** Petrolhead brand colors - used across all screens */
export const BrandColors = {
  /** Primary accent: vibrant red */
  accent: '#E53935',
  /** Pressed/hover state for accent */
  accentDark: '#C62828',
  /** Accent with low opacity for badges/chips */
  accentMuted: 'rgba(229, 57, 53, 0.15)',
  /** Main background */
  bg: '#0D0D0D',
  /** Card/surface background */
  surface: '#1A1A1A',
  /** Elevated surface */
  surfaceElevated: '#222222',
  /** Subtle border */
  border: '#2A2A2A',
  /** Primary text */
  textPrimary: '#FFFFFF',
  /** Secondary text */
  textSecondary: '#9E9E9E',
  /** Dim/muted text */
  textMuted: '#6B7280',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
