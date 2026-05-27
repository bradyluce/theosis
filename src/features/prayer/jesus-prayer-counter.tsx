"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// A chotki / prayer-rope counter for the Jesus Prayer. Tap the central button
// each time you say the prayer. Set a target count (33, 100, 150, custom)
// and the ring fills as you go. Haptics fire on each tap (Android Web; iOS
// Safari ignores navigator.vibrate, falls back to visual pulse).
//
// State is persisted to localStorage so the count survives refresh — useful
// when the prayer is interrupted. The counter only resets explicitly.

const STORAGE_KEY = "theosis-jesus-prayer-count-v1";

const PRESET_COUNTS = [33, 100, 150, 300] as const;

type Persisted = {
  count: number;
  target: number;
  startedAt?: string;
};

function loadState(): Persisted {
  if (typeof window === "undefined") return { count: 0, target: 100 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, target: 100 };
    const parsed = JSON.parse(raw) as Persisted;
    return {
      count: Math.max(0, Math.floor(parsed.count ?? 0)),
      target: parsed.target && parsed.target > 0 ? parsed.target : 100,
      startedAt: parsed.startedAt,
    };
  } catch {
    return { count: 0, target: 100 };
  }
}

function saveState(state: Persisted) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota errors are non-fatal — the counter still works in-session.
  }
}

export function JesusPrayerCounter() {
  const [hydrated, setHydrated] = useState(false);
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(100);
  const [pulse, setPulse] = useState(false);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage after mount to avoid SSR/CSR mismatch. The
  // initial render uses defaults; this effect upgrades to the persisted
  // values once we're on the client.
  useEffect(() => {
    const initial = loadState();
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot hydration from external storage. */
    setCount(initial.count);
    setTarget(initial.target);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persist on change (post-hydration only — don't overwrite stored value
  // with the SSR default on first render).
  useEffect(() => {
    if (!hydrated) return;
    saveState({ count, target });
  }, [hydrated, count, target]);

  const percent = Math.min(100, Math.round((count / target) * 100));
  const completed = count >= target && target > 0;

  const tick = useCallback(() => {
    setCount((c) => c + 1);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        // Some browsers throw rather than no-op; swallow.
      }
    }
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    setPulse(true);
    pulseTimer.current = setTimeout(() => setPulse(false), 220);
  }, []);

  const reset = useCallback(() => {
    setCount(0);
  }, []);

  // Keyboard shortcut: space or enter increments. Helpful at the desk.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        tick();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tick]);

  return (
    <div className="space-y-8">
      {/* The prayer itself, displayed as a meditation focus. */}
      <div className="rounded-[16px] border border-accent/20 bg-surface p-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.22em] text-accent">The Jesus Prayer</p>
        <p className="mt-3 font-serif text-2xl leading-snug tracking-tight text-ink">
          “Lord Jesus Christ,<br />
          Son of God,<br />
          have mercy on me,<br />
          a sinner.”
        </p>
      </div>

      {/* Counter ring */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={tick}
          aria-label="Add one to the count"
          className={cn(
            "relative flex h-64 w-64 items-center justify-center rounded-full border-2 border-line/40 bg-surface transition-transform duration-150",
            pulse && "scale-[1.02]",
          )}
          style={{
            backgroundImage: `conic-gradient(var(--accent) ${percent}%, transparent ${percent}%)`,
            backgroundClip: "padding-box",
          }}
        >
          <span className="flex h-[15rem] w-[15rem] flex-col items-center justify-center rounded-full bg-surface">
            <span className="font-serif text-7xl tabular-nums text-ink">{count}</span>
            <span className="mt-1 text-[10px] uppercase tracking-[0.22em] text-ink-soft">
              of {target}
            </span>
            {completed ? (
              <span className="mt-3 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-accent">
                Rule complete
              </span>
            ) : null}
          </span>
        </button>
        <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-ink-soft">
          Tap to pray · Space / Enter on desktop
        </p>
      </div>

      {/* Target picker */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.22em] text-ink-soft">Set a count</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setTarget(n)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm tabular-nums transition-colors",
                target === n
                  ? "border-accent/40 bg-accent-soft text-accent"
                  : "border-line/60 bg-surface text-ink-soft hover:text-ink",
              )}
            >
              {n}
            </button>
          ))}
          <CustomTargetInput value={target} onChange={setTarget} />
        </div>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-full border border-line/60 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:bg-surface-strong hover:text-ink"
        >
          <ArrowCounterClockwise size={12} weight="bold" /> Reset count
        </button>
      </div>
    </div>
  );
}

function CustomTargetInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const isPreset = (PRESET_COUNTS as readonly number[]).includes(value);
  const [draft, setDraft] = useState(isPreset ? "" : String(value));

  // Keep the draft in sync if the parent value changes via preset click.
  // Treated as a controlled-input mirror — when the source of truth flips,
  // the draft string follows.
  useEffect(() => {
    const next = (PRESET_COUNTS as readonly number[]).includes(value)
      ? ""
      : String(value);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror controlled value.
    setDraft(next);
  }, [value]);

  return (
    <input
      type="number"
      min={1}
      max={9999}
      inputMode="numeric"
      placeholder="Custom"
      value={draft}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        const parsed = Number(next);
        if (Number.isFinite(parsed) && parsed > 0 && parsed <= 9999) {
          onChange(parsed);
        }
      }}
      className="w-24 rounded-full border border-line/60 bg-surface px-4 py-1.5 text-sm tabular-nums text-ink outline-none transition-colors placeholder:text-ink-soft hover:border-line-strong focus:border-accent/50"
      aria-label="Custom target"
    />
  );
}
