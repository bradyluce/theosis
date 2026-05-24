// Editorial origin notes for each translation — the history of the text
// itself (who translated it, when, from what source, why it matters in
// Orthodox use), not the technical import notes that appear in the catalog
// `description` field. Surfaced in the book picker's translation info sheet.
//
// Theosis owns its prose: these are original summaries, not lifted from
// Wikipedia or OrthodoxWiki.

export type TranslationOrigin = {
  // 1–3 word epoch label that appears as an eyebrow above the name.
  era: string;
  // The full editorial paragraph — keep it to ~3-5 sentences, dense but
  // readable, written for a curious Orthodox reader who doesn't know the
  // textual history.
  origin: string;
};

export const TRANSLATION_ORIGINS: Record<string, TranslationOrigin> = {
  kjva: {
    era: "1611 · England",
    origin:
      "The King James Version was commissioned by King James I of England and completed in 1611 by a committee of forty-seven Anglican and Puritan scholars. This edition preserves the Apocryphal books — Tobit, Judith, Wisdom, Sirach, the Maccabees, and others — which were printed in every original copy of the 1611 KJV but were removed from most Protestant Bibles in the nineteenth century. Orthodox Christians know these as the Deuterocanon and read them as Scripture. The English is Jacobean, sonorous, and shaped English literature for four centuries.",
  },
  rsv: {
    era: "1952 · American revision",
    origin:
      "The Revised Standard Version is a mid-twentieth-century revision of the King James tradition prepared by the National Council of Churches in America. The translators kept the rhythm and dignity of the KJV but updated archaic vocabulary and incorporated then-recent discoveries of older Hebrew and Greek manuscripts — including the Dead Sea Scrolls. The RSV is widely used in ecumenical study and has been adopted in modified form by several Orthodox jurisdictions for liturgical reading.",
  },
  lxxe: {
    era: "1851 · Brenton",
    origin:
      "Sir Lancelot Charles Lee Brenton, an English clergyman, completed the first full English translation of the Septuagint in 1851. The Septuagint itself was a Greek translation of the Hebrew Scriptures made by Jewish scholars in Alexandria during the third and second centuries BC — it was the Bible of the apostles, and it remains the Old Testament of the Orthodox Church. The New Testament quotes it directly more often than the Hebrew. Brenton's edition is the standard English reference for the LXX.",
  },
  brenton: {
    era: "1851 · Brenton",
    origin:
      "An alternate text-extraction of Brenton's 1851 English Septuagint, prepared from the public-domain PDF of the original edition. The translation is the same as the OSIS-based LXXE import, but small differences in scanning and formatting occasionally surface words or punctuation the other misses. Both share Brenton's Victorian English voice and his Septuagint-faithful renderings of the Greek Old Testament that the Orthodox Church reads as authoritative.",
  },
  eob: {
    era: "Modern · Orthodox",
    origin:
      "The Eastern / Greek Orthodox Bible (New Testament) is a contemporary English translation prepared by Orthodox scholars under the editorial direction of Laurent Cleenewerck and published in 2007. It works from the Patriarchal Greek text used by the Ecumenical Patriarchate of Constantinople rather than the eclectic Nestle-Aland critical text used by most modern Protestant translations. The result is a New Testament that reflects the Byzantine textual tradition the Orthodox Church has preserved continuously for over a millennium, with extensive footnotes addressing Orthodox readings and Patristic interpretation.",
  },
  gnt: {
    era: "1904 · Nestle",
    origin:
      "Eberhard Nestle's 1904 Greek New Testament was the first widely-used critical edition of the Greek New Testament, attempting to reconstruct the earliest recoverable text by weighing variants across the major manuscript traditions. It became the basis for the Nestle-Aland editions still in use by Bible translators worldwide. Its readings often differ from the Byzantine majority text the Orthodox Church received, and the divergences themselves are theologically interesting — every disputed verse is a window into how the New Testament was copied, read, and preserved.",
  },
  "lxx-greek": {
    era: "3rd c. BC · Alexandria",
    origin:
      "The original Greek text of the Septuagint — the translation of the Hebrew Scriptures made by Jewish scholars in Alexandria during the third and second centuries BC. The Septuagint shaped the language of the New Testament: when an apostle quotes the Old Testament, he most often quotes the LXX. The Orthodox Church received the LXX from the apostolic generation and has used it ever since as the authoritative Old Testament. This is the Greek itself, in the form transmitted through Codex Vaticanus and the Rahlfs critical edition.",
  },
  byz: {
    era: "Byzantine · Majority Text",
    origin:
      "The Byzantine textform — also called the Majority Text — represents the reading found in roughly ninety-five percent of all surviving Greek New Testament manuscripts. It is the textual tradition copied, read aloud, and preserved by the Greek-speaking Christian world from the fourth century onward, and the text from which Byzantine lectionaries were drawn. This edition follows Robinson-Pierpont (2018), the most rigorous modern reconstruction of the Byzantine text. For the Orthodox, this is closer to the New Testament the Fathers actually read than the critical editions reconstructed from a handful of Alexandrian witnesses.",
  },
  ant1904: {
    era: "1904 · Patriarchal Text",
    origin:
      "The Patriarchal Text of 1904 is the official Greek New Testament of the Ecumenical Patriarchate of Constantinople, edited by Vasileios Antoniades on commission from the Synod. Antoniades collated dozens of liturgical Gospel books and Apostolos manuscripts to produce a text that reflects the readings actually used in Orthodox worship — the New Testament as it has been heard, chanted, and prayed in the Greek-speaking Church. This is the text that underlies the Greek lectionary and the printed Greek Bibles in use across the Patriarchate today.",
  },
  web: {
    era: "2000 · Modern English",
    origin:
      "The World English Bible is a contemporary public-domain English translation begun by Rainbow Missions in 1997 and continually refined since. It is a careful revision of the 1901 American Standard Version with updated vocabulary, modern punctuation, and a translation philosophy that aims for accuracy without archaism. This edition includes the Apocrypha/Deuterocanon — Tobit, Judith, Wisdom, Sirach, the Maccabees, and the rest of the books Orthodox Christians read as Scripture. The WEB renders the divine name as 'Yahweh' rather than 'the LORD', a distinctive that readers should weigh.",
  },
  vulgate: {
    era: "4th c. · Jerome / 1592 Clementine",
    origin:
      "The Vulgate is St. Jerome's late-fourth-century Latin Bible, translated under commission from Pope Damasus and completed around AD 405. Jerome worked from the Hebrew for most of the Old Testament and from the Greek for the New Testament and Deuterocanon, producing the translation that would become the standard Bible of Latin Christendom for over a millennium. This edition is the Sixto-Clementine recension of 1592, the official text used by the Roman Church until Vatican II. For the Orthodox reader, the Vulgate matters as the text the Western Fathers — Augustine, Gregory the Great, Bede — read and quoted, and as a key witness to readings older than any surviving Greek manuscript.",
  },
};
