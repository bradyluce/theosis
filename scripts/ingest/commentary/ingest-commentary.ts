import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseAzkoul } from "./parse-azkoul";

const OUTPUT_DIRECTORY = join(process.cwd(), "content/generated/commentary");
const RAW_DIRECTORY = join(process.cwd(), "content/raw/commentary");

function main() {
  mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

  const azkoul = parseAzkoul({
    filePath: join(
      RAW_DIRECTORY,
      "257499874-Holy-Orthodox-Church-Org-Father-m-Azkoul.txt",
    ),
    verseTranslationPrefix: "kjva",
  });

  if (azkoul.entries.length === 0) {
    throw new Error("[azkoul] No commentary entries parsed.");
  }

  writeFileSync(
    join(OUTPUT_DIRECTORY, "azkoul.json"),
    `${JSON.stringify(azkoul, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `[azkoul] ${azkoul.entries.length} commentary entries linked to verses.`,
  );
}

main();
