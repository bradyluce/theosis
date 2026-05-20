// Per-day enrichment of menaion.json: assigns saintIds to the primary
// commemoration and/or extends the `also` list with co-commemorated saints.
//
// Run with: tsx scripts/ingest/enrich-menaion.ts
// Safe to re-run; ENRICHMENTS is the source of truth.

import fs from "node:fs";
import path from "node:path";

type Commemoration = { name: string; summary?: string; saintId?: string };
type MenaionEntry = {
  monthDay: string;
  title: string;
  summary: string;
  also?: Commemoration[];
  feastRank?: string;
  saintIds?: string[];
};
type MenaionFile = { _meta: unknown; entries: Record<string, MenaionEntry> };

// For each Gregorian MM-DD, optionally override `also` (replacing any
// existing list) and/or `saintIds`. Either field may be omitted to leave
// the existing value alone. The script always recomputes saintIds as the
// de-duped union of (declared saintIds) + (saintId pulled from each also).
type Enrichment = {
  saintIds?: string[];
  also?: Commemoration[];
};

const ENRICHMENTS: Record<string, Enrichment> = {
  // --- Days with named saint Person links (formerly link-saints.ts) ---
  "01-01": { saintIds: ["basil-the-great"] },
  "01-07": { saintIds: ["john-the-forerunner"] },
  "01-17": { saintIds: ["anthony-the-great"] },
  "01-18": { saintIds: ["athanasius-the-great"] },
  "01-21": { saintIds: ["maximus-the-confessor"] },
  "01-25": { saintIds: ["gregory-the-theologian"] },
  "01-28": { saintIds: ["ephraim-the-syrian"] },
  "01-29": { saintIds: ["ignatius-of-antioch"] },
  "02-14": { saintIds: ["cyril-equal-to-apostles"] },
  "02-23": { saintIds: ["polycarp-of-smyrna"] },
  "02-24": { saintIds: ["john-the-forerunner"] },
  "03-09": { saintIds: ["forty-martyrs-of-sebaste"] },
  "03-30": { saintIds: ["john-climacus"] },
  "04-01": { saintIds: ["mary-of-egypt"] },
  "04-23": { saintIds: ["george-the-trophy-bearer"] },
  "04-25": { saintIds: ["apostle-mark"] },
  "05-02": { saintIds: ["athanasius-the-great"] },
  "05-08": { saintIds: ["apostle-john-the-theologian"] },
  "05-09": { saintIds: ["nicholas-of-myra"] },
  "05-15": { saintIds: ["pachomius-the-great"] },
  "05-25": { saintIds: ["john-the-forerunner"] },
  "06-09": { saintIds: ["cyril-of-alexandria"] },
  "06-24": { saintIds: ["john-the-forerunner"] },
  "07-22": { saintIds: ["mary-magdalene"] },
  "07-25": { saintIds: ["joachim-and-anna"] },
  "08-29": { saintIds: ["john-the-forerunner"] },
  "09-23": { saintIds: ["john-the-forerunner"] },
  "09-26": { saintIds: ["apostle-john-the-theologian"] },
  "10-06": { saintIds: ["apostle-thomas"] },
  "10-18": { saintIds: ["apostle-luke"] },
  "10-26": { saintIds: ["demetrius-of-thessalonica"] },
  "11-13": { saintIds: ["john-chrysostom"] },
  "11-16": { saintIds: ["apostle-matthew"] },
  "11-30": { saintIds: ["apostle-andrew"] },
  "12-05": { saintIds: ["sabbas-the-sanctified"] },
  "12-06": { saintIds: ["nicholas-of-myra"] },
  "12-12": { saintIds: ["spyridon-of-trimythous"] },
  "12-20": { saintIds: ["ignatius-of-antioch"] },

  // --- Multi-saint days. The `also` list is reserved for saints not already
  //     present in the entry's `title`. Joint feasts ("Peter and Paul",
  //     "Three Hierarchs") rely on the title naming the principals and on
  //     `saintIds` linking them to library Person records — the saint-card
  //     panel handles the per-saint clickable surface in that case. ---
  "05-03": {
    also: [
      { name: "St. Theodosius of the Kiev Caves", summary: "Eleventh-century abbot of the Kiev Caves Lavra and father of Russian cenobitic monasticism." },
      { name: "Martyr Diodorus" },
    ],
  },
  "05-11": {
    saintIds: ["cyril-equal-to-apostles", "methodius-equal-to-apostles"],
    also: [
      { name: "Hieromartyr Mocius of Amphipolis" },
    ],
  },
  "05-12": {
    also: [
      { name: "St. Germanus, Patriarch of Constantinople", summary: "Eighth-century defender of the holy icons against the first iconoclasm." },
      { name: "St. Theodore the Bishop of Cyrenia" },
    ],
  },
  "06-11": {
    also: [
      { name: "St. Barlaam of Khutyn, Wonderworker of Novgorod" },
    ],
  },
  "06-12": {
    also: [
      { name: "St. Peter of Mount Athos", summary: "Ninth-century desert ascetic of Athos, the holy mountain's first known hermit." },
    ],
  },
  "06-30": {
    also: [
      { name: "Apostle Peter", saintId: "apostle-peter" },
      { name: "Apostle Andrew the First-Called", saintId: "apostle-andrew" },
      { name: "Apostle James, son of Zebedee" },
      { name: "Apostle John the Theologian", saintId: "apostle-john-the-theologian" },
      { name: "Apostle Philip" },
      { name: "Apostle Bartholomew" },
      { name: "Apostle Thomas", saintId: "apostle-thomas" },
      { name: "Apostle Matthew", saintId: "apostle-matthew" },
      { name: "Apostle James, son of Alphaeus" },
      { name: "Apostle Jude, brother of the Lord" },
      { name: "Apostle Simon the Zealot" },
      { name: "Apostle Matthias" },
    ],
  },
  // (08-01 is enriched below in the saint-Person section.)
  "09-04": {
    also: [
      { name: "Holy Prophet Moses the God-Seer", summary: "Leader of Israel out of Egypt, who received the Law on Sinai face to face with God.", saintId: "prophet-moses" },
    ],
  },
  "09-17": {
    also: [
      { name: "Martyr Faith" },
      { name: "Martyr Hope" },
      { name: "Martyr Love" },
    ],
  },
  "10-04": {
    also: [
      { name: "Hieromartyr Hierotheus, first Bishop of Athens", summary: "A disciple of the apostle Paul, present at the dormition of the Theotokos." },
    ],
  },
  "11-08": {
    also: [
      { name: "Archangel Gabriel" },
      { name: "Archangel Raphael" },
      { name: "Archangel Uriel" },
      { name: "Archangel Selaphiel" },
      { name: "Archangel Jegudiel" },
      { name: "Archangel Barachiel" },
    ],
  },
  "11-09": {
    saintIds: ["nektarios-of-aegina"],
    also: [
      { name: "St. Matrona of Constantinople", summary: "Fifth-century ascetic who lived hidden in a male monastery to escape her pagan husband." },
      { name: "St. Nektarios of Aegina", summary: "Late-nineteenth century Greek hierarch and modern wonderworker.", saintId: "nektarios-of-aegina" },
    ],
  },
  "11-15": {
    also: [
      { name: "Confessors Gurias, Samonas, and Habib of Edessa" },
    ],
  },
  "11-23": {
    also: [
      { name: "St. Gregory of Acragas, Bishop of Sicily" },
    ],
  },
  "11-24": { saintIds: ["catherine-of-alexandria"] },
  "12-04": {
    saintIds: ["barbara-great-martyr", "john-of-damascus"],
    also: [
      { name: "St. John of Damascus", summary: "Eighth-century monk of St. Sabbas, defender of the icons, and author of the Octoechos.", saintId: "john-of-damascus" },
    ],
  },
  "12-10": {
    also: [
      { name: "Martyr Hermogenes" },
      { name: "Martyr Eugraphus" },
    ],
  },
  "12-13": {
    also: [
      { name: "Martyr Auxentius" },
      { name: "Martyr Eugene" },
      { name: "Martyr Mardarius" },
      { name: "Martyr Orestes" },
    ],
  },
  "12-14": {
    also: [
      { name: "Martyr Leucius" },
      { name: "Martyr Philemon" },
      { name: "Martyr Apollonius" },
      { name: "Martyr Callinicus" },
    ],
  },
  "12-17": { saintIds: ["prophet-daniel"] },
  "12-26": {
    saintIds: ["prophet-david-king"],
    also: [
      { name: "Righteous Joseph the Betrothed" },
      { name: "Holy King and Prophet David", saintId: "prophet-david-king" },
      { name: "Holy Apostle James, the Brother of the Lord" },
    ],
  },
  "12-27": { saintIds: ["protomartyr-stephen"] },
  "01-04": {
    also: [
      { name: "The Seventy Apostles" },
      { name: "Venerable Theoctistus, abbot of Cucumo in Sicily" },
    ],
  },
  "01-10": { saintIds: ["gregory-of-nyssa"] },
  "01-12": { saintIds: ["tatiana-of-rome"] },
  "02-06": { saintIds: ["photios-the-great"] },
  "02-08": { saintIds: ["theodore-the-general"] },
  "02-10": { saintIds: ["charalampias"] },
  "02-12": {
    also: [
      { name: "St. Alexis, Metropolitan of Moscow", summary: "Fourteenth-century hierarch who healed the wife of the Tatar khan and held the Russian Church together." },
    ],
  },
  "02-17": { saintIds: ["theodore-the-tyro"] },
  "03-12": { saintIds: ["symeon-the-new-theologian"] },
  "03-18": { saintIds: ["cyril-of-jerusalem"] },
  "06-01": { saintIds: ["justin-the-philosopher"] },
  "07-04": { saintIds: ["andrew-of-crete"] },
  "07-19": { saintIds: ["macrina-the-younger"] },
  "07-20": { saintIds: ["prophet-elijah"] },
  "07-27": { saintIds: ["panteleimon-the-healer"] },
  "08-01": {
    saintIds: ["seraphim-of-sarov"],
    also: [
      { name: "The Seven Holy Maccabees, their mother Solomonia, and their teacher Eleazar" },
      { name: "Uncovering of the Relics of St. Seraphim of Sarov", saintId: "seraphim-of-sarov" },
    ],
  },
  "08-20": { saintIds: ["prophet-samuel"] },
  "08-23": {
    also: [
      { name: "Hieromartyr Irenaeus of Lyons", summary: "Second-century bishop and disciple of Polycarp who from Gaul defended the apostolic tradition against the gnostics." },
    ],
  },
  "09-01": { saintIds: ["symeon-the-stylite"] },
  "09-25": {
    saintIds: ["sergius-of-radonezh"],
    also: [
      { name: "Repose of St. Sergius of Radonezh, Abbot of Holy Trinity Lavra", summary: "Fourteenth-century father of Russian monasticism and builder of the Holy Trinity Lavra north of Moscow.", saintId: "sergius-of-radonezh" },
    ],
  },
  "10-01": {
    saintIds: ["romanos-the-melodist"],
    also: [
      { name: "St. Romanos the Melodist", summary: "Sixth-century deacon of Constantinople and author of the great body of Byzantine kontakia.", saintId: "romanos-the-melodist" },
    ],
  },
  "11-01": { saintIds: ["cosmas-and-damian-of-asia"] },
};

function main() {
  const filePath = path.join(process.cwd(), "content/normalized/calendar/menaion.json");
  const file = JSON.parse(fs.readFileSync(filePath, "utf8")) as MenaionFile;

  let touched = 0;
  let missing = 0;

  for (const [monthDay, enrichment] of Object.entries(ENRICHMENTS)) {
    const entry = file.entries[monthDay];
    if (!entry) {
      console.warn(`  ! missing menaion entry: ${monthDay}`);
      missing += 1;
      continue;
    }

    if (enrichment.also !== undefined) {
      entry.also = enrichment.also;
    }

    // Recompute saintIds as the union of declared + any saintId on `also` entries.
    const fromAlso = (entry.also ?? []).map((c) => c.saintId).filter((id): id is string => Boolean(id));
    const declared = enrichment.saintIds ?? entry.saintIds ?? [];
    const merged = [...new Set([...declared, ...fromAlso])];
    if (merged.length > 0) {
      entry.saintIds = merged;
    }

    touched += 1;
  }

  fs.writeFileSync(filePath, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  console.log(`touched ${touched} entries (${missing} missing).`);
}

main();
