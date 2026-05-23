// Clone or refresh the HistoricalChristianFaith/Commentaries-Database corpus
// into corpus/hcf-commentaries/. The directory is gitignored — this is an
// external corpus mirrored on demand, mirroring the pattern used by other
// external sources under corpus/ (e.g. catena_aurea_matthew/).
//
// Pin a commit SHA in hcf-version.json for reproducibility; this script
// checks out that SHA after clone/fetch so a re-run produces the same data.

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SCRIPT_DIR = new URL(".", import.meta.url).pathname;
const REPO_ROOT = resolve(SCRIPT_DIR, "../../../..");
const CORPUS_DIR = join(REPO_ROOT, "corpus", "hcf-commentaries");

type HcfVersion = {
  repo: string;
  pinnedCommit: string;
  pinnedBranch: string;
};

function readVersion(): HcfVersion {
  const path = join(SCRIPT_DIR, "hcf-version.json");
  return JSON.parse(readFileSync(path, "utf8")) as HcfVersion;
}

function run(cmd: string, cwd?: string) {
  execSync(cmd, { cwd, stdio: "inherit" });
}

function main() {
  const version = readVersion();

  if (!existsSync(CORPUS_DIR)) {
    console.log(`[hcf-clone] cloning ${version.repo} -> ${CORPUS_DIR}`);
    run(`git clone --filter=blob:none ${version.repo} ${CORPUS_DIR}`);
  } else {
    console.log(`[hcf-clone] fetching latest into existing ${CORPUS_DIR}`);
    run(`git fetch --all --tags`, CORPUS_DIR);
  }

  console.log(`[hcf-clone] checking out pinned commit ${version.pinnedCommit}`);
  run(`git checkout ${version.pinnedCommit}`, CORPUS_DIR);

  const headRef = execSync(`git rev-parse HEAD`, { cwd: CORPUS_DIR })
    .toString()
    .trim();
  if (headRef !== version.pinnedCommit) {
    throw new Error(
      `[hcf-clone] HEAD ${headRef} != pinned ${version.pinnedCommit}`,
    );
  }
  console.log(`[hcf-clone] HEAD pinned to ${headRef}`);
}

main();
