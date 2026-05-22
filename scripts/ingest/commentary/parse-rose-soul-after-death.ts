import type { Person, SourceRecord, Work } from "@theosis/core";
import { parseSingleBook, type CommentaryBundleV2 } from "../library/shared";

const PERSON_ID = "seraphim-rose";
const WORK_ID = "rose-soul-after-death";
const SOURCE_ID = "rose-soul-after-death-source";

const person: Person = {
  id: PERSON_ID,
  slug: "seraphim-rose",
  name: "Hieromonk Seraphim (Rose)",
  honorific: "Hieromonk",
  kind: "theologian",
  eraLabel: "20th century (1934–1982)",
  summary:
    "American-born convert from Berkeley intellectual life to Orthodoxy under St. John Maximovitch. Co-founder with Fr. Herman (Podmoshensky) of the St. Herman of Alaska Brotherhood, the Platina (California) skete, and the journal The Orthodox Word. His writings — drawing heavily on the Fathers, especially the ascetic tradition — defined the patristic-revival voice of 20th-century English-language American Orthodoxy.",
  traditions: ["Eastern Orthodox", "Russian Orthodox Outside Russia"],
  topicSlugs: ["modern-spirituality", "patristic-revival", "russian-orthodox-tradition", "eschatology"],
  featuredWorkIds: [WORK_ID],
  iconId: "icon-seraphim-rose",
};

const work: Work = {
  id: WORK_ID,
  slug: WORK_ID,
  personId: PERSON_ID,
  title: "The Soul After Death",
  shortTitle: "Soul After Death",
  workType: "treatise",
  lengthLabel: "long",
  eraLabel: "1980 (rev. 2009)",
  summary:
    "A patristic survey of what the Fathers and the experience of the Church teach about what the soul encounters in the moments and days after bodily death — the toll-houses, the aerial spirits, the role of guardian angels, and the particular judgment. Written explicitly as a corrective to popular post-NDE 'after-life' literature.",
  topicSlugs: ["eschatology", "afterlife", "patristic-theology", "toll-houses"],
  sourceId: SOURCE_ID,
  verseRefs: [],
};

const source: SourceRecord = {
  id: SOURCE_ID,
  label: "The Soul After Death — Fr. Seraphim Rose (Theosis library acquisition)",
  collection: "Theosis library acquisitions",
  sourceType: "pdf",
  url: "",
  note:
    "Edition transcribed from a PDF in the Theosis acquisitions corpus; see content/raw/library/rose-soul-after-death/PROVENANCE.json for the editorial provenance record.",
  isSeeded: false,
};

const ORDINALS = ["One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten"];

export type ParseRoseSoulConfig = { rawDir: string };

export function parseRoseSoulAfterDeath(config: ParseRoseSoulConfig): CommentaryBundleV2 {
  return parseSingleBook({
    slug: WORK_ID,
    rawDir: config.rawDir,
    person,
    work,
    source,
    chapterHeading: /^CHAPTER\s+(ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN)\s*$/gm,
    buildLabels: (capture, idx) => ({
      label: `Chapter ${idx + 1}`,
      title: `Chapter ${capture.charAt(0)}${capture.slice(1).toLowerCase()}`,
    }),
  });
}
