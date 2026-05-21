import { notFound } from "next/navigation";
import { BibleReaderExperience } from "@/features/bible/reader-experience";
import { buildReaderModel } from "@/features/bible/reader-model";
import { loadChapterCommentary } from "@/lib/content/commentary-loader";
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
};

export default async function BibleReaderPage({ params }: BibleReaderPageProps) {
  const resolvedParams = await params;
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

  return <BibleReaderExperience model={model} />;
}
