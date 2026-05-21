import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import {
  getBookBySlug,
  getTranslationBySlug,
} from "@/lib/bible/server-store";

type BookChapterPickerProps = {
  params: Promise<{
    translation: string;
    book: string;
  }>;
};

// Intermediate route between the Bible landing page and the chapter reader.
// User taps a book → lands here → picks a chapter number. The whole grid is
// rendered server-side; tapping a chapter is a normal Link navigation.
export default async function BookChapterPickerPage({
  params,
}: BookChapterPickerProps) {
  const resolved = await params;
  const translation = getTranslationBySlug(resolved.translation);
  const book = getBookBySlug(resolved.book);
  if (!translation || !book) notFound();

  const chapters = Array.from(
    { length: book.chapterCount },
    (_, idx) => idx + 1,
  );

  return (
    <div className="space-y-6 px-4 sm:px-6">
      {/* Back to book index */}
      <div className="pt-2">
        <Link
          href="/bible"
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:text-ink"
        >
          <CaretLeft size={14} weight="bold" /> All books
        </Link>
      </div>

      <header className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
          {translation.abbreviation} · {book.testamentLabel}
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
          {book.name}
        </h1>
        <p className="text-sm text-ink-muted">
          {book.chapterCount} {book.chapterCount === 1 ? "chapter" : "chapters"}
          {book.chapterCount > 1 ? " — tap to open" : ""}
        </p>
      </header>

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-7 md:grid-cols-9">
        {chapters.map((num) => (
          <Link
            key={num}
            href={`/bible/${translation.slug}/${book.slug}/${num}`}
            className="flex aspect-square items-center justify-center rounded-[12px] border border-line/40 bg-surface font-serif text-lg text-ink transition-colors duration-200 hover:border-accent/40 hover:bg-surface-strong hover:text-accent"
          >
            {num}
          </Link>
        ))}
      </div>
    </div>
  );
}
