// Theosis design system — the icon-corner aesthetic.
//
// The visual brief is "an Orthodox church at evening service" — candlelit
// gilt on dark wood, oxblood from a saint's robe, parchment ivory for the
// reading surface. Dark theme only (forced via app.json userInterfaceStyle).
//
// Anything new — colors, sizes, spacing tokens — should slot into the
// existing scale rather than introducing a one-off. The whole point of the
// system is that surfaces stack predictably and type breathes the same way
// on every screen.

import { Platform } from "react-native";

// --- Palette ---------------------------------------------------------------
// Three concentric tiers of dark surface so cards can layer with depth, plus
// two warm accents (gold for everyday, oxblood for liturgical emphasis) and
// a parchment ink for high-contrast body text. The `*Soft` and `*Glow`
// variants are alpha-channel versions for tints and inner glows.

export const colors = {
  // Surfaces — darkest in the back, slightly warm midnight on top
  background: "#0a0908",
  surface: "#131210",
  surfaceStrong: "#1c1a18",
  surfaceElevated: "#252220",
  // Subtle warm tint applied at the top of pages — feels like candlelight
  // catching the page edge.
  surfaceWarm: "rgba(212, 168, 87, 0.05)",

  // Ink scale — for text. `ink` is parchment ivory, never pure white.
  ink: "#f4ecd8",
  inkMuted: "#b8ad95",
  inkSoft: "#75706a",
  inkFaint: "#4a4843",

  // Hairlines
  line: "rgba(244, 236, 216, 0.07)",
  lineStrong: "rgba(244, 236, 216, 0.14)",
  lineGilt: "rgba(212, 168, 87, 0.28)",

  // Primary accent — gilt
  accent: "#d4a857",
  accentStrong: "#e6b966",
  accentSoft: "rgba(212, 168, 87, 0.14)",
  accentGlow: "rgba(212, 168, 87, 0.22)",

  // Secondary accent — oxblood (saints' robes, feast emphasis)
  oxblood: "#8b3a3a",
  oxbloodSoft: "rgba(139, 58, 58, 0.16)",
  oxbloodInk: "#c97a7a",

  // Liturgical season tints — apply over the warm gradient on Daily.
  // Subtle enough to feel atmospheric rather than themed.
  lentenViolet: "rgba(106, 67, 130, 0.10)",
  paschalRed: "rgba(165, 50, 50, 0.10)",
  ordinaryGold: "rgba(212, 168, 87, 0.08)",

  error: "#c43d3d",
} as const;

const platformSansAndMono = Platform.select({
  ios: { sans: "system-ui", mono: "ui-monospace" },
  android: { sans: "System", mono: "monospace" },
  default: { sans: "System", mono: "monospace" },
}) as { sans: string; mono: string };

// --- Fonts -----------------------------------------------------------------
// Newsreader weights must match what _layout.tsx loads. See the comment
// block there for the full set; if you reference a weight here that isn't
// loaded, the text falls back silently to the system serif.
export const fonts = {
  sans: platformSansAndMono.sans,
  serif: "Newsreader_400Regular",
  serifItalic: "Newsreader_400Regular_Italic",
  serifMedium: "Newsreader_500Medium",
  serifBold: "Newsreader_600SemiBold",
  serifBoldItalic: "Newsreader_600SemiBold_Italic",
  mono: platformSansAndMono.mono,
} as const;

// --- Spacing ---------------------------------------------------------------
// Multiples of 4. Added `2xs` and `5xl` for the extra-tight and extra-wide
// breathing rooms an editorial layout needs.
export const spacing = {
  "2xs": 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 48,
  "5xl": 64,
  "6xl": 88,
} as const;

export const radii = {
  pill: 999,
  card: 14,
  large: 20,
  xl: 28,
} as const;

// --- Elevation -------------------------------------------------------------
// Real shadows — three depths from a barely-there lift to the dramatic
// floating hero card. iOS gets the cubic decay; Android elevation does its
// best to match.
export const elevation = {
  none: {},
  rest: {
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  raised: {
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  floating: {
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  // A warm inner glow — for the gilt-edged hero card. Stacked under the
  // shadow it reads like the icon corner catching candlelight.
  giltGlow: {
    shadowColor: "#d4a857",
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
} as const;

// --- Typography roles ------------------------------------------------------
// Named slots so screens use the same hierarchy. `tracked` value is the
// letterSpacing used with `textTransform: "uppercase"` for small caps.
export const text = {
  // Tiny tracked label. "DAILY · OXFORD STREET" feel.
  eyebrow: {
    fontFamily: fonts.sans,
    fontSize: 10.5,
    fontWeight: "600" as const,
    letterSpacing: 2.6,
    textTransform: "uppercase" as const,
    color: colors.inkSoft,
  },
  // The accent variant of eyebrow — used to call out feast/section.
  eyebrowAccent: {
    fontFamily: fonts.sans,
    fontSize: 10.5,
    fontWeight: "700" as const,
    letterSpacing: 2.6,
    textTransform: "uppercase" as const,
    color: colors.accent,
  },
  // Display sizes — the page hero. titleDisplay is reserved for one hero
  // per screen. Italic for liturgical poetry, regular for plain titles.
  titleDisplay: {
    fontFamily: fonts.serifBold,
    fontSize: 44,
    color: colors.ink,
    lineHeight: 48,
    letterSpacing: -0.6,
  },
  titleDisplayItalic: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 44,
    color: colors.ink,
    lineHeight: 48,
    letterSpacing: -0.4,
  },
  titleXl: {
    fontFamily: fonts.serifBold,
    fontSize: 36,
    color: colors.ink,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  titleLg: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: colors.ink,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  titleMd: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.ink,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  titleSm: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.ink,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  // Pull quote — used for hero scripture and feast-summary moments.
  pullQuote: {
    fontFamily: fonts.serifItalic,
    fontSize: 24,
    color: colors.ink,
    lineHeight: 36,
    letterSpacing: -0.2,
  },
  // Numeric display — the streak number, the chapter glyph.
  numeralDisplay: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 64,
    color: colors.ink,
    lineHeight: 64,
    letterSpacing: -2,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkMuted,
  },
  bodyLong: {
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 26,
    color: colors.ink,
  },
  bodyStrong: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink,
  },
  byline: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkMuted,
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
