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
  "Abercius": { personId: "abercius-of-hierapolis", canonicalName: "Abercius of Hierapolis" },
  "Alcuin of York": { personId: "alcuin", canonicalName: "Alcuin of York" },
  "Alexander of Alexandria": { personId: "alexander-of-alexandria", canonicalName: "Alexander of Alexandria" },
  "Ambrose of Milan": { personId: "ambrose-of-milan", canonicalName: "Ambrose of Milan" },
  "Amphilochius of Iconium": { personId: "amphilochius-of-iconium", canonicalName: "Amphilochius of Iconium" },
  "Andrew of Crete": { personId: "andrew-of-crete", canonicalName: "Andrew of Crete" },
  "Anselm of Canterbury": { personId: "anselm-canterbury", canonicalName: "Anselm of Canterbury" },
  "Anthony the Great": { personId: "anthony-the-great", canonicalName: "Anthony the Great" },
  "Aphrahat the Persian Sage": { personId: "aphrahat", canonicalName: "Aphrahat" },
  "Arnobius of Sicca": { personId: "arnobius-of-sicca", canonicalName: "Arnobius of Sicca" },
  "Aristides of Athens": { personId: "aristides-of-athens", canonicalName: "Aristides of Athens" },
  "Athanasius of Alexandria": { personId: "athanasius-the-great", canonicalName: "Athanasius the Great" },
  "Athenagoras of Athens": { personId: "athenagoras-of-athens", canonicalName: "Athenagoras of Athens" },
  "Augustine of Hippo": { personId: "augustine", canonicalName: "Augustine of Hippo" },
  // Both HCF dirs collapse to one Person — Prudentius is usually cited
  // without the full Roman name. No existing Theosis seed Person, so
  // pick a canonical slug here and unify under it.
  "Aurelius Prudentius Clemens": { personId: "prudentius", canonicalName: "Prudentius" },
  "Basil of Caesarea": { personId: "basil-the-great", canonicalName: "Basil the Great" },
  "Bede": { personId: "bede", canonicalName: "Venerable Bede" },
  "Benedict of Nursia": { personId: "benedict-of-nursia", canonicalName: "Benedict of Nursia" },
  "Clement of Alexandria": { personId: "clement-of-alexandria", canonicalName: "Clement of Alexandria" },
  "Clement of Rome": { personId: "clement-of-rome", canonicalName: "Clement of Rome" },
  "Cyprian": { personId: "cyprian-of-carthage", canonicalName: "Cyprian of Carthage" },
  "Cyril of Alexandria": { personId: "cyril-of-alexandria", canonicalName: "Cyril of Alexandria" },
  "Cyril of Jerusalem": { personId: "cyril-of-jerusalem", canonicalName: "Cyril of Jerusalem" },
  "Diadochos of Photiki": { personId: "diadochos-of-photiki", canonicalName: "Diadochos of Photiki" },
  "Didymus the Blind": { personId: "didymus-blind", canonicalName: "Didymus the Blind" },
  "Dionysius of Alexandria": { personId: "dionysius-alexandria", canonicalName: "Dionysius of Alexandria" },
  "Ephrem the Syrian": { personId: "ephraim-the-syrian", canonicalName: "Ephraim the Syrian" },
  "Epiphanius of Salamis": { personId: "epiphanius-salamis", canonicalName: "Epiphanius of Salamis" },
  "Eusebius of Caesarea": { personId: "eusebius-caesarea", canonicalName: "Eusebius of Caesarea" },
  "Glossa Ordinaria": { personId: "gloss-ordinaria", canonicalName: "Glossa Ordinaria" },
  "Gregory of Nazianzus": { personId: "gregory-of-nazianzus", canonicalName: "Gregory the Theologian" },
  "Gregory of Nyssa": { personId: "gregory-of-nyssa", canonicalName: "Gregory of Nyssa" },
  "Gregory of Neocaesarea": { personId: "gregory-thaumaturgus", canonicalName: "Gregory the Wonderworker" },
  "Gregory Palamas": { personId: "gregory-palamas", canonicalName: "Gregory Palamas" },
  "Gregory the Dialogist": { personId: "gregory-the-great", canonicalName: "Gregory the Great" },
  "Hilary of Poitiers": { personId: "hilary-poitiers", canonicalName: "Hilary of Poitiers" },
  "Hippolytus of Rome": { personId: "hippolytus-of-rome", canonicalName: "Hippolytus of Rome" },
  "Ignatius of Antioch": { personId: "ignatius-of-antioch", canonicalName: "Ignatius of Antioch" },
  "Irenaeus": { personId: "irenaeus-of-lyons", canonicalName: "Irenaeus of Lyons" },
  "Isidore of Pelusium": { personId: "isidore-of-pelusium", canonicalName: "Isidore of Pelusium" },
  "Isidore of Seville": { personId: "isidore-seville", canonicalName: "Isidore of Seville" },
  "Jerome": { personId: "jerome", canonicalName: "Jerome" },
  "John Cassian": { personId: "john-cassian", canonicalName: "John Cassian" },
  "John Chrysostom": { personId: "john-chrysostom", canonicalName: "John Chrysostom" },
  "John Damascene": { personId: "john-of-damascus", canonicalName: "John of Damascus" },
  "John of Karpathos": { personId: "john-of-karpathos", canonicalName: "John of Karpathos" },
  "Julius Africanus": { personId: "julius-africanus", canonicalName: "Julius Africanus" },
  "Justin Martyr": { personId: "justin-martyr", canonicalName: "Justin Martyr" },
  "Lucius Caecilius Firmianus Lactantius": { personId: "lactantius", canonicalName: "Lactantius" },
  "Leo the Great": { personId: "leo-the-great", canonicalName: "Leo the Great" },
  "Macarius of Egypt": { personId: "macarius-the-egyptian", canonicalName: "Macarius the Egyptian" },
  "Macrina the Younger": { personId: "macrina-the-younger", canonicalName: "Macrina the Younger" },
  "Malchion": { personId: "malchion", canonicalName: "Malchion" },
  "Marcus Minucius Felix": { personId: "minucius-felix", canonicalName: "Minucius Felix" },
  "Mathetes": { personId: "mathetes", canonicalName: "Mathetes" },
  "Maximus the Confessor": { personId: "maximus-the-confessor", canonicalName: "Maximus the Confessor" },
  "Methodius of Olympus": { personId: "methodius-of-olympus", canonicalName: "Methodius of Olympus" },
  "Novatian": { personId: "novatian", canonicalName: "Novatian" },
  "Origen of Alexandria": { personId: "origen", canonicalName: "Origen" },
  "Pachomius the Great": { personId: "pachomius-the-great", canonicalName: "Pachomius the Great" },
  "Pamphilus of Caesarea": { personId: "pamphilus-of-caesarea", canonicalName: "Pamphilus of Caesarea" },
  "Papias of Hierapolis": { personId: "papias-of-hierapolis", canonicalName: "Papias of Hierapolis" },
  "Peter Chrysologus": { personId: "peter-chrysologus", canonicalName: "Peter Chrysologus" },
  "Peter of Alexandria": { personId: "peter-of-alexandria", canonicalName: "Peter of Alexandria" },
  // HCF's "Photios I of Constantinople" is the same Patriarch as the
  // seed's `photios-the-great` (the title by which he's commemorated
  // in the Orthodox tradition). Map to the existing seed Person.
  "Photios I of Constantinople": { personId: "photios-the-great", canonicalName: "Photios the Great" },
  "Polycarp of Smyrna": { personId: "polycarp-of-smyrna", canonicalName: "Polycarp of Smyrna" },
  "Prudentius": { personId: "prudentius", canonicalName: "Prudentius" },
  "Pseudo-Athanasius": { personId: "pseudo-athanasius", canonicalName: "Pseudo-Athanasius" },
  "Pseudo-Augustine": { personId: "pseudo-augustine", canonicalName: "Pseudo-Augustine" },
  "Pseudo-Barnabas": { personId: "pseudo-barnabas", canonicalName: "Pseudo-Barnabas" },
  "Pseudo-Chrysostom": { personId: "pseudo-chrysostom", canonicalName: "Pseudo-Chrysostom" },
  "Pseudo-Dionysius the Areopagite": { personId: "pseudo-dionysius", canonicalName: "Pseudo-Dionysius the Areopagite" },
  "Pseudo-Jerome": { personId: "pseudo-jerome", canonicalName: "Pseudo-Jerome" },
  "Rabanus Maurus": { personId: "rabanus-maurus", canonicalName: "Rabanus Maurus" },
  // HCF's "Remigius of Rheims" content in the Catena tradition is
  // overwhelmingly Remigius of Auxerre (9th c.) — the Catena's standard
  // "Remig." attribution. The 5th-c. Apostle of the Franks isn't a
  // commentator. Map to the existing Theosis ID.
  "Remigius of Rheims": { personId: "remigius-auxerre", canonicalName: "Remigius of Auxerre" },
  "Romanos the Melodist": { personId: "romanos-the-melodist", canonicalName: "Romanos the Melodist" },
  "Socrates Scholasticus": { personId: "socrates-scholasticus", canonicalName: "Socrates Scholasticus" },
  "Symeon the New Theologian": { personId: "symeon-the-new-theologian", canonicalName: "Symeon the New Theologian" },
  "Tatian the Assyrian": { personId: "tatian-the-syrian", canonicalName: "Tatian the Syrian" },
  "Tertullian": { personId: "tertullian", canonicalName: "Tertullian" },
  "Theodoret of Cyrus": { personId: "theodoret-of-cyrrhus", canonicalName: "Theodoret of Cyrus" },
  "Theodore Stratelates": { personId: "theodore-the-general", canonicalName: "Theodore the General (Stratelates)" },
  "Theodotus of Ancyra": { personId: "theodotus-of-ancyra", canonicalName: "Theodotus of Ancyra" },
  "Theophilus of Antioch": { personId: "theophilus-of-antioch", canonicalName: "Theophilus of Antioch" },
  "Theophylact of Ohrid": { personId: "theophylact-of-ohrid", canonicalName: "Theophylact of Ohrid" },
  "Thomas Aquinas": { personId: "thomas-aquinas", canonicalName: "Thomas Aquinas" },
  "Titus of Bostra": { personId: "titus-bostra", canonicalName: "Titus of Bostra" },
  "Victorinus of Pettau": { personId: "victorinus-pettau", canonicalName: "Victorinus of Pettau" },
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

// HCF dirs that are liturgical texts or anonymous apocryphal acts
// rather than Persons. They surface as commentary blocks under a
// "Liturgy of ..." / "Acts of ..." attribution; treating each as a
// Person creates spurious Library entries with no author behind them.
// The curated `early-liturgies` and `apocryphal-writings` Persons
// already cover this material on the seed side.
const NON_PERSON_DIRS = new Set([
  "Liturgy of Addai and Mari",
  "Liturgy of Saint James",
  "Liturgy of Saint Mark",
  "The Liturgy Of The Blessed Apostles",
  "Ambrosian Hymn Writer",
  "Acts of Peter",
  "Acts of Peter and Paul",
]);

export function shouldSkipAuthorDir(dirName: string): boolean {
  return (
    BIBLE_BOOK_DIRS.has(dirName) ||
    MODERN_NON_PD_DIRS.has(dirName) ||
    NON_PERSON_DIRS.has(dirName)
  );
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
