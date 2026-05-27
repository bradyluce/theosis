"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookmarkSimple,
  CaretDown,
  CaretLeft,
  CaretRight,
  ChatCircleDots,
  Copy,
  DotsThree,
  Image as ImageIcon,
  MagnifyingGlass,
  NotePencil,
  Play,
  ShareNetwork,
  SpeakerHigh,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type { ReaderModel, ReaderVerseCard } from "@/features/bible/reader-model";
import { QuoteCardModal } from "@/features/share/quote-card-modal";
import { useStudyState } from "@/lib/user/use-study-state";
import { useUiState } from "@/lib/user/use-ui-state";
import { cn } from "@/lib/utils";

type HighlightColor = "yellow" | "green" | "blue" | "orange" | "pink" | null;

const HIGHLIGHT_SWATCHES: {
  color: NonNullable<HighlightColor>;
  ring: string;
  fill: string;
}[] = [
  { color: "yellow", ring: "ring-yellow-300", fill: "bg-yellow-300" },
  { color: "green", ring: "ring-emerald-400", fill: "bg-emerald-400" },
  { color: "blue", ring: "ring-sky-400", fill: "bg-sky-400" },
  { color: "orange", ring: "ring-orange-400", fill: "bg-orange-400" },
  { color: "pink", ring: "ring-pink-400", fill: "bg-pink-400" },
];

type ReaderExperienceProps = {
  model: ReaderModel;
  highlightRange?: { start: number; end: number } | null;
  // Optional decorative banner rendered above the chapter label. Server pages
  // pass a <MediaBackdrop> here — keeps the reader itself a pure client
  // component while letting the server pick contextual imagery.
  backdrop?: React.ReactNode;
};

export function BibleReaderExperience({
  model,
  highlightRange,
  backdrop,
}: ReaderExperienceProps) {
  const router = useRouter();
  const [selectedVerseId, setSelectedVerseId] = useState<string | null>(null);
  const [verseHighlightColor, setVerseHighlightColor] =
    useState<HighlightColor>(null);
  const [showCommentary, setShowCommentary] = useState<string | null>(null);
  const [translationPickerOpen, setTranslationPickerOpen] = useState(false);
  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false);
  const [shareVerseId, setShareVerseId] = useState<string | null>(null);

  const toggleSavedVerse = useStudyState((state) => state.toggleSavedVerse);
  const savedVerses = useStudyState((state) => state.savedVerses);
  const setVerseSheetOpen = useUiState((state) => state.setVerseSheetOpen);

  // Mirror the verse/commentary sheet visibility into the global UI store so
  // the BottomNav can slide out of view while the sheet is open.
  useEffect(() => {
    const open = Boolean(
      selectedVerseId ||
        showCommentary ||
        translationPickerOpen ||
        bookPickerOpen ||
        chapterPickerOpen,
    );
    setVerseSheetOpen(open);
    return () => setVerseSheetOpen(false);
  }, [
    selectedVerseId,
    showCommentary,
    translationPickerOpen,
    bookPickerOpen,
    chapterPickerOpen,
    setVerseSheetOpen,
  ]);

  // Available previous / next chapters for the chevron buttons.
  const navigation = useMemo(() => {
    const currentBook = model.book;
    const currentChapter = model.chapter.chapterNumber;
    const sameBookPrev =
      currentChapter > 1
        ? `/bible/${model.translation.slug}/${currentBook.slug}/${currentChapter - 1}`
        : null;
    const sameBookNext =
      currentChapter < currentBook.chapterCount
        ? `/bible/${model.translation.slug}/${currentBook.slug}/${currentChapter + 1}`
        : null;
    return { prev: sameBookPrev, next: sameBookNext };
  }, [model]);

  const selectedVerse = useMemo(
    () => model.verses.find((v) => v.verse.id === selectedVerseId) ?? null,
    [model.verses, selectedVerseId],
  );

  const commentaryVerse = useMemo(
    () => model.verses.find((v) => v.verse.id === showCommentary) ?? null,
    [model.verses, showCommentary],
  );

  // Verses appointed by the daily lectionary (passed in via ?highlight=
  // query param) get a soft gold glow so the reader can see at a glance
  // which verses are today's reading.
  const highlightedVerseIds = useMemo(() => {
    if (!highlightRange) return new Set<string>();
    return new Set(
      model.verses
        .filter(
          (card) =>
            card.verse.verseNumber >= highlightRange.start &&
            card.verse.verseNumber <= highlightRange.end,
        )
        .map((card) => card.verse.id),
    );
  }, [highlightRange, model.verses]);

  // On mount (and whenever the highlight range changes), scroll the first
  // appointed verse into view so the user lands at the right spot.
  useEffect(() => {
    if (highlightedVerseIds.size === 0) return;
    const firstId = model.verses.find((card) =>
      highlightedVerseIds.has(card.verse.id),
    )?.verse.id;
    if (!firstId) return;
    // Wait for layout so the element exists and scroll-margin is honored.
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(firstId);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [highlightedVerseIds, model.verses]);

  // Close any open sheet on Escape.
  useEffect(() => {
    if (
      !selectedVerseId &&
      !showCommentary &&
      !translationPickerOpen &&
      !bookPickerOpen &&
      !chapterPickerOpen
    )
      return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedVerseId(null);
        setShowCommentary(null);
        setTranslationPickerOpen(false);
        setBookPickerOpen(false);
        setChapterPickerOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectedVerseId,
    showCommentary,
    translationPickerOpen,
    bookPickerOpen,
    chapterPickerOpen,
  ]);

  function handleSelectVerse(verseId: string) {
    setSelectedVerseId((prev) => (prev === verseId ? null : verseId));
    setVerseHighlightColor(null);
  }

  function handleClose() {
    setSelectedVerseId(null);
    setVerseHighlightColor(null);
  }

  const isSelectedSaved = selectedVerse
    ? savedVerses.some((v) => v.verseId === selectedVerse.verse.id)
    : false;

  return (
    <div className="relative min-h-dvh bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-background/80 px-3 py-3 backdrop-blur-md sm:px-6">
        <div className="flex min-w-0 items-center gap-1">
          {/* Book name → opens book picker. Visually a single pill split into
              two buttons so the divider sits between Book and Chapter. */}
          <div className="flex items-stretch overflow-hidden rounded-full border border-line-strong/60 bg-surface text-sm font-medium">
            <button
              type="button"
              onClick={() => setBookPickerOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={bookPickerOpen}
              className="px-3 py-1.5 text-ink transition-colors duration-200 hover:bg-surface-strong"
            >
              {model.book.shortName ?? model.book.name}
            </button>
            <span className="w-px bg-line-strong/40" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setChapterPickerOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={chapterPickerOpen}
              className="px-3 py-1.5 text-ink transition-colors duration-200 hover:bg-surface-strong"
            >
              {model.chapter.chapterNumber}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setTranslationPickerOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={translationPickerOpen}
            className="inline-flex items-center gap-1 rounded-full border border-line-strong/60 bg-surface px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors duration-200 hover:bg-surface-strong hover:text-ink"
          >
            {model.translation.abbreviation}
            <CaretDown size={11} weight="bold" />
          </button>

          {/* Chapter prev/next chevrons */}
          <div className="ml-1 flex items-center gap-0.5">
            <TopIconButton
              aria-label="Previous chapter"
              disabled={!navigation.prev}
              onClick={() => navigation.prev && router.push(navigation.prev)}
            >
              <CaretLeft size={16} weight="bold" />
            </TopIconButton>
            <TopIconButton
              aria-label="Next chapter"
              disabled={!navigation.next}
              onClick={() => navigation.next && router.push(navigation.next)}
            >
              <CaretRight size={16} weight="bold" />
            </TopIconButton>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <TopIconButton aria-label="Listen">
            <SpeakerHigh size={20} />
          </TopIconButton>
          <TopIconButton aria-label="Search">
            <MagnifyingGlass size={20} />
          </TopIconButton>
          <TopIconButton aria-label="More">
            <DotsThree size={20} weight="bold" />
          </TopIconButton>
        </div>
      </header>

      {/* Body */}
      <div className="px-5 pb-40 pt-2 sm:px-8">
        {backdrop ? <div className="mb-4">{backdrop}</div> : null}
        {/* Chapter label */}
        <p className="mb-4 text-center font-serif text-2xl tracking-tight text-ink-muted">
          {model.chapter.chapterNumber}
        </p>

        {/* Verses */}
        <div className="font-serif text-[1.18rem] leading-[2] text-ink sm:text-[1.22rem]">
          {model.verses.map((card) => {
            const v = card.verse;
            const isSelected = selectedVerseId === v.id;
            const isHighlighted = highlightedVerseIds.has(v.id);
            return (
              <span
                key={v.id}
                id={v.id}
                onClick={() => handleSelectVerse(v.id)}
                className={cn(
                  "relative cursor-pointer transition-colors duration-150",
                  isHighlighted && "verse-glow",
                  isSelected &&
                    "underline decoration-dotted decoration-ink decoration-2 underline-offset-[6px]",
                )}
              >
                <sup className="mr-1 font-mono text-[0.62em] font-medium text-ink-soft align-super">
                  {v.verseNumber}
                </sup>
                <span>{v.text} </span>
                {card.hasDirectCommentary || card.hasRelatedEntries ? (
                  <button
                    type="button"
                    aria-label="Open commentary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCommentary(v.id);
                    }}
                    className="mx-0.5 inline-flex translate-y-[-2px] items-center text-ink-soft transition-colors duration-200 hover:text-accent"
                  >
                    <ChatCircleDots size={16} weight="regular" />
                  </button>
                ) : null}{" "}
              </span>
            );
          })}
        </div>
      </div>

      {/* Floating play button (chapter prev/next live in the top bar now). */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-[88px] z-10 flex justify-center px-6 transition-opacity duration-200",
          (selectedVerseId || showCommentary) && "pointer-events-none opacity-0",
        )}
      >
        <button
          aria-label="Play audio"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-background shadow-xl transition-transform duration-200 hover:scale-105"
        >
          <Play size={20} weight="fill" />
        </button>
      </div>

      {/* Verse action bottom sheet */}
      {selectedVerse ? (
        <VerseActionSheet
          verse={selectedVerse}
          translation={model.translation}
          highlightColor={verseHighlightColor}
          onColorChange={setVerseHighlightColor}
          isSaved={isSelectedSaved}
          onSave={() =>
            toggleSavedVerse(selectedVerse.verse.id, selectedVerse.verse.translationId)
          }
          onClose={handleClose}
          onShare={() => {
            setShareVerseId(selectedVerse.verse.id);
            setSelectedVerseId(null);
          }}
          onOpenCommentary={() => {
            setShowCommentary(selectedVerse.verse.id);
            setSelectedVerseId(null);
          }}
          hasCommentary={
            selectedVerse.hasDirectCommentary || selectedVerse.hasRelatedEntries
          }
        />
      ) : null}

      {/* Share-as-image modal — opens from the Share/Image action tiles.
          Verse text + reference label are baked into the rendered card by
          /api/quote-card. */}
      {shareVerseId ? (() => {
        const shareVerse = model.verses.find(
          (card) => card.verse.id === shareVerseId,
        );
        if (!shareVerse) return null;
        return (
          <QuoteCardModal
            open
            onClose={() => setShareVerseId(null)}
            text={shareVerse.verse.text}
            attribution={shareVerse.verse.referenceLabel}
            reference={model.translation.name}
            kind="verse"
          />
        );
      })() : null}

      {/* Commentary bottom sheet */}
      {commentaryVerse ? (
        <CommentarySheet
          verse={commentaryVerse}
          translationAbbr={model.translation.abbreviation}
          onClose={() => setShowCommentary(null)}
        />
      ) : null}

      {/* Translation picker bottom sheet — opens from the abbreviation pill
          in the top bar. Each row navigates to the matching translation at
          the same book/chapter. */}
      {translationPickerOpen ? (
        <TranslationPickerSheet
          translations={model.availableTranslations}
          currentSlug={model.translation.slug}
          onClose={() => setTranslationPickerOpen(false)}
        />
      ) : null}

      {/* Book picker — opens from the book name pill in the top bar. */}
      {bookPickerOpen ? (
        <BookPickerSheet
          books={model.booksForPicker}
          currentSlug={model.book.slug}
          translationSlug={model.translation.slug}
          onClose={() => setBookPickerOpen(false)}
        />
      ) : null}

      {/* Chapter picker — opens from the chapter-number pill in the top bar.
          Renders a number grid for the current book. */}
      {chapterPickerOpen ? (
        <ChapterPickerSheet
          bookName={model.book.shortName ?? model.book.name}
          chapterCount={model.book.chapterCount}
          currentChapter={model.chapter.chapterNumber}
          translationSlug={model.translation.slug}
          bookSlug={model.book.slug}
          onClose={() => setChapterPickerOpen(false)}
        />
      ) : null}
    </div>
  );
}

function TopIconButton({
  children,
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { "aria-label": string }) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors duration-200 hover:bg-surface-strong hover:text-ink",
        disabled && "cursor-not-allowed opacity-30 hover:bg-transparent hover:text-ink-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

function VerseActionSheet({
  verse,
  translation,
  highlightColor,
  onColorChange,
  isSaved,
  onSave,
  onClose,
  onShare,
  onOpenCommentary,
  hasCommentary,
}: {
  verse: ReaderVerseCard;
  translation: ReaderModel["translation"];
  highlightColor: HighlightColor;
  onColorChange: (next: HighlightColor) => void;
  isSaved: boolean;
  onSave: () => void;
  onClose: () => void;
  onShare: () => void;
  onOpenCommentary: () => void;
  hasCommentary: boolean;
}) {
  const v = verse.verse;
  return (
    <>
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-background/40 backdrop-blur-sm"
      />
      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto max-w-[680px] overflow-hidden rounded-t-[20px] border-t border-line-strong/60 bg-surface-strong shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 text-sm">
            <p className="text-ink-muted">
              Selected:{" "}
              <span className="font-medium text-ink">
                {v.referenceLabel} {translation.abbreviation}
              </span>
            </p>
            <button onClick={onClose} aria-label="Close">
              <X size={18} className="text-ink-muted" />
            </button>
          </div>

          {/* Color swatches row */}
          <div className="flex items-center gap-3 px-5 py-3">
            <button
              onClick={() => onColorChange(null)}
              aria-label="No color"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
                highlightColor === null
                  ? "border-ink"
                  : "border-line-strong/60",
              )}
            >
              <span className="h-2 w-5 rounded-full bg-ink-muted" />
            </button>
            {HIGHLIGHT_SWATCHES.map((swatch) => (
              <button
                key={swatch.color}
                onClick={() => onColorChange(swatch.color)}
                aria-label={`Highlight ${swatch.color}`}
                className={cn(
                  "h-9 w-9 rounded-full transition-transform",
                  swatch.fill,
                  highlightColor === swatch.color
                    ? "ring-2 ring-offset-2 ring-offset-surface-strong ring-ink scale-110"
                    : "",
                )}
              />
            ))}
          </div>

          {/* Action row */}
          <div className="-mx-1 flex gap-1 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ActionTile
              icon={<BookmarkSimple size={20} weight={isSaved ? "fill" : "regular"} />}
              label={isSaved ? "Saved" : "Save"}
              onClick={onSave}
              active={isSaved}
            />
            <ActionTile
              icon={<NotePencil size={20} />}
              label="Note"
              onClick={() => {}}
            />
            <ActionTile
              icon={<Copy size={20} />}
              label="Copy"
              onClick={() => {
                navigator.clipboard?.writeText(
                  `${v.referenceLabel} (${translation.abbreviation}) — ${v.text}`,
                );
              }}
            />
            <ActionTile
              icon={<ShareNetwork size={20} />}
              label="Share"
              onClick={onShare}
            />
            <ActionTile
              icon={<ImageIcon size={20} />}
              label="Image"
              onClick={onShare}
            />
            {hasCommentary ? (
              <ActionTile
                icon={<ChatCircleDots size={20} />}
                label="Fathers"
                onClick={onOpenCommentary}
              />
            ) : null}
          </div>

          {/* Swipe up indicator */}
          <button
            onClick={onOpenCommentary}
            className="flex w-full items-center justify-center gap-2 border-t border-line/40 py-3 text-xs text-ink-muted"
            disabled={!hasCommentary}
          >
            <span>{hasCommentary ? "Swipe up for commentary" : "No commentary on this verse"}</span>
          </button>
        </div>
      </div>
    </>
  );
}

function CommentarySheet({
  verse,
  translationAbbr,
  onClose,
}: {
  verse: ReaderVerseCard;
  translationAbbr: string;
  onClose: () => void;
}) {
  const entries =
    verse.directCommentary.length > 0
      ? verse.directCommentary
      : verse.relatedEntries;

  return (
    <>
      <button
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm"
      />
      <div className="fixed inset-x-0 bottom-0 z-40 flex max-h-[75vh] flex-col">
        <div className="mx-auto flex w-full max-w-[680px] flex-col overflow-hidden rounded-t-[20px] border-t border-line-strong/60 bg-surface-strong shadow-2xl">
          <div className="flex items-center justify-between border-b border-line/40 px-5 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                Fathers on
              </p>
              <p className="font-medium text-ink">
                {verse.verse.referenceLabel} {translationAbbr}
              </p>
            </div>
            <button onClick={onClose} aria-label="Close">
              <X size={20} className="text-ink-muted" />
            </button>
          </div>

          <div className="overflow-y-auto px-5 py-4">
            {entries.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-soft">
                No commentary on this verse yet.
              </p>
            ) : (
              <ul className="space-y-4">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="space-y-2 rounded-[14px] border border-line/40 bg-surface px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-serif text-base font-medium tracking-tight text-ink">
                        {entry.personName}
                      </p>
                      {entry.workSlug ? (
                        <Link
                          href={`/library/works/${entry.workSlug}`}
                          className="text-[10px] uppercase tracking-[0.18em] text-accent transition-colors hover:text-ink"
                        >
                          {entry.workTitle}
                        </Link>
                      ) : null}
                    </div>
                    <p className="text-sm leading-7 text-ink-muted">
                      {entry.excerpt}
                    </p>
                    {entry.takeaway ? (
                      <p className="rounded-[10px] bg-surface-elevated px-3 py-3 text-sm leading-7 text-ink">
                        {entry.takeaway}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ActionTile({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex min-w-[72px] flex-col items-center justify-center gap-1 rounded-[12px] px-3 py-3 text-ink-muted transition-colors duration-200 hover:bg-surface-elevated",
        active && "text-ink",
      )}
    >
      <span>{icon}</span>
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}

function TranslationPickerSheet({
  translations,
  currentSlug,
  onClose,
}: {
  translations: ReaderModel["availableTranslations"];
  currentSlug: string;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <button
        aria-label="Close translation picker"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm"
      />
      <div className="fixed inset-x-0 bottom-0 z-40 flex max-h-[80vh] flex-col">
        <div className="mx-auto flex w-full max-w-[680px] flex-col overflow-hidden rounded-t-[20px] border-t border-line-strong/60 bg-surface-strong shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line/40 px-5 py-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-accent">
                Translation
              </p>
              <p className="font-serif text-lg tracking-tight text-ink">
                Choose a translation
              </p>
            </div>
            <button onClick={onClose} aria-label="Close">
              <X size={20} className="text-ink-muted" />
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto px-3 py-3">
            {translations.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-ink-soft">
                No translations are available yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {translations.map((t) => {
                  const isCurrent = t.slug === currentSlug;
                  return (
                    <li key={t.slug}>
                      <Link
                        href={t.href}
                        onClick={onClose}
                        aria-current={isCurrent ? "true" : undefined}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-[14px] border px-4 py-3 transition-colors duration-200",
                          isCurrent
                            ? "border-accent/40 bg-accent-soft text-ink"
                            : "border-line/40 bg-surface text-ink hover:bg-surface-elevated",
                        )}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="font-serif text-base font-medium tracking-tight">
                            {t.label}
                          </p>
                          <p className="line-clamp-1 text-xs text-ink-muted">
                            {t.caption}
                          </p>
                        </div>
                        {isCurrent ? (
                          <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.22em] text-accent">
                            Reading
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function BookPickerSheet({
  books,
  currentSlug,
  translationSlug,
  onClose,
}: {
  books: ReaderModel["booksForPicker"];
  currentSlug: string;
  translationSlug: string;
  onClose: () => void;
}) {
  // Group by testament so the picker mirrors the Bible landing page layout.
  const ot = books.filter((b) => b.testamentLabel !== "New Testament");
  const nt = books.filter((b) => b.testamentLabel === "New Testament");

  return (
    <>
      <button
        aria-label="Close book picker"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm"
      />
      <div className="fixed inset-x-0 bottom-0 z-40 flex max-h-[85vh] flex-col">
        <div className="mx-auto flex w-full max-w-[680px] flex-col overflow-hidden rounded-t-[20px] border-t border-line-strong/60 bg-surface-strong shadow-2xl">
          <div className="flex items-center justify-between border-b border-line/40 px-5 py-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-accent">
                Book
              </p>
              <p className="font-serif text-lg tracking-tight text-ink">
                Jump to a book
              </p>
            </div>
            <button onClick={onClose} aria-label="Close">
              <X size={20} className="text-ink-muted" />
            </button>
          </div>

          <div className="overflow-y-auto px-4 py-4">
            <BookGroup
              label="Old Testament"
              books={ot}
              currentSlug={currentSlug}
              translationSlug={translationSlug}
              onSelect={onClose}
            />
            {nt.length > 0 ? (
              <BookGroup
                label="New Testament"
                books={nt}
                currentSlug={currentSlug}
                translationSlug={translationSlug}
                onSelect={onClose}
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

function BookGroup({
  label,
  books,
  currentSlug,
  translationSlug,
  onSelect,
}: {
  label: string;
  books: ReaderModel["booksForPicker"];
  currentSlug: string;
  translationSlug: string;
  onSelect: () => void;
}) {
  if (books.length === 0) return null;
  return (
    <section className="mb-4">
      <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-ink-soft">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {books.map((b) => {
          const isCurrent = b.slug === currentSlug;
          return (
            <Link
              key={b.slug}
              href={`/bible/${translationSlug}/${b.slug}/1`}
              onClick={onSelect}
              aria-current={isCurrent ? "true" : undefined}
              className={cn(
                "flex items-center justify-between rounded-[10px] border px-3 py-2 text-sm transition-colors duration-200",
                isCurrent
                  ? "border-accent/40 bg-accent-soft text-ink"
                  : "border-line/40 bg-surface text-ink hover:bg-surface-elevated",
              )}
            >
              <span className="truncate">{b.name}</span>
              <span className="ml-2 font-mono text-[10px] text-ink-soft">
                {b.chapterCount}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ChapterPickerSheet({
  bookName,
  chapterCount,
  currentChapter,
  translationSlug,
  bookSlug,
  onClose,
}: {
  bookName: string;
  chapterCount: number;
  currentChapter: number;
  translationSlug: string;
  bookSlug: string;
  onClose: () => void;
}) {
  const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);
  return (
    <>
      <button
        aria-label="Close chapter picker"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm"
      />
      <div className="fixed inset-x-0 bottom-0 z-40 flex max-h-[85vh] flex-col">
        <div className="mx-auto flex w-full max-w-[680px] flex-col overflow-hidden rounded-t-[20px] border-t border-line-strong/60 bg-surface-strong shadow-2xl">
          <div className="flex items-center justify-between border-b border-line/40 px-5 py-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-accent">
                Chapter
              </p>
              <p className="font-serif text-lg tracking-tight text-ink">
                {bookName}
              </p>
            </div>
            <button onClick={onClose} aria-label="Close">
              <X size={20} className="text-ink-muted" />
            </button>
          </div>

          <div className="overflow-y-auto px-4 py-4">
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
              {chapters.map((num) => {
                const isCurrent = num === currentChapter;
                return (
                  <Link
                    key={num}
                    href={`/bible/${translationSlug}/${bookSlug}/${num}`}
                    onClick={onClose}
                    aria-current={isCurrent ? "true" : undefined}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-[10px] border font-serif text-base transition-colors duration-200",
                      isCurrent
                        ? "border-accent/50 bg-accent-soft text-accent"
                        : "border-line/40 bg-surface text-ink hover:border-accent/40 hover:bg-surface-elevated",
                    )}
                  >
                    {num}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
