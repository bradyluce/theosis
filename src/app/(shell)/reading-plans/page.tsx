import { PlansExplorer } from "@/features/reading-plans/plans-explorer";
import { readingPlans } from "@/lib/content/seed/reading-plans";

export const metadata = {
  title: "Reading plans",
};

export default function ReadingPlansPage() {
  return (
    <div className="space-y-6 px-4 sm:px-6">
      <header className="space-y-2 pt-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
          Read with the Church
        </p>
        <h1 className="font-serif text-4xl tracking-tight text-ink">
          Reading plans
        </h1>
        <p className="text-sm leading-7 text-ink-muted">
          Short, structured paths through the Scriptures. Start one and the
          home screen will surface today&rsquo;s reading.
        </p>
      </header>

      <PlansExplorer plans={readingPlans} />
    </div>
  );
}
