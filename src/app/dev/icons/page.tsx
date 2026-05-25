import { promises as fs } from "node:fs";
import path from "node:path";
import { getAllIcons } from "@/lib/content/icon-store";
import IconsGrid, { type IconEntry } from "./icons-grid";

export const dynamic = "force-dynamic";

export default async function DevIconsPage() {
  const icons = getAllIcons();
  const entries: IconEntry[] = await Promise.all(
    icons.map(async (icon) => {
      let fileSize = 0;
      try {
        const filePath = path.join(process.cwd(), "public", icon.src);
        const stat = await fs.stat(filePath);
        fileSize = stat.size;
      } catch {
        // Missing file — leave size at 0 so it sorts to the top.
      }
      const kind: IconEntry["kind"] = icon.id.startsWith("icon-feast-")
        ? "feast"
        : icon.id.startsWith("icon-st-")
          ? "saint-manual"
          : "saint";
      return {
        id: icon.id,
        src: icon.src,
        alt: icon.alt,
        width: icon.width,
        height: icon.height,
        license: icon.license,
        attribution: icon.attribution,
        sourceUrl: icon.sourceUrl,
        caption: icon.caption,
        fileSize,
        minDim: Math.min(icon.width || 0, icon.height || 0),
        aspect: icon.width && icon.height ? icon.width / icon.height : 1,
        kind,
      };
    }),
  );
  return <IconsGrid entries={entries} />;
}
