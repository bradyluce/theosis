// Terms of Service — substantive draft suitable for App Store
// submission. Plain-English, no legalese theater; covers acceptance,
// account, content, conduct, third-party services, intellectual
// property, disclaimers, liability cap, termination, governing law,
// changes, and contact. Replace company name + jurisdiction + email
// before going live.

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
        <Eyebrow tone="accent">Last updated · May 27, 2026</Eyebrow>
        <Text style={styles.title}>Terms of Service</Text>
        <GiltRule style={{ alignSelf: "flex-start", marginTop: spacing.md }} />

        <Text style={styles.intro}>
          These Terms of Service (&quot;Terms&quot;) govern your use of the
          Theosis mobile application and any related services (collectively,
          the &quot;Service&quot;) operated by Theosis (&quot;Theosis,&quot;
          &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing
          or using the Service you agree to be bound by these Terms. If you
          do not agree, do not use the Service.
        </Text>

        <Section number="1" title="Eligibility">
          You must be at least 13 years old to create a Theosis account. By
          creating an account you represent that you meet this age
          requirement. The Service is not directed to children under 13 and
          we do not knowingly collect personal information from anyone
          under that age. If you are between 13 and the age of majority in
          your jurisdiction, you may only use the Service with the consent
          of a parent or legal guardian.
        </Section>

        <Section number="2" title="What Theosis is">
          Theosis is a study companion for Orthodox Christian texts —
          Scripture, patristic commentary, the lives of the saints, the
          prayer rule, the liturgical calendar, and related editorial
          content. The Service is informational and devotional. It does
          not replace a confessor, spiritual father, parish, sacrament, or
          the sacramental life of the Church.
        </Section>

        <Section number="3" title="Your account">
          You may use much of the Service anonymously, with your data stored
          only on your device. Some features (cross-device sync, account
          recovery) require creating an account through our authentication
          provider, Clerk. You are responsible for keeping your sign-in
          credentials confidential and for any activity under your account.
          Notify us promptly at the contact email below if you suspect
          unauthorized access.
        </Section>

        <Section number="4" title="Your content">
          Highlights, notes, reading lists, prayer-rule selections, the
          diptych, and similar content you create (&quot;Your Content&quot;)
          remain yours. By using the Service you grant Theosis a limited,
          worldwide, non-exclusive, royalty-free license to store, transmit,
          process, and display Your Content solely to operate the Service
          for you — for example, to sync between your devices, restore
          after re-install, or render in a printable PDF. We do not sell
          Your Content, share it with advertisers, or use it to train
          machine-learning models.
        </Section>

        <Section number="5" title="Editorial content">
          Bible translations, patristic excerpts, daily commemorations, and
          hymns surfaced in the Service are drawn from public-domain
          editions and openly licensed sources, attributed where required.
          Saint biographies and editorial prose are written by Theosis from
          public-domain facts; AI-generated content is never substituted
          for authentic patristic writing. We make reasonable efforts to
          keep attributions and context accurate; if you spot an error,
          please tell us.
        </Section>

        <Section number="6" title="Acceptable use">
          You agree not to (a) reverse-engineer, scrape, or attempt to
          extract source code from the Service except as permitted by
          applicable law; (b) use the Service to harass, defame, or harm
          others; (c) misrepresent affiliation with a Church or jurisdiction
          you do not represent; (d) impersonate Theosis or another user;
          (e) attempt to circumvent security or access controls; (f) use
          the Service in violation of applicable law.
        </Section>

        <Section number="7" title="Third-party services">
          The Service relies on third-party providers: Clerk Inc. for
          authentication, Vercel Inc. for application hosting, Neon Inc.
          for database hosting, Apple Inc. and Google LLC for OAuth
          providers, and Expo for the mobile runtime. Your use of those
          providers is governed by their own terms. We are not responsible
          for outages, security incidents, or data handling at those
          providers other than our reasonable diligence in selecting them.
        </Section>

        <Section number="8" title="Intellectual property">
          The Theosis name, logo, design system, editorial prose written by
          Theosis, and the original software comprising the Service are
          owned by Theosis and protected by copyright, trademark, and other
          laws. We grant you a limited, revocable, non-exclusive,
          non-transferable license to use the Service for personal,
          non-commercial study. Content sourced from third parties is used
          under the applicable public-domain or open-license terms.
        </Section>

        <Section number="9" title="Disclaimers">
          The Service is provided &quot;as is&quot; and &quot;as
          available&quot; without warranties of any kind, express or
          implied, including but not limited to merchantability, fitness
          for a particular purpose, non-infringement, accuracy, or
          uninterrupted availability. Editorial content is not pastoral
          counsel, medical advice, legal advice, financial advice, or
          mental-health advice. For such matters consult a qualified
          professional or your priest.
        </Section>

        <Section number="10" title="Limitation of liability">
          To the maximum extent permitted by law, Theosis and its
          contributors will not be liable for any indirect, incidental,
          consequential, special, exemplary, or punitive damages arising
          out of or relating to the Service. Our aggregate liability for
          any claim relating to the Service is limited to the greater of
          (i) the amount you paid to use the Service in the twelve months
          before the claim, or (ii) twenty United States dollars
          (USD $20.00). Some jurisdictions do not allow these limits;
          where that is so, the limits apply to the maximum extent
          permitted.
        </Section>

        <Section number="11" title="Termination">
          You may terminate your account at any time from Settings →
          Account → Delete my account. Deletion is permanent and removes
          every record we hold on our servers. We may suspend or terminate
          your access to the Service if you materially breach these Terms,
          with notice where practicable.
        </Section>

        <Section number="12" title="Changes to the Service and the Terms">
          We may modify the Service or these Terms from time to time. For
          material changes (new categories of data collected, new fees,
          changes to dispute resolution) we will surface a notice in the
          app and, where you have provided an email address, by email
          before the changes take effect. Your continued use of the
          Service after a change indicates acceptance of the updated
          Terms.
        </Section>

        <Section number="13" title="Governing law">
          These Terms are governed by the laws of the State of Michigan,
          United States of America, without regard to its conflict-of-law
          rules. Any dispute arising out of or relating to the Service or
          these Terms will be resolved in the state or federal courts
          located in Wayne County, Michigan. To the extent permitted by
          law, you and Theosis waive any right to a jury trial.
        </Section>

        <Section number="14" title="Severability and entire agreement">
          If any provision of these Terms is held unenforceable, the
          remainder will continue in effect. These Terms, together with
          the Privacy Policy, constitute the entire agreement between you
          and Theosis regarding the Service and supersede any prior
          agreements.
        </Section>

        <Section number="15" title="Contact">
          Questions or concerns about these Terms? Email us at the address
          shown on the App Store listing. We respond personally — usually
          within five business days.
        </Section>

        <View style={styles.footer}>
          <GiltRule />
          <Text style={styles.footerText}>
            By creating an account or using the Service you agree to these
            Terms.
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
