// Public Terms of Service page. Mirrors the in-app /terms screen text
// verbatim (apps/mobile/app/terms.tsx) so the App Store Connect listing
// can link here. Keep the two in sync on every substantive change;
// update the "Last updated" date below whenever you ship changes.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of the Theosis mobile application and related services.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-prose px-6 py-12 font-serif text-ink md:py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Last updated · May 27, 2026
      </p>
      <h1 className="mt-3 font-serif text-4xl font-semibold italic leading-tight tracking-tight md:text-5xl">
        Terms of Service
      </h1>
      <div className="mt-4 h-px w-24 bg-gradient-to-r from-accent/60 to-transparent" />

      <p className="mt-8 text-base leading-relaxed text-ink-muted">
        These Terms of Service (&quot;Terms&quot;) govern your use of the
        Theosis mobile application and any related services (collectively,
        the &quot;Service&quot;) operated by Theosis (&quot;Theosis,&quot;
        &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing
        or using the Service you agree to be bound by these Terms. If you
        do not agree, do not use the Service.
      </p>

      <Section number="1" title="Eligibility">
        You must be at least 13 years old to create a Theosis account. By
        creating an account you represent that you meet this age
        requirement. The Service is not directed to children under 13 and
        we do not knowingly collect personal information from anyone under
        that age. If you are between 13 and the age of majority in your
        jurisdiction, you may only use the Service with the consent of a
        parent or legal guardian.
      </Section>

      <Section number="2" title="What Theosis is">
        Theosis is a study companion for Orthodox Christian texts —
        Scripture, patristic commentary, the lives of the saints, the
        prayer rule, the liturgical calendar, and related editorial
        content. The Service is informational and devotional. It does not
        replace a confessor, spiritual father, parish, sacrament, or the
        sacramental life of the Church.
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
        for you — for example, to sync between your devices, restore after
        re-install, or render in a printable PDF. We do not sell Your
        Content, share it with advertisers, or use it to train
        machine-learning models.
      </Section>

      <Section number="5" title="Editorial content">
        Bible translations, patristic excerpts, daily commemorations, and
        hymns surfaced in the Service are drawn from public-domain editions
        and openly licensed sources, attributed where required. Saint
        biographies and editorial prose are written by Theosis from
        public-domain facts; AI-generated content is never substituted for
        authentic patristic writing. We make reasonable efforts to keep
        attributions and context accurate; if you spot an error, please
        tell us.
      </Section>

      <Section number="6" title="Acceptable use">
        You agree not to (a) reverse-engineer, scrape, or attempt to
        extract source code from the Service except as permitted by
        applicable law; (b) use the Service to harass, defame, or harm
        others; (c) misrepresent affiliation with a Church or jurisdiction
        you do not represent; (d) impersonate Theosis or another user;
        (e) attempt to circumvent security or access controls; (f) use the
        Service in violation of applicable law.
      </Section>

      <Section number="7" title="Third-party services">
        The Service relies on third-party providers: Clerk Inc. for
        authentication, Vercel Inc. for application hosting, Neon Inc. for
        database hosting, Apple Inc. and Google LLC for OAuth providers,
        and Expo for the mobile runtime. Your use of those providers is
        governed by their own terms. We are not responsible for outages,
        security incidents, or data handling at those providers other than
        our reasonable diligence in selecting them.
      </Section>

      <Section number="8" title="Intellectual property">
        The Theosis name, logo, design system, editorial prose written by
        Theosis, and the original software comprising the Service are owned
        by Theosis and protected by copyright, trademark, and other laws.
        We grant you a limited, revocable, non-exclusive, non-transferable
        license to use the Service for personal, non-commercial study.
        Content sourced from third parties is used under the applicable
        public-domain or open-license terms.
      </Section>

      <Section number="9" title="Disclaimers">
        The Service is provided &quot;as is&quot; and &quot;as
        available&quot; without warranties of any kind, express or
        implied, including but not limited to merchantability, fitness for
        a particular purpose, non-infringement, accuracy, or uninterrupted
        availability. Editorial content is not pastoral counsel, medical
        advice, legal advice, financial advice, or mental-health advice.
        For such matters consult a qualified professional or your priest.
      </Section>

      <Section number="10" title="Limitation of liability">
        To the maximum extent permitted by law, Theosis and its
        contributors will not be liable for any indirect, incidental,
        consequential, special, exemplary, or punitive damages arising out
        of or relating to the Service. Our aggregate liability for any
        claim relating to the Service is limited to the greater of (i) the
        amount you paid to use the Service in the twelve months before the
        claim, or (ii) twenty United States dollars (USD $20.00). Some
        jurisdictions do not allow these limits; where that is so, the
        limits apply to the maximum extent permitted.
      </Section>

      <Section number="11" title="Termination">
        You may terminate your account at any time from Settings →
        Account → Delete my account. Deletion is permanent and removes
        every record we hold on our servers. We may suspend or terminate
        your access to the Service if you materially breach these Terms,
        with notice where practicable.
      </Section>

      <Section
        number="12"
        title="Changes to the Service and the Terms"
      >
        We may modify the Service or these Terms from time to time. For
        material changes (new categories of data collected, new fees,
        changes to dispute resolution) we will surface a notice in the app
        and, where you have provided an email address, by email before the
        changes take effect. Your continued use of the Service after a
        change indicates acceptance of the updated Terms.
      </Section>

      <Section number="13" title="Governing law">
        These Terms are governed by the laws of the State of Texas, United
        States of America, without regard to its conflict-of-law rules.
        Any dispute arising out of or relating to the Service or these
        Terms will be resolved in the state or federal courts located in
        the State of Texas. To the extent permitted by law, you and Theosis
        waive any right to a jury trial.
      </Section>

      <Section number="14" title="Severability and entire agreement">
        If any provision of these Terms is held unenforceable, the
        remainder will continue in effect. These Terms, together with the
        Privacy Policy, constitute the entire agreement between you and
        Theosis regarding the Service and supersede any prior agreements.
      </Section>

      <Section number="15" title="Contact">
        Questions or concerns about these Terms? Email us at{" "}
        <a
          href="mailto:contact.theosis@gmail.com"
          className="text-accent underline-offset-2 hover:underline"
        >
          contact.theosis@gmail.com
        </a>
        . We respond personally — usually within five business days.
      </Section>

      <footer className="mt-12 border-t border-line/40 pt-6 text-center text-sm italic text-ink-soft">
        By creating an account or using the Service you agree to these
        Terms.
      </footer>
    </main>
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
    <section className="mt-10">
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-sm font-semibold italic text-accent">
          {number}
        </span>
        <h2 className="font-serif text-xl font-semibold italic tracking-tight text-accent">
          {title}
        </h2>
      </div>
      <div className="mt-3 space-y-3 text-base leading-relaxed text-ink-muted">
        {children}
      </div>
    </section>
  );
}
