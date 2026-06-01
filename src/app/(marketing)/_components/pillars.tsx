import type { ReactNode } from "react";
import { Reveal } from "./reveal";

function CrossGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M12 3v18M8 7h8M6 12h12" strokeLinecap="round" />
    </svg>
  );
}
function CalendarGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" strokeLinecap="round" />
    </svg>
  );
}
function PinGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

const PILLARS: ReadonlyArray<{
  glyph: ReactNode;
  title: string;
  body: string;
}> = [
  {
    glyph: <CrossGlyph />,
    title: "A rule you'll keep",
    body: "Assemble morning and evening prayers, your patron saint, and your diptych — and pray them anywhere, even offline.",
  },
  {
    glyph: <CalendarGlyph />,
    title: "Keep the feasts",
    body: "The full Church calendar — every commemoration, fast, and tone — on the Old Calendar or the New.",
  },
  {
    glyph: <PinGlyph />,
    title: "Find your people",
    body: "Search Orthodox parishes and monasteries near you, filtered by jurisdiction and community.",
  },
];

export function Pillars() {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {PILLARS.map((pillar, i) => (
        <Reveal key={pillar.title} delayMs={i * 100}>
          <div className="h-full rounded-2xl border border-line bg-surface/60 p-6 transition-colors hover:border-line-gilt">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-line-gilt bg-accent-soft text-accent">
              <span className="h-5 w-5">{pillar.glyph}</span>
            </div>
            <h3 className="mt-5 font-serif text-xl tracking-tight text-ink">
              {pillar.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {pillar.body}
            </p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
