// Terms of Service — placeholder draft for the App Store handoff.
// The phrasing is plain and honest about what Theosis is and what it
// isn't. Replace with the canonical legal text when one exists; this
// is enough to clear App Store guideline 1.2 (provide terms) for the
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

export default function TermsScreen() {
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
        <Wordmark size={16} subline="Terms" />
        <View style={{ width: 28 }} />
      </View>
      <GiltRule full style={{ marginHorizontal: spacing.xl }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Eyebrow tone="accent">Last updated · May 2026</Eyebrow>
        <Text style={styles.title}>Terms of Service</Text>
        <GiltRule style={{ alignSelf: "flex-start", marginTop: spacing.md }} />

        <Section title="What Theosis is">
          Theosis is a study companion for Orthodox Christian texts — Scripture,
          patristic commentary, the lives of the saints, the prayer rule, and
          the liturgical calendar. It does not replace a confessor, a parish,
          or the sacramental life of the Church. It is a tool for reading and
          remembrance.
        </Section>

        <Section title="Editorial content">
          Bible translations, patristic excerpts, daily commemorations, and
          hymns surfaced in the app are drawn from public-domain editions
          and openly licensed sources. Saint biographies are written from
          public-domain facts; AI-generated prose is never substituted for
          authentic patristic writing. We make our best effort to keep
          attribution and context accurate.
        </Section>

        <Section title="Your account and your content">
          When you sign in, Theosis stores a record of your account, your
          preferences (calendar, translation, jurisdiction, etc.), and the
          content you save (verses, highlights, notes, reading list,
          diptych, prayer rule). You own this data. You can delete your
          account at any time from Settings → Account → Delete account;
          this drops every record we hold about you, on the server, and
          signs you out.
        </Section>

        <Section title="No prophecy. No counsel.">
          Anything that looks like advice in this app — a daily reading,
          a commemoration, an excerpt from a Father — is editorial, not
          pastoral. For spiritual counsel, see your priest or spiritual
          father. For medical, legal, financial, or mental-health
          decisions, see a qualified professional.
        </Section>

        <Section title="Availability">
          Theosis runs on third-party infrastructure (Clerk for accounts,
          Vercel + Neon for the API and database, Expo for the mobile
          runtime). When those providers are unavailable, parts of the
          app may be too. The app is provided as-is, without warranty.
        </Section>

        <Section title="Changes to these terms">
          We may update these terms as the app evolves. If we make a
          material change (new data collected, new payment model, etc.),
          we&apos;ll surface a note in the app or by email if you&apos;ve
          provided one.
        </Section>

        <Section title="Contact">
          Questions? Reach out at the email shown in the App Store listing.
          We&apos;ll respond as a human, not a form letter.
        </Section>

        <View style={styles.footer}>
          <GiltRule />
          <Text style={styles.footerText}>
            By using Theosis you agree to these terms.
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
