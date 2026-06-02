// Add explicit multi-commemoration data for major Orthodox calendar days
// where the menaion entry currently shows a single saint but tradition
// recognizes multiple. Specifically:
//
//   - Complete the Synaxis of the Twelve Apostles (June 30) with all 12.
//   - Add co-commemorations to days where multiple bio'd saints share
//     the same feast (where the auto-link picked up only one).
//   - Populate the `also` array with additional commemorations from
//     the standard synaxarion tradition for days the menaion only lists
//     the principal saint.
//
// Idempotent — won't duplicate existing saintIds or also entries.
// Run with: tsx scripts/ingest/fill-menaion-commemorations.ts

import fs from "node:fs";
import path from "node:path";

type Commemoration = {
  name: string;
  summary?: string;
  saintId?: string;
};

type MenaionEntry = {
  monthDay: string;
  title: string;
  summary?: string;
  saintIds?: string[];
  also?: Commemoration[];
};

// Date-keyed additions to make. addSaintIds extends the entry's saintIds.
// addAlso appends to the entry's `also` array.
const ADDITIONS: Array<{
  date: string;
  addSaintIds?: string[];
  addAlso?: Commemoration[];
}> = [
  // --- May ---
  {
    date: "05-06",
    addAlso: [
      { name: "Prophet Job the Long-suffering", saintId: "job-the-long-suffering" },
    ],
  },

  // --- June ---
  {
    date: "06-30",
    addSaintIds: [
      "apostle-james-zebedee",
      "apostle-philip-twelve",
      "apostle-bartholomew",
      "apostle-thomas",
      "apostle-jude",
      "apostle-simon-zealot",
      "apostle-matthias",
      "apostle-james-brother-of-lord",
    ],
  },

  // --- July ---
  {
    date: "07-04",
    addAlso: [
      { name: "St. Andrew of Crete, Archbishop", summary: "Hymnographer of the Great Canon.", saintId: "andrew-of-crete" },
    ],
  },
  {
    date: "07-12",
    addAlso: [
      { name: "St. Paisios the Athonite", summary: "Twentieth-century elder of Mount Athos.", saintId: "paisios-the-athonite" },
    ],
  },
  {
    date: "07-17",
    addAlso: [
      { name: "Holy Royal Martyrs of Russia", summary: "Tsar Nicholas II, Tsarina Alexandra, and their five children, slain at Yekaterinburg in 1918.", saintId: "royal-martyrs-of-russia" },
    ],
  },
  {
    date: "07-18",
    addAlso: [
      { name: "Holy New Martyr Grand Duchess Elizabeth", summary: "Founder of the Convent of Martha and Mary in Moscow; cast alive into a mine-shaft at Alapayevsk.", saintId: "elizabeth-the-new-martyr" },
    ],
  },
  {
    date: "07-19",
    addAlso: [
      { name: "St. Seraphim of Sarov", summary: "Uncovering of his relics in 1903.", saintId: "seraphim-of-sarov" },
    ],
  },

  // --- August ---
  {
    date: "08-01",
    addSaintIds: ["seraphim-of-sarov"],
    addAlso: [
      { name: "The Seven Holy Maccabees, their mother Solomonia, and their teacher Eleazar" },
    ],
  },
  {
    date: "08-09",
    addSaintIds: ["herman-of-alaska"],
  },
  {
    date: "08-28",
    addAlso: [
      { name: "St. Moses the Black of Scetis", saintId: "moses-the-black" },
    ],
  },

  // --- September ---
  {
    date: "09-01",
    addAlso: [
      { name: "St. Symeon the Stylite the Elder", saintId: "symeon-the-stylite" },
      { name: "Indiction: Beginning of the Church Year" },
    ],
  },
  {
    date: "09-09",
    addSaintIds: ["joachim-and-anna"],
  },
  {
    date: "09-17",
    addAlso: [
      { name: "Sophia and her Daughters Faith, Hope, and Love", saintId: "sophia-and-three-daughters" },
    ],
  },
  {
    date: "09-20",
    addAlso: [
      { name: "Great-martyr Eustathius Placidas", saintId: "eustathius-placidas" },
    ],
  },
  {
    date: "09-22",
    addAlso: [
      { name: "Prophet Jonah", saintId: "prophet-jonah" },
    ],
  },
  {
    date: "09-24",
    addSaintIds: ["thekla-of-iconium", "silouan-the-athonite"],
  },

  // --- October ---
  {
    date: "10-01",
    addSaintIds: ["romanos-the-melodist"],
  },
  {
    date: "10-17",
    addAlso: [
      { name: "St. Lazarus the Four-Days-Dead", summary: "Bishop of Kition on Cyprus, friend of the Lord.", saintId: "lazarus-of-bethany" },
    ],
  },
  {
    date: "10-28",
    addAlso: [
      { name: "Great-martyr Paraskeva", saintId: "paraskeva-friday" },
    ],
  },

  // --- November ---
  {
    date: "11-01",
    addAlso: [
      { name: "Cosmas and Damian, Unmercenaries of Asia", saintId: "cosmas-and-damian-of-asia" },
    ],
  },
  {
    date: "11-08",
    addAlso: [
      { name: "Archangel Michael", saintId: "archangel-michael" },
      { name: "Archangel Gabriel", saintId: "archangel-gabriel" },
    ],
  },
  {
    date: "11-14",
    addSaintIds: ["gregory-palamas"],
  },
  {
    date: "11-17",
    addAlso: [
      { name: "Gregory the Wonderworker, Bishop of Neo-Caesarea", saintId: "gregory-the-wonderworker" },
    ],
  },

  // --- December ---
  {
    date: "12-04",
    addSaintIds: ["john-of-damascus"],
  },
  {
    date: "12-13",
    addAlso: [
      { name: "St. Herman of Alaska", saintId: "herman-of-alaska" },
    ],
  },
  {
    date: "12-17",
    addAlso: [
      { name: "Prophet Daniel and the Three Holy Youths", saintId: "prophet-daniel" },
    ],
  },
  {
    date: "12-19",
    addAlso: [
      { name: "Martyrs Boniface and Righteous Aglaida of Rome", saintId: "boniface-and-aglaida" },
    ],
  },
  {
    date: "12-20",
    addAlso: [
      { name: "Hieromartyr Ignatius the God-bearer of Antioch", saintId: "ignatius-of-antioch" },
      { name: "St. John of Kronstadt", saintId: "john-of-kronstadt" },
    ],
  },
  {
    date: "12-22",
    addAlso: [
      { name: "Great-martyr Anastasia the Deliverer-from-bonds", saintId: "anastasia-the-deliverer" },
    ],
  },

  // --- January ---
  {
    date: "01-09",
    addAlso: [
      { name: "St. Philip the Confessor, Metropolitan of Moscow", saintId: "philip-of-moscow" },
    ],
  },
  {
    date: "01-10",
    addAlso: [
      { name: "St. Theophan the Recluse", saintId: "theophan-the-recluse" },
    ],
  },
  {
    date: "01-14",
    addAlso: [
      { name: "St. Sava, First Archbishop of Serbia", saintId: "sava-of-serbia" },
    ],
  },
  {
    date: "01-19",
    addAlso: [
      { name: "St. Macarius the Great of Egypt", saintId: "macarius-the-great" },
    ],
  },
  {
    date: "01-20",
    addAlso: [
      { name: "St. Euthymius the Great", saintId: "euthymius-the-great" },
    ],
  },
  {
    date: "01-21",
    addAlso: [
      { name: "St. Maximus the Confessor", saintId: "maximus-the-confessor" },
      { name: "St. Maximus the Greek", saintId: "maximus-the-greek" },
    ],
  },

  // --- February ---
  {
    date: "02-01",
    addAlso: [
      { name: "Martyr Tryphon of Lampsacus", saintId: "tryphon-the-martyr" },
    ],
  },
  {
    date: "02-03",
    addAlso: [
      { name: "Simeon the God-Receiver", saintId: "simeon-the-god-receiver" },
      { name: "Anna the Prophetess", saintId: "anna-the-prophetess" },
    ],
  },
  {
    date: "02-05",
    addAlso: [
      { name: "Martyr Agatha of Sicily", saintId: "agatha-of-sicily" },
    ],
  },
  {
    date: "02-06",
    addAlso: [
      { name: "Photios the Great, Patriarch of Constantinople", saintId: "photios-the-great" },
      { name: "Blessed Xenia of St. Petersburg, Fool-for-Christ", saintId: "xenia-of-petersburg" },
    ],
  },
  {
    date: "02-10",
    addAlso: [
      { name: "Hieromartyr Charalampias of Magnesia", saintId: "charalampias" },
    ],
  },
  {
    date: "02-12",
    addAlso: [
      { name: "St. Alexius, Metropolitan of Moscow", saintId: "alexius-of-moscow" },
    ],
  },
  {
    date: "02-23",
    addAlso: [
      { name: "Hieromartyr Polycarp of Smyrna", saintId: "polycarp-of-smyrna" },
    ],
  },
  {
    date: "02-26",
    addAlso: [
      { name: "Photini the Samaritan Woman", saintId: "photini-the-samaritan" },
    ],
  },

  // --- March ---
  {
    date: "03-05",
    addAlso: [
      { name: "St. Mark the Ascetic", saintId: "mark-the-ascetic" },
    ],
  },
  {
    date: "03-12",
    addAlso: [
      { name: "St. Symeon the New Theologian", saintId: "symeon-the-new-theologian" },
    ],
  },
  {
    date: "03-18",
    addAlso: [
      { name: "St. Cyril of Jerusalem", saintId: "cyril-of-jerusalem" },
      { name: "St. Nikolai of Žiča and Ohrid", saintId: "nikolai-of-zica" },
    ],
  },
  {
    date: "03-31",
    addAlso: [
      { name: "St. Innocent of Alaska, Apostle of America", saintId: "innocent-of-alaska" },
    ],
  },

  // --- April ---
  {
    date: "04-01",
    addAlso: [
      { name: "St. Justin Popović of Ćelije", saintId: "justin-popovich" },
    ],
  },
  {
    date: "04-30",
    addAlso: [
      { name: "St. Ignatius Brianchaninov", saintId: "ignatius-brianchaninov" },
    ],
  },
];

function main() {
  const menaionPath = path.join(process.cwd(), "content/normalized/calendar/menaion.json");
  const raw = JSON.parse(fs.readFileSync(menaionPath, "utf8")) as {
    entries: Record<string, MenaionEntry>;
    _meta?: unknown;
  };

  let saintIdsAdded = 0;
  let alsoAdded = 0;
  let updates = 0;

  for (const { date, addSaintIds, addAlso } of ADDITIONS) {
    const entry = raw.entries[date];
    if (!entry) {
      console.warn(`No menaion entry for ${date}; skipping.`);
      continue;
    }

    let changed = false;

    if (addSaintIds) {
      const existing = new Set(entry.saintIds ?? []);
      const newIds = addSaintIds.filter((id) => !existing.has(id));
      if (newIds.length > 0) {
        entry.saintIds = [...(entry.saintIds ?? []), ...newIds];
        saintIdsAdded += newIds.length;
        changed = true;
      }
    }

    if (addAlso) {
      const existingNames = new Set((entry.also ?? []).map((a) => a.name));
      const newAlso = addAlso.filter((a) => !existingNames.has(a.name));
      if (newAlso.length > 0) {
        entry.also = [...(entry.also ?? []), ...newAlso];
        alsoAdded += newAlso.length;
        changed = true;
      }
    }

    if (changed) updates += 1;
  }

  fs.writeFileSync(menaionPath, JSON.stringify(raw, null, 2) + "\n");
  console.log(`Updated ${updates} menaion entries: ${saintIdsAdded} new saintIds, ${alsoAdded} new co-commemorations.`);
}

main();
