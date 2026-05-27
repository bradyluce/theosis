import Link from "next/link";
import {
  CaretLeft,
  CaretRight,
  Clock,
  HandsPraying,
  Moon,
  Sun,
} from "@phosphor-icons/react/dist/ssr";
import { prayerSets } from "@/lib/content/seed/prayers";

const SET_ICONS = {
  morning: Sun,
  evening: Moon,
  "compline-light": Moon,
} as const;

export const metadata = {
  title: "Prayer rule",
};

export default function PrayerPage() {
  return (
    <div className="space-y-6 px-4 sm:px-6">
      <div className="pt-2">
        <Link
          href="/you"
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:text-ink"
        >
          <CaretLeft size={14} weight="bold" /> You
        </Link>
      </div>

      <header className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
          Prayer Rule
        </p>
        <h1 className="font-serif text-4xl tracking-tight text-ink">
          Pray today
        </h1>
        <p className="text-sm leading-7 text-ink-muted">
          The traditional morning and evening prayers — what every Orthodox
          Christian is given on the day of their baptism. Begin slowly. The
          rule is medicine; do what you can.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl tracking-tight text-ink">Today’s prayers</h2>
        <div className="space-y-3">
          {prayerSets.map((set) => {
            const Icon = SET_ICONS[set.slug as keyof typeof SET_ICONS] ?? HandsPraying;
            return (
              <Link
                key={set.id}
                href={`/prayer/${set.slug}`}
                className="flex items-start gap-4 rounded-[16px] border border-line/40 bg-surface p-5 transition-colors hover:bg-surface-strong"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-soft text-accent">
                  <Icon size={20} weight="fill" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-accent">
                    {set.subtitle}
                  </p>
                  <p className="font-serif text-xl tracking-tight text-ink">
                    {set.title}
                  </p>
                  <p className="line-clamp-2 text-sm leading-6 text-ink-muted">
                    {set.intro}
                  </p>
                  <p className="flex items-center gap-1 pt-1 text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                    <Clock size={10} weight="bold" /> ~{set.minutes} min
                  </p>
                </div>
                <CaretRight size={14} weight="bold" className="mt-3 shrink-0 text-ink-soft" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl tracking-tight text-ink">The Jesus Prayer</h2>
        <Link
          href="/prayer/jesus-prayer"
          className="flex items-start gap-4 rounded-[16px] border border-accent/20 bg-surface p-5 transition-colors hover:bg-surface-strong"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-soft text-accent">
            <HandsPraying size={20} weight="fill" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-accent">
              Pray without ceasing
            </p>
            <p className="font-serif text-xl leading-tight tracking-tight text-ink">
              “Lord Jesus Christ, Son of God, have mercy on me, a sinner.”
            </p>
            <p className="text-sm leading-6 text-ink-muted">
              A chotki counter — tap to pray, set a count, hold a rhythm.
            </p>
          </div>
          <CaretRight size={14} weight="bold" className="mt-3 shrink-0 text-ink-soft" />
        </Link>
      </section>
    </div>
  );
}
