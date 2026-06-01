import { OrthoCross } from "./ortho-cross";
import { StoreBadge } from "./store-badge";

export function Hero() {
  return (
    <section className="relative -mt-16 flex min-h-svh flex-col items-center justify-center overflow-hidden px-5 pb-20 pt-28 text-center">
      {/* candlelight glow */}
      <div
        aria-hidden="true"
        className="candle-breathe pointer-events-none absolute left-1/2 top-[40%] -z-10 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,168,87,0.18),rgba(212,168,87,0.05)_38%,transparent_68%)]"
      />
      {/* bottom vignette to seat the section into the page */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_75%_at_50%_0%,transparent,rgba(10,9,8,0.65))]"
      />

      <div className="relative mb-9">
        <div
          aria-hidden="true"
          className="gilt-sheen absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-2xl"
        />
        <OrthoCross
          variant="gilt"
          className="relative h-24 w-auto drop-shadow-[0_0_26px_rgba(212,168,87,0.4)]"
        />
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent">
        Orthodox Christian Study
      </p>

      <h1 className="mt-5 max-w-3xl font-serif text-5xl font-medium leading-[1.05] tracking-tight text-ink sm:text-6xl md:text-7xl">
        Pray the day.
        <br />
        <span className="italic text-gilt">Read the Fathers.</span>
      </h1>

      <p className="mt-7 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
        Verse-first patristic commentary, the daily liturgical rhythm, and the
        whole library of the Church Fathers — gathered into one quietly
        beautiful app.
      </p>

      <div className="mt-9 flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
        <StoreBadge platform="app" />
        <a
          href="#features"
          className="group flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          See what&apos;s inside
          <span className="transition-transform duration-300 group-hover:translate-y-0.5">
            ↓
          </span>
        </a>
      </div>
    </section>
  );
}
