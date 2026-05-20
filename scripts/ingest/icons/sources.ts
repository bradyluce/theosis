// Curated Wikimedia Commons source list for Theosis icon ingestion.
// Every entry must resolve to a public-domain or CC0 file — the ingest script
// rejects anything else. Each id becomes the on-disk filename and the iconId
// referenced from Person, DailyCommemoration, or DailyCommemorationItem.
//
// To add an entry: use probe.ts to find a candidate, verify license, then add
// here. Captions and alt text are Theosis-owned editorial prose — do not lift
// from the Commons file description page.

export type IconSource = {
  id: string;
  wikimediaTitle: string;
  alt: string;
  caption?: string;
};

export const iconSources: IconSource[] = [
  // --- Christ ---
  {
    id: "icon-christ-pantocrator-sinai",
    wikimediaTitle: "File:Christ Icon Sinai 6th century.jpg",
    alt: "Sixth-century encaustic icon of Christ Pantocrator from St Catherine's Monastery, Sinai.",
    caption: "Christ Pantocrator, Sinai (6th century)",
  },

  // --- Theotokos ---
  {
    id: "icon-theotokos-vladimir",
    wikimediaTitle: "File:Vladimirskaya.jpg",
    alt: "Twelfth-century Byzantine icon of the Theotokos of Vladimir.",
    caption: "Theotokos of Vladimir",
  },

  // --- Trinity ---
  {
    id: "icon-rublev-trinity",
    wikimediaTitle: "File:Angelsatmamre-trinity-rublev-1410.jpg",
    alt: "Andrei Rublev's icon of the Holy Trinity, c. 1410.",
    caption: "Rublev, Holy Trinity",
  },

  // --- Twelve Great Feasts ---
  {
    id: "icon-feast-nativity-theotokos",
    wikimediaTitle:
      "File:Nikola-Obrazopisov-Belyova-church-Nativity-of-the-Theotokos-icon-1863.jpg",
    alt: "Nineteenth-century icon of the Nativity of the Theotokos.",
    caption: "Nativity of the Theotokos",
  },
  {
    id: "icon-feast-exaltation-cross",
    wikimediaTitle: "File:Exaltation of the Cross - Palekh icon (19 c, priv.coll).jpg",
    alt: "Palekh-school icon of the Exaltation of the Holy Cross.",
    caption: "Exaltation of the Holy Cross",
  },
  {
    id: "icon-feast-presentation-theotokos",
    wikimediaTitle:
      "File:Presentation of Mary, II Half of XIV Century, St Mary Perivleptos Church, Ohrid Icon Gallery.jpg",
    alt: "Fourteenth-century icon of the Entrance of the Theotokos into the Temple, Ohrid.",
    caption: "Entrance of the Theotokos into the Temple",
  },
  {
    id: "icon-feast-nativity-christ",
    wikimediaTitle: "File:The Nativity of Christ Dionysius of Fourna.png",
    alt: "Icon of the Nativity of Christ after Dionysius of Fourna.",
    caption: "Nativity of Christ",
  },
  {
    id: "icon-feast-theophany",
    wikimediaTitle: "File:Bogojavlenie.jpg",
    alt: "Russian icon of the Theophany — the Baptism of Christ in the Jordan.",
    caption: "Theophany",
  },
  {
    id: "icon-feast-meeting-of-lord",
    wikimediaTitle:
      "File:Novgorod School - The Presentation of Christ in the Temple - NG.M.02382 - National Museum of Art, Architecture and Design.jpg",
    alt: "Novgorod-school icon of the Meeting of the Lord — the Presentation of Christ in the Temple.",
    caption: "Meeting of the Lord",
  },
  {
    id: "icon-feast-annunciation",
    wikimediaTitle: "File:Annunciation. Orthodox icon.jpg",
    alt: "Orthodox icon of the Annunciation of the Theotokos.",
    caption: "Annunciation of the Theotokos",
  },
  {
    id: "icon-feast-entry-jerusalem",
    wikimediaTitle:
      "File:Russian School - Icon with Entry into Jerusalem - FA001223 - Brighton Museum ^ Art Gallery.jpg",
    alt: "Russian icon of the Entry of the Lord into Jerusalem.",
    caption: "Entry into Jerusalem",
  },
  {
    id: "icon-feast-resurrection",
    wikimediaTitle:
      "File:Resurrection of Christ Icon by Toma Vishanov from Holy Trinity Church in Bansko.jpg",
    alt: "Icon of the Resurrection of Christ — the Anastasis — by Toma Vishanov.",
    caption: "Resurrection of Christ (Anastasis)",
  },
  {
    id: "icon-feast-ascension",
    wikimediaTitle: "File:Ascension of Jesus icon, Lattakia (1667).jpg",
    alt: "Seventeenth-century Antiochian icon of the Ascension of the Lord.",
    caption: "Ascension of the Lord",
  },
  {
    id: "icon-feast-pentecost",
    wikimediaTitle: "File:Pentecost Dionysius of Fourna.png",
    alt: "Icon of Holy Pentecost after Dionysius of Fourna.",
    caption: "Holy Pentecost",
  },
  {
    id: "icon-feast-transfiguration",
    wikimediaTitle: "File:Greek - Transfiguration of Christ - Walters 371081.jpg",
    alt: "Greek icon of the Transfiguration of Christ on Mount Tabor.",
    caption: "Transfiguration of Christ",
  },
  {
    id: "icon-feast-dormition",
    wikimediaTitle: "File:Dormition of Theotokos Andreas Ritzos.jpg",
    alt: "Icon of the Dormition of the Theotokos by Andreas Ritzos.",
    caption: "Dormition of the Theotokos",
  },

  // --- Major saints ---
  {
    id: "icon-st-nicholas-myra",
    wikimediaTitle: "File:Russian - Icon of Saint Nicholas - Walters 44648.jpg",
    alt: "Russian icon of Saint Nicholas the Wonderworker, Archbishop of Myra.",
    caption: "Saint Nicholas of Myra",
  },
  {
    id: "icon-st-john-chrysostom",
    wikimediaTitle: "File:John Chrysostom (Dionisius).jpg",
    alt: "Icon of Saint John Chrysostom by Dionisius.",
    caption: "Saint John Chrysostom",
  },
  {
    id: "icon-st-basil-the-great",
    wikimediaTitle:
      "File:Novgorod School - Saint Basil the Great - NG.M.01523 - National Museum of Art, Architecture and Design.jpg",
    alt: "Novgorod-school icon of Saint Basil the Great.",
    caption: "Saint Basil the Great",
  },
  {
    id: "icon-st-mary-of-egypt",
    wikimediaTitle: "File:Icon of Mary of Egypt (Mstera, 19th c.).jpg",
    alt: "Mstera-school icon of Saint Mary of Egypt.",
    caption: "Saint Mary of Egypt",
  },
  {
    id: "icon-st-seraphim-of-sarov",
    wikimediaTitle: "File:Seraphim of Sarov (after 1903, priv.coll).jpg",
    alt: "Russian icon of Saint Seraphim of Sarov.",
    caption: "Saint Seraphim of Sarov",
  },
  {
    id: "icon-st-sergius-of-radonezh",
    wikimediaTitle: "File:Sergius of Radonezh vita icon (17 c., Yaroslavl museum).jpg",
    alt: "Seventeenth-century vita icon of Saint Sergius of Radonezh.",
    caption: "Saint Sergius of Radonezh",
  },
  {
    id: "icon-st-anthony-the-great",
    wikimediaTitle: "File:Anthony the Great icon (lebanon).jpg",
    alt: "Icon of Saint Anthony the Great, father of monastics.",
    caption: "Saint Anthony the Great",
  },
  {
    id: "icon-st-george-trophy-bearer",
    wikimediaTitle:
      "File:Saint George icon. Novgorod icon-painting school, 15th cent.., Veliky Novgorod, Russia. Tretyakov Gallery.jpg",
    alt: "Fifteenth-century Novgorod-school icon of Saint George the Trophy-Bearer.",
    caption: "Saint George the Trophy-Bearer",
  },
];
