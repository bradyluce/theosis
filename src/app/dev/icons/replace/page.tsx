import { promises as fs } from "node:fs";
import path from "node:path";
import { getAllIcons } from "@/lib/content/icon-store";
import ReplacementPicker, {
  type CandidateView,
  type FlaggedRow,
} from "./replacement-picker";

export const dynamic = "force-dynamic";

type CandidatesFile = {
  fetchedAt: string;
  entries: Record<
    string,
    {
      name: string;
      queries: string[];
      candidates: Array<{
        wikimediaTitle: string;
        thumbUrl: string;
        fullUrl: string;
        width: number;
        height: number;
        license: string;
        artist: string;
      }>;
    }
  >;
};

export default async function ReplaceIconsPage() {
  const candidatesPath = path.join(process.cwd(), ".flagged-icons-candidates.json");
  const flaggedPath = path.join(process.cwd(), ".flagged-icons.json");

  let candidates: CandidatesFile = { fetchedAt: "", entries: {} };
  try {
    const raw = await fs.readFile(candidatesPath, "utf8");
    candidates = JSON.parse(raw) as CandidatesFile;
  } catch {
    // Empty candidates file — page renders an instructions panel.
  }

  let flagged: string[] = [];
  try {
    const raw = await fs.readFile(flaggedPath, "utf8");
    flagged = JSON.parse(raw) as string[];
  } catch {
    // No flagged file yet.
  }

  const iconsById = new Map(getAllIcons().map((i) => [i.id, i]));

  const rows: FlaggedRow[] = flagged.map((id) => {
    const current = iconsById.get(id);
    const entry = candidates.entries[id];
    const candList: CandidateView[] = (entry?.candidates ?? []).map((c) => ({
      wikimediaTitle: c.wikimediaTitle,
      thumbUrl: c.thumbUrl,
      fullUrl: c.fullUrl,
      width: c.width,
      height: c.height,
      license: c.license,
      artist: c.artist,
    }));
    return {
      id,
      currentSrc: current?.src ?? "",
      currentAlt: current?.alt ?? "",
      currentCaption: current?.caption ?? "",
      currentWidth: current?.width ?? 0,
      currentHeight: current?.height ?? 0,
      currentSourceUrl: current?.sourceUrl ?? "",
      seedName: entry?.name ?? current?.caption ?? id,
      queries: entry?.queries ?? [],
      candidates: candList,
    };
  });

  return <ReplacementPicker rows={rows} fetchedAt={candidates.fetchedAt} />;
}
