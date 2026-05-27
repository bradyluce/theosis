import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeft, Clock } from "@phosphor-icons/react/dist/ssr";
import { getPrayerSetBySlug } from "@/lib/content/seed/prayers";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const set = getPrayerSetBySlug(slug);
  return { title: set?.title ?? "Prayer" };
}

export default async function PrayerSetPage({ params }: Props) {
  const { slug } = await params;
  const set = getPrayerSetBySlug(slug);
  if (!set) notFound();

  return (
    <div className="space-y-6 px-4 sm:px-6">
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
          {set.subtitle}
        </p>
        <h1 className="font-serif text-4xl tracking-tight text-ink">{set.title}</h1>
        <p className="text-sm leading-7 text-ink-muted">{set.intro}</p>
        <p className="flex items-center gap-1 pt-1 text-[10px] uppercase tracking-[0.18em] text-ink-soft">
          <Clock size={10} weight="bold" /> ~{set.minutes} min
        </p>
      </header>

      <div className="space-y-10">
        {set.sections.map((section, sectionIndex) => (
          <section key={sectionIndex} className="space-y-3">
            {section.heading ? (
              <h2 className="font-serif text-xl tracking-tight text-ink">
                {section.heading}
              </h2>
            ) : null}
            {section.context ? (
              <p className="text-xs leading-6 italic text-ink-soft">
                {section.context}
              </p>
            ) : null}
            <div className="space-y-3 border-l-2 border-accent/30 pl-4">
              {section.lines.map((line, lineIndex) => (
                <p
                  key={lineIndex}
                  className={cn(
                    "font-serif leading-relaxed",
                    line.kind === "say" && "text-[1.05rem] text-ink",
                    line.kind === "trisagion" && "text-[1.1rem] text-ink",
                    line.kind === "rubric" && "text-sm italic text-ink-soft",
                    line.kind === "note" && "text-sm italic text-ink-muted",
                  )}
                >
                  {line.text}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="rounded-[14px] border border-line/40 bg-surface px-5 py-4 text-center">
        <p className="text-[10px] uppercase tracking-[0.22em] text-accent">Amen.</p>
        <p className="mt-1 font-serif text-base text-ink">May God grant you a blessed day.</p>
      </div>
    </div>
  );
}
