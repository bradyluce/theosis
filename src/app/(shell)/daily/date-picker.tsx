"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Props = {
  // Current date as ISO yyyy-mm-dd, controlled by the page.
  value: string;
  // The user's "today" in their local timezone, used to highlight the Today shortcut.
  today: string;
};

// Interactive calendar/date input for the Daily page. Submitting a new date
// navigates to `/daily?date=YYYY-MM-DD`; clearing it returns to `/daily` which
// resolves to today. Bounded to the Paschalion's supported range (1900-2099).
export function DatePicker({ value, today }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = (next: string | null) => {
    startTransition(() => {
      router.push(next ? `/daily?date=${next}` : "/daily");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
        <span>Jump to date</span>
        <input
          type="date"
          value={value}
          min="1900-01-01"
          max="2099-12-31"
          onChange={(event) => navigate(event.target.value || null)}
          disabled={isPending}
          className="rounded-md border border-line bg-background px-2 py-1 text-sm normal-case tracking-normal text-ink focus:outline-none focus:ring-1 focus:ring-gold"
        />
      </label>
      {value !== today ? (
        <button
          type="button"
          onClick={() => navigate(null)}
          disabled={isPending}
          className="rounded-md border border-line bg-background px-3 py-1 text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft transition-colors duration-200 hover:bg-surface-strong hover:text-ink"
        >
          Today
        </button>
      ) : null}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => navigate(shiftIso(value, -1))}
          disabled={isPending}
          aria-label="Previous day"
          className="rounded-md border border-line bg-background px-2 py-1 text-sm text-ink-soft transition-colors duration-200 hover:bg-surface-strong hover:text-ink"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => navigate(shiftIso(value, 1))}
          disabled={isPending}
          aria-label="Next day"
          className="rounded-md border border-line bg-background px-2 py-1 text-sm text-ink-soft transition-colors duration-200 hover:bg-surface-strong hover:text-ink"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function shiftIso(iso: string, days: number): string {
  const [yyyy, mm, dd] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(yyyy, mm - 1, dd + days));
  return next.toISOString().slice(0, 10);
}
