import { PageHeader } from "@/components/layout/page-header";
import { getAllSaints } from "@/lib/content";
import { SaintsBrowser } from "@/features/library/saints-browser";

export default function SaintsPage() {
  const saints = getAllSaints();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Library"
        title="Saints"
        description="Browse the saints of the Orthodox Church — apostles and martyrs, hierarchs and monastics, equal-to-the-apostles, prophets, and modern wonderworkers."
      />
      <SaintsBrowser saints={saints} />
    </div>
  );
}
