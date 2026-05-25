// Orthodox prayer corpus — public-domain texts (English) drawn from the
// Jordanville prayer book and other standard sources. Bundled at build
// time so the prayer rule works offline. New prayers go here; the rule
// engine references them by id, and the user's chosen rule is just a
// list of ids in AsyncStorage.

export type PrayerCategory =
  | "essential"
  | "morning"
  | "evening"
  | "psalms"
  | "creed"
  | "intercession";

export type PrayerEntry = {
  id: string;
  title: string;
  // Optional secondary line under the title ("Prayer of the Hours",
  // "Psalm 50", etc.). Shown small + uppercase in lists.
  subtitle?: string;
  category: PrayerCategory;
  // Suggested time-of-day for filtering in the picker. A prayer can be
  // appropriate at any time (essential), morning, evening, or both.
  suggestedFor: ("morning" | "evening" | "anytime")[];
  // Inline text. Paragraphs separated by \n\n. We render each paragraph
  // in a serif Text block; \n becomes a line break within a paragraph.
  body: string;
  // Source label rendered subtly under the prayer. Helps with provenance.
  attribution?: string;
};

// Dynamic items the rule can include — not static prayers; they pull
// content from the daily API at read time.
export type DynamicItemKind = "gospel-of-day" | "epistle-of-day" | "psalm-of-day";

export type DynamicItem = {
  id: string; // dyn-gospel, dyn-epistle, dyn-psalm
  kind: DynamicItemKind;
  title: string;
  subtitle: string;
};

export const DYNAMIC_ITEMS: DynamicItem[] = [
  {
    id: "dyn-gospel",
    kind: "gospel-of-day",
    title: "Gospel Reading of the Day",
    subtitle: "Pulled live from the daily lectionary",
  },
  {
    id: "dyn-epistle",
    kind: "epistle-of-day",
    title: "Epistle Reading of the Day",
    subtitle: "Pulled live from the daily lectionary",
  },
  {
    id: "dyn-psalm",
    kind: "psalm-of-day",
    title: "Appointed Psalm",
    subtitle: "Pulled live from the daily Psalter cycle",
  },
];

export const PRAYER_CORPUS: PrayerEntry[] = [
  // ---- Essentials -----------------------------------------------------
  {
    id: "trisagion",
    title: "Trisagion Prayers",
    subtitle: "Holy God",
    category: "essential",
    suggestedFor: ["morning", "evening", "anytime"],
    body:
      "In the Name of the Father, and of the Son, and of the Holy Spirit. Amen.\n\n" +
      "Glory to Thee, our God, glory to Thee.\n\n" +
      "O Heavenly King, the Comforter, the Spirit of Truth, who art everywhere present and fillest all things, Treasury of good things and Giver of life: come and abide in us, and cleanse us from every impurity, and save our souls, O Good One.\n\n" +
      "Holy God, Holy Mighty, Holy Immortal, have mercy on us. (Thrice)\n\n" +
      "Glory to the Father, and to the Son, and to the Holy Spirit, both now and ever, and unto the ages of ages. Amen.\n\n" +
      "O Most Holy Trinity, have mercy on us. O Lord, cleanse us from our sins. O Master, pardon our iniquities. O Holy One, visit and heal our infirmities for Thy Name's sake.\n\n" +
      "Lord, have mercy. (Thrice)\n\n" +
      "Glory to the Father, and to the Son, and to the Holy Spirit, both now and ever, and unto the ages of ages. Amen.",
    attribution: "Jordanville Prayer Book",
  },
  {
    id: "our-father",
    title: "The Lord's Prayer",
    subtitle: "Our Father",
    category: "essential",
    suggestedFor: ["morning", "evening", "anytime"],
    body:
      "Our Father, who art in heaven, hallowed be Thy Name. Thy Kingdom come, Thy will be done, on earth as it is in heaven. Give us this day our daily bread, and forgive us our trespasses as we forgive those who trespass against us; and lead us not into temptation, but deliver us from the evil one.",
    attribution: "Matthew 6:9–13",
  },
  {
    id: "symbol-of-faith",
    title: "The Symbol of Faith",
    subtitle: "Nicene-Constantinopolitan Creed",
    category: "creed",
    suggestedFor: ["morning", "evening"],
    body:
      "I believe in one God, the Father Almighty, Maker of heaven and earth, and of all things visible and invisible.\n\n" +
      "And in one Lord Jesus Christ, the Son of God, the Only-begotten, begotten of the Father before all ages; Light of Light, true God of true God; begotten, not made; of one essence with the Father, by whom all things were made.\n\n" +
      "Who for us men and for our salvation came down from the heavens, and was incarnate of the Holy Spirit and the Virgin Mary, and became man.\n\n" +
      "And was crucified for us under Pontius Pilate, and suffered, and was buried.\n\n" +
      "And the third day He arose again, according to the Scriptures.\n\n" +
      "And ascended into the heavens, and sitteth at the right hand of the Father.\n\n" +
      "And He shall come again with glory to judge the living and the dead, whose Kingdom shall have no end.\n\n" +
      "And in the Holy Spirit, the Lord, the Giver of life, who proceedeth from the Father; who with the Father and the Son together is worshipped and glorified; who spake by the Prophets.\n\n" +
      "In One, Holy, Catholic, and Apostolic Church.\n\n" +
      "I confess one Baptism for the remission of sins.\n\n" +
      "I look for the resurrection of the dead, and the life of the age to come. Amen.",
    attribution: "First and Second Ecumenical Councils (325, 381)",
  },
  {
    id: "psalm-50",
    title: "Psalm 50",
    subtitle: "Have mercy on me, O God",
    category: "psalms",
    suggestedFor: ["morning", "evening"],
    body:
      "Have mercy on me, O God, according to Thy great mercy; and according to the multitude of Thy compassions blot out my transgression. Wash me thoroughly from mine iniquity, and cleanse me from my sin. For I know mine iniquity, and my sin is ever before me. Against Thee only have I sinned and done this evil before Thee, that Thou mightest be justified in Thy words, and prevail when Thou art judged.\n\n" +
      "For behold, I was conceived in iniquities, and in sins did my mother bear me. For behold, Thou hast loved truth; the hidden and secret things of Thy wisdom hast Thou made manifest unto me. Thou shalt sprinkle me with hyssop, and I shall be made clean; Thou shalt wash me, and I shall be made whiter than snow. Thou shalt make me to hear joy and gladness; the bones that be humbled, they shall rejoice.\n\n" +
      "Turn Thy face away from my sins, and blot out all mine iniquities. Create in me a clean heart, O God, and renew a right spirit within me. Cast me not away from Thy presence, and take not Thy Holy Spirit from me. Restore unto me the joy of Thy salvation, and with Thy governing Spirit establish me.\n\n" +
      "I shall teach transgressors Thy ways, and the ungodly shall turn back unto Thee. Deliver me from blood-guiltiness, O God, Thou God of my salvation; my tongue shall rejoice in Thy righteousness. O Lord, Thou shalt open my lips, and my mouth shall declare Thy praise.\n\n" +
      "For if Thou hadst desired sacrifice, I had given it; with whole-burnt offerings Thou shalt not be pleased. A sacrifice unto God is a broken spirit; a heart that is broken and humbled God will not despise. Do good, O Lord, in Thy good pleasure unto Sion, and let the walls of Jerusalem be builded. Then shalt Thou be pleased with a sacrifice of righteousness, with oblation and whole-burnt offerings. Then shall they offer bullocks upon Thine altar.",
    attribution: "Septuagint Psalm 50 (Hebrew 51)",
  },

  // ---- Morning prayers ------------------------------------------------
  {
    id: "morning-arising",
    title: "Prayer Upon Arising",
    category: "morning",
    suggestedFor: ["morning"],
    body:
      "Having risen from sleep, I thank Thee, O Holy Trinity, because of the abundance of Thy goodness and long-suffering Thou wast not wroth with me, slothful and sinful as I am; neither hast Thou destroyed me in mine iniquities; but in Thy compassion raised me up, as I lay in despair, that at dawn I might sing the glories of Thy Majesty.\n\n" +
      "Do Thou now enlighten the eyes of mine understanding, open my mouth to receive Thy words, teach me Thy commandments, help me to do Thy will, confessing Thee from my heart, singing and praising Thine all-holy Name: of the Father, and of the Son, and of the Holy Spirit, now and ever, and unto the ages of ages. Amen.",
    attribution: "Jordanville Prayer Book — Morning Prayers",
  },
  {
    id: "morning-macarius-1",
    title: "First Morning Prayer of St. Macarius",
    category: "morning",
    suggestedFor: ["morning"],
    body:
      "O God, cleanse Thou me a sinner, for I have never wrought any good thing in Thy sight; but deliver me from the evil one, and let Thy will be done in me, that without condemnation I may open my unworthy mouth and praise Thy holy Name: of the Father, and of the Son, and of the Holy Spirit, now and ever, and unto the ages of ages. Amen.",
    attribution: "St. Macarius the Great",
  },
  {
    id: "morning-macarius-2",
    title: "Second Morning Prayer of St. Macarius",
    category: "morning",
    suggestedFor: ["morning"],
    body:
      "O Lord, who in Thine abundant goodness and Thy great compassion hast granted me, Thy servant, to go through the time of the night that is past without attack from any opposing evil: Do Thou Thyself, O Master, Creator of all things, vouchsafe me by Thy true light and with an enlightened heart to do Thy will, now and ever, and unto the ages of ages. Amen.",
    attribution: "St. Macarius the Great",
  },
  {
    id: "morning-to-theotokos",
    title: "Prayer to the Most Holy Theotokos",
    category: "morning",
    suggestedFor: ["morning", "evening"],
    body:
      "O my most holy Lady Theotokos, through thy holy and all-powerful prayers banish from me, thy lowly and wretched servant, despondency, forgetfulness, folly, carelessness, and all filthy, evil, and blasphemous thoughts out of my wretched heart and from my darkened mind.\n\n" +
      "And quench the flame of my passions, for I am poor and wretched, and deliver me from many cruel memories and deeds, and free me from all their evil effects. For blessed art thou by all generations, and glorified is thy most honorable name, unto the ages of ages. Amen.",
    attribution: "Jordanville Prayer Book",
  },
  {
    id: "morning-guardian-angel",
    title: "Prayer to One's Guardian Angel",
    category: "morning",
    suggestedFor: ["morning", "evening"],
    body:
      "O Angel of Christ, holy guardian and protector of my soul and body, forgive me all things wherein I have offended thee every day of my life, and protect me from all influence and temptation of the Evil One. May I never again anger God by my sins. Pray for me to the Lord, that He may make me worthy of the grace of the All-holy Trinity, and of the Most Blessed Theotokos, and of all the Saints. Amen.",
  },

  // ---- Evening prayers ------------------------------------------------
  {
    id: "evening-thanksgiving",
    title: "Evening Thanksgiving",
    category: "evening",
    suggestedFor: ["evening"],
    body:
      "O Lord our God, in that Thou art good and lovest mankind, forgive me wherein I have sinned today in word, deed, and thought. Grant me peaceful and undisturbed sleep. Send Thy Guardian Angel to protect and keep me from every evil. For Thou art the Guardian of our souls and bodies, and unto Thee do we send up glory: to the Father, and to the Son, and to the Holy Spirit, now and ever, and unto the ages of ages. Amen.",
    attribution: "Jordanville Prayer Book — Evening Prayers",
  },
  {
    id: "evening-john-damascene",
    title: "Prayer of St. John of Damascus",
    category: "evening",
    suggestedFor: ["evening"],
    body:
      "O Lord, Lover of mankind, is this bed to be my coffin, or wilt Thou enlighten my wretched soul with another day? Behold, the coffin lieth before me, and behold, death confronteth me. I fear, O Lord, Thy judgment and the endless torments; yet I cease not to do evil. My Lord God, I continually anger Thee, and Thy Most Pure Mother, and all the heavenly Powers, and my holy Guardian Angel.\n\n" +
      "I know, O Lord, that I am unworthy of Thy love, but am deserving of every condemnation and torment. But, O Lord, whether I will it or not, save me. For to save a good man is no great thing, and to have mercy on the pure is nothing wonderful, for they are worthy of Thy mercy. But show the wonder of Thy mercy to me a sinner: in this reveal Thy love for mankind, lest my wickedness prevail over Thine ineffable goodness and mercy. And order my life as Thou wilt. Amen.",
    attribution: "St. John of Damascus",
  },
  {
    id: "evening-confession",
    title: "Evening Confession of Sins",
    category: "evening",
    suggestedFor: ["evening"],
    body:
      "I confess unto Thee, O Lord my God and Creator, in the Holy Trinity, the One glorified and worshipped Father, and Son, and Holy Spirit: all my sins which I have committed all the days of my life, and at every hour, in the present and in the past day and night, in deeds, words, thoughts, gluttony, drunkenness, secret eating, idle talking, despondency, sloth, contradiction, disobedience, slander, judging, neglect, self-love, greed, rapacity, untruthfulness, dishonesty, money-loving, avarice, jealousy, envy, anger, remembering wrongs, hatred, taking bribes, and in all my senses—sight, hearing, smell, taste, touch—and in other sins, spiritual and physical, by which I have angered Thee my God and Creator, and wronged my neighbor.\n\n" +
      "Sorrowing for this but having no excuse, I repent and pray: help me, O Lord my God, that with tears I may humbly confess my sins, and may be vouchsafed Thy mercy and forgiveness, unto the ages of ages. Amen.",
    attribution: "Jordanville Prayer Book",
  },
  {
    id: "evening-simeon",
    title: "Prayer of St. Simeon the God-Receiver",
    subtitle: "Now lettest Thou Thy servant",
    category: "evening",
    suggestedFor: ["evening"],
    body:
      "Now lettest Thou Thy servant depart in peace, O Master, according to Thy word; for mine eyes have seen Thy salvation which Thou hast prepared before the face of all peoples, a light to enlighten the Gentiles, and the glory of Thy people Israel.",
    attribution: "Luke 2:29–32",
  },

  // ---- Intercession ---------------------------------------------------
  {
    id: "intercession-living",
    title: "For the Living",
    category: "intercession",
    suggestedFor: ["morning", "evening"],
    body:
      "Save, O Lord, and have mercy upon my spiritual father (name); my parents (names); my relatives (names); my godparents and godchildren (names); my brothers and sisters in Christ (names); and all Orthodox Christians.\n\n" +
      "Have mercy on those who hate and offend me, and those who have asked me, unworthy though I be, to pray for them. Save them, O Lord, and have mercy on them, according to Thy great mercy.",
  },
  {
    id: "intercession-departed",
    title: "For the Departed",
    category: "intercession",
    suggestedFor: ["morning", "evening"],
    body:
      "Remember, O Lord, the souls of Thy departed servants: my parents (names), my relatives, my friends, and all who have fallen asleep before me in the hope of the resurrection and life everlasting. Give them rest, O our Lord and God, where the light of Thy countenance shines forth. Pardon all their transgressions, voluntary and involuntary, in word and deed and thought. Establish them in the place of brightness, in the place of green pasture, in the place of repose, whence pain, sorrow, and sighing have fled away. Amen.",
  },
];

// Quick lookup map for rendering a rule by id.
export const PRAYER_BY_ID = new Map<string, PrayerEntry>(
  PRAYER_CORPUS.map((p) => [p.id, p]),
);

export const DYNAMIC_BY_ID = new Map<string, DynamicItem>(
  DYNAMIC_ITEMS.map((d) => [d.id, d]),
);

// Compact starter — pre-selected in a new user's rule. Hand-picked to
// give a meaningful but quick first session in both morning and evening.
export const STARTER_RULE: {
  morning: string[];
  evening: string[];
} = {
  morning: [
    "trisagion",
    "our-father",
    "morning-arising",
    "morning-macarius-1",
    "dyn-gospel",
  ],
  evening: [
    "trisagion",
    "our-father",
    "psalm-50",
    "evening-thanksgiving",
    "evening-simeon",
  ],
};
