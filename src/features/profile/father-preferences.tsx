"use client";

import { useMemo, useState } from "react";
import type { Person } from "@/domain/content/types";
import { useStudyState } from "@/lib/user/use-study-state";

type Props = {
  fathers: Person[];
};

// Manage the user's preferred Fathers (ordered list, shown first in the
// reader's commentary panel) and Hidden Fathers (excluded from the panel
// entirely). The Zustand store handles persistence.
export function FatherPreferences({ fathers }: Props) {
  // Fall back to empty arrays for the first render or for pre-migration
  // persisted states that haven't been touched by the migration yet.
  const preferredFatherIds = useStudyState(
    (state) => state.preferences.preferredFatherIds ?? [],
  );
  const hiddenFatherIds = useStudyState(
    (state) => state.preferences.hiddenFatherIds ?? [],
  );
  const togglePreferred = useStudyState((state) => state.togglePreferredFather);
  const toggleHidden = useStudyState((state) => state.togglehiddenFather);
  const moveFather = useStudyState((state) => state.movePreferredFather);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"preferred" | "hidden">("preferred");
  const [query, setQuery] = useState("");

  const preferredFathers = useMemo(
    () =>
      preferredFatherIds
        .map((id) => fathers.find((father) => father.id === id))
        .filter((value): value is Person => Boolean(value)),
    [preferredFatherIds, fathers],
  );
  const hiddenFathers = useMemo(
    () =>
      hiddenFatherIds
        .map((id) => fathers.find((father) => father.id === id))
        .filter((value): value is Person => Boolean(value)),
    [hiddenFatherIds, fathers],
  );

  const candidatesForPicker = useMemo(() => {
    const inUse = new Set<string>([...preferredFatherIds, ...hiddenFatherIds]);
    const needle = query.trim().toLowerCase();
    return fathers.filter((father) => {
      if (inUse.has(father.id)) return false;
      if (!needle) return true;
      return (
        father.name.toLowerCase().includes(needle) ||
        father.eraLabel.toLowerCase().includes(needle)
      );
    });
  }, [fathers, preferredFatherIds, hiddenFatherIds, query]);

  function openPicker(mode: "preferred" | "hidden") {
    setPickerMode(mode);
    setQuery("");
    setShowPicker(true);
  }

  return (
    <div className="rounded-[12px] border border-line bg-background px-4 py-4 space-y-4">
      <div>
        <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
          Commentary ranking
        </p>
        <p className="mt-1 text-xs leading-5 text-ink-soft">
          Preferred Fathers appear first in the reader's commentary panel.
          Hidden Fathers are removed from that panel entirely.
        </p>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-ink-soft">
            Always show first
          </p>
          <button
            type="button"
            onClick={() => openPicker("preferred")}
            className="rounded-md border border-line bg-surface px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-ink-soft transition-colors duration-200 hover:bg-surface-strong hover:text-ink"
          >
            Add
          </button>
        </div>
        {preferredFathers.length > 0 ? (
          <ul className="space-y-1">
            {preferredFathers.map((father, index) => (
              <li
                key={father.id}
                className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-1.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-[0.65rem] text-ink-soft w-4 text-right">
                    {index + 1}
                  </span>
                  <span className="truncate text-sm text-ink">{father.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveFather(father.id, "up")}
                    disabled={index === 0}
                    aria-label="Move up"
                    className="rounded px-1.5 py-0.5 text-sm text-ink-soft transition-colors duration-200 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveFather(father.id, "down")}
                    disabled={index === preferredFathers.length - 1}
                    aria-label="Move down"
                    className="rounded px-1.5 py-0.5 text-sm text-ink-soft transition-colors duration-200 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePreferred(father.id)}
                    aria-label="Remove from preferred"
                    className="rounded px-1.5 py-0.5 text-sm text-ink-soft transition-colors duration-200 hover:text-ink"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-soft">
            None set. The reader will use its default ranking.
          </p>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-ink-soft">
            Hide from commentary
          </p>
          <button
            type="button"
            onClick={() => openPicker("hidden")}
            className="rounded-md border border-line bg-surface px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-ink-soft transition-colors duration-200 hover:bg-surface-strong hover:text-ink"
          >
            Add
          </button>
        </div>
        {hiddenFathers.length > 0 ? (
          <ul className="space-y-1">
            {hiddenFathers.map((father) => (
              <li
                key={father.id}
                className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-1.5"
              >
                <span className="truncate text-sm text-ink">{father.name}</span>
                <button
                  type="button"
                  onClick={() => toggleHidden(father.id)}
                  aria-label="Remove from hidden"
                  className="rounded px-1.5 py-0.5 text-sm text-ink-soft transition-colors duration-200 hover:text-ink"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-soft">None hidden.</p>
        )}
      </section>

      {showPicker ? (
        <div className="rounded-md border border-line-strong bg-surface-strong px-3 py-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
              {pickerMode === "preferred" ? "Add to preferred" : "Add to hidden"}
            </p>
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft hover:text-ink"
            >
              Close
            </button>
          </div>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or era"
            className="w-full rounded-md border border-line bg-background px-3 py-1.5 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-1 focus:ring-gold"
            autoFocus
          />
          <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {candidatesForPicker.map((father) => (
              <li key={father.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (pickerMode === "preferred") togglePreferred(father.id);
                    else toggleHidden(father.id);
                    setShowPicker(false);
                  }}
                  className="w-full rounded border border-line bg-background px-3 py-1.5 text-left text-sm text-ink transition-colors duration-200 hover:bg-surface"
                >
                  <span>{father.name}</span>
                  <span className="ml-2 text-[0.65rem] uppercase tracking-[0.18em] text-ink-soft">
                    {father.eraLabel}
                  </span>
                </button>
              </li>
            ))}
            {candidatesForPicker.length === 0 ? (
              <li className="px-3 py-2 text-xs text-ink-soft">
                No matching Fathers.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
