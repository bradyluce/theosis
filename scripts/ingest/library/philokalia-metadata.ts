// Topic-slug + icon overlays applied to the Philokalia Persons and Works at
// bundle emit time. Keeps the bulk of parse-philokalia.ts's AUTHORS array
// readable by lifting the per-author taxonomy here. Missing entries fall
// through with no overlay applied (topicSlugs stays [], iconId stays unset).

export type PersonOverlay = {
  iconId?: string;
  topicSlugs: string[];
};

export type WorkOverlay = {
  topicSlugs: string[];
};

// Per-Person overlays. Keys are Person.id values used in parse-philokalia.ts.
export const PHILOKALIA_PERSON_OVERLAYS: Record<string, PersonOverlay> = {
  "antony-the-great": {
    iconId: "icon-anthony-the-great",
    topicSlugs: ["monasticism", "ascetical-theology", "desert-tradition"],
  },
  "evagrius-ponticus": {
    topicSlugs: ["monasticism", "ascetical-theology", "passions-and-virtues", "desert-tradition"],
  },
  "john-cassian": {
    iconId: "icon-john-cassian",
    topicSlugs: ["monasticism", "ascetical-theology", "latin-patristics", "desert-tradition"],
  },
  "mark-the-ascetic": {
    iconId: "icon-mark-the-ascetic",
    topicSlugs: ["monasticism", "ascetical-theology", "grace-and-works"],
  },
  "hesychios-of-sinai": {
    topicSlugs: ["hesychasm", "nepsis-watchfulness", "jesus-prayer", "monasticism"],
  },
  "neilos-the-ascetic": {
    topicSlugs: ["monasticism", "ascetical-theology"],
  },
  "diadochos-of-photiki": {
    topicSlugs: ["hesychasm", "jesus-prayer", "ascetical-theology"],
  },
  "john-of-karpathos": {
    topicSlugs: ["monasticism", "ascetical-theology"],
  },
  "theodoros-the-great-ascetic": {
    topicSlugs: ["monasticism", "ascetical-theology"],
  },
  "maximus-the-confessor": {
    topicSlugs: ["theosis", "christology", "byzantine-tradition"],
  },
  "thalassios-the-libyan": {
    topicSlugs: ["monasticism", "ascetical-theology", "passions-and-virtues"],
  },
  "symeon-metaphrastis": {
    topicSlugs: ["hagiography", "byzantine-tradition"],
  },
  "makarios-of-egypt": {
    iconId: "icon-macarius-the-egyptian",
    topicSlugs: ["monasticism", "desert-tradition", "prayer-of-the-heart"],
  },
  "symeon-the-new-theologian": {
    iconId: "icon-symeon-the-new-theologian",
    topicSlugs: ["hesychasm", "byzantine-tradition", "theosis", "mystical-theology"],
  },
  "nikitas-stithatos": {
    topicSlugs: ["hesychasm", "byzantine-tradition", "ascetical-theology"],
  },
  "ilias-the-presbyter": {
    topicSlugs: ["ascetical-theology", "byzantine-tradition"],
  },
  "peter-of-damaskos": {
    topicSlugs: ["ascetical-theology", "byzantine-tradition", "passions-and-virtues"],
  },
  "gregory-of-sinai": {
    topicSlugs: ["hesychasm", "jesus-prayer", "prayer-of-the-heart", "monasticism"],
  },
  "gregory-palamas": {
    iconId: "icon-gregory-palamas",
    topicSlugs: ["hesychasm", "theosis", "byzantine-tradition", "mystical-theology"],
  },
};

// Per-Work overlays. Keys are Work.id values produced by parse-philokalia.ts.
export const PHILOKALIA_WORK_OVERLAYS: Record<string, WorkOverlay> = {
  // Antony
  "philokalia-antony-on-character-of-men": { topicSlugs: ["ascetical-theology", "virtues"] },
  // Evagrios
  "philokalia-evagrios-outline-teaching": { topicSlugs: ["ascetical-theology", "monastic-spirituality"] },
  "philokalia-evagrios-on-discrimination": { topicSlugs: ["passions-and-virtues", "discernment"] },
  "philokalia-evagrios-extracts-on-watchfulness": { topicSlugs: ["nepsis-watchfulness", "ascetical-theology"] },
  "philokalia-evagrios-on-prayer": { topicSlugs: ["prayer", "contemplative-prayer"] },
  // Cassian
  "philokalia-cassian-on-eight-vices": { topicSlugs: ["passions-and-virtues", "ascetical-theology"] },
  "philokalia-cassian-holy-fathers-discrimination": { topicSlugs: ["discernment", "monastic-spirituality"] },
  // Mark the Ascetic
  "philokalia-mark-on-spiritual-law": { topicSlugs: ["grace-and-works", "ascetical-theology"] },
  "philokalia-mark-on-those-righteous-by-works": { topicSlugs: ["grace-and-works", "ascetical-theology"] },
  "philokalia-mark-letter-to-nicolas": { topicSlugs: ["ascetical-theology", "letters"] },
  // Hesychios
  "philokalia-hesychios-on-watchfulness": { topicSlugs: ["nepsis-watchfulness", "jesus-prayer", "hesychasm"] },
  // Neilos
  "philokalia-neilos-ascetic-discourse": { topicSlugs: ["ascetical-theology", "monastic-spirituality"] },
  // Diadochos
  "philokalia-diadochos-on-spiritual-knowledge": { topicSlugs: ["jesus-prayer", "discernment", "hesychasm"] },
  // John of Karpathos
  "philokalia-karpathos-encouragement-monks-india": { topicSlugs: ["ascetical-theology", "monastic-spirituality"] },
  "philokalia-karpathos-twenty-four-discourses": { topicSlugs: ["ascetical-theology", "compunction"] },
  // Theodoros
  "philokalia-theodoros-century-spiritual-texts": { topicSlugs: ["ascetical-theology", "monastic-spirituality"] },
  "philokalia-theodoros-theoretikon": { topicSlugs: ["contemplative-prayer", "ascetical-theology"] },
  // Maximos
  "philokalia-maximos-four-hundred-texts-on-love": { topicSlugs: ["love", "ascetical-theology", "virtues"] },
  "philokalia-maximos-two-hundred-on-theology": { topicSlugs: ["theosis", "christology"] },
  "philokalia-maximos-various-texts": { topicSlugs: ["ascetical-theology", "passions-and-virtues", "theosis"] },
  "philokalia-maximos-on-lords-prayer": { topicSlugs: ["prayer", "lords-prayer"] },
  // Thalassios
  "philokalia-thalassios-four-centuries": { topicSlugs: ["love", "ascetical-theology", "passions-and-virtues"] },
  // Makarios
  "philokalia-makarios-macarian-selections": { topicSlugs: ["prayer-of-the-heart", "monastic-spirituality"] },
  // Symeon the New Theologian
  "philokalia-symeon-nt-three-methods-prayer": { topicSlugs: ["prayer", "hesychasm", "jesus-prayer"] },
  "philokalia-symeon-nt-practical-theological-texts": { topicSlugs: ["mystical-theology", "theosis", "ascetical-theology"] },
  // Nikitas
  "philokalia-nikitas-on-practice-virtues": { topicSlugs: ["virtues", "ascetical-theology"] },
  "philokalia-nikitas-on-inner-nature": { topicSlugs: ["contemplative-prayer", "ascetical-theology"] },
  "philokalia-nikitas-on-spiritual-knowledge": { topicSlugs: ["mystical-theology", "love"] },
  // Ilias
  "philokalia-ilias-gnomic-anthology": { topicSlugs: ["ascetical-theology", "monastic-spirituality"] },
  // Peter of Damaskos
  "philokalia-peter-damaskos-book-1": { topicSlugs: ["ascetical-theology", "virtues", "passions-and-virtues"] },
  "philokalia-peter-damaskos-book-2": { topicSlugs: ["ascetical-theology", "virtues"] },
  // Gregory of Sinai
  "philokalia-gregory-sinai-on-commandments": { topicSlugs: ["ascetical-theology", "hesychasm"] },
  "philokalia-gregory-sinai-further-texts": { topicSlugs: ["ascetical-theology"] },
  "philokalia-gregory-sinai-signs-of-grace": { topicSlugs: ["discernment", "hesychasm"] },
  "philokalia-gregory-sinai-on-stillness": { topicSlugs: ["hesychasm", "contemplative-prayer"] },
  "philokalia-gregory-sinai-on-prayer": { topicSlugs: ["prayer", "jesus-prayer", "hesychasm"] },
  // Gregory Palamas
  "philokalia-palamas-to-nun-xenia": { topicSlugs: ["ascetical-theology", "letters"] },
  "philokalia-palamas-nt-decalogue": { topicSlugs: ["commandments", "ascetical-theology"] },
  "philokalia-palamas-three-texts-on-prayer": { topicSlugs: ["prayer", "purity-of-heart"] },
  "philokalia-palamas-topics-natural-theological": { topicSlugs: ["theosis", "mystical-theology", "byzantine-tradition"] },
  "philokalia-palamas-hagioretic-tome": { topicSlugs: ["hesychasm", "theosis", "mystical-theology"] },
};
