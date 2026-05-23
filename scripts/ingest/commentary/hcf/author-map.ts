// Maps HCF directory names to Theosis person IDs. Two purposes:
//
// 1. Reconcile Theosis IDs with HCF's "long form" names so HCF entries
//    surface on the existing author's library card (no duplicate Person
//    record for "Augustine of Hippo" alongside Theosis's "augustine").
// 2. Drop dirs we don't want as Persons: Bible book names (scripture
//    cross-references — different content type) and modern non-PD authors.
//
// Top HCF dirs by file count (covers the bulk of meaningful content):
//   7287 Thomas Aquinas      5834 Theophylact of Ohrid
//   5811 John Chrysostom     5505 Augustine of Hippo
//   4907 Bede                4868 Jerome
//   2577 Gregory the Dialogist  2211 Origen of Alexandria
//   2097 Tertullian          1740 Cyril of Alexandria
//
// HCF dirs not mapped explicitly fall through to slugified "hcf-<name>"
// IDs (see toPersonId below) — picks up the long tail without manual review.

export type HcfAuthorMapping = {
  personId: string;
  // Human-facing canonical name for the Person record we create / merge into.
  canonicalName: string;
};

// Explicit reconciliation: HCF dir -> existing Theosis person ID. When the
// HCF dir name matches our preferred long form already (e.g. "Theophylact
// of Ohrid" -> "theophylact-of-ohrid"), we still map it explicitly so the
// person record uses the slug rather than the auto-prefixed hcf-* form.
//
// Existing-Theosis IDs were harvested from PERSON_ID constants and
// personId literals across scripts/ingest/commentary/parse-*.ts. The goal
// is "if it already has a canonical Theosis ID, surface HCF entries under
// that same ID so the library Person card aggregates everything."
export const EXPLICIT_AUTHOR_MAP: Record<string, HcfAuthorMapping> = {
  "Ambrose of Milan": { personId: "ambrose-of-milan", canonicalName: "Ambrose of Milan" },
  "Anselm of Canterbury": { personId: "anselm-canterbury", canonicalName: "Anselm of Canterbury" },
  "Aphrahat the Persian Sage": { personId: "aphrahat", canonicalName: "Aphrahat" },
  "Aristides of Athens": { personId: "aristides-of-athens", canonicalName: "Aristides of Athens" },
  "Athanasius of Alexandria": { personId: "athanasius-the-great", canonicalName: "Athanasius the Great" },
  "Athenagoras of Athens": { personId: "athenagoras-of-athens", canonicalName: "Athenagoras of Athens" },
  "Augustine of Hippo": { personId: "augustine", canonicalName: "Augustine of Hippo" },
  "Basil of Caesarea": { personId: "basil-the-great", canonicalName: "Basil the Great" },
  "Bede": { personId: "bede", canonicalName: "Venerable Bede" },
  "Clement of Alexandria": { personId: "clement-of-alexandria", canonicalName: "Clement of Alexandria" },
  "Clement of Rome": { personId: "clement-of-rome", canonicalName: "Clement of Rome" },
  "Cyprian": { personId: "cyprian-of-carthage", canonicalName: "Cyprian of Carthage" },
  "Cyril of Alexandria": { personId: "cyril-of-alexandria", canonicalName: "Cyril of Alexandria" },
  "Cyril of Jerusalem": { personId: "cyril-of-jerusalem", canonicalName: "Cyril of Jerusalem" },
  "Ephrem the Syrian": { personId: "ephraim-the-syrian", canonicalName: "Ephraim the Syrian" },
  "Eusebius of Caesarea": { personId: "eusebius-caesarea", canonicalName: "Eusebius of Caesarea" },
  "Glossa Ordinaria": { personId: "gloss-ordinaria", canonicalName: "Glossa Ordinaria" },
  "Gregory of Nazianzus": { personId: "gregory-of-nazianzus", canonicalName: "Gregory the Theologian" },
  "Gregory of Nyssa": { personId: "gregory-of-nyssa", canonicalName: "Gregory of Nyssa" },
  "Gregory of Neocaesarea": { personId: "gregory-thaumaturgus", canonicalName: "Gregory the Wonderworker" },
  "Gregory the Dialogist": { personId: "gregory-the-great", canonicalName: "Gregory the Great" },
  "Hilary of Poitiers": { personId: "hilary-poitiers", canonicalName: "Hilary of Poitiers" },
  "Hippolytus of Rome": { personId: "hippolytus-of-rome", canonicalName: "Hippolytus of Rome" },
  "Ignatius of Antioch": { personId: "ignatius-of-antioch", canonicalName: "Ignatius of Antioch" },
  "Irenaeus": { personId: "irenaeus-of-lyons", canonicalName: "Irenaeus of Lyons" },
  "Isidore of Seville": { personId: "isidore-seville", canonicalName: "Isidore of Seville" },
  "Jerome": { personId: "jerome", canonicalName: "Jerome" },
  "John Chrysostom": { personId: "john-chrysostom", canonicalName: "John Chrysostom" },
  "John Damascene": { personId: "john-of-damascus", canonicalName: "John of Damascus" },
  "Justin Martyr": { personId: "justin-martyr", canonicalName: "Justin Martyr" },
  "Lucius Caecilius Firmianus Lactantius": { personId: "lactantius", canonicalName: "Lactantius" },
  "Leo the Great": { personId: "leo-the-great", canonicalName: "Leo the Great" },
  "Macarius of Egypt": { personId: "macarius-the-egyptian", canonicalName: "Macarius the Egyptian" },
  "Marcus Minucius Felix": { personId: "minucius-felix", canonicalName: "Minucius Felix" },
  "Mathetes": { personId: "mathetes", canonicalName: "Mathetes" },
  "Maximus the Confessor": { personId: "maximus-the-confessor", canonicalName: "Maximus the Confessor" },
  "Methodius of Olympus": { personId: "methodius-of-olympus", canonicalName: "Methodius of Olympus" },
  "Origen of Alexandria": { personId: "origen", canonicalName: "Origen" },
  "Papias of Hierapolis": { personId: "papias-of-hierapolis", canonicalName: "Papias of Hierapolis" },
  "Peter Chrysologus": { personId: "peter-chrysologus", canonicalName: "Peter Chrysologus" },
  "Polycarp of Smyrna": { personId: "polycarp-of-smyrna", canonicalName: "Polycarp of Smyrna" },
  "Pseudo-Athanasius": { personId: "pseudo-athanasius", canonicalName: "Pseudo-Athanasius" },
  "Pseudo-Chrysostom": { personId: "pseudo-chrysostom", canonicalName: "Pseudo-Chrysostom" },
  "Pseudo-Dionysius the Areopagite": { personId: "pseudo-dionysius", canonicalName: "Pseudo-Dionysius the Areopagite" },
  "Pseudo-Jerome": { personId: "pseudo-jerome", canonicalName: "Pseudo-Jerome" },
  "Rabanus Maurus": { personId: "rabanus-maurus", canonicalName: "Rabanus Maurus" },
  "Tatian the Assyrian": { personId: "tatian-the-syrian", canonicalName: "Tatian the Syrian" },
  "Tertullian": { personId: "tertullian", canonicalName: "Tertullian" },
  "Theodoret of Cyrus": { personId: "theodoret-of-cyrrhus", canonicalName: "Theodoret of Cyrus" },
  "Theodotus of Ancyra": { personId: "theodotus-ancyra", canonicalName: "Theodotus of Ancyra" },
  "Theophilus of Antioch": { personId: "theophilus-of-antioch", canonicalName: "Theophilus of Antioch" },
  "Theophylact of Ohrid": { personId: "theophylact-of-ohrid", canonicalName: "Theophylact of Ohrid" },
  "Thomas Aquinas": { personId: "thomas-aquinas", canonicalName: "Thomas Aquinas" },
};

// Top-level HCF dirs that are Bible-book cross-references rather than
// authors. Their files key OT/NT passages against verses from OTHER books
// (e.g. 1 Corinthians/Deuteronomy 10_14.toml = a 1 Cor passage as
// commentary on Deut 10:14). Distinct content type — skip for now.
const BIBLE_BOOK_DIRS = new Set([
  "1 Corinthians", "1 Peter", "1 Timothy", "2 Corinthians", "2 Peter",
  "Acts", "Ephesians", "Galatians", "Hebrews", "James", "John", "Jude",
  "Luke", "Mark", "Matthew", "Philippians", "Revelation", "Romans",
]);

// Modern authors whose works are still under copyright. Per the user's
// "drop fair-use" license posture, we skip these wholesale at the dir
// level. (Adding more here is cheaper than per-entry source filtering.)
const MODERN_NON_PD_DIRS = new Set([
  "CS Lewis", "GK Chesterton", "JRR Tolkien", "JB Lightfoot",
  "Douglas Wilson", "John Calvin", "John Wesley", "Martin Luther",
  "Erasmus of Rotterdam", "Ulrich Zwingli", "Cornelius a Lapide",
]);

export function shouldSkipAuthorDir(dirName: string): boolean {
  return BIBLE_BOOK_DIRS.has(dirName) || MODERN_NON_PD_DIRS.has(dirName);
}

// Convert an HCF dir name to a Theosis personId. Mapped names use the
// canonical Theosis ID; unmapped names get an "hcf-" prefix so they
// don't accidentally collide with the existing ID namespace.
export function toPersonId(hcfDirName: string): string {
  const explicit = EXPLICIT_AUTHOR_MAP[hcfDirName];
  if (explicit) return explicit.personId;
  return `hcf-${slugifyName(hcfDirName)}`;
}

export function toCanonicalName(hcfDirName: string): string {
  return EXPLICIT_AUTHOR_MAP[hcfDirName]?.canonicalName ?? hcfDirName;
}

// Same normalization used elsewhere for IDs: NFKD, strip diacritics,
// hyphenate non-alphanumerics. Idempotent.
export function slugifyName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
