"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BookmarkSimple,
  CaretRight,
  ShareNetwork,
} from "@phosphor-icons/react";
import { QuoteCardModal } from "@/features/share/quote-card-modal";
import { useStudyState } from "@/lib/user/use-study-state";

type VersePreview = {
  id: string;
  verseNumber: number;
  text: string;
  translationId: string;
};

type HomeGospelHeroProps = {
  readingLabel: string;
  todayLabel: string;
  contextLabel: string;
  href: string;
  verses: VersePreview[];
  // Used to seed the share-card "kind" — typed verse so the card carries
  // the scripture treatment (no quote marks around the body).
  shareReference: string;
  shareAttributionTranslation: string;
};

export function HomeGospelHero({
  readingLabel,
  todayLabel,
  contextLabel,
  href,
  verses,
  shareReference,
  shareAttributionTranslation,
}: HomeGospelHeroProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const toggleSavedVerse = useStudyState((s) => s.toggleSavedVerse);
  const savedVerses = useStudyState((s) => s.savedVerses);
  const leadVerse = verses[0];
  const leadVerseSaved = leadVerse
    ? savedVerses.some(
        (entry) => entry.verseId === `${leadVerse.translationId}:${leadVerse.id}`,
      ) ||
      savedVerses.some((entry) => entry.verseId === leadVerse.id)
    : false;

  // Combine the displayed verses into one quote body for the share image.
  const shareText = verses
    .slice(0, 4)
    .map((v) => `${v.verseNumber} ${v.text.trim()}`)
    .join(" ");

  function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (leadVerse) {
      toggleSavedVerse(leadVerse.id, leadVerse.translationId);
    }
  }

  function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setShareOpen(true);
  }

  return (
    <>
      <Link
        href={href}
        className="block overflow-hidden rounded-[20px] border border-accent/15 bg-surface"
      >
        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
              {readingLabel}
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">
              {todayLabel}
            </p>
          </div>

          <p className="font-serif text-2xl tracking-tight text-ink">
            {shareReference}
          </p>

          {verses.length > 0 ? (
            <div className="font-serif text-[1.1rem] leading-[1.85] text-ink">
              {verses.slice(0, 3).map((v) => (
                <span key={v.id}>
                  <sup className="mr-1 font-mono text-[0.6em] text-ink-soft">
                    {v.verseNumber}
                  </sup>
                  <span>{v.text} </span>
                </span>
              ))}
              {verses.length > 3 ? <span className="text-ink-soft">…</span> : null}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">{contextLabel}</p>
          )}

          <div className="flex items-center gap-6 pt-2 text-ink-muted">
            <button
              type="button"
              onClick={handleSave}
              className="flex flex-col items-center gap-0.5 transition-colors hover:text-ink"
              aria-label={leadVerseSaved ? "Saved" : "Save"}
            >
              <BookmarkSimple size={20} weight={leadVerseSaved ? "fill" : "regular"} />
              <span className="text-[9px] uppercase tracking-[0.18em] text-ink-soft">
                {leadVerseSaved ? "Saved" : "Save"}
              </span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex flex-col items-center gap-0.5 transition-colors hover:text-ink"
              aria-label="Share"
            >
              <ShareNetwork size={20} />
              <span className="text-[9px] uppercase tracking-[0.18em] text-ink-soft">
                Share
              </span>
            </button>
            <span className="ml-auto flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-accent">
              Read
              <CaretRight size={12} weight="bold" />
            </span>
          </div>
        </div>
      </Link>

      <QuoteCardModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        text={shareText || contextLabel}
        attribution={shareReference}
        reference={shareAttributionTranslation}
        kind="verse"
      />
    </>
  );
}
