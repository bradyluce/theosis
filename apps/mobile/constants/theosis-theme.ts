// Theosis design tokens, ported from src/app/globals.css (the web app's
// Tailwind theme). Dark-only — the app forces userInterfaceStyle: "dark"
// in app.json to match the icon-cabinet aesthetic (wood + gilt + parchment,
// dimmed for night reading).
//
// Fonts: the web uses Newsreader (serif), Instrument Sans (sans), and IBM
// Plex Mono (mono). For now mobile uses platform system fonts — `ui-serif`
// resolves to New York on iOS, a comparable scholarly serif. Custom fonts
// can be added later via expo-google-fonts without changing the rest of
// the design tokens.

import { Platform } from "react-native";

export const colors = {
  background: "#08080b",
  surface: "#131316",
  surfaceStrong: "#1c1c22",
  surfaceElevated: "#24242c",
  ink: "#f5f5f7",
  inkMuted: "#b4b4bc",
  inkSoft: "#75757f",
  line: "rgba(255, 255, 255, 0.07)",
  lineStrong: "rgba(255, 255, 255, 0.14)",
  accent: "#d4a857",
  accentSoft: "rgba(212, 168, 87, 0.14)",
  accentStrong: "#e6b966",
  error: "#c43d3d",
} as const;

const platformFonts = Platform.select({
  ios: {
    sans: "system-ui",
    // `ui-serif` resolves to New York on iOS — closest stock match for
    // Newsreader's scholarly feel.
    serif: "ui-serif",
    mono: "ui-monospace",
  },
  android: { sans: "System", serif: "serif", mono: "monospace" },
  default: { sans: "System", serif: "serif", mono: "monospace" },
}) as { sans: string; serif: string; mono: string };

export const fonts = {
  sans: platformFonts.sans,
  serif: platformFonts.serif,
  mono: platformFonts.mono,
} as const;

// Multiples of 4 — matches the web app's vertical rhythm.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 48,
} as const;

export const radii = {
  pill: 999,
  card: 12,
  large: 16,
  xl: 20,
} as const;

// Reusable text styles for the most common typographic roles. Pulled out
// here so screens don't have to remember the right font/size/color combos.
export const text = {
  eyebrow: {
    fontSize: 11,
    fontWeight: "500" as const,
    letterSpacing: 2.4,
    textTransform: "uppercase" as const,
    color: colors.inkSoft,
  },
  titleXl: {
    fontFamily: fonts.serif,
    fontSize: 40,
    color: colors.ink,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  titleLg: {
    fontFamily: fonts.serif,
    fontSize: 32,
    color: colors.ink,
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  titleMd: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.ink,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  titleSm: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.ink,
    lineHeight: 26,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkMuted,
  },
  bodyStrong: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink,
  },
  mono: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.ink,
  },
} as const;

// Single dark React Navigation theme so the navigator chrome (header,
// tab bar, etc.) uses our palette instead of the default.
export const navigationTheme = {
  dark: true,
  colors: {
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.ink,
    border: colors.line,
    notification: colors.accent,
  },
  fonts: {
    regular: { fontFamily: fonts.sans, fontWeight: "400" as const },
    medium: { fontFamily: fonts.sans, fontWeight: "500" as const },
    bold: { fontFamily: fonts.sans, fontWeight: "700" as const },
    heavy: { fontFamily: fonts.sans, fontWeight: "800" as const },
  },
};
