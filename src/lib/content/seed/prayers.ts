// Traditional Orthodox prayers — English texts as they appear in widely
// circulated public-domain sources (Hapgood 1906, Jordanville prayer book
// recensions in the public domain, and standard Hours service books).
// Theosis-owned typesetting: the words are inherited; formatting,
// rubric labels, and section grouping are our editorial choices.
//
// PrayerRubric distinguishes texts the worshipper SAYS from rubrics the
// priest/cantor recites and from notes describing the act. The reader UI
// styles them differently (rubrics smaller / italic).

export type PrayerRubric = "say" | "rubric" | "note" | "trisagion";

export type PrayerSection = {
  // Optional heading rendered above the section, e.g. "The Trisagion".
  heading?: string;
  // One or more lines. Empty lines render as a paragraph break.
  lines: { kind: PrayerRubric; text: string }[];
  // Optional short context paragraph between heading and lines.
  context?: string;
};

export type PrayerSet = {
  id: string;
  slug: string;
  title: string;
  // Short subtitle / eyebrow.
  subtitle: string;
  // Estimated time to pray, in minutes.
  minutes: number;
  // Short context paragraph at the top of the reader.
  intro: string;
  sections: PrayerSection[];
};

// The opening invocation — shared between morning and evening rules. We
// duplicate rather than alias so the section list reads top-to-bottom.
const trisagionPrayers: PrayerSection[] = [
  {
    heading: "Opening",
    lines: [
      { kind: "say", text: "In the name of the Father, and of the Son, and of the Holy Spirit. Amen." },
      { kind: "say", text: "Glory to Thee, our God, glory to Thee." },
      {
        kind: "say",
        text:
          "O Heavenly King, Comforter, Spirit of Truth, who art everywhere present and fillest all things, Treasury of good things and Giver of Life: come and abide in us, and cleanse us from every stain, and save our souls, O Good One.",
      },
    ],
  },
  {
    heading: "The Trisagion",
    lines: [
      { kind: "trisagion", text: "Holy God, Holy Mighty, Holy Immortal, have mercy on us. (×3)" },
      { kind: "say", text: "Glory to the Father, and to the Son, and to the Holy Spirit, now and ever and unto the ages of ages. Amen." },
      {
        kind: "say",
        text:
          "O Most Holy Trinity, have mercy on us. O Lord, cleanse us from our sins. O Master, pardon our transgressions. O Holy One, visit and heal our infirmities for Thy name’s sake.",
      },
      { kind: "say", text: "Lord, have mercy. Lord, have mercy. Lord, have mercy." },
      { kind: "say", text: "Glory to the Father, and to the Son, and to the Holy Spirit, now and ever and unto the ages of ages. Amen." },
    ],
  },
  {
    heading: "The Lord’s Prayer",
    lines: [
      {
        kind: "say",
        text:
          "Our Father, who art in the heavens, hallowed be Thy name. Thy kingdom come. Thy will be done, on earth as it is in heaven. Give us this day our daily bread, and forgive us our trespasses, as we forgive those who trespass against us. And lead us not into temptation, but deliver us from the evil one.",
      },
    ],
  },
];

const morningPrayers: PrayerSet = {
  id: "prayer-morning",
  slug: "morning",
  title: "Morning Prayers",
  subtitle: "On rising from sleep",
  minutes: 8,
  intro:
    "The traditional Orthodox prayers said upon rising. Stand before your icon corner if you have one, make the sign of the Cross, and begin slowly. The full rule is below; on short days, the Trisagion through the Lord’s Prayer is enough.",
  sections: [
    {
      heading: "On Rising",
      lines: [
        { kind: "note", text: "Make the sign of the Cross and say:" },
        {
          kind: "say",
          text:
            "Having risen from sleep, I thank Thee, O Holy Trinity, that for the sake of Thy great kindness and long-suffering Thou hast not had indignation against me, slothful and sinful as I am; neither hast Thou destroyed me in my transgressions, but in Thy love toward mankind hast raised me up, as I lay in despair, that at dawn I might glorify Thy majesty.",
        },
        {
          kind: "say",
          text:
            "Enlighten the eyes of my understanding, open my mouth to receive Thy words, teach me Thy commandments, help me to do Thy will, confessing Thee from my heart, singing and praising Thine all-holy name: of the Father, and of the Son, and of the Holy Spirit, now and ever and unto the ages of ages. Amen.",
        },
      ],
    },
    ...trisagionPrayers,
    {
      heading: "The Symbol of Faith",
      context:
        "The Niceno-Constantinopolitan Creed, confessed at every Liturgy.",
      lines: [
        {
          kind: "say",
          text:
            "I believe in one God, the Father Almighty, Maker of heaven and earth, and of all things visible and invisible.",
        },
        {
          kind: "say",
          text:
            "And in one Lord, Jesus Christ, the Son of God, the only-begotten, begotten of the Father before all ages: Light of Light, true God of true God, begotten, not made; of one essence with the Father, by whom all things were made.",
        },
        {
          kind: "say",
          text:
            "Who for us men and for our salvation came down from the heavens, and was incarnate of the Holy Spirit and the Virgin Mary, and became man.",
        },
        {
          kind: "say",
          text:
            "And He was crucified for us under Pontius Pilate, and suffered, and was buried.",
        },
        {
          kind: "say",
          text:
            "And the third day He arose again, according to the Scriptures, and ascended into the heavens, and sitteth at the right hand of the Father.",
        },
        {
          kind: "say",
          text:
            "And He shall come again with glory to judge the living and the dead, whose Kingdom shall have no end.",
        },
        {
          kind: "say",
          text:
            "And in the Holy Spirit, the Lord, the Giver of Life, who proceedeth from the Father, who with the Father and the Son together is worshipped and glorified, who spake by the prophets.",
        },
        {
          kind: "say",
          text:
            "In one, Holy, Catholic, and Apostolic Church. I confess one baptism for the remission of sins. I look for the resurrection of the dead, and the life of the age to come. Amen.",
        },
      ],
    },
    {
      heading: "Prayer of St. Macarius the Great",
      lines: [
        {
          kind: "say",
          text:
            "O God, cleanse me, a sinner, for I have never done anything good in Thy sight; deliver me also from the evil one, and let Thy will be in me, that without condemnation I may open my unworthy mouth and praise Thy holy name: of the Father, and of the Son, and of the Holy Spirit, now and ever and unto the ages of ages. Amen.",
        },
      ],
    },
    {
      heading: "To the Most Holy Theotokos",
      lines: [
        {
          kind: "say",
          text:
            "O most holy Lady, Theotokos: by thy holy and all-powerful prayers, drive far from me, thy humble and wretched servant, despondency, forgetfulness, foolishness, carelessness, and all defiled, evil, and blasphemous thoughts from my wretched heart and my darkened mind.",
        },
        {
          kind: "say",
          text:
            "And quench the flame of my passions, for I am poor and wretched. Deliver me from my many cruel memories and deeds, and free me from all their evil effects.",
        },
      ],
    },
    {
      heading: "Conclusion",
      lines: [
        { kind: "say", text: "It is truly meet to bless thee, O Theotokos, ever-blessed and most pure, and the Mother of our God." },
        { kind: "say", text: "More honorable than the Cherubim, and beyond compare more glorious than the Seraphim; who, without corruption, gavest birth to God the Word: the very Theotokos, thee do we magnify." },
        { kind: "rubric", text: "Cross oneself thrice. The day’s work begins now in the Lord." },
      ],
    },
  ],
};

const eveningPrayers: PrayerSet = {
  id: "prayer-evening",
  slug: "evening",
  title: "Evening Prayers",
  subtitle: "At the end of the day",
  minutes: 8,
  intro:
    "The evening rule examines the conscience and entrusts the night to God. Pray slowly; do not hurry to bed. Sleep follows prayer, not the other way around.",
  sections: [
    ...trisagionPrayers,
    {
      heading: "Prayer of St. Macarius",
      lines: [
        {
          kind: "say",
          text:
            "O Eternal God, King of all creation, who hast accounted me worthy to attain even unto this hour: forgive me the sins I have committed this day in deed, word, and thought, and cleanse, O Lord, my humble soul from every defilement of flesh and spirit.",
        },
        {
          kind: "say",
          text:
            "Grant me, O Lord, to pass the sleep of this night in peace; that, rising from my lowly bed, I may please Thy most holy name all the days of my life, and conquer the foes, both fleshly and bodiless, which battle against me.",
        },
        {
          kind: "say",
          text:
            "And deliver me, O Lord, from vain thoughts which defile me, and from evil desires. For thine is the Kingdom, and the power, and the glory: of the Father, and of the Son, and of the Holy Spirit, now and ever and unto the ages of ages. Amen.",
        },
      ],
    },
    {
      heading: "Examination of Conscience",
      context:
        "Stand quietly. Recall the day. Where did you sin in thought, word, or deed? Where did you neglect to do good? Confess these to God now; bring them to the priest in due season.",
      lines: [
        {
          kind: "note",
          text: "Pause in silence. Name to God, briefly, the sins of this day.",
        },
        {
          kind: "say",
          text:
            "Forgive, O Lord, every soul of Christian people that hath grieved Thee this day, and grant me a quiet and peaceful sleep, that, rising from my bed, I may please Thy most holy name all the days of my life. Amen.",
        },
      ],
    },
    {
      heading: "Prayer Before Sleep",
      lines: [
        {
          kind: "say",
          text:
            "Into Thy hands, O Lord Jesus Christ, my God, I commend my spirit and my body. Do Thou bless me, do Thou have mercy upon me, and grant me everlasting life. Amen.",
        },
        { kind: "rubric", text: "Kiss the cross at the head of the bed and lie down in peace." },
      ],
    },
  ],
};

const compline: PrayerSet = {
  id: "prayer-compline-light",
  slug: "compline-light",
  title: "Small Compline (excerpts)",
  subtitle: "A short office for night",
  minutes: 6,
  intro:
    "An abridged form of Small Compline, suitable for night prayer when the full office isn’t possible. Begin with the Trisagion prayers, then continue below.",
  sections: [
    {
      heading: "Psalm 50",
      context: "King David’s great prayer of repentance, said at most services.",
      lines: [
        {
          kind: "say",
          text:
            "Have mercy on me, O God, according to Thy great mercy; and according to the multitude of Thy compassions blot out my transgression.",
        },
        {
          kind: "say",
          text:
            "Wash me thoroughly from mine iniquity, and cleanse me from my sin. For I know mine iniquity, and my sin is ever before me.",
        },
        {
          kind: "say",
          text:
            "Create in me a clean heart, O God, and renew a right spirit within me. Cast me not away from Thy presence, and take not Thy Holy Spirit from me. Restore unto me the joy of Thy salvation, and uphold me with Thy governing Spirit.",
        },
      ],
    },
    {
      heading: "Hymn to the Theotokos",
      lines: [
        {
          kind: "say",
          text:
            "It is truly meet to bless thee, O Theotokos, ever-blessed and most pure, and the Mother of our God. More honorable than the Cherubim, and beyond compare more glorious than the Seraphim; who, without corruption, gavest birth to God the Word: the very Theotokos, thee do we magnify.",
        },
      ],
    },
    {
      heading: "Dismissal",
      lines: [
        {
          kind: "say",
          text:
            "Through the prayers of our holy fathers, O Lord Jesus Christ our God, have mercy on us. Amen.",
        },
      ],
    },
  ],
};

export const prayerSets: PrayerSet[] = [morningPrayers, eveningPrayers, compline];

export function getPrayerSetBySlug(slug: string): PrayerSet | undefined {
  return prayerSets.find((set) => set.slug === slug);
}
