import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Pill } from "@/components/primitives/pill";
import { Surface } from "@/components/primitives/surface";
import { getPeopleByIds, getPrimaryTranslation } from "@/lib/content";
import {
  getDailyCommemoration,
  getDailyHymns,
  getDailyReadings,
} from "@/lib/calendar";
import { DatePicker } from "@/app/(shell)/daily/date-picker";

type DailyPageProps = {
  searchParams: Promise<{ date?: string }>;
};

// Parse a `?date=YYYY-MM-DD` query param into a UTC Date. Returns undefined
// for missing or malformed input — the composer treats that as "today".
function parseDateParam(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2099) return undefined;
  if (month < 1 || month > 12) return undefined;
  if (day < 1 || day > 31) return undefined;
  return new Date(Date.UTC(year, month - 1, day));
}

// Today's ISO date in the user's local timezone (not UTC) — matches what a
// human means by "today" when they click the picker's Today shortcut.
function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function DailyPage({ searchParams }: DailyPageProps) {
  const { date: rawDate } = await searchParams;
  const date = parseDateParam(rawDate);

  const daily = getDailyCommemoration(date);
  const saints = getPeopleByIds(daily.saintIds);
  const readings = getDailyReadings(date);
  const hymns = getDailyHymns(date);
  const translationSlug = getPrimaryTranslation().slug;
  // The first linked Person that carries an extendedSummary is the source
  // for the inline "Read more" disclosure. Days that don't have one fall
  // back to just the short summary — no Read more button.
  const primarySaintWithBio = saints.find((saint) => Boolean(saint.extendedSummary));
  // Format in UTC so the displayed weekday matches the ISO date we resolved
  // from the URL — otherwise users west of UTC see the previous day's label
  // when the underlying ISO is parsed as UTC midnight.
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(daily.isoDate));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={formattedDate}
        title={daily.title}
        description={daily.summary}
      />

      <DatePicker value={daily.isoDate} today={todayIso()} />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Surface className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {daily.feastLabel ? <Pill variant="accent">{daily.feastLabel}</Pill> : null}
            {daily.fastLabel ? <Pill variant="subtle">{daily.fastLabel}</Pill> : null}
          </div>

          <div className="space-y-3">
            <h2 className="font-serif text-4xl tracking-tight text-ink">
              {daily.title}
            </h2>
            <p className="text-sm leading-7 text-ink-muted">{daily.summary}</p>
          </div>

          {primarySaintWithBio?.extendedSummary ? (
            <details className="group rounded-[12px] border border-line bg-background px-4 py-3 transition-colors duration-200 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft transition-colors duration-200 hover:text-ink">
                <span>Read more about {primarySaintWithBio.name.split(",")[0]}</span>
                <span className="text-base transition-transform duration-200 group-open:rotate-90">›</span>
              </summary>
              <div className="mt-4 space-y-3 text-sm leading-7 text-ink-muted">
                {primarySaintWithBio.extendedSummary.split("\n\n").map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
                <p>
                  <Link
                    href={`/library/people/${primarySaintWithBio.slug}`}
                    className="text-ink underline decoration-line decoration-1 underline-offset-4 transition-colors duration-200 hover:text-gold"
                  >
                    Full library entry →
                  </Link>
                </p>
              </div>
            </details>
          ) : null}

          {saints.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {saints.map((saint) => (
                <Link
                  key={saint.id}
                  href={`/library/people/${saint.slug}`}
                  className="rounded-[12px] border border-line bg-background px-4 py-3 transition-colors duration-200 hover:bg-surface-strong"
                >
                  <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                    {saint.kind}
                  </p>
                  <p className="mt-1 font-serif text-2xl tracking-tight text-ink">
                    {saint.name}
                  </p>
                </Link>
              ))}
            </div>
          ) : null}

          {daily.additionalCommemorations.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                Also commemorated
              </p>
              <ul className="space-y-1 text-sm leading-6 text-ink-muted">
                {daily.additionalCommemorations.map((item, index) => {
                  const linkedSaint = item.saintId
                    ? saints.find((saint) => saint.id === item.saintId)
                    : undefined;
                  return (
                    <li key={`${item.name}-${index}`}>
                      {linkedSaint ? (
                        <Link
                          href={`/library/people/${linkedSaint.slug}`}
                          className="text-ink transition-colors duration-200 hover:text-gold"
                        >
                          {item.name}
                        </Link>
                      ) : (
                        item.name
                      )}
                      {item.summary ? (
                        <span className="text-ink-soft"> — {item.summary}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </Surface>

        <Surface className="space-y-4">
          <div className="space-y-1">
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
              Readings
            </p>
            <h2 className="font-serif text-3xl tracking-tight text-ink">
              Scripture for the day
            </h2>
          </div>
          {readings.length > 0 ? (
            <div className="grid gap-3">
              {readings.map((reading) => (
                <Link
                  key={reading.id}
                  href={`/bible/${translationSlug}/${reading.scripture.bookSlug}/${reading.scripture.chapterNumber}`}
                  className="rounded-[12px] border border-line bg-background px-4 py-4 transition-colors duration-200 hover:bg-surface-strong"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Pill>{reading.label}</Pill>
                    <span className="text-xs uppercase tracking-[0.18em] text-ink-soft">
                      {reading.contextLabel}
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-2xl tracking-tight text-ink">
                    {reading.scripture.label}
                  </h3>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-7 text-ink-muted">
              No appointed readings for this day yet — weekday lectionary
              coverage is still being filled in.
            </p>
          )}
        </Surface>
      </div>

      <Surface className="space-y-4">
        <div className="space-y-1">
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
            Hymns
          </p>
          <h2 className="font-serif text-3xl tracking-tight text-ink">
            Troparion and kontakion
          </h2>
        </div>
        {hymns.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {hymns.map((hymn) => (
              <div
                key={hymn.id}
                className="rounded-[12px] border border-line bg-background px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <Pill variant="subtle">{hymn.type}</Pill>
                  <span className="text-xs uppercase tracking-[0.18em] text-ink-soft">
                    {hymn.tone}
                  </span>
                </div>
                <h3 className="mt-3 font-serif text-2xl tracking-tight text-ink">
                  {hymn.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-ink-muted">
                  {hymn.text}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-7 text-ink-muted">
            No hymns yet appointed for this day — the corpus is being filled in
            with original English translations of the standard texts.
          </p>
        )}
      </Surface>
    </div>
  );
}
