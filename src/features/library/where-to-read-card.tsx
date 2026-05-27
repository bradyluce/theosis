import Link from "next/link";
import type { WorkAvailability } from "@theosis/core";
import { Pill } from "@/components/primitives/pill";
import { Surface } from "@/components/primitives/surface";

type WhereToReadCardProps = {
  availability: WorkAvailability;
  workTitle: string;
};

// Rendered in place of the prose body for works whose `contentStatus` is
// "reference-only". The work's catalogue record, summary, verseRefs, and
// save-to-profile action remain available; only the body is replaced.
export function WhereToReadCard({ availability, workTitle }: WhereToReadCardProps) {
  const link = availability.affiliateUrl ?? availability.purchaseUrl;
  const statusLabel =
    availability.status === "in-print"
      ? "In print"
      : availability.status === "open-access"
      ? "Open access"
      : availability.status === "out-of-print"
      ? "Out of print"
      : null;

  return (
    <Surface tone="accent" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill variant="accent">Where to read</Pill>
        {statusLabel ? <Pill variant="subtle">{statusLabel}</Pill> : null}
      </div>
      <p className="font-serif text-base leading-7 text-ink">
        The full text of <em>{workTitle}</em> is not redistributed in this app.
        It is published under copyright by{" "}
        <span className="font-medium text-ink">
          {availability.publisher ?? "its publisher"}
        </span>
        {availability.isbn ? (
          <>
            {" "}
            (ISBN {availability.isbn})
          </>
        ) : null}
        .
      </p>
      {availability.note ? (
        <p className="text-sm leading-7 text-ink-muted">{availability.note}</p>
      ) : null}
      {link ? (
        <div>
          <Link
            href={link}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-[10px] border border-accent/40 bg-accent-soft/40 px-4 py-2 text-sm font-medium text-accent transition-colors duration-200 hover:bg-accent-soft hover:text-ink"
          >
            Open publisher page ↗
          </Link>
        </div>
      ) : null}
      <p className="text-xs leading-relaxed text-ink-soft">
        You can still save this work to your reading list, follow the author,
        and see which Scripture passages it engages.
      </p>
    </Surface>
  );
}
