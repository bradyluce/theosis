import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import {
  colors,
  elevation,
  fonts,
  radii,
  spacing,
  text,
} from "@/constants/theosis-theme";

// Theosis design primitives. Every screen composes from these so the
// elite typographic + surface treatment stays consistent. If you find
// yourself writing card borders + radii + shadows inline, the answer is
// almost always a primitive here.

// --- Eyebrow ---------------------------------------------------------------
// Small-caps tracked label. Pair with a serif title beneath. The accent
// variant lights up — use it sparingly (one per card max).

export function Eyebrow({
  children,
  tone = "soft",
  style,
}: {
  children: ReactNode;
  tone?: "soft" | "accent" | "oxblood";
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[
        tone === "accent"
          ? text.eyebrowAccent
          : tone === "oxblood"
            ? [text.eyebrowAccent, { color: colors.oxbloodInk }]
            : text.eyebrow,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// --- GiltRule --------------------------------------------------------------
// A hairline divider in gold. Use under section headers, between editorial
// blocks, or as a tab underline. Width defaults to 48px ("gilt rule") —
// pass `full` for full-width.

export function GiltRule({
  full,
  tone = "gilt",
  style,
}: {
  full?: boolean;
  tone?: "gilt" | "ink";
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          height: StyleSheet.hairlineWidth,
          width: full ? "100%" : 48,
          backgroundColor:
            tone === "gilt" ? colors.lineGilt : colors.lineStrong,
        },
        style,
      ]}
    />
  );
}

// --- Wordmark --------------------------------------------------------------
// The "Theosis" logotype. Serif italic with extra spacing on the leading
// capital, set against tracked small caps for any subline. The mark always
// reads as one composed object — don't reach for it just to render a
// page title.

export function Wordmark({
  size = 24,
  subline,
  style,
}: {
  size?: number;
  subline?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.wordmarkWrap, style]}>
      <Text
        style={{
          fontFamily: fonts.serifBoldItalic,
          fontSize: size,
          color: colors.ink,
          letterSpacing: -0.3,
          lineHeight: size * 1.05,
        }}
      >
        Theosis
      </Text>
      {subline ? (
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 9.5,
            fontWeight: "600",
            color: colors.accent,
            letterSpacing: 3.2,
            textTransform: "uppercase",
            marginTop: 2,
          }}
        >
          {subline}
        </Text>
      ) : null}
    </View>
  );
}

// --- Halo ------------------------------------------------------------------
// Circular avatar/icon frame with a subtle gilt ring + radial inner glow.
// Used for: profile avatars, the Daily masthead, halo around saint icons
// in the drawer. Renders its child inside the inner circle; that child can
// be a Text initial, an Image, or anything. The glow is a soft accent-
// soft fill that suggests candlelight catching the icon.

export function Halo({
  size = 56,
  ringTone = "gilt",
  glow = true,
  children,
  style,
}: {
  size?: number;
  ringTone?: "gilt" | "muted" | "oxblood";
  glow?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const ringColor =
    ringTone === "gilt"
      ? colors.accent
      : ringTone === "oxblood"
        ? colors.oxblood
        : colors.lineStrong;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      {glow ? (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: size / 2,
              backgroundColor: colors.accentGlow,
              opacity: 0.5,
              transform: [{ scale: 1.18 }],
            },
          ]}
        />
      ) : null}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: ringColor,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
}

// --- DropCap ---------------------------------------------------------------
// Floated illuminated first letter. Pass the verse number + the verse text
// and the component renders the first letter as a 3-line drop, the rest
// inline with the verse number as a superscript. Oxblood by default —
// the saint's robe accent on the opening letter of Scripture.

export function DropCap({
  verseNumber,
  text: verseText,
  tone = "oxblood",
  numberStyle,
  bodyStyle,
}: {
  verseNumber: number;
  text: string;
  tone?: "oxblood" | "gilt";
  numberStyle?: StyleProp<TextStyle>;
  bodyStyle?: StyleProp<TextStyle>;
}) {
  const firstChar = verseText.charAt(0);
  const rest = verseText.slice(1);
  const dropColor = tone === "oxblood" ? colors.oxbloodInk : colors.accent;
  return (
    <Text>
      <Text style={[styles.verseNumberSuper, numberStyle]}>{verseNumber} </Text>
      <Text
        style={{
          fontFamily: fonts.serifBoldItalic,
          fontSize: 56,
          lineHeight: 50,
          color: dropColor,
          letterSpacing: -2,
        }}
      >
        {firstChar}
      </Text>
      <Text style={bodyStyle}>{rest} </Text>
    </Text>
  );
}

// --- Card ------------------------------------------------------------------
// The reusable card surface. Three intents:
//   • "plain"   — quiet surface card for content (default)
//   • "raised"  — sits one tier up with a real shadow
//   • "hero"    — gilt-edged, full elevation, used for the day's hero
//   • "oxblood" — feast-emphasis card (saint feasts, fast days)
// Pass `gradient` to add a subtle warm gradient overlay (hero defaults on).

export function Card({
  intent = "plain",
  gradient,
  children,
  style,
}: {
  intent?: "plain" | "raised" | "hero" | "oxblood";
  gradient?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const wantsGradient = gradient ?? intent === "hero";
  const baseStyle =
    intent === "hero"
      ? styles.cardHero
      : intent === "oxblood"
        ? styles.cardOxblood
        : intent === "raised"
          ? styles.cardRaised
          : styles.cardPlain;
  const shadow =
    intent === "hero"
      ? elevation.floating
      : intent === "raised"
        ? elevation.raised
        : elevation.rest;

  return (
    <View style={[baseStyle, shadow, style]}>
      {wantsGradient ? (
        <LinearGradient
          colors={[
            intent === "oxblood"
              ? "rgba(139, 58, 58, 0.16)"
              : "rgba(212, 168, 87, 0.10)",
            "transparent",
          ]}
          locations={[0, 0.7]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      {children}
    </View>
  );
}

// --- DisplayNumeral --------------------------------------------------------
// Massive italic serif numeral with an optional small-caps label sitting
// under it like a museum catalog stamp. Use for streaks, badge counts,
// chapter glyphs.

export function DisplayNumeral({
  value,
  label,
  align = "left",
  size = 64,
  tone = "ink",
  style,
}: {
  value: string | number;
  label?: string;
  align?: "left" | "center" | "right";
  size?: number;
  tone?: "ink" | "accent" | "oxblood";
  style?: StyleProp<ViewStyle>;
}) {
  const color =
    tone === "accent"
      ? colors.accent
      : tone === "oxblood"
        ? colors.oxbloodInk
        : colors.ink;
  return (
    <View style={[{ alignItems: align as ViewStyle["alignItems"] }, style]}>
      <Text
        style={{
          fontFamily: fonts.serifBoldItalic,
          fontSize: size,
          lineHeight: size,
          color,
          letterSpacing: -size * 0.04,
        }}
      >
        {value}
      </Text>
      {label ? (
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 10.5,
            fontWeight: "600",
            color: colors.inkSoft,
            letterSpacing: 2.4,
            textTransform: "uppercase",
            marginTop: spacing.xs,
          }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

// --- SectionHeader ---------------------------------------------------------
// Editorial section header: eyebrow on top, optional gilt rule under the
// title, optional accessory on the right (e.g. "See all →").

export function SectionHeader({
  eyebrow,
  title,
  rule,
  accessory,
}: {
  eyebrow?: string;
  title: string;
  rule?: boolean;
  accessory?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        {eyebrow ? <Eyebrow tone="accent">{eyebrow}</Eyebrow> : null}
        <Text style={text.titleMd}>{title}</Text>
        {rule ? <GiltRule style={{ marginTop: spacing.sm }} /> : null}
      </View>
      {accessory ? <View>{accessory}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wordmarkWrap: { alignItems: "flex-start" },

  cardPlain: {
    backgroundColor: colors.surface,
    borderRadius: radii.large,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    overflow: "hidden",
  },
  cardRaised: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.large,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    overflow: "hidden",
  },
  cardHero: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.lineGilt,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing["2xl"],
    overflow: "hidden",
  },
  cardOxblood: {
    backgroundColor: colors.surface,
    borderRadius: radii.large,
    borderWidth: 1,
    borderColor: "rgba(139, 58, 58, 0.4)",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    overflow: "hidden",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sectionHeaderText: { flex: 1, gap: spacing.xs },

  verseNumberSuper: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: "600",
    color: colors.accent,
    letterSpacing: 0.4,
  },
});
