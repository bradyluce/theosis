import { OrthoCross } from "./ortho-cross";
import { StoreBadge } from "./store-badge";
import { Reveal } from "./reveal";

export function ClosingCta() {
  return (
    <section
      id="download"
      className="relative scroll-mt-20 overflow-hidden px-5 py-28 text-center sm:py-36"
    >
      <div
        aria-hidden="true"
        className="candle-breathe pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,168,87,0.15),transparent_70%)]"
      />
      <Reveal>
        <OrthoCross
          variant="gilt"
          className="mx-auto h-16 w-auto drop-shadow-[0_0_22px_rgba(212,168,87,0.35)]"
        />
        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.32em] text-accent">
          Begin
        </p>
        <h2 className="mt-5 font-serif text-5xl font-medium italic leading-tight tracking-tight text-ink sm:text-6xl">
          Come and see.
        </h2>
        <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-ink-muted">
          Theosis is free, ad-free, and made with reverence — for prayer, not
          for data.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <StoreBadge platform="app" />
          <StoreBadge platform="play" />
        </div>
      </Reveal>
    </section>
  );
}
