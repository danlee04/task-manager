/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
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
    screen: '#F6F7FB',
    card: '#FFFFFF',
    border: '#E6E8F0',
    heading: '#191D35',
    muted: '#656B7E',
    faint: '#8A90A2',
    accent: '#6268D9',
    accentStrong: '#4F55C9',
    accentSoft: '#EEF0FF',
    onAccent: '#FFFFFF',
    hero: '#292E63',
    heroMuted: '#BFC4FF',
    heroTrack: 'rgba(255, 255, 255, 0.18)',
    heroSurface: 'rgba(255, 255, 255, 0.08)',
    surfaceMuted: '#ECEEF4',
    scrim: 'rgba(15, 18, 38, 0.45)',
    danger: '#DC2626',
    dangerSoft: '#FEE2E2',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    screen: '#000000',
    card: '#14161F',
    border: '#262A3D',
    heading: '#F2F3F8',
    muted: '#A3A8BA',
    faint: '#6B7085',
    accent: '#6268D9',
    accentStrong: '#B4B8FF',
    accentSoft: '#23264A',
    onAccent: '#FFFFFF',
    hero: '#23275A',
    heroMuted: '#BFC4FF',
    heroTrack: 'rgba(255, 255, 255, 0.18)',
    heroSurface: 'rgba(255, 255, 255, 0.08)',
    surfaceMuted: '#20232F',
    scrim: 'rgba(0, 0, 0, 0.6)',
    danger: '#F87171',
    dangerSoft: '#3A1518',
  },
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

export const AppFonts = {
  regular: 'GoogleSans_400Regular',
  medium: 'GoogleSans_500Medium',
  bold: 'GoogleSans_700Bold',
} as const;

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
