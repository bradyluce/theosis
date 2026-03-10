import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Pill } from "@/components/primitives/pill";
import { Surface } from "@/components/primitives/surface";
import {
  getPersonById,
  getSourceById,
  getWorkBySlug,
  getWorkSections,
} from "@/lib/content";

type WorkPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function WorkPage({ params }: WorkPageProps) {
  const { slug } = await params;
  const work = getWorkBySlug(slug);

  if (!work) {
    notFound();
  }

  const person = getPersonById(work.personId);
  const source = getSourceById(work.sourceId);
  const sections = getWorkSections(work.id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={work.workType}
        title={work.title}
        description={work.summary}
      />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Surface className="space-y-4">
          <Pill variant="accent">{work.eraLabel}</Pill>
          {person ? (
            <div className="space-y-1">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                Attributed to
              </p>
              <Link
                href={`/library/people/${person.slug}`}
                className="text-sm font-medium text-accent transition-colors duration-200 hover:text-ink"
              >
                {person.honorific ? `${person.honorific} ${person.name}` : person.name}
              </Link>
            </div>
          ) : null}
          <div className="space-y-1">
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
              Source collection
            </p>
            <p className="text-sm leading-7 text-ink-muted">
              {source?.collection ?? "Seeded source"}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
              Linked passages
            </p>
            <div className="flex flex-wrap gap-2">
              {work.verseRefs.map((reference) => (
                <Pill key={reference.label} variant="subtle">
                  {reference.label}
                </Pill>
              ))}
            </div>
          </div>
        </Surface>

        <div className="space-y-4">
          {sections.map((section) => (
            <Surface key={section.id} className="space-y-3">
              <Pill>{section.label}</Pill>
              <p className="font-serif text-2xl leading-9 tracking-tight text-ink">
                {section.excerpt}
              </p>
              {section.verseRef ? (
                <p className="text-sm text-ink-soft">
                  Related passage: {section.verseRef.label}
                </p>
              ) : null}
            </Surface>
          ))}
        </div>
      </div>
    </div>
  );
}
