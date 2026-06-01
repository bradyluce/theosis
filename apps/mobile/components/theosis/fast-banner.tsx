import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { type ReactNode } from "react";
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
  // Collapse the feature card down to its one-line header (icon + name +
  // chevron). Owned by the Daily screen so the choice persists across
  // visits. When onToggleCollapsed is omitted, the card isn't collapsible.
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

export function FastBanner({
  detail,
  fastingLevel,
  collapsed = false,
  onToggleCollapsed,
}: FastBannerProps) {
  const severity: FastSeverity = fastingLevel ?? "standard";

  if (!detail) {
    return <CompactRow icon="coffee" label="Fast Free" tone="muted" />;
  }

  if (detail.kind === "fast-free") {
    return (
      <FastFreeFeature
        name={detail.name}
        reason={detail.reason}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
      />
    );
  }

  // Both seasonal fasts and the weekly Wed/Fri fast get the full feature
  // card — weekly fasts have the same kind of specific guidance, just
  // without a day-of-fast counter.
  return (
    <FastFeature
      name={detail.name}
      dayOfFast={detail.dayOfFast}
      totalDays={detail.totalDays}
      guidance={detail.guidance[severity]}
      severity={severity}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
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

// Header shared by both feature variants. When onToggleCollapsed is
// provided it becomes a tappable row with a chevron that expands/collapses
// the card; otherwise it's a plain static header.
function FeatureHeader({
  icon,
  eyebrow,
  name,
  trailing,
  collapsed,
  onToggleCollapsed,
}: {
  icon: "leaf" | "white-balance-sunny";
  eyebrow: string;
  name: string;
  trailing?: ReactNode;
  collapsed: boolean;
  onToggleCollapsed?: () => void;
}) {
  const inner = (
    <>
      <View style={styles.featureIconWrap}>
        <MaterialCommunityIcons name={icon} size={16} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        {collapsed ? null : (
          <Text style={styles.featureEyebrow}>{eyebrow}</Text>
        )}
        <Text
          style={[styles.featureTitle, collapsed && styles.featureTitleCollapsed]}
        >
          {name}
        </Text>
      </View>
      {trailing ?? null}
      {onToggleCollapsed ? (
        <Feather
          name={collapsed ? "chevron-down" : "chevron-up"}
          size={18}
          color={colors.inkSoft}
        />
      ) : null}
    </>
  );

  if (!onToggleCollapsed) {
    return <View style={styles.featureHeader}>{inner}</View>;
  }
  return (
    <Pressable
      onPress={onToggleCollapsed}
      style={({ pressed }) => [styles.featureHeader, pressed && { opacity: 0.7 }]}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ expanded: !collapsed }}
      accessibilityLabel={`${name} — ${collapsed ? "expand" : "collapse"} details`}
    >
      {inner}
    </Pressable>
  );
}

function FastFeature({
  name,
  dayOfFast,
  totalDays,
  guidance,
  severity,
  collapsed,
  onToggleCollapsed,
}: {
  name: string;
  dayOfFast?: number;
  totalDays?: number;
  guidance: string;
  severity: FastSeverity;
  collapsed: boolean;
  onToggleCollapsed?: () => void;
}) {
  const hasProgress =
    typeof dayOfFast === "number" &&
    typeof totalDays === "number" &&
    totalDays > 1;
  const percent = hasProgress
    ? Math.min(100, Math.round((dayOfFast / totalDays) * 100))
    : 0;

  return (
    <View style={[styles.feature, collapsed && styles.featureCollapsed]}>
      <FeatureHeader
        icon="leaf"
        eyebrow="Fasting season"
        name={name}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
        trailing={
          hasProgress ? (
            <Text style={styles.featureDay}>
              Day <Text style={styles.featureDayNum}>{dayOfFast}</Text>
              <Text style={styles.featureDaySoft}> / {totalDays}</Text>
            </Text>
          ) : undefined
        }
      />

      {collapsed ? null : (
        <>
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
        </>
      )}
    </View>
  );
}

function FastFreeFeature({
  name,
  reason,
  collapsed,
  onToggleCollapsed,
}: {
  name: string;
  reason: string;
  collapsed: boolean;
  onToggleCollapsed?: () => void;
}) {
  return (
    <View style={[styles.feature, collapsed && styles.featureCollapsed]}>
      <FeatureHeader
        icon="white-balance-sunny"
        eyebrow="Fast-free"
        name={name}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
      />
      {collapsed ? null : <Text style={styles.guidance}>{reason}</Text>}
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
  // Collapsed: trim the vertical padding so the header reads as a slim
  // horizontal bar (icon · name · day counter · chevron) instead of a tall
  // card. Horizontal padding stays for comfortable insets.
  featureCollapsed: {
    paddingVertical: spacing.sm,
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
  // No eyebrow above the name when collapsed — drop the gap so the name sits
  // centered against the icon on a single line.
  featureTitleCollapsed: {
    marginTop: 0,
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
    // inkSoft (AA-legible muted), not inkFaint — the faint tone failed even the
    // 3:1 floor, making de-emphasized fast-day numbers effectively invisible.
    color: colors.inkSoft,
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
