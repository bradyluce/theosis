// Privacy Policy — placeholder draft for the App Store handoff.
// Honest description of what we collect, why, and what we don't.
// Replace with the canonical legal text when one exists; sufficient
// to clear App Store guideline 5.1.1 (privacy policy required) for
// TestFlight beta.

import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Eyebrow, GiltRule, Wordmark } from "@/components/theosis/primitives";
import { colors, fonts, spacing } from "@/constants/theosis-theme";

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[
          "rgba(212, 168, 87, 0.10)",
          "rgba(139, 58, 58, 0.03)",
          colors.background,
        ]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.masthead}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={20} color={colors.inkMuted} />
        </Pressable>
        <Wordmark size={16} subline="Privacy" />
        <View style={{ width: 28 }} />
      </View>
      <GiltRule full style={{ marginHorizontal: spacing.xl }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Eyebrow tone="accent">Last updated · May 2026</Eyebrow>
        <Text style={styles.title}>Privacy Policy</Text>
        <GiltRule style={{ alignSelf: "flex-start", marginTop: spacing.md }} />

        <Section title="What we collect from anonymous users">
          When you use the app without signing in, everything you do —
          highlights, saved verses, notes, prayer rule, diptych, last
          read position — stays on your device in local storage. We
          collect nothing on the server.
        </Section>

        <Section title="What we collect when you sign in">
          Signing in lets your data follow you across devices. After
          sign-in we store, on our server: your account identifier (from
          Clerk), your email if you signed up with email, your display
          name if your provider shared it, your preferences (calendar,
          translation, fasting level, jurisdiction, parish, patron
          saint, commentary fathers order, text size), and the content
          you create (highlights, saved verses, notes, reading list,
          recent searches, prayer rule entries, diptych, daily activity,
          completion marks).
        </Section>

        <Section title="What we don&apos;t collect">
          We don&apos;t collect your contacts, your photos, your
          location (other than the rough latitude/longitude you
          voluntarily provide for the parish finder), your microphone,
          or your browsing history. We have no analytics SDK tracking
          screen views or session length. We don&apos;t sell or share
          your data with advertisers — we run no advertising.
        </Section>

        <Section title="Where your data lives">
          Account records are stored with Clerk (clerk.com). User data
          is stored in Neon Postgres, accessed by our API hosted on
          Vercel. Bible text, patristic content, and the saints
          calendar are served from the same API and from public S3
          buckets — none of those requests are tied to your account.
        </Section>

        <Section title="Third parties">
          Authentication: Clerk Inc. — see clerk.com/legal/privacy-policy.
          {"\n"}Hosting: Vercel Inc. — see vercel.com/legal/privacy-policy.
          {"\n"}Database: Neon Inc. — see neon.tech/privacy-policy.
          {"\n"}Apple / Google OAuth: only the basic profile fields they
          return to Clerk on your behalf.
        </Section>

        <Section title="Children">
          Theosis is not directed at children under 13. If you believe a
          child has created an account, contact us at the App Store
          listing email and we&apos;ll delete the record.
        </Section>

        <Section title="Your rights">
          You can view a snapshot of everything we hold about you at any
          time from the in-app diagnostic (Settings → Account → Fetch
          /api/me). You can delete your account and all related data
          from Settings → Account → Delete account. You can sign out at
          any time from the same screen.
        </Section>

        <Section title="Changes">
          If we materially change what we collect or how we use it, we
          will surface a note in the app and, if you&apos;ve provided an
          email, send a message.
        </Section>

        <Section title="Contact">
          Privacy questions go to the email on the App Store listing.
        </Section>

        <View style={styles.footer}>
          <GiltRule />
          <Text style={styles.footerText}>
            Made with reverence — for prayer, not for data.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.bodyText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  masthead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["4xl"],
    gap: spacing.lg,
  },
  title: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 38,
    color: colors.ink,
    letterSpacing: -0.6,
    lineHeight: 42,
  },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 18,
    color: colors.accent,
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  bodyText: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 24,
    color: colors.inkMuted,
  },
  footer: {
    paddingTop: spacing.lg,
    gap: spacing.md,
    alignItems: "center",
  },
  footerText: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkSoft,
  },
});
