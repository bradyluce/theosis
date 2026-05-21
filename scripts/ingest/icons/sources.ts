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
  {
    id: "icon-feast-first-ecumenical-council",
    wikimediaTitle:
      "File:044 Sunday of the Holy Fathers of the First. Ecumenical Council Icon from Saint Paraskevi Church in Langadas.jpg",
    alt: "Icon of the Sunday of the Holy Fathers of the First Ecumenical Council.",
    caption: "Sunday of the Holy Fathers",
  },

  // --- Movable cycle / Lenten Triodion & Pentecostarion ---
  {
    id: "icon-feast-publican-pharisee",
    wikimediaTitle: "File:Pharisee and the Publican.png",
    alt: "Icon of the Parable of the Publican and the Pharisee.",
    caption: "Sunday of the Publican and the Pharisee",
  },
  {
    id: "icon-feast-last-judgment",
    wikimediaTitle: "File:Last Judgment by F.Kavertzas (1640-41).jpg",
    alt: "Seventeenth-century icon of the Last Judgment by Franghias Kavertzas.",
    caption: "Sunday of the Last Judgment",
  },
  {
    id: "icon-feast-expulsion-of-adam",
    wikimediaTitle:
      "File:041 Expulsion from the Garden of Eden Icon from Saint Paraskevi Church in Langadas.jpg",
    alt: "Icon of the Expulsion of Adam and Eve from Paradise.",
    caption: "Forgiveness Sunday — Expulsion of Adam",
  },
  {
    id: "icon-feast-sunday-orthodoxy",
    wikimediaTitle: "File:Triumph orthodoxy.jpg",
    alt: "Icon of the Triumph of Orthodoxy — the restoration of the holy icons.",
    caption: "Sunday of Orthodoxy",
  },
  {
    id: "icon-feast-veneration-cross",
    wikimediaTitle:
      "File:Veneration of a Cross by I.Saltanov (1677-8, Kremlin museum).jpg",
    alt: "Icon of the Veneration of the Precious Cross by Ivan Saltanov, Kremlin Museum.",
    caption: "Sunday of the Veneration of the Cross",
  },
  {
    id: "icon-feast-ladder-of-divine-ascent",
    wikimediaTitle: "File:The Ladder of Divine Ascent-Sinai.jpg",
    alt: "Twelfth-century Sinai icon of the Ladder of Divine Ascent.",
    caption: "Sunday of St. John Climacus",
  },
  {
    id: "icon-feast-raising-of-lazarus",
    wikimediaTitle:
      "File:The Lazarus Raising. Novgorod icon-painting school, 15th cent., Kirillo-Belozersky Monastery. Saint-Petersburg, Russia.jpg",
    alt: "Fifteenth-century Novgorod-school icon of the Raising of Lazarus.",
    caption: "Lazarus Saturday",
  },
  {
    id: "icon-feast-crucifixion",
    wikimediaTitle: "File:Icon of Passion of Jesus Christ, Novgorod.jpg",
    alt: "Novgorod icon of the Passion and Crucifixion of Christ.",
    caption: "Holy and Great Friday",
  },
  {
    id: "icon-feast-thomas-sunday",
    wikimediaTitle:
      "File:061 Incredulity of Thomas Icon from Saint Paraskevi Church in Langadas.jpg",
    alt: "Icon of the Incredulity of Thomas, kept on Antipascha.",
    caption: "Sunday of Thomas (Antipascha)",
  },
  {
    id: "icon-feast-myrrhbearers",
    wikimediaTitle:
      "File:0662Ha. Hermitage Museum (Hall 143). Icon of the Myrrh-Bearing Women at the Tomb.jpg",
    alt: "Icon of the Myrrh-Bearing Women at the empty tomb of Christ.",
    caption: "Sunday of the Myrrh-Bearing Women",
  },
  {
    id: "icon-feast-mid-pentecost",
    wikimediaTitle:
      "File:007 Mid-Pentecost Icon from Saint Paraskevi Church in Langadas.jpg",
    alt: "Icon of Mid-Pentecost, Christ teaching among the doctors in the Temple.",
    caption: "Mid-Pentecost",
  },
  {
    id: "icon-feast-samaritan-woman",
    wikimediaTitle:
      "File:013 Sunday of the Samaritan Woman Icon from Saint Paraskevi Church in Langadas.jpg",
    alt: "Icon of Christ and the Samaritan Woman at Jacob's Well.",
    caption: "Sunday of the Samaritan Woman",
  },
  {
    id: "icon-feast-blind-man",
    wikimediaTitle: "File:Jesus healing the blind XIX c. Brashlyan.jpg",
    alt: "Icon of Christ healing the man born blind.",
    caption: "Sunday of the Blind Man",
  },
  {
    id: "icon-feast-zacchaeus",
    wikimediaTitle: "File:Saint Zacchaeus - Orthodox Icon.png",
    alt: "Orthodox icon of Zacchaeus the publican in the sycamore tree.",
    caption: "Sunday of Zacchaeus",
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
  {
    id: "icon-symeon-the-stylite",
    wikimediaTitle: "File:Saint Simeon Stylites the Elder (1664 icon).jpg",
    alt: "Seventeenth-century icon of Saint Symeon the Stylite the Elder.",
    caption: "Saint Symeon the Stylite",
  },

  // --- Famous saints the auto-curator missed (name-matching quirks) ---
  {
    id: "icon-john-the-forerunner",
    wikimediaTitle: "File:Icon of John the Baptist (Yaroslavl, 1551).jpg",
    alt: "Sixteenth-century Yaroslavl icon of Saint John the Forerunner and Baptist.",
    caption: "Saint John the Forerunner",
  },
  {
    id: "icon-apostle-james-zebedee",
    wikimediaTitle: "File:James son of Zebedee.jpg",
    alt: "Icon of Saint James, son of Zebedee, the Apostle.",
    caption: "Apostle James the Greater",
  },
  {
    id: "icon-joachim-and-anna",
    wikimediaTitle: "File:The Meeting of Joachim and Anna.jpg",
    alt: "Icon of the Meeting of the Holy Ancestors Joachim and Anna at the Golden Gate.",
    caption: "Holy Ancestors Joachim and Anna",
  },
  {
    id: "icon-photini-the-samaritan",
    wikimediaTitle: "File:Icon of Agia Fotini-Pachia Ammos-Lasithi.JPG",
    alt: "Icon of Saint Photini the Samaritan, the Equal-to-the-Apostles.",
    caption: "Saint Photini the Samaritan",
  },
  {
    id: "icon-john-climacus",
    wikimediaTitle: "File:John Climacus.jpg",
    alt: "Icon of Saint John Climacus, author of The Ladder of Divine Ascent.",
    caption: "Saint John Climacus",
  },

  // --- More famous saints curated after Wikidata pass ---
  {
    id: "icon-catherine-of-alexandria",
    wikimediaTitle: "File:Saint Catherine Icon by Toma Vishanov.jpg",
    alt: "Icon of Saint Catherine the Great-martyr of Alexandria, by Toma Vishanov.",
    caption: "Saint Catherine of Alexandria",
  },
  {
    id: "icon-constantine-the-great",
    wikimediaTitle:
      "File:070 Saints Constantine and Helen Icon from Saint Paraskevi Church in Langadas.jpg",
    alt: "Icon of the Holy Equal-to-the-Apostles Constantine and Helen.",
    caption: "Saints Constantine and Helen",
  },
  {
    id: "icon-helen-equal-to-apostles",
    wikimediaTitle:
      "File:070 Saints Constantine and Helen Icon from Saint Paraskevi Church in Langadas.jpg",
    alt: "Icon of the Holy Equal-to-the-Apostles Constantine and Helen.",
    caption: "Saints Constantine and Helen",
  },
  {
    id: "icon-mary-magdalene",
    wikimediaTitle: "File:Maria Magdalene icon.jpg",
    alt: "Icon of Saint Mary Magdalene, the Equal-to-the-Apostles and Myrrh-bearer.",
    caption: "Saint Mary Magdalene",
  },
  {
    id: "icon-vladimir-of-kiev",
    wikimediaTitle: "File:Saint Vladimir icon (GTG, 15 c.).jpg",
    alt: "Fifteenth-century icon of Holy Great Prince Vladimir of Kiev, Equal-to-the-Apostles.",
    caption: "Saint Vladimir of Kiev",
  },
  {
    id: "icon-olga-of-kiev",
    wikimediaTitle: "File:Saint Olga of Kiev (19th c.).jpg",
    alt: "Nineteenth-century icon of Holy Princess Olga of Kiev, Equal-to-the-Apostles.",
    caption: "Saint Olga of Kiev",
  },
  {
    id: "icon-panteleimon-the-healer",
    wikimediaTitle: "File:Saint Panteleimon Resurrects a Dead Man Gavril Atanasov 1893.jpg",
    alt: "Icon of Saint Panteleimon the Healer raising a dead man, by Gavril Atanasov, 1893.",
    caption: "Saint Panteleimon the Healer",
  },
  {
    id: "icon-ignatius-of-antioch",
    wikimediaTitle:
      "File:Ignatius of Antioch by M.Dikarev (1894, Hermitage).jpg",
    alt: "Icon of the Hieromartyr Ignatius the God-bearer of Antioch by M. Dikarev, 1894.",
    caption: "Saint Ignatius of Antioch",
  },
  {
    id: "icon-moses-the-black",
    wikimediaTitle: "File:Saints Poimen, Elijah, and Moses the Black.jpg",
    alt: "Icon of Saints Poemen the Great, Elijah the Prophet, and Moses the Black of Scetis.",
    caption: "Saint Moses the Black",
  },
  {
    id: "icon-nina-of-georgia",
    wikimediaTitle: "File:Saint Nino (Palekh, 20th c., priv.coll).jpg",
    alt: "Twentieth-century Palekh-school icon of Saint Nina, Equal-to-the-Apostles, Enlightener of Georgia.",
    caption: "Saint Nina of Georgia",
  },
  {
    id: "icon-xenia-of-petersburg",
    wikimediaTitle: "File:Ksenia of petersbourg.jpeg",
    alt: "Icon of Blessed Xenia of Saint Petersburg, Fool-for-Christ.",
    caption: "Blessed Xenia of Petersburg",
  },
  {
    id: "icon-charalampias",
    wikimediaTitle:
      "File:048 Saint Charalambos Icon from Saint Paraskevi Church in Langadas.jpg",
    alt: "Icon of the Hieromartyr Charalampias, Bishop of Magnesia.",
    caption: "Saint Charalampias",
  },
  {
    id: "icon-cyprian-of-carthage",
    wikimediaTitle: "File:Stcyprian.jpg",
    alt: "Icon of the Hieromartyr Cyprian of Carthage.",
    caption: "Saint Cyprian of Carthage",
  },
  {
    id: "icon-gregory-the-wonderworker",
    wikimediaTitle: "File:Gregory Thaumaturgus.jpg",
    alt: "Icon of Saint Gregory the Wonderworker, Bishop of Neo-Caesarea.",
    caption: "Saint Gregory the Wonderworker",
  },
  {
    id: "icon-lawrence-the-archdeacon",
    wikimediaTitle:
      "File:Lawrence of Rome by M.Dikarev (1897, Hermitage).jpg",
    alt: "Icon of the Hieromartyr Lawrence the Archdeacon of Rome, by M. Dikarev, 1897.",
    caption: "Saint Lawrence the Archdeacon",
  },
  {
    id: "icon-theodore-the-tyro",
    wikimediaTitle:
      "File:Theodore Tyron by O.Chirikov (1891, Abramov's icon museum).jpg",
    alt: "Icon of the Great-martyr Theodore the Tyro (the Recruit), by O. Chirikov, 1891.",
    caption: "Saint Theodore the Tyro",
  },
  {
    id: "icon-cosmas-and-damian-of-asia",
    wikimediaTitle:
      "File:011 Saints Cosmas and Damian Icon from Saint Paraskevi Church in Langadas.jpg",
    alt: "Icon of the Holy Unmercenaries Cosmas and Damian of Asia.",
    caption: "Saints Cosmas and Damian",
  },
  {
    id: "icon-apostle-jude",
    wikimediaTitle: "File:Russian Icon of Apostle Jude Thaddeus, Kizhi.jpg",
    alt: "Russian icon of the Holy Apostle Jude Thaddeus.",
    caption: "Apostle Jude Thaddeus",
  },
  {
    id: "icon-prophet-jonah",
    wikimediaTitle: "File:Jonah.jpg",
    alt: "Icon of the Holy Prophet Jonah.",
    caption: "Prophet Jonah",
  },
  {
    id: "icon-prophet-habakkuk",
    wikimediaTitle: "File:Prophet Habakkuk Пророк Аввакум.jpg",
    alt: "Icon of the Holy Prophet Habakkuk.",
    caption: "Prophet Habakkuk",
  },
  {
    id: "icon-prophet-moses",
    wikimediaTitle: "File:Moses-icon.jpg",
    alt: "Icon of the Holy Prophet Moses the God-Seer.",
    caption: "Prophet Moses the God-Seer",
  },
  {
    id: "icon-prophet-zechariah-of-twelve",
    wikimediaTitle: "File:Zechariah (central Russia, 17 c, priv.coll).jpg",
    alt: "Seventeenth-century Russian icon of the Prophet Zechariah, one of the Twelve.",
    caption: "Prophet Zechariah of the Twelve",
  },
  {
    id: "icon-tikhon-of-moscow",
    wikimediaTitle: "File:Tikhon of Moscow.jpg",
    alt: "Icon of Saint Tikhon, Patriarch and Confessor of Moscow.",
    caption: "Saint Tikhon of Moscow",
  },
  {
    id: "icon-job-the-long-suffering",
    wikimediaTitle: "File:Иов Многострадальный. Чтец.jpg",
    alt: "Icon of the Righteous Job the Long-Suffering.",
    caption: "Job the Long-Suffering",
  },
  {
    id: "icon-patriarch-jacob",
    wikimediaTitle: "File:I ForeFather Jacob.jpg",
    alt: "Icon of the Holy Forefather Jacob.",
    caption: "Patriarch Jacob",
  },
  {
    id: "icon-patriarch-isaac",
    wikimediaTitle: "File:John in Korovniki church - patriarch 10 Isaak (c. 1654, Yaroslavl).jpg",
    alt: "Seventeenth-century Yaroslavl icon of the Holy Forefather Isaac.",
    caption: "Patriarch Isaac",
  },
  {
    id: "icon-anastasia-the-deliverer",
    wikimediaTitle:
      "File:Saint Anastasia Pharmakolytria Icon in Saint Athanasius Church in Livadi, Sterios Dimitriou, 1845.jpg",
    alt: "Icon of Great-martyr Anastasia the Deliverer-from-bonds (Pharmakolytria).",
    caption: "Great-martyr Anastasia",
  },
  {
    id: "icon-anna-of-kashin",
    wikimediaTitle: "File:Anna of Kashin 02.jpg",
    alt: "Icon of Holy Princess Anna of Kashin.",
    caption: "Saint Anna of Kashin",
  },
  {
    id: "icon-theotokos",
    wikimediaTitle: "File:Theotokos Hodegetria XVII c. Nesebar.jpg",
    alt: "Seventeenth-century icon of the Most Holy Theotokos Hodegetria from Nesebar.",
    caption: "The Most Holy Theotokos",
  },
];
