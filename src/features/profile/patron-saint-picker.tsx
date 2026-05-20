"use client";

import { useMemo, useState } from "react";
import type { Person } from "@/domain/content/types";
import { useStudyState } from "@/lib/user/use-study-state";

type Props = {
  saints: Person[];
  currentPatronId: string | undefined;
};

// Search-and-pick UI for the user's patron saint. Opens an inline picker
// from the Profile preferences panel; selecting a saint updates the Zustand
// store, which persists to localStorage on its own.
export function PatronSaintPicker({ saints, currentPatronId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const setPatronSaint = useStudyState((state) => state.setPatronSaint);

  const currentPatron = useMemo(
    () => saints.find((saint) => saint.id === currentPatronId),
    [saints, currentPatronId],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return saints;
    return saints.filter(
      (saint) =>
        saint.name.toLowerCase().includes(needle) ||
        saint.eraLabel.toLowerCase().includes(needle) ||
        saint.feastDayLabel?.toLowerCase().includes(needle) ||
        saint.summary.toLowerCase().includes(needle),
    );
  }, [saints, query]);

  if (!isOpen) {
    return (
      <div className="rounded-[12px] border border-line bg-background px-4 py-4">
        <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
          Patron saint
        </p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <p className="font-serif text-xl tracking-tight text-ink">
              {currentPatron?.name ?? "Not selected"}
            </p>
            {currentPatron?.feastDayLabel ? (
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ink-soft">
                {currentPatron.feastDayLabel}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="rounded-md border border-line bg-background px-3 py-1 text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft transition-colors duration-200 hover:bg-surface-strong hover:text-ink"
          >
            {currentPatron ? "Change" : "Choose"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-line bg-background px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
          Choose a patron saint
        </p>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setQuery("");
          }}
          className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft hover:text-ink"
        >
          Close
        </button>
      </div>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name, era, or feast day"
        className="mt-3 w-full rounded-md border border-line bg-background px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-1 focus:ring-gold"
        autoFocus
      />
      <p className="mt-2 text-xs text-ink-soft">
        {filtered.length} {filtered.length === 1 ? "saint" : "saints"} available
      </p>
      <ul
        className="mt-3 max-h-80 space-y-1 overflow-y-auto pr-1"
        role="listbox"
        aria-label="Saints"
      >
        {filtered.map((saint) => {
          const isSelected = saint.id === currentPatronId;
          return (
            <li key={saint.id}>
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setPatronSaint(saint.id);
                  setIsOpen(false);
                  setQuery("");
                }}
                className={`w-full rounded-md border px-3 py-2 text-left transition-colors duration-200 ${
                  isSelected
                    ? "border-gold bg-surface-strong"
                    : "border-line bg-background hover:bg-surface-strong"
                }`}
              >
                <p className="font-medium text-ink">{saint.name}</p>
                <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-ink-soft">
                  {saint.eraLabel}
                  {saint.feastDayLabel ? ` · ${saint.feastDayLabel}` : null}
                </p>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="px-3 py-4 text-sm text-ink-soft">No saints match your search.</li>
        ) : null}
      </ul>
    </div>
  );
}
