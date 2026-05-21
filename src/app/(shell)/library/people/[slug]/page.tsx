import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Pill } from "@/components/primitives/pill";
import { Surface } from "@/components/primitives/surface";
import { getAllTopics } from "@/lib/content";
import {
  getPersonBySlugFromAll,
  getWorksForPersonFromAll,
} from "@/lib/content/commentary-loader";
import { getIconForPerson } from "@/lib/content/icon-store";

type PersonPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PersonPage({ params }: PersonPageProps) {
  const { slug } = await params;
  const person = getPersonBySlugFromAll(slug);

  if (!person) {
    notFound();
  }

  const topics = getAllTopics();
  const works = getWorksForPersonFromAll(person.id);
  const icon = getIconForPerson(person);

  return (
    <div className="space-y-8 px-4 sm:px-6">
      <PageHeader
        eyebrow={person.kind}
        title={person.honorific ? `${person.honorific} ${person.name}` : person.name}
        description={person.summary}
      />

      {icon ? (
        <div className="flex flex-col items-center gap-2">
          <Image
            src={icon.src}
            alt={icon.alt}
            width={icon.width}
            height={icon.height}
            className="h-64 w-auto rounded-[6px] border border-line shadow-sm sm:h-72"
            priority
          />
          <p className="text-[0.62rem] italic tracking-wide text-ink-soft">
            {icon.caption ? `${icon.caption} — ` : ""}
            {icon.attribution}
          </p>
        </div>
      ) : null}

      {person.extendedSummary ? (
        <Surface className="space-y-4">
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
            Life
          </p>
          <div className="space-y-3 text-base leading-8 text-ink">
            {person.extendedSummary.split("\n\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </Surface>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Surface className="space-y-4">
          <Pill variant="accent">{person.eraLabel}</Pill>
          <div className="space-y-2">
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
              Traditions
            </p>
            <div className="flex flex-wrap gap-2">
              {person.traditions.map((item) => (
                <Pill key={item} variant="subtle">
                  {item}
                </Pill>
              ))}
            </div>
          </div>
          {person.feastDayLabel ? (
            <div className="space-y-1">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                Feast day
              </p>
              <p className="text-sm leading-7 text-ink-muted">
                {person.feastDayLabel}
              </p>
            </div>
          ) : null}
          <div className="space-y-2">
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
              Topics
            </p>
            <div className="flex flex-wrap gap-2">
              {person.topicSlugs.map((slugValue) => {
                const topic = topics.find((item) => item.slug === slugValue);
                return topic ? (
                  <Pill key={topic.slug} variant="subtle">
                    {topic.label}
                  </Pill>
                ) : null;
              })}
            </div>
          </div>
        </Surface>

        <Surface className="space-y-4">
          <div className="space-y-1">
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
              Works in library
            </p>
            <h2 className="font-serif text-3xl tracking-tight text-ink">
              Readings and commentaries
            </h2>
          </div>
          <div className="grid gap-3">
            {works.map((work) => (
              <Link
                key={work.id}
                href={`/library/works/${work.slug}`}
                className="rounded-[12px] border border-line bg-background px-4 py-4 transition-colors duration-200 hover:bg-surface"
              >
                <div className="flex items-center justify-between gap-3">
                  <Pill>{work.workType}</Pill>
                  <span className="text-xs uppercase tracking-[0.18em] text-ink-soft">
                    {work.lengthLabel}
                  </span>
                </div>
                <h3 className="mt-3 font-serif text-2xl tracking-tight text-ink">
                  {work.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-ink-muted">
                  {work.summary}
                </p>
              </Link>
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}
