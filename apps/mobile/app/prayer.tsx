import { Stack, router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Pill } from "@/components/theosis/pill";
import { colors, fonts, radii, spacing } from "@/constants/theosis-theme";

// Prayer Rule placeholder. Mirrors the web /prayer route — surface the
// intent so the rest of the app can route here, while the actual rule
// builder waits on real product spec.

export default function PrayerScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Settings",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.accent,
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Prayer Rule</Text>
            <Text style={styles.title}>Build your rule</Text>
            <Text style={styles.summary}>
              A traditional Orthodox prayer rule built piece by piece —
              morning prayers, evening prayers, the Psalter, Jesus Prayer
              counts, and the appointed canons for the day.
            </Text>
          </View>

          <View style={styles.comingSoon}>
            <Pill variant="accent">Coming soon</Pill>
            <Text style={styles.comingSoonBody}>
              Tracking which prayers you&apos;ve completed and which canons
              are appointed for today is in design. For now, the corpus
              under the Library tab is the right place for the texts —
              the Akathists, Psalters, and standard prayer rules will land
              here when their content is normalized into the app.
            </Text>
          </View>

          <View style={styles.intentBlock}>
            <Text style={styles.intentLabel}>What this will become</Text>
            <BulletRow text="Morning and evening prayer cards with checkmarks." />
            <BulletRow text="Psalter reader with kathisma-of-the-day prompts." />
            <BulletRow text="Jesus Prayer counter with daily / weekly goals." />
            <BulletRow text="Canons of the day — Akathist, Paraklesis, Canon to the Guardian Angel — appointed by the calendar." />
            <BulletRow text="Optional integration with the daily lectionary so reading + prayer share one daily flow." />
          </View>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>← Back to Settings</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function BulletRow({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bullet}>·</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing["4xl"],
    gap: spacing.lg,
  },

  header: { gap: spacing.sm },
  eyebrow: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.accent,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  summary: {
    fontSize: 14,
    lineHeight: 24,
    color: colors.inkMuted,
  },

  comingSoon: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(212, 168, 87, 0.2)",
    backgroundColor: "rgba(212, 168, 87, 0.05)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  comingSoonBody: {
    fontSize: 14,
    lineHeight: 23,
    color: colors.inkMuted,
  },

  intentBlock: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  intentLabel: {
    fontSize: 10.4,
    fontWeight: "500",
    color: colors.inkSoft,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  bulletRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  bullet: {
    fontSize: 18,
    color: colors.accent,
    lineHeight: 24,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 24,
    color: colors.inkMuted,
  },

  backButton: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accent,
  },
});
