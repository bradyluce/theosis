import Image from "next/image";
import Link from "next/link";
import {
  CaretRight,
  Flame,
} from "@phosphor-icons/react/dist/ssr";
import {
  getChapterVerses,
  getPrimaryTranslation,
} from "@/lib/bible/server-store";
import {
  composeDailyFastDetail,
  getDailyCommemoration,
  getDailyHymns,
  getDailyReadings,
} from "@/lib/calendar";
import { FastBanner } from "@/features/calendar/fast-banner";
import { HomeGospelHero } from "@/features/bible/home-gospel-hero";
import { ReadingPlanHomeTile } from "@/features/reading-plans/home-tile";
import { getPeopleByIds, getPersonById } from "@/lib/content";
import {
  getIconForPerson,
  getPrimaryIconForDay,
} from "@/lib/content/icon-store";

// Placeholder name until auth is wired in. The user mentioned wanting a
// toggle to display the patron-saint name instead of the personal name —
// that lives in profile settings (TODO once auth exists).
const PLACEHOLDER_NAME = "Brady";

function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function HomePage() {
  const today = new Date();
  const greetingText = greeting(today);

  const primaryTranslation = getPrimaryTranslation();
  const daily = getDailyCommemoration();
  const fastDetail = composeDailyFastDetail(today);
  const saints = getPeopleByIds(daily.saintIds);
  const primarySaint = saints[0];
  const readings = getDailyReadings();
  const hymns = getDailyHymns();
  const commemorationIcon = getPrimaryIconForDay(daily, saints);
  // The "Continue" section currently hard-codes a Chrysostom feature card —
  // surface his icon there too while it's still hard-coded.
  const chrysostomIcon = getIconForPerson(getPersonById("john-chrysostom"));

  // Prefer the Gospel reading; fall back to the first reading of the day.
  const gospelReading =
    readings.find((r) => r.label.toLowerCase().includes("gospel")) ??
    readings[0];

  // Pull the actual verses for the gospel reading so we can preview them in
  // the hero card. Slice to verseStart..verseEnd (verseEnd may be omitted →
  // single verse). Guard for missing data so the page never crashes.
  let gospelVerses: ReturnType<typeof getChapterVerses> = [];
  if (gospelReading && primaryTranslation) {
    const all = getChapterVerses(
      primaryTranslation.id,
      gospelReading.scripture.bookSlug,
      gospelReading.scripture.chapterNumber,
    );
    const start = gospelReading.scripture.verseStart;
    const end = gospelReading.scripture.verseEnd ?? start;
    gospelVerses = all.filter(
      (v) => v.verseNumber >= start && v.verseNumber <= end,
    );
  }

  const troparion = hymns.find((h) => h.type === "troparion");
  const kontakion = hymns.find((h) => h.type === "kontakion");

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(today);

  return (
    <div className="space-y-6 px-4 sm:px-6">
      {/* Greeting + streak chip. Right padding reserves space for the
          mobile-only profile avatar that floats above the AppShell on small
          screens. Desktop uses the side rail, so no padding needed there. */}
      <header className="flex items-center justify-between pt-3 pr-14 sm:pr-16 lg:pr-0">
        <h1 className="font-serif text-3xl tracking-tight text-ink">
          {greetingText}, {PLACEHOLDER_NAME}
        </h1>
        <button
          aria-label="Streak"
          className="flex items-center gap-1 rounded-full border border-line-strong/60 bg-surface px-3 py-1 text-sm text-ink-muted"
        >
          <Flame size={16} weight="fill" className="text-accent" />
          <span>1</span>
        </button>
      </header>

      {/* Gospel Reading hero */}
      {gospelReading && primaryTranslation ? (
        <HomeGospelHero
          readingLabel="Gospel Reading"
          todayLabel={todayLabel}
          contextLabel={gospelReading.contextLabel}
          href={`/bible/${primaryTranslation.slug}/${gospelReading.scripture.bookSlug}/${gospelReading.scripture.chapterNumber}#${gospelVerses[0]?.id ?? ""}`}
          verses={gospelVerses.map((v) => ({
            id: v.id,
            verseNumber: v.verseNumber,
            text: v.text,
            translationId: v.translationId,
          }))}
          shareReference={gospelReading.scripture.label}
          shareAttributionTranslation={primaryTranslation.name}
        />
      ) : null}

      {/* Fast banner (compact) — surfaces active fast or fast-free season */}
      <FastBanner detail={fastDetail} variant="compact" />

      {/* Today's commemoration */}
      <Link
        href="/daily"
        className="flex items-center gap-4 rounded-[16px] border border-line/40 bg-surface p-4 transition-colors duration-200 hover:bg-surface-strong"
      >
        {commemorationIcon ? (
          <Image
            src={commemorationIcon.src}
            alt={commemorationIcon.alt}
            width={commemorationIcon.width}
            height={commemorationIcon.height}
            className="h-14 w-14 shrink-0 rounded-full border border-line object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-soft font-serif text-2xl text-accent">
            {primarySaint?.name.replace(/^(St\.|the |of )/, "").trim().slice(0, 1) ??
              "✝"}
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">
            Commemoration
          </p>
          <p className="font-serif text-lg tracking-tight text-ink">
            {primarySaint?.name ?? daily.title}
          </p>
          <p className="line-clamp-1 text-xs text-ink-muted">{daily.summary}</p>
        </div>
        <CaretRight size={14} weight="bold" className="text-ink-soft" />
      </Link>

      {/* Troparion */}
      {troparion ? (
        <HymnCard
          kind="Troparion"
          tone={troparion.tone}
          title={troparion.title}
          text={troparion.text}
        />
      ) : null}

      {/* Kontakion */}
      {kontakion ? (
        <HymnCard
          kind="Kontakion"
          tone={kontakion.tone}
          title={kontakion.title}
          text={kontakion.text}
        />
      ) : null}

      {/* Reading plan tile — surfaces today's reading when the user has an
          active plan, otherwise nudges them to start one. */}
      <ReadingPlanHomeTile />

      {/* Continue Reading (placeholder for now — wire to reading history) */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl tracking-tight text-ink">
            Continue
          </h2>
          <Link
            href="/library"
            className="text-sm text-ink-muted transition-colors hover:text-ink"
          >
            See all
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FeatureCard
            href="/library/people/john-chrysostom"
            kicker="Fathers"
            title="St. John Chrysostom"
            subtitle="Archbishop of Constantinople"
            iconSrc={chrysostomIcon?.src}
            iconAlt={chrysostomIcon?.alt}
            iconWidth={chrysostomIcon?.width}
            iconHeight={chrysostomIcon?.height}
          />
          <FeatureCard
            href="/library?topic=theosis"
            kicker="Doctrine"
            title="On Theosis"
            subtitle="The Eastern teaching on deification"
          />
        </div>
      </section>
    </div>
  );
}

function HymnCard({
  kind,
  tone,
  title,
  text,
}: {
  kind: "Troparion" | "Kontakion";
  tone: string;
  title: string;
  text: string;
}) {
  return (
    <div className="space-y-3 rounded-[16px] border border-line/40 bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] uppercase tracking-[0.22em] text-accent">
          {kind}
        </p>
        <p className="text-[10px] uppercase tracking-[0.16em] text-ink-soft">
          {tone}
        </p>
      </div>
      <p className="font-serif text-lg tracking-tight text-ink">{title}</p>
      <p className="font-serif text-[0.95rem] leading-7 text-ink-muted">
        {text}
      </p>
    </div>
  );
}

function FeatureCard({
  href,
  kicker,
  title,
  subtitle,
  iconSrc,
  iconAlt,
  iconWidth,
  iconHeight,
}: {
  href: string;
  kicker: string;
  title: string;
  subtitle: string;
  iconSrc?: string;
  iconAlt?: string;
  iconWidth?: number;
  iconHeight?: number;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[16px] border border-line/40 bg-surface p-5 transition-colors duration-200 hover:bg-surface-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.22em] text-accent">
          {kicker}
        </p>
        {iconSrc && iconAlt && iconWidth && iconHeight ? (
          <Image
            src={iconSrc}
            alt={iconAlt}
            width={iconWidth}
            height={iconHeight}
            className="h-12 w-12 shrink-0 rounded-full border border-line object-cover"
          />
        ) : null}
      </div>
      <h3 className="mt-2 font-serif text-xl tracking-tight text-ink">
        {title}
      </h3>
      <p className="mt-1 text-xs text-ink-muted">{subtitle}</p>
    </Link>
  );
}
