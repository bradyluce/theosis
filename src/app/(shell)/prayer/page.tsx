import Link from "next/link";
import {
  CaretLeft,
  HandsPraying,
  Plus,
} from "@phosphor-icons/react/dist/ssr";

// Placeholder for the prayer-rule builder. The full UX is TBD — the user
// indicated they'll spec details later. For now this surface signals intent
// and lets the You-tab quick tile route somewhere meaningful.
export default function PrayerPage() {
  return (
    <div className="space-y-6 px-4 sm:px-6">
      {/* Back link */}
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
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
          Build your rule
        </h1>
        <p className="text-sm leading-7 text-ink-muted">
          A traditional Orthodox prayer rule built piece by piece — morning
          prayers, evening prayers, Psalter, Jesus Prayer counts, and the
          appointed canons for the day.
        </p>
      </header>

      {/* Coming soon card */}
      <div className="flex items-start gap-4 rounded-[16px] border border-accent/20 bg-surface p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-soft text-accent">
          <HandsPraying size={24} weight="fill" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-accent">
            Coming soon
          </p>
          <p className="font-serif text-lg tracking-tight text-ink">
            The rule builder is being designed
          </p>
          <p className="text-sm leading-6 text-ink-muted">
            Once it lands you&rsquo;ll assemble a personal rule from morning &
            evening prayers, Psalter sections, the Jesus Prayer, akathists,
            and the daily commemorations.
          </p>
        </div>
      </div>

      {/* Placeholder structure */}
      <section className="space-y-3">
        <h2 className="font-serif text-2xl tracking-tight text-ink">
          Rule sections
        </h2>
        {[
          { label: "Morning prayers", note: "Trisagion → Our Father → daily set" },
          { label: "Evening prayers", note: "Vespers anchors and bedtime prayers" },
          { label: "Psalter", note: "Kathisma rotation tracked across the week" },
          { label: "Jesus Prayer", note: "Set a count and a chotki style" },
          { label: "Canon of the day", note: "From the Octoechos and Menaion" },
        ].map((row) => (
          <button
            key={row.label}
            className="flex w-full items-center justify-between gap-4 rounded-[14px] border border-line/40 bg-surface px-4 py-4 text-left transition-colors duration-200 hover:bg-surface-strong"
          >
            <div className="min-w-0 space-y-1">
              <p className="font-serif text-lg tracking-tight text-ink">
                {row.label}
              </p>
              <p className="text-xs text-ink-muted">{row.note}</p>
            </div>
            <Plus
              size={20}
              weight="bold"
              className="shrink-0 text-ink-soft"
            />
          </button>
        ))}
      </section>
    </div>
  );
}
