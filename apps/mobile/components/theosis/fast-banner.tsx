import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { DailyFastDetail, FastSeverity } from "@theosis/core";

import {
  colors,
  fonts,
  radii,
  spacing,
  text,
} from "@/constants/theosis-theme";

// Fast banner. Two visual modes:
//   - Compact: a chip-shaped row for weekly Wed/Fri fasts, fast-free
//     plain days, and when fastDetail is null/undefined (no detail).
//   - Feature: a card-shaped block with progress + guidance for seasonal
//     fasts (Lent, Holy Week, Apostles', Dormition, Nativity, Cheesefare)
//     and fast-free seasons (Bright Week, Pentecost week, Sviatki).
//
// The "Your rule" footer links to /settings so the user can adjust their
// fastingLevel pref without leaving the context.

type FastBannerProps = {
  detail: DailyFastDetail | null | undefined;
  fastingLevel: FastSeverity | undefined;
};

export function FastBanner({ detail, fastingLevel }: FastBannerProps) {
  const severity: FastSeverity = fastingLevel ?? "standard";

  if (!detail) {
    return <CompactRow icon="coffee" label="Fast Free" tone="muted" />;
  }

  if (detail.kind === "fast-free") {
    return <FastFreeFeature name={detail.name} reason={detail.reason} />;
  }

  // Weekly Wed/Fri — keep the compact chip experience.
  if (detail.fastKind === "weekly") {
    return <CompactRow icon="moon" label={detail.name} tone="accent" />;
  }

  return (
    <FastFeature
      name={detail.name}
      dayOfFast={detail.dayOfFast}
      totalDays={detail.totalDays}
      guidance={detail.guidance[severity]}
      severity={severity}
    />
  );
}

function CompactRow({
  icon,
  label,
  tone,
}: {
  icon: "moon" | "coffee";
  label: string;
  tone: "accent" | "muted";
}) {
  return (
    <View
      style={[
        styles.compact,
        tone === "muted" && styles.compactMuted,
      ]}
    >
      <Feather
        name={icon}
        size={13}
        color={tone === "accent" ? colors.accent : colors.inkMuted}
      />
      <Text
        style={[
          styles.compactLabel,
          tone === "muted" && styles.compactLabelMuted,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function FastFeature({
  name,
  dayOfFast,
  totalDays,
  guidance,
  severity,
}: {
  name: string;
  dayOfFast?: number;
  totalDays?: number;
  guidance: string;
  severity: FastSeverity;
}) {
  const hasProgress =
    typeof dayOfFast === "number" &&
    typeof totalDays === "number" &&
    totalDays > 1;
  const percent = hasProgress
    ? Math.min(100, Math.round((dayOfFast / totalDays) * 100))
    : 0;

  return (
    <View style={styles.feature}>
      <View style={styles.featureHeader}>
        <View style={styles.featureIconWrap}>
          <Feather name="moon" size={16} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.featureEyebrow}>Fasting season</Text>
          <Text style={styles.featureTitle}>{name}</Text>
        </View>
        {hasProgress ? (
          <Text style={styles.featureDay}>
            Day <Text style={styles.featureDayNum}>{dayOfFast}</Text>
            <Text style={styles.featureDaySoft}> / {totalDays}</Text>
          </Text>
        ) : null}
      </View>

      {hasProgress ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
        </View>
      ) : null}

      <Text style={styles.guidance}>{guidance}</Text>

      <View style={styles.featureFooter}>
        <Text style={styles.footerLabel}>Your rule: {severity}</Text>
        <Pressable
          onPress={() => router.push("/settings")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Adjust your fasting level"
        >
          <Text style={styles.footerLink}>Adjust</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FastFreeFeature({
  name,
  reason,
}: {
  name: string;
  reason: string;
}) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureHeader}>
        <View style={styles.featureIconWrap}>
          <Feather name="sun" size={16} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.featureEyebrow}>Fast-free</Text>
          <Text style={styles.featureTitle}>{name}</Text>
        </View>
      </View>
      <Text style={styles.guidance}>{reason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  compact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: colors.accentSoft,
    alignSelf: "flex-start",
  },
  compactMuted: {
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  compactLabel: {
    ...text.eyebrowAccent,
    fontSize: 10,
  },
  compactLabelMuted: {
    color: colors.inkMuted,
  },
  feature: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  featureHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  featureEyebrow: {
    ...text.eyebrowAccent,
    fontSize: 10,
  },
  featureTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 18,
    color: colors.ink,
    lineHeight: 22,
    letterSpacing: -0.2,
    marginTop: 2,
  },
  featureDay: {
    fontFamily: fonts.sans,
    fontSize: 10.5,
    color: colors.inkSoft,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontVariant: ["tabular-nums"],
  },
  featureDayNum: {
    color: colors.ink,
  },
  featureDaySoft: {
    color: colors.inkFaint,
  },
  progressTrack: {
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.line,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
    opacity: 0.7,
    borderRadius: 999,
  },
  guidance: {
    fontFamily: fonts.serif,
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkMuted,
  },
  featureFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  footerLabel: {
    ...text.eyebrow,
    fontSize: 9.5,
    textTransform: "uppercase",
  },
  footerLink: {
    ...text.eyebrowAccent,
    fontSize: 9.5,
  },
});
