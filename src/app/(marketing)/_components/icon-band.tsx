import Image from "next/image";
import { Reveal } from "./reveal";

// A sacred centerpiece — the Resurrection icon full-bleed, scrimmed so the
// pull-quote on theosis (deification) stays legible. The quote names the very
// idea the app is named for.

export function IconBand() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0">
        <Image
          src="/marketing/resurrection.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* fade top & bottom into the page, plus an even wash for contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/55 to-background" />
        <div className="absolute inset-0 bg-background/45" />
      </div>

      <div className="relative mx-auto max-w-3xl px-5 py-28 text-center sm:py-36">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent">
            Theosis
          </p>
          <blockquote className="mt-6 font-serif text-3xl font-medium italic leading-snug tracking-tight text-ink sm:text-4xl md:text-[2.7rem]">
            &ldquo;He became what we are, that He might make us what He
            is.&rdquo;
          </blockquote>
          <p className="mt-6 text-sm text-ink-muted">
            — St. Athanasius the Great,{" "}
            <span className="italic">On the Incarnation</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
