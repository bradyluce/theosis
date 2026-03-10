import { notFound } from "next/navigation";
import { BibleReaderExperience } from "@/features/bible/reader-experience";
import { buildReaderModel } from "@/features/bible/reader-model";

type BibleReaderPageProps = {
  params: Promise<{
    translation: string;
    book: string;
    chapter: string;
  }>;
};

export default async function BibleReaderPage({
  params,
}: BibleReaderPageProps) {
  const resolvedParams = await params;
  const chapterNumber = Number.parseInt(resolvedParams.chapter, 10);

  if (Number.isNaN(chapterNumber)) {
    notFound();
  }

  const model = buildReaderModel(
    resolvedParams.translation,
    resolvedParams.book,
    chapterNumber,
  );

  if (!model) {
    notFound();
  }

  return <BibleReaderExperience model={model} />;
}
