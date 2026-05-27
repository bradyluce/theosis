import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { JesusPrayerCounter } from "@/features/prayer/jesus-prayer-counter";

export const metadata = {
  title: "The Jesus Prayer",
};

export default function JesusPrayerPage() {
  return (
    <div className="space-y-8 px-4 sm:px-6">
      <div className="pt-2">
        <Link
          href="/prayer"
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:text-ink"
        >
          <CaretLeft size={14} weight="bold" /> Prayer
        </Link>
      </div>

      <header className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
          Pray without ceasing
        </p>
        <h1 className="font-serif text-4xl tracking-tight text-ink">
          The Jesus Prayer
        </h1>
        <p className="text-sm leading-7 text-ink-muted">
          A short prayer prayed many times. Breathe in on the first half,
          breathe out on the second. The chotki — the prayer rope —
          holds the count for you. Begin small. Be patient.
        </p>
      </header>

      <JesusPrayerCounter />

      <section className="space-y-3 rounded-[16px] border border-line/40 bg-surface p-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-accent">
          A word from the Fathers
        </p>
        <blockquote className="font-serif text-[1.05rem] leading-relaxed italic text-ink">
          “The continual invocation of the Name of Jesus, joined with the
          remembrance of His person, is a way of unceasing prayer. It enters
          the heart slowly, and remains there as a quiet fire.”
        </blockquote>
        <p className="text-xs text-ink-soft">
          — Paraphrased from St. Theophan the Recluse.
        </p>
      </section>
    </div>
  );
}
