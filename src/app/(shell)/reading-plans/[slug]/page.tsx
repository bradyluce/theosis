import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { PlanDetail } from "@/features/reading-plans/plan-detail";
import { getPrimaryTranslation } from "@/lib/bible/server-store";
import { getReadingPlanBySlug } from "@/lib/content/seed/reading-plans";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const plan = getReadingPlanBySlug(slug);
  return { title: plan?.title ?? "Reading plan" };
}

export default async function ReadingPlanPage({ params }: Props) {
  const { slug } = await params;
  const plan = getReadingPlanBySlug(slug);
  if (!plan) notFound();

  const translation = getPrimaryTranslation();
  // Default to "kjva" if no primary translation is bundled — keeps the
  // reader links from rendering "/bible/undefined/...".
  const translationSlug = translation?.slug ?? "kjva";

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <div className="pt-2">
        <Link
          href="/reading-plans"
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:text-ink"
        >
          <CaretLeft size={14} weight="bold" /> Plans
        </Link>
      </div>
      <PlanDetail plan={plan} translationSlug={translationSlug} />
    </div>
  );
}
