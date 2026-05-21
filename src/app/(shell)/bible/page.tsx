import Link from "next/link";
import { CaretDown, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { getAllBooks } from "@/lib/content/book-canon";
import { getPrimaryTranslation } from "@/lib/bible/server-store";

export default function BibleLandingPage() {
  const allBooks = getAllBooks();
  const primaryTranslation = getPrimaryTranslation();

  if (!primaryTranslation) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm text-ink-muted">
          Bible content not yet generated. Run the ingestion script to get started.
        </p>
      </div>
    );
  }

  const translationSlug = primaryTranslation.slug;
  const oldTestament = allBooks
    .filter(
      (b) => b.canonDivision === "old-testament" || b.canonDivision === "deuterocanon",
    )
    .sort((a, b) => a.order - b.order);
  const newTestament = allBooks
    .filter((b) => b.canonDivision === "new-testament")
    .sort((a, b) => a.order - b.order);

  function bookHref(bookSlug: string) {
    return `/bible/${translationSlug}/${bookSlug}`;
  }

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink pt-2">
        The Holy Bible
      </h1>

      <button className="inline-flex items-center gap-2 rounded-full border border-line-strong/60 bg-surface px-4 py-2 text-sm text-ink">
        {primaryTranslation.abbreviation}
        <CaretRight size={14} weight="bold" className="text-ink-soft" />
      </button>

      <TestamentSection
        label="Old Testament"
        count={oldTestament.length}
        books={oldTestament}
        bookHref={bookHref}
      />
      <TestamentSection
        label="New Testament"
        count={newTestament.length}
        books={newTestament}
        bookHref={bookHref}
      />
    </div>
  );
}

function TestamentSection({
  label,
  count,
  books,
  bookHref,
}: {
  label: string;
  count: number;
  books: ReturnType<typeof getAllBooks>;
  bookHref: (slug: string) => string;
}) {
  return (
    <details className="group overflow-hidden rounded-[16px] border border-line/40 bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 transition-colors duration-200 hover:bg-surface-strong [&::-webkit-details-marker]:hidden">
        <div className="flex items-baseline gap-3">
          <h2 className="font-serif text-2xl tracking-tight text-ink">{label}</h2>
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">
            {count} books
          </span>
        </div>
        <CaretDown
          size={16}
          weight="bold"
          className="text-ink-soft transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className="grid grid-cols-2 gap-2 border-t border-line/40 bg-background/40 p-3 sm:grid-cols-3">
        {books.map((book) => (
          <Link
            key={book.slug}
            href={bookHref(book.slug)}
            className="flex items-center justify-between rounded-[10px] border border-line/40 bg-surface px-3 py-2 text-sm text-ink transition-colors duration-200 hover:bg-surface-strong"
          >
            <span className="truncate">{book.name}</span>
            <span className="ml-2 font-mono text-[10px] text-ink-soft">
              {book.chapterCount}
            </span>
          </Link>
        ))}
      </div>
    </details>
  );
}
