// Public Privacy Policy page. Mirrors the in-app /privacy screen text
// verbatim (apps/mobile/app/privacy.tsx) so the App Store Connect
// "Privacy Policy URL" field can point at this page and the content
// matches what the user reads inside the app. Keep the two in sync on
// every substantive change; update the "Last updated" date below
// whenever you ship changes here.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Theosis handles your personal information: what we collect, how we use it, who we share with, and your rights.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-prose px-6 py-12 font-serif text-ink md:py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Last updated · May 27, 2026
      </p>
      <h1 className="mt-3 font-serif text-4xl font-semibold italic leading-tight tracking-tight md:text-5xl">
        Privacy Policy
      </h1>
      <div className="mt-4 h-px w-24 bg-gradient-to-r from-accent/60 to-transparent" />

      <p className="mt-8 text-base leading-relaxed text-ink-muted">
        This Privacy Policy describes how Theosis (&quot;we,&quot;
        &quot;us,&quot; or &quot;our&quot;) handles personal information in
        the Theosis mobile application and related services
        (&quot;Service&quot;). Our guiding principle is restraint: we collect
        what we need to make the Service work, nothing more, and we do not
        sell or share your data with advertisers.
      </p>

      <Section number="1" title="Anonymous use">
        You can use most of the Service without an account. When you do,
        everything you create — highlights, saved verses, notes, reading
        list, prayer rule, diptych, last-read position, completion marks —
        stays on your device in local storage (AsyncStorage on iOS and
        Android). Nothing about your activity is transmitted to our servers
        in this mode.
      </Section>

      <Section number="2" title="Account data">
        <p>If you create an account, we collect and store:</p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            Account identifier (a UUID issued by our authentication
            provider, Clerk Inc.);
          </li>
          <li>
            Your email address (if you sign in with email or with an OAuth
            provider that shares one);
          </li>
          <li>Display name if your OAuth provider shares it;</li>
          <li>
            Preferences you set in onboarding or Settings: calendar system,
            primary translation, text size, fasting level, jurisdiction,
            parish, patron saint, preferred fathers, hidden fathers,
            commentary ranking, daily-card order, onboarding status;
          </li>
          <li>
            Content you create: highlights, saved verses, notes, favorite
            people, reading list, recent searches, prayer-rule entries,
            diptych entries, daily-activity dates, completion marks.
          </li>
        </ul>
      </Section>

      <Section number="3" title="What we don’t collect">
        We do not collect your contacts, photos, microphone, precise
        location, browsing history outside Theosis, advertising identifiers,
        or biometric data. We do not include third-party analytics SDKs
        that track screen views, session length, or aggregate behavior. We
        do not sell or share your personal information with third parties
        for their marketing or advertising purposes.
      </Section>

      <Section number="4" title="How we use your data">
        We use the data described in Section 2 only to operate the Service
        for you: render the interface in your preferred configuration, sync
        your content across your devices, surface your reading history and
        completions, deliver the Service generally, comply with legal
        obligations, and detect and prevent abuse.
      </Section>

      <Section number="5" title="Service providers">
        <p>
          We rely on the following providers, each subject to its own
          privacy policy:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            <strong>Clerk Inc.</strong> (clerk.com) — authentication.
            Handles your email, password, and OAuth tokens.
          </li>
          <li>
            <strong>Vercel Inc.</strong> (vercel.com) — application hosting
            and routing. Receives Service requests including authenticated
            API calls.
          </li>
          <li>
            <strong>Neon Inc.</strong> (neon.tech) — Postgres database
            hosting. Stores the account and content data described in
            Section 2.
          </li>
          <li>
            <strong>Apple Inc. and Google LLC</strong> — OAuth identity
            providers used at your election.
          </li>
          <li>
            <strong>Expo</strong> (expo.dev) — mobile runtime. Receives
            application updates and crash data limited to the JavaScript
            bundle.
          </li>
          <li>
            <strong>OpenStreetMap Foundation</strong>{" "}
            (nominatim.openstreetmap.org) — geocoding. When you search
            parishes by ZIP, city, or address, that text is sent to look up
            coordinates. We don&apos;t retain it.
          </li>
        </ul>
        <p className="mt-3">
          We share only the minimum data required for each provider to
          deliver its function.
        </p>
      </Section>

      <Section number="6" title="Cookies and similar technology">
        The mobile app does not use cookies. Authentication tokens are
        stored in Apple Keychain or Android Keystore via Expo SecureStore.
        Application preferences are stored in AsyncStorage as plain JSON
        on your device.
      </Section>

      <Section number="7" title="Retention">
        Anonymous on-device data persists until you uninstall the app, clear
        app data, or sign in (at which point the data is imported into your
        account). Account data persists until you delete your account. We
        may retain anonymized aggregate metrics (number of accounts,
        country counts) indefinitely for operational purposes.
      </Section>

      <Section number="8" title="Your rights">
        <p>
          Depending on your jurisdiction you may have rights to access,
          correct, port, restrict, or delete personal information we hold
          about you, and to object to certain processing.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            <strong>Access</strong>: see a full machine-readable snapshot
            of everything we hold about you from Settings → Account →
            Manage.
          </li>
          <li>
            <strong>Deletion</strong>: Settings → Account → Delete my
            account permanently removes every record we hold about you
            from our servers. This action is not reversible.
          </li>
          <li>
            <strong>Correction or portability</strong>: contact us at
            contact.theosis@gmail.com.
          </li>
        </ul>
      </Section>

      <Section number="9" title="Children">
        Theosis is not directed at children under 13. If you believe a
        child under 13 has created an account, contact us and we will
        delete the record promptly. For users 13–17, we recommend using the
        Service with the consent of a parent or guardian.
      </Section>

      <Section number="10" title="Security">
        We use industry-standard measures to protect data in transit (HTTPS
        for all API calls; TLS at every provider) and at rest (encrypted
        volumes at Vercel and Neon). No system is perfectly secure; if a
        breach is suspected we will notify affected users where required by
        law.
      </Section>

      <Section number="11" title="International transfers">
        Our infrastructure runs primarily in the United States. If you
        access the Service from outside the U.S., your data may be
        transferred to, stored at, or processed in the United States. By
        using the Service you consent to this transfer.
      </Section>

      <Section
        number="12"
        title="California, EU/UK, and other jurisdictions"
      >
        Residents of California (CCPA/CPRA), the European Economic Area,
        the United Kingdom, and certain U.S. states may have additional
        rights including the right to know what categories of personal
        information are collected and shared, the right to opt out of
        &quot;sale&quot; or &quot;sharing&quot; of personal information
        (we do not sell or share), and the right to a non-discriminatory
        experience when exercising these rights. We honor these rights.
        Contact us to make a request.
      </Section>

      <Section number="13" title="Changes">
        We will update this Privacy Policy from time to time. For material
        changes (new categories of data collected, new purposes, new
        third-party sharing) we will surface a notice in the app and,
        where you have provided an email address, by email before the
        changes take effect.
      </Section>

      <Section number="14" title="Contact">
        Privacy questions, deletion requests, or rights requests should be
        sent to{" "}
        <a
          href="mailto:contact.theosis@gmail.com"
          className="text-accent underline-offset-2 hover:underline"
        >
          contact.theosis@gmail.com
        </a>
        . We respond personally, usually within five business days. For
        matters governed by GDPR you may also contact your local data
        protection authority.
      </Section>

      <footer className="mt-12 border-t border-line/40 pt-6 text-center text-sm italic text-ink-soft">
        Made with reverence — for prayer, not for data.
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
