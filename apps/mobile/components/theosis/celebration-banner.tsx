import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";

// Celebration banner for the Daily page — appears on the user's name day
// (their patron saint's feast) and/or their birthday. A warm, gilt-tinted
// strip styled to sit beside the fast banner. Renders nothing when there's
// nothing to celebrate. "Many years!" is the traditional Orthodox greeting
// for both occasions.

type CelebrationBannerProps = {
  isNameDay: boolean;
  isBirthday: boolean;
  patronName: string | null;
  // Tapping a name-day banner opens the patron's page. Omitted for a
  // birthday-only banner (nothing to navigate to).
  onPress?: () => void;
};

export function CelebrationBanner({
  isNameDay,
  isBirthday,
  patronName,
  onPress,
}: CelebrationBannerProps) {
  if (!isNameDay && !isBirthday) return null;

  const eyebrow =
    isNameDay && isBirthday
      ? "Name day & birthday"
      : isNameDay
        ? "Your name day"
        : "Your birthday";

  let body: string;
  if (isNameDay && isBirthday) {
    body = patronName
      ? `Happy birthday — and your name day. ${patronName} is commemorated today.`
      : "Happy birthday — and your name day today.";
  } else if (isNameDay) {
    body = patronName
      ? `${patronName} is commemorated today — your patron and your name day.`
      : "Your patron saint is commemorated today.";
  } else {
    body = "Wishing you a blessed and joyful birthday.";
  }

  const icon = isBirthday && !isNameDay ? "gift" : "star";
  const interactive = Boolean(onPress) && isNameDay;

  const inner = (
    <View style={styles.banner}>
      <View style={styles.iconWrap}>
        <Feather name={icon} size={16} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>Many years!</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      {interactive ? (
        <Feather name="chevron-right" size={18} color={colors.inkSoft} />
      ) : null}
    </View>
  );

  if (!interactive) return inner;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={`${eyebrow} — many years`}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: colors.accentSoft,
    padding: spacing.lg,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    ...text.eyebrowAccent,
    fontSize: 10,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 18,
    color: colors.ink,
    lineHeight: 22,
    letterSpacing: -0.2,
    marginTop: 2,
  },
  body: {
    fontFamily: fonts.serif,
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
});
