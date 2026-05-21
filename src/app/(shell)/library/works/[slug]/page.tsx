import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Pill } from "@/components/primitives/pill";
import { Surface } from "@/components/primitives/surface";
import { ReadingListButton } from "@/features/library/reading-list-button";
import {
  getPersonById,
  getSourceById,
  getWorkBySlug,
  getWorkSections,
} from "@/lib/content";
import {
  getChaptersForWork,
  getCommentaryEntriesForWork,
  getPersonByIdFromAll,
  getSourceByIdFromAll,
  getWorkBySlugFromAll,
} from "@/lib/content/commentary-loader";

type WorkPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const BOOK_DISPLAY_NAMES: Record<string, string> = {
  matthew: "Matthew",
  mark: "Mark",
  luke: "Luke",
  john: "John",
};

function bookLabel(bookSlug: string): string {
  return (
    BOOK_DISPLAY_NAMES[bookSlug] ??
    bookSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export default async function WorkPage({ params }: WorkPageProps) {
  const { slug } = await params;
  const work = getWorkBySlug(slug) ?? getWorkBySlugFromAll(slug);

  if (!work) {
    notFound();
  }

  const person = getPersonById(work.personId) ?? getPersonByIdFromAll(work.personId);
  const source = getSourceById(work.sourceId) ?? getSourceByIdFromAll(work.sourceId);
  const seedSections = getWorkSections(work.id);
  const commentaryEntries = getCommentaryEntriesForWork(work.id);
  const chapters = getChaptersForWork(work.id);

  // Group commentary entries by chapter for rendering
  type ChapterGroup = {
    chapterNumber: number;
    bookSlug: string;
    entries: typeof commentaryEntries;
  };
  const chapterGroups: ChapterGroup[] = [];
  let currentGroup: ChapterGroup | null = null;
  for (const item of commentaryEntries) {
    if (
      !currentGroup ||
      currentGroup.chapterNumber !== item.chapterNumber ||
      currentGroup.bookSlug !== item.bookSlug
    ) {
      currentGroup = {
        chapterNumber: item.chapterNumber,
        bookSlug: item.bookSlug,
        entries: [],
      };
      chapterGroups.push(currentGroup);
    }
    currentGroup.entries.push(item);
  }

  const hasCommentary = chapterGroups.length > 0;
  const totalEntries = commentaryEntries.length;
  const uniqueFathers = new Set(commentaryEntries.map((e) => e.entry.personId)).size;
  const firstBookSlug = commentaryEntries[0]?.bookSlug;

  const hasChapters = chapters.length > 0;
  const totalParagraphs = chapters.reduce(
    (sum, chapter) =>
      sum +
      chapter.sections.reduce((s, section) => s + section.paragraphs.length, 0),
    0,
  );

  return (
    <div className="space-y-8 px-4 sm:px-6">
      <PageHeader
        eyebrow={work.workType}
        title={work.title}
        description={work.summary}
        actions={<ReadingListButton workId={work.id} />}
      />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Surface className="space-y-4">
          <Pill variant="accent">{work.eraLabel}</Pill>
          {person ? (
            <div className="space-y-1">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                Attributed to
              </p>
              <Link
                href={`/library/people/${person.slug}`}
                className="text-sm font-medium text-accent transition-colors duration-200 hover:text-ink"
              >
                {person.honorific ? `${person.honorific} ${person.name}` : person.name}
              </Link>
            </div>
          ) : null}
          <div className="space-y-1">
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
              Source collection
            </p>
            <p className="text-sm leading-7 text-ink-muted">
              {source?.collection ?? "Seeded source"}
            </p>
            {source?.url ? (
              <Link
                href={source.url}
                className="text-xs font-medium text-accent transition-colors duration-200 hover:text-ink"
                target="_blank"
                rel="noreferrer"
              >
                Open source ↗
              </Link>
            ) : null}
          </div>
          {hasCommentary ? (
            <div className="space-y-2">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                Corpus
              </p>
              <p className="text-sm leading-7 text-ink-muted">
                {totalEntries.toLocaleString()} commentary entries from{" "}
                {uniqueFathers} {uniqueFathers === 1 ? "Father" : "Fathers"} across{" "}
                {chapterGroups.length}{" "}
                {chapterGroups.length === 1 ? "chapter" : "chapters"}
                {firstBookSlug ? ` of ${bookLabel(firstBookSlug)}` : ""}.
              </p>
            </div>
          ) : null}
          {hasChapters ? (
            <div className="space-y-2">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                Text
              </p>
              <p className="text-sm leading-7 text-ink-muted">
                {chapters.length}{" "}
                {chapters.length === 1 ? "book" : "books"},{" "}
                {totalParagraphs.toLocaleString()} paragraphs.
              </p>
            </div>
          ) : null}
          {work.verseRefs.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                Linked passages
              </p>
              <div className="flex flex-wrap gap-2">
                {work.verseRefs.map((reference) => (
                  <Pill key={reference.label} variant="subtle">
                    {reference.label}
                  </Pill>
                ))}
              </div>
            </div>
          ) : null}
        </Surface>

        <div className="space-y-4">
          {seedSections.map((section) => (
            <Surface key={section.id} className="space-y-3">
              <Pill>{section.label}</Pill>
              <p className="font-serif text-2xl leading-9 tracking-tight text-ink">
                {section.excerpt}
              </p>
              {section.verseRef ? (
                <p className="text-sm text-ink-soft">
                  Related passage: {section.verseRef.label}
                </p>
              ) : null}
            </Surface>
          ))}

          {hasChapters ? (
            <div className="space-y-3">
              {chapters.map((chapter) => (
                <details
                  key={chapter.id}
                  className="group rounded-[12px] border border-line bg-surface"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[12px] px-4 py-3 transition-colors duration-200 hover:bg-surface-strong">
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-lg tracking-tight text-ink">
                        {chapter.label}
                      </p>
                      <p className="text-[0.65rem] uppercase tracking-[0.18em] text-ink-soft">
                        {chapter.sections.reduce(
                          (sum, section) => sum + section.paragraphs.length,
                          0,
                        )}{" "}
                        paragraphs
                      </p>
                    </div>
                    <span className="shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-180">
                      ▾
                    </span>
                  </summary>
                  <div className="space-y-6 border-t border-line bg-background px-5 py-6 sm:px-8 sm:py-8">
                    {chapter.summary ? (
                      <p className="border-l-2 border-accent/40 pl-4 font-serif text-base italic leading-7 text-ink-muted">
                        {chapter.summary}
                      </p>
                    ) : null}
                    {chapter.sections.map((section, sectionIdx) => (
                      <section
                        key={`${chapter.id}-section-${sectionIdx}`}
                        className="space-y-4"
                      >
                        {section.heading ? (
                          <h3 className="font-serif text-lg tracking-tight text-ink">
                            {section.heading}
                          </h3>
                        ) : null}
                        {section.paragraphs.map((paragraph, paragraphIdx) => (
                          <p
                            key={`${chapter.id}-p-${sectionIdx}-${paragraphIdx}`}
                            className="font-serif text-[15px] leading-8 text-ink"
                          >
                            {paragraph.number !== undefined ? (
                              <sup className="mr-1 font-mono text-[0.65rem] font-medium text-accent">
                                {paragraph.number}
                              </sup>
                            ) : null}
                            {paragraph.text}
                          </p>
                        ))}
                      </section>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          ) : null}

          {hasCommentary ? (
            <div className="space-y-3">
              {chapterGroups.map((group) => (
                <details
                  key={`${group.bookSlug}-${group.chapterNumber}`}
                  className="group rounded-[12px] border border-line bg-surface"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[12px] px-4 py-3 transition-colors duration-200 hover:bg-surface-strong">
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-lg tracking-tight text-ink">
                        {bookLabel(group.bookSlug)} {group.chapterNumber}
                      </p>
                      <p className="text-[0.65rem] uppercase tracking-[0.18em] text-ink-soft">
                        {group.entries.length} entries
                      </p>
                    </div>
                    <span className="shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-180">
                      ▾
                    </span>
                  </summary>
                  <div className="space-y-4 border-t border-line bg-background px-4 py-4">
                    {group.entries.map(({ entry, person: entryPerson, verseNumber }) => (
                      <article
                        key={entry.id}
                        className="space-y-2 border-b border-line/60 pb-4 last:border-b-0 last:pb-0"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-mono text-xs tracking-wide text-accent">
                            v. {verseNumber}
                          </p>
                          {entryPerson ? (
                            <Link
                              href={`/library/people/${entryPerson.slug}`}
                              className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft transition-colors duration-200 hover:text-ink"
                            >
                              {entryPerson.honorific
                                ? `${entryPerson.honorific} ${entryPerson.name}`
                                : entryPerson.name}
                            </Link>
                          ) : (
                            <span className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                              {entry.personId}
                            </span>
                          )}
                        </div>
                        <p className="text-sm leading-7 text-ink-muted">
                          {entry.excerpt}
                        </p>
                      </article>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          ) : !hasChapters && seedSections.length === 0 ? (
            <Surface tone="quiet" className="space-y-2 px-4 py-4">
              <h3 className="font-serif text-2xl tracking-tight text-ink">
                No content seeded for this work yet.
              </h3>
              <p className="text-sm leading-7 text-ink-muted">
                Sections will appear here as the work is built out.
              </p>
            </Surface>
          ) : null}
        </div>
      </div>
    </div>
  );
}
