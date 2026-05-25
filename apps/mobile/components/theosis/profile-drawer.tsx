import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  DisplayNumeral,
  Eyebrow,
  GiltRule,
  Halo,
  Wordmark,
} from "@/components/theosis/primitives";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";
import type { ProfilePrefs } from "@/lib/preferences";

// Slide-in profile drawer — opened from the Daily masthead avatar. The
// composition reads like a private icon corner: halo avatar with candle
// glow, gilt name plate, hairline rules instead of bordered list rows.

type ProfileDrawerProps = {
  visible: boolean;
  onClose: () => void;
  profile: ProfilePrefs;
  streak: number;
  savedCount: number;
};

const DRAWER_WIDTH = Math.min(340, Dimensions.get("window").width * 0.86);

export function ProfileDrawer({
  visible,
  onClose,
  profile,
  streak,
  savedCount,
}: ProfileDrawerProps) {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: visible ? 0 : -DRAWER_WIDTH,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 0.65 : 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, translateX, backdropOpacity]);

  const navigate = (href: string) => {
    onClose();
    setTimeout(() => router.push(href as never), 200);
  };

  const displayName = profile.displayName?.trim() || "Friend";
  const initial = displayName.charAt(0).toUpperCase();
  const statusLabel =
    profile.status === "christian"
      ? "Orthodox Christian"
      : profile.status === "catechumen"
        ? "Catechumen"
        : profile.status === "inquirer"
          ? "Inquirer"
          : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityLabel="Close profile drawer"
          />
        </Animated.View>

        <Animated.View
          style={[styles.drawer, { transform: [{ translateX }] }]}
        >
          {/* Warm gradient backdrop inside the drawer — soft candlelight
              top, settling to the deep ground at the bottom. */}
          <LinearGradient
            colors={[
              "rgba(212, 168, 87, 0.10)",
              "rgba(139, 58, 58, 0.04)",
              colors.background,
            ]}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={styles.wordmarkWrap}>
            <Wordmark size={18} subline="Icon corner" />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Identity — halo avatar with glow, name in display italic */}
            <View style={styles.identity}>
              <Halo size={72} glow>
                <Text style={styles.avatarLetter}>{initial}</Text>
              </Halo>
              <Text style={styles.displayName}>{displayName}</Text>
              {statusLabel ? (
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillLabel}>{statusLabel}</Text>
                </View>
              ) : null}
              {profile.parish ? (
                <View style={styles.parishRow}>
                  <Feather name="map-pin" size={11} color={colors.inkSoft} />
                  <Text style={styles.parish}>{profile.parish}</Text>
                </View>
              ) : null}
            </View>

            <GiltRule full style={styles.divider} />

            {/* Stat row — two big italic numerals as catalog stamps */}
            <View style={styles.statRow}>
              <DisplayNumeral
                value={streak}
                label="Day streak"
                size={42}
                tone="accent"
              />
              <View style={styles.statSeparator} />
              <DisplayNumeral
                value={savedCount}
                label="Saved"
                size={42}
                align="right"
              />
            </View>

            <GiltRule full style={styles.divider} />

            <View style={styles.linkSection}>
              <Eyebrow tone="soft" style={styles.linkSectionLabel}>
                Practice
              </Eyebrow>
              <DrawerLink
                glyph="user"
                label="Profile"
                onPress={() => navigate("/you")}
              />
              <DrawerLink
                glyph="feather"
                label="Prayer Rule"
                onPress={() => navigate("/prayer")}
              />
              <DrawerLink
                glyph="bookmark"
                label="Library"
                onPress={() => navigate("/library")}
              />
            </View>

            <View style={styles.linkSection}>
              <Eyebrow tone="soft" style={styles.linkSectionLabel}>
                Devotion
              </Eyebrow>
              <DrawerLink
                glyph="award"
                label="Patron saint"
                value={profile.patronSaintSlug?.split("-").join(" ")}
                onPress={() =>
                  profile.patronSaintSlug
                    ? navigate(`/people/${profile.patronSaintSlug}`)
                    : navigate("/settings")
                }
              />
              <DrawerLink
                glyph="settings"
                label="Settings"
                onPress={() => navigate("/settings")}
              />
            </View>
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
          >
            <Feather name="x" size={14} color={colors.inkSoft} />
            <Text style={styles.closeLabel}>Close</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function DrawerLink({
  glyph,
  label,
  value,
  onPress,
}: {
  glyph: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Feather name={glyph} size={16} color={colors.accent} />
      <Text style={styles.linkLabel}>{label}</Text>
      {value ? (
        <Text style={styles.linkValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      <Feather name="chevron-right" size={16} color={colors.inkSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: "100%",
    backgroundColor: colors.background,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.lineGilt,
    paddingTop: 64,
    paddingBottom: spacing.lg,
    overflow: "hidden",
  },
  wordmarkWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["3xl"],
  },

  identity: {
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  avatarLetter: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 32,
    color: colors.accent,
  },
  displayName: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  statusPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: "rgba(212, 168, 87, 0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
  },
  statusPillLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  parishRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  parish: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkMuted,
  },

  divider: { marginVertical: spacing.xl },

  statRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  statSeparator: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: colors.lineGilt,
    marginHorizontal: spacing.md,
  },

  linkSection: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  linkSectionLabel: { marginBottom: spacing.xs },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.card,
  },
  linkPressed: {
    backgroundColor: "rgba(212, 168, 87, 0.06)",
  },
  linkLabel: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  linkValue: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.inkSoft,
    maxWidth: 110,
    textTransform: "capitalize",
  },

  closeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xl,
  },
  closeLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "600",
    color: colors.inkSoft,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
});
