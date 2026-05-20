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
        <p className="text-ink-muted text-sm">
          Bible content not yet generated. Run the ingestion script to get started.
        </p>
      </div>
    );
  }

  const translationSlug = primaryTranslation.slug;

  // Deuterocanonical books are presented alongside the Old Testament — the
  // Orthodox canon treats them as part of the Old Testament rather than a
  // separate volume.
  const oldTestament = allBooks
    .filter(
      (b) => b.canonDivision === "old-testament" || b.canonDivision === "deuterocanon",
    )
    .sort((a, b) => a.order - b.order);
  const newTestament = allBooks
    .filter((b) => b.canonDivision === "new-testament")
    .sort((a, b) => a.order - b.order);

  function bookHref(bookSlug: string) {
    return `/bible/${translationSlug}/${bookSlug}/1`;
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
            Choose a Testament, then a book. Tap any verse to open patristic
            commentary, related writings, and cross references.
          </p>
        </div>
        <p className="text-[0.7rem] uppercase tracking-[0.18em] text-ink-soft">
          Reading in {primaryTranslation.abbreviation} — {primaryTranslation.name}
        </p>
      </header>

      <div className="space-y-4">
        <TestamentSelector
          label="Old Testament"
          count={oldTestament.length}
          books={oldTestament}
          bookHref={bookHref}
          defaultOpen
        />
        <TestamentSelector
          label="New Testament"
          count={newTestament.length}
          books={newTestament}
          bookHref={bookHref}
          defaultOpen
        />
      </div>
    </div>
  );
}

function TestamentSelector({
  label,
  count,
  books,
  bookHref,
  defaultOpen,
}: {
  label: string;
  count: number;
  books: ReturnType<typeof getAllBooks>;
  bookHref: (slug: string) => string;
  defaultOpen?: boolean;
}) {
  return (
    <Surface className="p-0 overflow-hidden">
      <details className="group" open={defaultOpen}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 transition-colors duration-200 hover:bg-surface-strong [&::-webkit-details-marker]:hidden">
          <div className="flex items-baseline gap-3">
            <h2 className="font-serif text-2xl tracking-tight text-ink">{label}</h2>
            <span className="text-[0.68rem] uppercase tracking-[0.18em] text-ink-soft">
              {count} books
            </span>
          </div>
          <span className="text-base text-ink-soft transition-transform duration-200 group-open:rotate-90">
            ›
          </span>
        </summary>
        <div className="grid grid-cols-2 gap-1.5 border-t border-line bg-background p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {books.map((book) => (
            <Link
              key={book.slug}
              href={bookHref(book.slug)}
              className="flex items-center justify-between gap-2 rounded-[10px] border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors duration-200 hover:bg-surface-strong hover:text-ink"
              title={`${book.chapterCount} ${book.chapterCount === 1 ? "chapter" : "chapters"}`}
            >
              <span className="truncate font-medium">{book.name}</span>
              <span className="font-mono text-[0.65rem] text-ink-soft">
                {book.chapterCount}
              </span>
            </Link>
          ))}
        </div>
      </details>
    </Surface>
  );
}
