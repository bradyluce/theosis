import Image from "next/image";

// Stylized "Reader" screen — Scripture with the Fathers set beside it. The
// first verse carries the app's gilt verse-glow; a Chrysostom note sits in a
// gilt-edged card below, the way commentary surfaces in-app.

export function ReaderScreen() {
  return (
    <div className="flex h-full flex-col bg-background text-ink">
      <div className="px-4 pb-2 pt-10 text-center">
        <p className="text-[8.5px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
          Matthew · Chapter 5
        </p>
        <p className="mt-0.5 font-serif text-[15px] text-ink">The Beatitudes</p>
      </div>

      <div className="flex-1 space-y-2 px-4 font-serif text-[12.5px] leading-relaxed">
        <p>
          <sup className="mr-0.5 text-[8px] text-accent">3</sup>
          <span className="rounded bg-accent-soft px-1 text-ink shadow-[0_0_12px_rgba(212,168,87,0.3)]">
            Blessed are the poor in spirit: for theirs is the kingdom of heaven.
          </span>
        </p>
        <p className="text-ink-muted">
          <sup className="mr-0.5 text-[8px] text-accent">4</sup>Blessed are they
          that mourn: for they shall be comforted.
        </p>
        <p className="text-ink-muted">
          <sup className="mr-0.5 text-[8px] text-accent">5</sup>Blessed are the
          meek: for they shall inherit the earth.
        </p>
      </div>

      <div className="m-3 rounded-xl border border-line-gilt bg-surface-strong p-3">
        <div className="flex items-center gap-2">
          <div className="relative h-7 w-7 overflow-hidden rounded-full ring-1 ring-line-gilt">
            <Image
              src="/icons/icon-john-chrysostom.jpg"
              alt=""
              fill
              sizes="28px"
              className="object-cover"
            />
          </div>
          <p className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-accent">
            St. John Chrysostom
          </p>
        </div>
        <p className="mt-2 font-serif text-[11.5px] italic leading-snug text-ink-muted">
          &ldquo;What is meant by &lsquo;the poor in spirit&rsquo;? The humble
          and contrite in mind.&rdquo;
        </p>
      </div>
    </div>
  );
}
