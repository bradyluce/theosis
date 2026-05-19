import { notFound } from "next/navigation";
import { BibleReaderExperience } from "@/features/bible/reader-experience";
import { buildReaderModel } from "@/features/bible/reader-model";
import { loadChapterData } from "@/lib/content/loader";

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

  const data = loadChapterData(resolvedParams.translation, resolvedParams.book, chapterNumber);

  if (!data) {
    notFound();
  }

  const model = buildReaderModel(data);

  return <BibleReaderExperience model={model} />;
}
