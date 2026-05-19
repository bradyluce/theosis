import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseAzkoul } from "./parse-azkoul";
import { parseCatenaAurea } from "./parse-catena-aurea";

// When running from a git worktree (.claude/worktrees/<name>), the main repo
// root is 3 levels up. Identify by presence of the content/raw directory,
// which is only in the main repo (gitignored in worktrees).
function findRepoRoot(): string {
  const cwd = process.cwd();
  for (const candidate of [cwd, resolve(cwd, "../../..")]) {
    if (existsSync(join(candidate, "corpus"))) return candidate;
  }
  return cwd;
}

const REPO_ROOT = findRepoRoot();
const OUTPUT_DIRECTORY = join(REPO_ROOT, "content/generated/commentary");
const RAW_DIRECTORY = join(REPO_ROOT, "content/raw/commentary");
const CORPUS_DIRECTORY = join(REPO_ROOT, "corpus");

function main() {
  mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

  // ── Azkoul ──────────────────────────────────────────────────────────────────
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

  // ── Catena Aurea on Matthew ──────────────────────────────────────────────────
  const catena = parseCatenaAurea({
    corpusDir: join(CORPUS_DIRECTORY, "catena_aurea_matthew/raw"),
    verseTranslationPrefix: "kjva",
  });

  if (catena.entries.length === 0) {
    throw new Error("[catena] No commentary entries parsed.");
  }

  writeFileSync(
    join(OUTPUT_DIRECTORY, "catena-aurea-matthew.json"),
    `${JSON.stringify(catena, null, 2)}\n`,
    "utf8",
  );

  const fatherCount = catena.people.length - 1; // subtract Aquinas
  console.log(
    `[catena] ${catena.entries.length} commentary entries across Matthew from ${fatherCount} Fathers.`,
  );
}

main();
