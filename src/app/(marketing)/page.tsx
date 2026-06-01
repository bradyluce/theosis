import type { Metadata } from "next";
import { Hero } from "./_components/hero";
import { FeatureRow } from "./_components/feature-row";
import { Pillars } from "./_components/pillars";
import { BreadthBand } from "./_components/breadth-band";
import { IconBand } from "./_components/icon-band";
import { ClosingCta } from "./_components/closing-cta";
import { PhoneFrame } from "./_components/phone-frame";
import { DailyScreen } from "./_components/screens/daily-screen";
import { ReaderScreen } from "./_components/screens/reader-screen";
import { LibraryScreen } from "./_components/screens/library-screen";

const description =
  "Theosis is an Orthodox Christian study app — verse-first patristic commentary, the daily liturgical rhythm, and the whole library of the Church Fathers. Coming soon to the App Store.";

export const metadata: Metadata = {
  title: { absolute: "Theosis — Orthodox Christian study, one verse at a time" },
  description,
  openGraph: {
    title: "Theosis — Orthodox Christian study",
    description,
    siteName: "Theosis",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Theosis — Orthodox Christian study",
    description,
  },
};

export default function LandingPage() {
  return (
    <main>
      <Hero />

      <section
        id="features"
        className="mx-auto max-w-6xl space-y-28 px-5 py-24 sm:px-8 sm:py-28 md:space-y-36"
      >
        <FeatureRow
          eyebrow="Every morning"
          title={
            <>
              The day, <span className="italic text-gilt">kept.</span>
            </>
          }
          body="Wake to today's saint, the fast, the tone, and the appointed Gospel — the whole rhythm of the Church, gathered on one quiet page before the day begins."
          points={[
            "Commemorations, troparia & kontakia",
            "Fasting guidance, every day of the year",
            "The day's Scripture, ready to read",
          ]}
          media={
            <PhoneFrame>
              <DailyScreen />
            </PhoneFrame>
          }
        />

        <FeatureRow
          flip
          eyebrow="Scripture & the Fathers"
          title={
            <>
              The Fathers, <span className="italic text-gilt">in the margin.</span>
            </>
          }
          body="Read any verse and the Fathers answer — Chrysostom, Augustine, the Catena Aurea — their commentary set beside the text, never buried in footnotes."
          points={[
            "Multiple translations to read across",
            "Verse-anchored patristic commentary",
            "Highlight, note, and save as you go",
          ]}
          media={
            <PhoneFrame>
              <ReaderScreen />
            </PhoneFrame>
          }
        />

        <FeatureRow
          eyebrow="The library"
          title={
            <>
              Eighty-five Fathers.{" "}
              <span className="italic text-gilt">One tap.</span>
            </>
          }
          body="From the Apostolic Fathers to the Cappadocians and beyond — homilies, treatises, and lives, searchable and whole, with provenance kept on every page."
          points={[
            "Full works, not just snippets",
            "Search across the entire corpus",
            "Lives and icons for every Father",
          ]}
          media={
            <PhoneFrame>
              <LibraryScreen />
            </PhoneFrame>
          }
        />
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8">
        <Pillars />
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-24">
        <BreadthBand />
      </section>

      <IconBand />

      <ClosingCta />
    </main>
  );
}
