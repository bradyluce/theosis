"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  BookmarkSimple,
  CaretDown,
  CaretLeft,
  Copy,
  HighlighterCircle,
  LinkSimple,
  NotePencil,
  X,
} from "@phosphor-icons/react";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/primitives/button";
import { Pill } from "@/components/primitives/pill";
import { SegmentedControl } from "@/components/primitives/segmented-control";
import { Surface } from "@/components/primitives/surface";
import type {
  ReaderCommentaryCard,
  ReaderModel,
  ReaderVerseCard,
} from "@/features/bible/reader-model";
import { useStudyState } from "@/lib/user/use-study-state";
import { cn } from "@/lib/utils";

type ReaderTab = "commentary" | "related" | "cross-references" | "actions";
type TextSize = "sm" | "md" | "lg";

type ReaderExperienceProps = {
  model: ReaderModel;
};

const TEXT_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
  { value: "sm", label: "S" },
  { value: "md", label: "M" },
  { value: "lg", label: "L" },
];

const VERSE_TEXT_CLASSES: Record<TextSize, string> = {
  sm: "font-serif text-[0.95rem] leading-7 text-ink sm:text-[1.05rem] sm:leading-7",
  md: "font-serif text-[1.22rem] leading-8 text-ink sm:text-[1.34rem] sm:leading-9",
  lg: "font-serif text-[1.4rem] leading-9 text-ink sm:text-[1.55rem] sm:leading-10",
};

function groupCommentaryByPerson(items: ReaderCommentaryCard[]): {
  personName: string;
  personSlug: string;
  entries: ReaderCommentaryCard[];
}[] {
  const order: string[] = [];
  const groups = new Map<
    string,
    { personName: string; personSlug: string; entries: ReaderCommentaryCard[] }
  >();
  for (const item of items) {
    const key = item.personSlug || item.personName;
    if (!groups.has(key)) {
      groups.set(key, {
        personName: item.personName,
        personSlug: item.personSlug,
        entries: [],
      });
      order.push(key);
    }
    groups.get(key)!.entries.push(item);
  }
  return order.map((k) => groups.get(k)!);
}

const EXCERPT_TEXT_CLASSES: Record<TextSize, string> = {
  sm: "text-xs leading-6 text-ink-muted",
  md: "text-sm leading-7 text-ink-muted",
  lg: "text-base leading-8 text-ink-muted",
};

const TAKEAWAY_TEXT_CLASSES: Record<TextSize, string> = {
  sm: "rounded-[8px] bg-surface px-3 py-3 text-xs leading-6 text-ink",
  md: "rounded-[8px] bg-surface px-3 py-3 text-sm leading-7 text-ink",
  lg: "rounded-[8px] bg-surface px-3 py-3 text-base leading-8 text-ink",
};

function FatherCommentaryGroup({
  personName,
  personSlug,
  entries,
  textSize,
}: {
  personName: string;
  personSlug: string;
  entries: ReaderCommentaryCard[];
  textSize: TextSize;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-surface-strong"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-lg tracking-tight text-ink">
            {personName}
          </p>
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-ink-soft">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </p>
        </div>
        <CaretDown
          size={14}
          weight="bold"
          className={cn(
            "shrink-0 text-ink-soft transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="space-y-4 border-t border-line bg-background px-4 py-4">
          {entries.map((entry) => (
            <article key={entry.id} className="space-y-2">
              <p className="text-[0.65rem] uppercase tracking-[0.18em] text-ink-soft">
                {entry.title}
                {entry.sourceLabel ? ` · ${entry.sourceLabel}` : ""}
              </p>
              <p className={EXCERPT_TEXT_CLASSES[textSize]}>{entry.excerpt}</p>
              {entry.takeaway ? (
                <p className={TAKEAWAY_TEXT_CLASSES[textSize]}>{entry.takeaway}</p>
              ) : null}
              {entry.workSlug ? (
                <Link
                  href={`/library/works/${entry.workSlug}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent transition-colors duration-200 hover:text-ink"
                >
                  Open {entry.workTitle}
                  <ArrowSquareOut size={14} />
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  active = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-[12px] border px-4 py-3 text-left transition-colors duration-200",
        active
          ? "border-accent/25 bg-accent-soft/60 text-ink"
          : "border-line bg-surface hover:bg-surface-strong",
      )}
    >
      <span className="text-sm font-medium tracking-[0.04em]">{label}</span>
      <span className={cn("text-ink-soft", active && "text-accent")}>{icon}</span>
    </button>
  );
}

function StudyPanel({
  selectedVerse,
  chapterCommentary,
  textSize,
  onClose,
  mobile,
}: {
  selectedVerse: ReaderVerseCard | undefined;
  chapterCommentary: ReaderCommentaryCard[];
  textSize: TextSize;
  onClose?: () => void;
  mobile?: boolean;
}) {
  const savedVerses = useStudyState((state) => state.savedVerses);
  const highlights = useStudyState((state) => state.highlights);
  const notes = useStudyState((state) => state.notes);
  const toggleSavedVerse = useStudyState((state) => state.toggleSavedVerse);
  const toggleHighlight = useStudyState((state) => state.toggleHighlight);
  const upsertNote = useStudyState((state) => state.upsertNote);

  const existingNote = selectedVerse
    ? notes.find(
        (item) =>
          item.targetType === "verse" && item.targetId === selectedVerse.verse.id,
      )
    : undefined;

  const [tab, setTab] = useState<ReaderTab>("commentary");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState(() => existingNote?.title ?? "");
  const [noteBody, setNoteBody] = useState(() => existingNote?.body ?? "");

  if (!selectedVerse) {
    return (
      <Surface className="space-y-4">
        <Pill>Select a verse</Pill>
        <div className="space-y-2">
          <h2 className="font-serif text-3xl tracking-tight text-ink">
            Verse-first commentary lives here.
          </h2>
          <p className="text-sm leading-7 text-ink-muted">
            Tap a verse to open direct commentary, related writings, cross
            references, and study actions.
          </p>
        </div>
      </Surface>
    );
  }

  const currentVerse = selectedVerse.verse;
  const isSaved = savedVerses.some((item) => item.verseId === currentVerse.id);
  const isHighlighted = highlights.some(
    (item) => item.targetType === "verse" && item.targetId === currentVerse.id,
  );
  const commentaryItems =
    selectedVerse.directCommentary.length > 0
      ? selectedVerse.directCommentary
      : chapterCommentary;

  async function copyVerseText() {
    try {
      const copyText = `${currentVerse.referenceLabel} - ${currentVerse.text}`;
      await navigator.clipboard.writeText(copyText);
      setFeedback("Verse text copied.");
    } catch {
      setFeedback("Copy is unavailable in this browser.");
    }
  }

  async function shareVerseLink() {
    const link = `${window.location.origin}${window.location.pathname}#${currentVerse.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: currentVerse.referenceLabel,
          text: currentVerse.text,
          url: link,
        });
        setFeedback("Shared from the reader.");
        return;
      }

      await navigator.clipboard.writeText(link);
      setFeedback("Share link copied.");
    } catch {
      setFeedback("Share is unavailable in this browser.");
    }
  }

  return (
    <Surface className={cn("space-y-5", mobile && "rounded-t-[20px] border-b-0")}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Pill variant="accent">{currentVerse.referenceLabel}</Pill>
          <p className={VERSE_TEXT_CLASSES[textSize]}>{currentVerse.text}</p>
        </div>
        {mobile && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line bg-surface text-ink-soft transition-colors duration-200 hover:text-ink"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      <SegmentedControl
        items={[
          { value: "commentary", label: "Commentary" },
          { value: "related", label: "Related" },
          { value: "cross-references", label: "Cross refs" },
          { value: "actions", label: "Actions" },
        ]}
        value={tab}
        onChange={(nextValue) => setTab(nextValue as ReaderTab)}
      />

      {tab === "commentary" ? (
        <div className="space-y-3">
          {commentaryItems.length > 0 ? (
            groupCommentaryByPerson(commentaryItems).map((group) => (
              <FatherCommentaryGroup
                key={group.personSlug || group.personName}
                personName={group.personName}
                personSlug={group.personSlug}
                entries={group.entries}
                textSize={textSize}
              />
            ))
          ) : (
            <Surface tone="quiet" className="space-y-2 px-4 py-4">
              <h3 className="font-serif text-2xl tracking-tight text-ink">
                No direct commentary seeded for this verse yet.
              </h3>
              <p className="text-sm leading-7 text-ink-muted">
                The content model is ready for more verse-level sources to be linked
                without changing the reader UI.
              </p>
            </Surface>
          )}
        </div>
      ) : null}

      {tab === "related" ? (
        <div className="space-y-3">
          {selectedVerse.relatedEntries.length > 0 ? (
            groupCommentaryByPerson(selectedVerse.relatedEntries).map((group) => (
              <FatherCommentaryGroup
                key={group.personSlug || group.personName}
                personName={group.personName}
                personSlug={group.personSlug}
                entries={group.entries}
                textSize={textSize}
              />
            ))
          ) : (
            <Surface tone="quiet" className="space-y-2 px-4 py-4">
              <h3 className="font-serif text-2xl tracking-tight text-ink">
                No related writings are connected to this verse yet.
              </h3>
              <p className="text-sm leading-7 text-ink-muted">
                Related writings stay visibly separate from direct commentary so
                ranking and interpretation remain honest.
              </p>
            </Surface>
          )}
        </div>
      ) : null}

      {tab === "cross-references" ? (
        <div className="space-y-3">
          {selectedVerse.crossReferences.length > 0 ? (
            selectedVerse.crossReferences.map((entry) => (
              <Link
                key={entry.id}
                href={entry.href}
                className="block rounded-[12px] border border-line bg-surface px-4 py-4 transition-colors duration-200 hover:bg-surface-strong"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                      {entry.relation}
                    </p>
                    <h3 className="font-serif text-2xl tracking-tight text-ink">
                      {entry.target.label}
                    </h3>
                  </div>
                  <ArrowSquareOut size={18} className="text-ink-soft" />
                </div>
                <p className="mt-3 text-sm leading-7 text-ink-muted">
                  {entry.note}
                </p>
              </Link>
            ))
          ) : (
            <Surface tone="quiet" className="space-y-2 px-4 py-4">
              <h3 className="font-serif text-2xl tracking-tight text-ink">
                No cross references are seeded for this verse yet.
              </h3>
              <p className="text-sm leading-7 text-ink-muted">
                Cross references are modeled separately so prophecy, fulfillment,
                and thematic links can each be ranked clearly later.
              </p>
            </Surface>
          )}
        </div>
      ) : null}

      {tab === "actions" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <ActionButton
              label={isSaved ? "Saved in profile" : "Save verse"}
              icon={<BookmarkSimple size={18} weight={isSaved ? "fill" : "regular"} />}
              active={isSaved}
              onClick={() =>
                toggleSavedVerse(currentVerse.id, currentVerse.translationId)
              }
            />
            <ActionButton
              label={isHighlighted ? "Highlighted" : "Highlight verse"}
              icon={
                <HighlighterCircle
                  size={18}
                  weight={isHighlighted ? "fill" : "regular"}
                />
              }
              active={isHighlighted}
              onClick={() =>
                toggleHighlight("verse", currentVerse.id, currentVerse.text)
              }
            />
            <ActionButton
              label="Copy verse"
              icon={<Copy size={18} />}
              onClick={() => {
                void copyVerseText();
              }}
            />
            <ActionButton
              label="Share link"
              icon={<LinkSimple size={18} />}
              onClick={() => {
                void shareVerseLink();
              }}
            />
          </div>

          <div className="space-y-3 rounded-[12px] border border-line bg-background px-4 py-4">
            <div className="flex items-center gap-2">
              <NotePencil size={18} className="text-accent" />
              <h3 className="text-sm font-medium tracking-[0.08em] text-ink">
                Verse note
              </h3>
            </div>
            <input
              value={noteTitle}
              onChange={(event) => setNoteTitle(event.target.value)}
              placeholder="Note title"
              className="w-full rounded-[10px] border border-line bg-surface-strong px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-ink-soft focus:border-line-strong"
            />
            <textarea
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              placeholder="Attach a note to this verse."
              rows={4}
              className="w-full resize-none rounded-[10px] border border-line bg-surface-strong px-3 py-3 text-sm leading-7 text-ink outline-none transition-colors duration-200 placeholder:text-ink-soft focus:border-line-strong"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">
                Local-first scaffolding
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  upsertNote("verse", currentVerse.id, noteTitle, noteBody);
                  setFeedback("Note saved locally.");
                }}
                disabled={!noteBody.trim()}
              >
                Save note
              </Button>
            </div>
          </div>

          {feedback ? (
            <p className="text-sm text-ink-muted">{feedback}</p>
          ) : null}
        </div>
      ) : null}
    </Surface>
  );
}

export function BibleReaderExperience({ model }: ReaderExperienceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const recordReadingHistory = useStudyState((state) => state.recordReadingHistory);
  const [selectedVerseId, setSelectedVerseId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [textSize, setTextSize] = useState<TextSize>("md");

  const selectedVerse = model.verses.find((item) => item.verse.id === selectedVerseId);

  useEffect(() => {
    const stored = window.localStorage.getItem("reader-text-size");
    if (stored === "sm" || stored === "md" || stored === "lg") setTextSize(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("reader-text-size", textSize);
  }, [textSize]);

  useEffect(() => {
    recordReadingHistory({
      label: `${model.chapterLabel} in ${model.translation.abbreviation}`,
      href: pathname,
    });
  }, [model.chapterLabel, model.translation.abbreviation, pathname, recordReadingHistory]);

  return (
    <div className="space-y-8">
      <header className="space-y-5 border-b border-line/80 pb-6">
        <div className="space-y-3">
          <Pill>Scripture Reader</Pill>
          <div className="space-y-2">
            <h1 className="font-serif text-4xl tracking-tight text-ink sm:text-5xl">
              {model.chapterLabel}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-ink-muted sm:text-base">
              {model.chapter.summary}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[0.7rem] uppercase tracking-[0.18em] text-ink-soft">
                  Translation
                </span>
                <select
                  value={`/bible/${model.translation.slug}/${model.book.slug}/${model.chapter.chapterNumber}`}
                  onChange={(event) => router.push(event.target.value)}
                  className="rounded-[10px] border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors duration-200 hover:border-line-strong"
                >
                  {model.availableTranslations.map((item) => (
                    <option key={item.slug} value={item.href}>
                      {item.label}
                      {item.caption ? ` — ${item.caption}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[0.7rem] uppercase tracking-[0.18em] text-ink-soft">
                  Book
                </span>
                <select
                  value={model.book.slug}
                  onChange={(event) => {
                    const nextBookSlug = event.target.value;
                    router.push(
                      `/bible/${model.translation.slug}/${nextBookSlug}/1`,
                    );
                  }}
                  className="rounded-[10px] border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors duration-200 hover:border-line-strong"
                >
                  {model.booksForPicker.map((bookOption) => (
                    <option key={bookOption.slug} value={bookOption.slug}>
                      {bookOption.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[0.7rem] uppercase tracking-[0.18em] text-ink-soft">
                  Chapter
                </span>
                <select
                  value={model.chapter.chapterNumber}
                  onChange={(event) => {
                    const nextChapter = Number.parseInt(event.target.value, 10);
                    if (Number.isNaN(nextChapter)) return;
                    router.push(
                      `/bible/${model.translation.slug}/${model.book.slug}/${nextChapter}`,
                    );
                  }}
                  className="rounded-[10px] border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors duration-200 hover:border-line-strong"
                >
                  {Array.from(
                    { length: model.book.chapterCount },
                    (_value, index) => index + 1,
                  ).map((chapterNumber) => (
                    <option key={chapterNumber} value={chapterNumber}>
                      {chapterNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[0.7rem] uppercase tracking-[0.18em] text-ink-soft">
                  Text
                </span>
                <div className="inline-flex rounded-[10px] border border-line bg-surface p-1">
                  {TEXT_SIZE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTextSize(option.value)}
                      className={cn(
                        "rounded-[6px] px-2.5 py-1 text-xs font-medium tracking-[0.08em] transition-colors duration-200",
                        textSize === option.value
                          ? "bg-surface-strong text-ink"
                          : "text-ink-soft hover:text-ink",
                      )}
                      aria-pressed={textSize === option.value}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/bible"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.18em] text-ink-soft transition-colors duration-200 hover:text-ink"
            >
              <CaretLeft size={10} />
              Books
            </Link>
            {model.chapter.chapterNumber > 1 ? (
              <Link
                href={`/bible/${model.translation.slug}/${model.book.slug}/${model.chapter.chapterNumber - 1}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.18em] text-ink-soft transition-colors duration-200 hover:text-ink"
              >
                <ArrowLeft size={10} />
                Ch {model.chapter.chapterNumber - 1}
              </Link>
            ) : null}
            {model.chapter.chapterNumber < model.book.chapterCount ? (
              <Link
                href={`/bible/${model.translation.slug}/${model.book.slug}/${model.chapter.chapterNumber + 1}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.18em] text-ink-soft transition-colors duration-200 hover:text-ink"
              >
                Ch {model.chapter.chapterNumber + 1}
                <ArrowRight size={10} />
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
        <div className="space-y-4">
          <Surface className="space-y-2">
            {model.verses.map((item) => {
              const selected = item.verse.id === selectedVerseId;

              return (
                <button
                  key={item.verse.id}
                  id={item.verse.id}
                  type="button"
                  onClick={() => {
                    setSelectedVerseId(item.verse.id);
                    setMobileDrawerOpen(true);
                  }}
                  className={cn(
                    "w-full rounded-[12px] px-3 py-4 text-left transition-colors duration-200",
                    selected ? "bg-accent-soft/55" : "hover:bg-surface-strong",
                    item.verse.paragraphStart && "mt-2",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex w-8 shrink-0 flex-col items-center pt-1">
                      <span className="font-mono text-xs text-accent">
                        {item.verse.verseNumber}
                      </span>
                      <span
                        className={cn(
                          "mt-2 h-1.5 w-1.5 rounded-full bg-transparent",
                          item.hasDirectCommentary && "bg-accent",
                          !item.hasDirectCommentary &&
                            item.hasRelatedEntries &&
                            "bg-ink-soft",
                        )}
                      />
                    </div>
                    <div className="flex-1 space-y-3">
                      <p className={VERSE_TEXT_CLASSES[textSize]}>
                        {item.verse.text}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.hasDirectCommentary ? (
                          <Pill variant="accent">Patristic commentary</Pill>
                        ) : null}
                        {item.hasRelatedEntries ? (
                          <Pill variant="subtle">Related writing</Pill>
                        ) : null}
                        {item.hasCrossReferences ? (
                          <Pill variant="subtle">Cross references</Pill>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </Surface>
        </div>

        <div className="hidden xl:block">
          <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto pr-1">
            <StudyPanel
              key={selectedVerse?.verse.id ?? "empty-desktop"}
              selectedVerse={selectedVerse}
              chapterCommentary={model.chapterCommentary}
              textSize={textSize}
            />
          </div>
        </div>
      </div>

      {mobileDrawerOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/20 xl:hidden">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            className="absolute inset-0"
            aria-label="Close verse drawer"
          />
          <div className="relative z-10 w-full px-3 pb-0">
            <div className="mx-auto max-h-[88dvh] overflow-y-auto rounded-t-[20px] border border-line-strong bg-surface-strong pb-6 pt-3 shadow-[0_-12px_40px_rgba(24,37,58,0.12)]">
              <div className="mb-3 flex justify-center">
                <span className="h-1.5 w-12 rounded-full bg-line-strong" />
              </div>
              <div className="px-3">
                <StudyPanel
                  key={selectedVerse?.verse.id ?? "empty-mobile"}
                  selectedVerse={selectedVerse}
                  chapterCommentary={model.chapterCommentary}
                  textSize={textSize}
                  mobile
                  onClose={() => setMobileDrawerOpen(false)}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
