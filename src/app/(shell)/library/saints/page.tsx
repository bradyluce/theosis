import { PageHeader } from "@/components/layout/page-header";
import type { IconRef } from "@theosis/core";
import { getAllSaints } from "@/lib/content";
import { getIconForPerson } from "@/lib/content/icon-store";
import { SaintsBrowser } from "@/features/library/saints-browser";

export default function SaintsPage() {
  const saints = getAllSaints();
  const icons: Record<string, IconRef> = {};
  for (const saint of saints) {
    const icon = getIconForPerson(saint);
    if (icon) icons[saint.id] = icon;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Library"
        title="Saints"
        description="Browse the saints of the Orthodox Church — apostles and martyrs, hierarchs and monastics, equal-to-the-apostles, prophets, and modern wonderworkers."
      />
      <SaintsBrowser saints={saints} icons={icons} />
    </div>
  );
}
