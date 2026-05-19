import Link from "next/link";
import { Pill } from "@/components/primitives/pill";
import { Surface } from "@/components/primitives/surface";
import { getAllBooks } from "@/lib/content/book-canon";
import { getPrimaryTranslation } from "@/lib/bible/server-store";

export default function BibleLandingPage() {
  const allBooks = getAllBooks();
  const primaryTranslation = getPrimaryTranslation();

  if (!primaryTranslation) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-ink-muted text-sm">Bible content not yet generated. Run the ingestion script to get started.</p>
      </div>
    );
  }

  const oldTestament = allBooks.filter((b) => b.canonDivision === "old-testament");
  const deuterocanon = allBooks.filter((b) => b.canonDivision === "deuterocanon");
  const newTestament = allBooks.filter((b) => b.canonDivision === "new-testament");

  function bookHref(bookSlug: string) {
    return `/bible/${primaryTranslation.slug}/${bookSlug}/1`;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b border-line/80 pb-6">
        <Pill>Scripture</Pill>
        <div className="space-y-2">
          <h1 className="font-serif text-4xl tracking-tight text-ink sm:text-5xl">
            Bible
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-ink-muted sm:text-base">
            Select a book to begin reading. Tap any verse to open patristic commentary,
            related writings, and cross references.
          </p>
        </div>
        <p className="text-[0.7rem] uppercase tracking-[0.18em] text-ink-soft">
          Reading in {primaryTranslation.abbreviation} — {primaryTranslation.name}
        </p>
      </header>

      <div className="space-y-8">
        <BookGroup label="Old Testament" books={oldTestament} bookHref={bookHref} />
        <BookGroup label="Deuterocanon" books={deuterocanon} bookHref={bookHref} />
        <BookGroup label="New Testament" books={newTestament} bookHref={bookHref} />
      </div>
    </div>
  );
}

function BookGroup({
  label,
  books,
  bookHref,
}: {
  label: string;
  books: ReturnType<typeof getAllBooks>;
  bookHref: (slug: string) => string;
}) {
  return (
    <section className="space-y-3">
      <p className="text-[0.7rem] uppercase tracking-[0.22em] text-ink-soft">{label}</p>
      <Surface className="p-0 overflow-hidden">
        <div className="divide-y divide-line">
          {books.map((book) => (
            <Link
              key={book.slug}
              href={bookHref(book.slug)}
              className="flex items-center justify-between px-4 py-3 transition-colors duration-200 hover:bg-surface-strong"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-right font-mono text-[0.65rem] text-ink-soft">
                  {book.order}
                </span>
                <span className="text-sm font-medium text-ink">{book.name}</span>
              </div>
              <span className="text-[0.68rem] uppercase tracking-[0.14em] text-ink-soft">
                {book.chapterCount} {book.chapterCount === 1 ? "ch" : "chs"}
              </span>
            </Link>
          ))}
        </div>
      </Surface>
    </section>
  );
}
