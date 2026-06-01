import Image from "next/image";

// Stylized "Daily" screen — today's commemoration, fast, Gospel, troparion.
// Real saint icon from /public/icons. St. Justin the Philosopher is in fact
// commemorated June 1, so the mock doubles as an accurate sample.

export function DailyScreen() {
  return (
    <div className="flex h-full flex-col bg-background text-ink">
      <div className="relative px-4 pb-3 pt-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-accent/12 to-transparent"
        />
        <p className="relative text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
          Friday · June 1
        </p>
        <div className="relative mt-2.5 flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-1 ring-line-gilt">
            <Image
              src="/icons/icon-justin-the-philosopher.jpg"
              alt=""
              fill
              sizes="56px"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-accent">
              Holy Martyr
            </p>
            <p className="font-serif text-[17px] leading-tight text-ink">
              Justin the Philosopher
            </p>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <p className="text-[10px] text-ink-muted">
            Apostles&apos; Fast · <span className="text-ink">wine &amp; oil</span>
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2.5 px-4">
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="text-[8.5px] font-semibold uppercase tracking-[0.18em] text-accent">
            Today&apos;s Gospel
          </p>
          <p className="mt-1 font-serif text-[14px] text-ink">John 14:1–11</p>
          <p className="mt-1 font-serif text-[12px] italic leading-snug text-ink-muted">
            &ldquo;Let not your heart be troubled: ye believe in God, believe
            also in me.&rdquo;
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="text-[8.5px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
            Troparion · Tone 4
          </p>
          <p className="mt-1 font-serif text-[12px] leading-snug text-ink">
            &ldquo;Thy Martyr Justin, O Lord, in his courage received the crown
            incorruptible…&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
