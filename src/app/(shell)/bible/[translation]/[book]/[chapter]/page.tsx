import { notFound } from "next/navigation";
import { BibleReaderExperience } from "@/features/bible/reader-experience";
import { buildReaderModel } from "@/features/bible/reader-model";
import { MediaBackdrop } from "@/components/media";
import { loadChapterCommentary } from "@/lib/content/commentary-loader";
import { parseHighlightParam } from "@/lib/content/reading-href";
import {
  getAvailableTranslations,
  getBookBySlug,
  getChapterSummary,
  getChapterVerses,
  getTranslationBySlug,
} from "@/lib/bible/server-store";

type BibleReaderPageProps = {
  params: Promise<{
    translation: string;
    book: string;
    chapter: string;
  }>;
  searchParams: Promise<{ highlight?: string }>;
};

export default async function BibleReaderPage({
  params,
  searchParams,
}: BibleReaderPageProps) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const chapterNumber = Number.parseInt(resolvedParams.chapter, 10);

  if (Number.isNaN(chapterNumber)) {
    notFound();
  }

  const translation = getTranslationBySlug(resolvedParams.translation);
  if (!translation) notFound();

  const book = getBookBySlug(resolvedParams.book);
  if (!book) notFound();

  const chapter = getChapterSummary(translation.id, book.slug, chapterNumber);
  if (!chapter) notFound();

  const verses = getChapterVerses(translation.id, book.slug, chapterNumber);
  const allTranslations = getAvailableTranslations();

  const commentary = loadChapterCommentary(
    book.slug,
    chapterNumber,
    translation.psalterScheme,
  );

  const model = buildReaderModel({
    translation,
    book,
    chapter,
    verses,
    allTranslations,
    commentary,
  });

  const highlightRange = parseHighlightParam(resolvedSearch.highlight);

  // Contextual backdrop: themes biased toward reading-friendly imagery, with a
  // stable seed so the same chapter renders the same image across loads.
  // Renders null until content/normalized/media/catalog.json is populated.
  const backdrop = (
    <MediaBackdrop
      themes={["fresco", "mosaic", "manuscript", "landscape"]}
      mood="contemplative"
      seed={`bible:${book.slug}:${chapterNumber}`}
      heightClassName="h-40 sm:h-52"
      overlay="soft"
    />
  );

  return (
    <BibleReaderExperience
      model={model}
      highlightRange={highlightRange}
      backdrop={backdrop}
    />
  );
}
