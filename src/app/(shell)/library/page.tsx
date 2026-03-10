import { PageHeader } from "@/components/layout/page-header";
import { LibraryExplorer } from "@/features/library/library-explorer";

export default function LibraryPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Corpus"
        title="Library"
        description="One reading library for Fathers, saints, theologians, and works, with enough structure to grow into a serious Orthodox research surface."
      />
      <LibraryExplorer />
    </div>
  );
}
