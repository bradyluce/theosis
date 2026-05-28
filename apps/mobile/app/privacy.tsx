// Privacy Policy — production text. Covers: what we collect, how we
// use it, who we share with, retention, security, your rights
// (access/correction/deletion), children's privacy, international
// transfers, third-party providers, changes, contact. Update the
// "Last updated" eyebrow below whenever substantive changes ship.

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
        <Eyebrow tone="accent">Last updated · May 27, 2026</Eyebrow>
        <Text style={styles.title}>Privacy Policy</Text>
        <GiltRule style={{ alignSelf: "flex-start", marginTop: spacing.md }} />

        <Text style={styles.intro}>
          This Privacy Policy describes how Theosis (&quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;) handles personal information
          in the Theosis mobile application and related services
          (&quot;Service&quot;). Our guiding principle is restraint: we
          collect what we need to make the Service work, nothing more, and
          we do not sell or share your data with advertisers.
        </Text>

        <Section number="1" title="Anonymous use">
          You can use most of the Service without an account. When you do,
          everything you create — highlights, saved verses, notes, reading
          list, prayer rule, diptych, last-read position, completion marks
          — stays on your device in local storage (AsyncStorage on iOS and
          Android). Nothing about your activity is transmitted to our
          servers in this mode.
        </Section>

        <Section number="2" title="Account data">
          If you create an account, we collect and store:
          {"\n\n"}
          • Account identifier (a UUID issued by our authentication
          provider, Clerk Inc.);
          {"\n"}
          • Your email address (if you sign in with email or with an
          OAuth provider that shares one);
          {"\n"}
          • Display name if your OAuth provider shares it;
          {"\n"}
          • Preferences you set in onboarding or Settings: calendar
          system, primary translation, text size, fasting level,
          jurisdiction, parish, patron saint, preferred fathers, hidden
          fathers, commentary ranking, daily-card order, onboarding
          status;
          {"\n"}
          • Content you create: highlights, saved verses, notes, favorite
          people, reading list, recent searches, prayer-rule entries,
          diptych entries, daily-activity dates, completion marks.
        </Section>

        <Section number="3" title="What we don&apos;t collect">
          We do not collect your contacts, photos, microphone, precise
          location, browsing history outside Theosis, advertising
          identifiers, or biometric data. We do not include third-party
          analytics SDKs that track screen views, session length, or
          aggregate behavior. We do not sell or share your personal
          information with third parties for their marketing or
          advertising purposes.
        </Section>

        <Section number="4" title="How we use your data">
          We use the data described in Section 2 only to operate the
          Service for you: render the interface in your preferred
          configuration, sync your content across your devices, surface
          your reading history and completions, deliver the Service
          generally, comply with legal obligations, and detect and
          prevent abuse.
        </Section>

        <Section number="5" title="Service providers">
          We rely on the following providers, each subject to its own
          privacy policy:
          {"\n\n"}
          • Clerk Inc. (clerk.com) — authentication. Handles your email,
          password, and OAuth tokens.
          {"\n"}
          • Vercel Inc. (vercel.com) — application hosting and routing.
          Receives Service requests including authenticated API calls.
          {"\n"}
          • Neon Inc. (neon.tech) — Postgres database hosting. Stores
          the account and content data described in Section 2.
          {"\n"}
          • Apple Inc. and Google LLC — OAuth identity providers used at
          your election.
          {"\n"}
          • Expo (expo.dev) — mobile runtime. Receives application
          updates and crash data limited to the JavaScript bundle.
          {"\n\n"}
          We share only the minimum data required for each provider to
          deliver its function.
        </Section>

        <Section number="6" title="Cookies and similar technology">
          The mobile app does not use cookies. Authentication tokens are
          stored in Apple Keychain or Android Keystore via
          Expo SecureStore. Application preferences are stored in
          AsyncStorage as plain JSON on your device.
        </Section>

        <Section number="7" title="Retention">
          Anonymous on-device data persists until you uninstall the app,
          clear app data, or sign in (at which point the data is imported
          into your account). Account data persists until you delete your
          account. We may retain anonymized aggregate metrics (number of
          accounts, country counts) indefinitely for operational
          purposes.
        </Section>

        <Section number="8" title="Your rights">
          Depending on your jurisdiction you may have rights to access,
          correct, port, restrict, or delete personal information we
          hold about you, and to object to certain processing.
          {"\n\n"}
          • Access: see a full machine-readable snapshot of everything
          we hold about you from Settings → Account → Manage → Fetch
          /api/me.
          {"\n"}
          • Deletion: Settings → Account → Delete my account
          permanently removes every record we hold about you from our
          servers. This action is not reversible.
          {"\n"}
          • Correction or portability: contact us at
          contact.theosis@gmail.com.
        </Section>

        <Section number="9" title="Children">
          Theosis is not directed at children under 13. If you believe a
          child under 13 has created an account, contact us and we will
          delete the record promptly. For users 13–17, we recommend
          using the Service with the consent of a parent or guardian.
        </Section>

        <Section number="10" title="Security">
          We use industry-standard measures to protect data in transit
          (HTTPS for all API calls; TLS at every provider) and at rest
          (encrypted volumes at Vercel and Neon). No system is perfectly
          secure; if a breach is suspected we will notify affected users
          where required by law.
        </Section>

        <Section number="11" title="International transfers">
          Our infrastructure runs primarily in the United States. If you
          access the Service from outside the U.S., your data may be
          transferred to, stored at, or processed in the United States.
          By using the Service you consent to this transfer.
        </Section>

        <Section number="12" title="California, EU/UK, and other jurisdictions">
          Residents of California (CCPA/CPRA), the European Economic
          Area, the United Kingdom, and certain U.S. states may have
          additional rights including the right to know what categories
          of personal information are collected and shared, the right to
          opt out of &quot;sale&quot; or &quot;sharing&quot; of personal
          information (we do not sell or share), and the right to a
          non-discriminatory experience when exercising these rights.
          We honor these rights. Contact us to make a request.
        </Section>

        <Section number="13" title="Changes">
          We will update this Privacy Policy from time to time. For
          material changes (new categories of data collected, new
          purposes, new third-party sharing) we will surface a notice in
          the app and, where you have provided an email address, by
          email before the changes take effect.
        </Section>

        <Section number="14" title="Contact">
          Privacy questions, deletion requests, or rights requests should
          be sent to contact.theosis@gmail.com. We respond personally,
          usually within five business days. For matters governed by
          GDPR you may also contact your local data protection authority.
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
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionNumber}>{number}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
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
  intro: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 25,
    color: colors.inkMuted,
  },
  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  sectionNumber: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 14,
    color: colors.accent,
    letterSpacing: -0.2,
    minWidth: 22,
  },
  sectionTitle: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 18,
    color: colors.accent,
    letterSpacing: -0.2,
    lineHeight: 24,
    flex: 1,
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
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
});
