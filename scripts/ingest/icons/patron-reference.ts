// Curated reference list of Orthodox saints commonly chosen as patron saints,
// weighted toward the saints American/convert Orthodox actually pick across
// jurisdictions (OCA, Greek, Antiochian, ROCOR, Serbian, Romanian, Georgian)
// plus the classic universal saints. Used by audit-patrons.ts to check coverage
// against the live library people list. NOT shipped to the app.
//
// Each entry: display name + `any` (distinctive tokens — match if a library
// person's name contains ANY of them) and/or `all` (match only if the name
// contains ALL tokens, for disambiguating common first names).

export type PatronRef = {
  name: string;
  any?: string[]; // match if row name contains any one of these
  all?: string[]; // match if row name contains all of these
  era?: "classic" | "modern"; // modern = 18th c. onward (icon licensing risk)
};

export const PATRON_REFERENCE: PatronRef[] = [
  // ── Archangels ──
  { name: "Archangel Michael", any: ["michael the archangel", "archangel michael"] },
  { name: "Archangel Gabriel", all: ["archangel", "gabriel"] },
  { name: "Archangel Raphael (Angel)", all: ["archangel", "raphael"] },

  // ── Old Testament ──
  { name: "Prophet Elijah/Elias", any: ["elijah", "elias the"] },
  { name: "Prophet Moses (God-seer)", any: ["moses the prophet", "moses the god"] },
  { name: "Prophet Elisha", any: ["elisha", "eliseus"] },
  { name: "Prophet Isaiah", any: ["isaiah"] },
  { name: "Prophet Jeremiah", any: ["jeremiah", "jeremias"] },
  { name: "Prophet Ezekiel", any: ["ezekiel"] },
  { name: "Prophet Daniel", any: ["daniel the prophet"] },
  { name: "Prophet David the King", any: ["david the king", "david the prophet"] },
  { name: "Righteous Job", any: ["job the long", "righteous job"] },
  { name: "Prophet Jonah", any: ["jonah", "jonas the prophet"] },

  // ── New Testament: Apostles ──
  { name: "Apostle Andrew the First-Called", any: ["andrew the first", "andrew the apostle"] },
  { name: "Apostle Peter", all: ["peter", "apostle"] },
  { name: "Apostle Paul", any: ["paul the apostle", "apostle paul"] },
  { name: "Apostle John the Theologian", any: ["john the theologian", "john the evangelist", "john the apostle"] },
  { name: "Apostle James (son of Zebedee)", any: ["james the greater", "james son of zebedee", "james, son of zebedee"] },
  { name: "Apostle James the Just (Brother of God)", any: ["james the just", "james the brother", "james, the brother"] },
  { name: "Apostle Philip", all: ["philip", "apostle"] },
  { name: "Apostle Bartholomew/Nathanael", any: ["bartholomew", "nathanael"] },
  { name: "Apostle Thomas", any: ["thomas the apostle", "apostle thomas"] },
  { name: "Apostle Matthew", any: ["matthew the apostle", "matthew the evangelist", "apostle matthew"] },
  { name: "Apostle Mark the Evangelist", any: ["mark the evangelist", "mark the apostle"] },
  { name: "Apostle Luke the Evangelist", any: ["luke the evangelist", "luke the apostle"] },
  { name: "Apostle Simon the Zealot", any: ["simon the zealot", "simon the canaan"] },
  { name: "Apostle Jude/Thaddeus", any: ["jude the", "thaddeus", "judas thaddeus"] },
  { name: "Apostle Matthias", any: ["matthias"] },
  { name: "Apostle Barnabas", any: ["barnabas"] },
  { name: "Apostle Timothy", any: ["timothy"] },
  { name: "Apostle Titus", any: ["titus the apostle", "titus, apostle"] },
  { name: "Apostle Silas", any: ["silas"] },
  { name: "Protomartyr Stephen", any: ["stephen the proto", "stephen the first", "protomartyr stephen"] },
  { name: "John the Baptist/Forerunner", any: ["john the baptist", "john the forerunner", "forerunner"] },

  // ── New Testament: Myrrhbearers & others ──
  { name: "Mary Magdalene", any: ["magdalene"] },
  { name: "Martha and Mary of Bethany", any: ["of bethany", "martha and mary"] },
  { name: "Righteous Lazarus", any: ["lazarus the four", "lazarus of bethany", "righteous lazarus"] },
  { name: "Photini the Samaritan Woman", any: ["photini", "photina"] },
  { name: "Joseph of Arimathea", any: ["arimathea"] },
  { name: "Nicodemus", any: ["nicodemus"] },
  { name: "Joachim and Anna", any: ["joachim", "righteous anna", "anna the mother"] },
  { name: "Simeon the God-receiver", any: ["god-receiver", "god-bearer simeon", "simeon the elder"] },
  { name: "Tabitha", any: ["tabitha"] },

  // ── Great Martyrs & early martyrs ──
  { name: "Great Martyr George", any: ["george the great", "george the trophy", "george the victorious"] },
  { name: "Great Martyr Demetrios of Thessaloniki", any: ["demetrios", "demetrius of thess", "demetrius the"] },
  { name: "Great Martyr Panteleimon", any: ["panteleimon", "pantaleon"] },
  { name: "Great Martyr Theodore the Tyro", any: ["theodore the tyro", "theodore the recruit", "theodore tyro"] },
  { name: "Great Martyr Theodore Stratelates", any: ["stratelates"] },
  { name: "Great Martyr Catherine of Alexandria", any: ["catherine of alexandria", "catherine the great"] },
  { name: "Great Martyr Barbara", any: ["barbara the great", "great martyr barbara", "barbara, great"] },
  { name: "Great Martyr Marina/Margaret", any: ["marina the great", "marina of antioch", "margaret of antioch"] },
  { name: "Great Martyr Irene", any: ["irene the great", "great martyr irene", "irene of thess"] },
  { name: "Martyr Paraskeva (Friday)", any: ["paraskeva", "paraskevi", "parasceva"] },
  { name: "Great Martyr Anastasia", any: ["anastasia the", "anastasia of"] },
  { name: "Great Martyr Eustathios/Eustace", any: ["eustathius", "eustace", "eustathios"] },
  { name: "Martyr Menas/Mina", any: ["menas", "mina the"] },
  { name: "Martyr Christopher", any: ["christopher the"] },
  { name: "Martyr Tryphon", any: ["tryphon"] },
  { name: "Hieromartyr Charalampos", any: ["charalampos", "charalambos", "charalampus", "charalampius"] },
  { name: "Martyrs Cyprian and Justina", any: ["cyprian and justina", "justina"] },
  { name: "Great Martyr Procopius", any: ["procopius"] },
  { name: "Great Martyr Mercurius", any: ["mercurius"] },
  { name: "Great Martyr Artemios", any: ["artemius", "artemios"] },
  { name: "Martyr Sebastian (Rome)", all: ["sebastian", "rome"] },
  { name: "Forty Martyrs of Sebaste", any: ["forty martyrs", "sebaste"] },

  // ── Unmercenaries / healers ──
  { name: "Unmercenaries Cosmas and Damian", any: ["cosmas", "damian the"] },
  { name: "Unmercenaries Cyrus and John", all: ["cyrus", "unmerc"] },
  { name: "Sampson the Hospitable", any: ["sampson the host", "samson the host"] },

  // ── Hierarchs / Fathers (classic) ──
  { name: "Nicholas of Myra", any: ["nicholas of myra", "nicholas the wonder"] },
  { name: "Spyridon of Trimythous", any: ["spyridon"] },
  { name: "Basil the Great", any: ["basil the great"] },
  { name: "Gregory the Theologian", any: ["gregory the theologian", "gregory nazianzen"] },
  { name: "John Chrysostom", any: ["chrysostom"] },
  { name: "Athanasius the Great", any: ["athanasius"] },
  { name: "Cyril of Alexandria", any: ["cyril of alexandria"] },
  { name: "Cyril of Jerusalem", any: ["cyril of jerusalem"] },
  { name: "Gregory of Nyssa", any: ["nyssa"] },
  { name: "Ambrose of Milan", any: ["ambrose of milan", "ambrose, bishop"] },
  { name: "Augustine of Hippo", any: ["augustine of hippo", "augustine, bishop"] },
  { name: "Jerome", any: ["jerome"] },
  { name: "Gregory the Great (Dialogist)", any: ["gregory the great", "gregory the dialog"] },
  { name: "Ignatius of Antioch", any: ["ignatius of antioch", "ignatius the god"] },
  { name: "Polycarp of Smyrna", any: ["polycarp"] },
  { name: "Irenaeus of Lyons", any: ["irenaeus"] },
  { name: "Clement of Rome", any: ["clement of rome"] },
  { name: "Justin Martyr", any: ["justin martyr", "justin the phil"] },
  { name: "Cyprian of Carthage", any: ["cyprian of carthage", "cyprian, bishop"] },
  { name: "Ephraim the Syrian", any: ["ephraim the syr", "ephrem the syr"] },
  { name: "Isaac the Syrian", any: ["isaac the syr"] },
  { name: "John of Damascus", any: ["john of damascus", "john damasc"] },
  { name: "Maximus the Confessor", any: ["maximus the conf"] },
  { name: "Gregory Palamas", any: ["palamas"] },
  { name: "Symeon the New Theologian", any: ["symeon the new"] },
  { name: "John Climacus (of the Ladder)", any: ["climacus", "john of the ladder"] },
  { name: "Photius the Great", any: ["photius the great", "photios the great", "photius, patriarch"] },
  { name: "Mark of Ephesus", any: ["mark of ephesus", "mark eugenikos"] },

  // ── Monastic founders / desert ──
  { name: "Anthony the Great", any: ["anthony the great"] },
  { name: "Macarius the Great", any: ["macarius the great", "macarius of egypt"] },
  { name: "Pachomius the Great", any: ["pachomius"] },
  { name: "Sabbas the Sanctified", any: ["sabbas the sanc", "savvas the sanc"] },
  { name: "Euthymius the Great", any: ["euthymius the great"] },
  { name: "Theodosius the Cenobiarch", any: ["cenobiarch", "theodosius the great"] },
  { name: "Paul of Thebes", any: ["paul of thebes", "paul the hermit"] },
  { name: "Moses the Black/Ethiopian", any: ["moses the black", "moses the ethi", "moses the strong"] },
  { name: "Mary of Egypt", any: ["mary of egypt"] },
  { name: "Pelagia", any: ["pelagia"] },
  { name: "Macrina the Younger", any: ["macrina"] },
  { name: "Brigid? no - ", any: ["__none__"] },

  // ── Women saints (classic) ──
  { name: "Equal-to-Apostles Nina of Georgia", any: ["nina of georgia", "nino of georgia", "nina, equal"] },
  { name: "Protomartyr Thecla", any: ["thecla", "thekla"] },
  { name: "Equal-to-Apostles Helen", any: ["helen, empress", "helena, empress", "helen the empress", "constantine and helen"] },
  { name: "Olga of Kiev", any: ["olga of kiev", "olga, princess", "olga, equal"] },
  { name: "Sophia and daughters Faith, Hope, Love", any: ["faith, hope", "sophia and her"] },
  { name: "Nonna (mother of Gregory)", any: ["nonna"] },
  { name: "Juliana", any: ["juliana of nico", "juliana of laz"] },
  { name: "Genevieve of Paris", any: ["genevieve"] },

  // ── Western pre-schism (popular with converts) ──
  { name: "Patrick of Ireland", any: ["patrick of ireland", "patrick, enlight", "patrick the"] },
  { name: "Brigid of Kildare", any: ["brigid", "bridget of kild", "brigit"] },
  { name: "Columba of Iona", any: ["columba", "columcille"] },
  { name: "Cuthbert of Lindisfarne", any: ["cuthbert"] },
  { name: "Bede the Venerable", any: ["bede"] },
  { name: "Hilda of Whitby", any: ["hilda"] },
  { name: "Aidan of Lindisfarne", any: ["aidan"] },
  { name: "Brendan the Navigator", any: ["brendan"] },
  { name: "Alban (Protomartyr of Britain)", any: ["alban"] },
  { name: "David of Wales", any: ["david of wales"] },
  { name: "Martin of Tours", any: ["martin of tours"] },
  { name: "John Cassian", any: ["cassian"] },
  { name: "Vincent of Lerins", any: ["vincent of ler"] },
  { name: "Benedict of Nursia", any: ["benedict of nursia"] },
  { name: "Scholastica", any: ["scholastica"] },
  { name: "Leo the Great", any: ["leo the great"] },
  { name: "Boniface (Apostle of Germany)", any: ["boniface"] },
  { name: "Edward the Confessor", any: ["edward the conf"] },
  { name: "Olaf of Norway", any: ["olaf"] },

  // ── Slavic / Russian (classic) ──
  { name: "Vladimir of Kiev", any: ["vladimir, prince", "vladimir the great", "vladimir, equal", "vladimir of kiev"] },
  { name: "Boris and Gleb", any: ["boris and gleb", "boris, prince", "gleb"] },
  { name: "Sergius of Radonezh", any: ["radonezh"] },
  { name: "Seraphim of Sarov", any: ["seraphim of sarov"] },
  { name: "Nilus of Sora", any: ["nilus of sora", "nil sorsky"] },
  { name: "Joseph of Volotsk", any: ["volotsk", "volokolamsk"] },
  { name: "Alexander Nevsky", any: ["nevsky", "nevskii"] },
  { name: "Anthony of the Kiev Caves", any: ["anthony of the kiev", "anthony of kiev"] },
  { name: "Theodosius of the Kiev Caves", any: ["theodosius of the kiev", "theodosius of kiev"] },
  { name: "Job of Pochaev", any: ["pochaev", "pochayiv"] },
  { name: "Tikhon of Zadonsk", any: ["zadonsk"] },
  { name: "Alexander Svirsky", any: ["svir"] },
  { name: "Dmitri of Rostov", any: ["rostov"] },

  // ── Serbian ──
  { name: "Sava of Serbia", any: ["sava of serbia", "sava, first", "sava the serb"] },
  { name: "Simeon the Myrrh-gusher (Stefan Nemanja)", any: ["myrrh-gusher", "nemanja", "simeon of serbia"] },
  { name: "Lazar of Serbia", any: ["lazar of serbia", "lazar, prince", "tsar lazar"] },
  { name: "Nikolai Velimirovich (of Ohrid/Zhicha)", any: ["velimirovich", "nikolai of ohrid", "nikolai of zhicha"], era: "modern" },
  { name: "Justin Popovich (of Celije)", any: ["popovich", "justin of celije"], era: "modern" },
  { name: "Mardarije of Libertyville", any: ["mardarije", "mardarius"], era: "modern" },
  { name: "Sebastian Dabovich", any: ["dabovich", "sebastian of jackson", "sebastian of san franc"], era: "modern" },
  { name: "Varnava (Nastic)", any: ["nastic", "varnava"], era: "modern" },

  // ── Georgian ──
  { name: "Gabriel (Urgebadze)", any: ["urgebadze", "gabriel the fool", "gabriel of georgia"], era: "modern" },
  { name: "David of Gareji", any: ["gareji", "garejeli"] },
  { name: "King David the Builder", any: ["david the builder", "david aghmash"] },
  { name: "Queen Tamar", any: ["queen tamar", "tamara of georgia", "tamar of georgia"] },

  // ── Romanian ──
  { name: "Parascheva of Iasi", any: ["parascheva of iasi", "paraskeva of iasi"] },
  { name: "Demetrius of Basarabov", any: ["basarabov"] },
  { name: "Calinic of Cernica", any: ["calinic", "callinicus of cern"] },
  { name: "John Jacob of Neamt", any: ["john jacob", "ioan iacob"], era: "modern" },
  { name: "Dimitrie the New", any: ["dimitrie"] },

  // ── American / Alaska saints (modern) ──
  { name: "Herman of Alaska", any: ["herman of alaska"], era: "modern" },
  { name: "Innocent of Alaska/Moscow", any: ["innocent of alaska", "innocent of moscow", "innocent veni"], era: "modern" },
  { name: "Jacob Netsvetov", any: ["netsvetov"], era: "modern" },
  { name: "Peter the Aleut", any: ["peter the aleut"], era: "modern" },
  { name: "Juvenaly of Alaska", any: ["juvenaly"], era: "modern" },
  { name: "Olga (Arrsamquq) of Alaska", any: ["olga of alaska", "olga arrsam", "matushka olga"], era: "modern" },
  { name: "Raphael of Brooklyn", any: ["raphael of brooklyn", "raphael hawaweeny", "raphael, bishop of brooklyn"], era: "modern" },
  { name: "Alexis Toth of Wilkes-Barre", any: ["alexis toth", "alexis of wilkes", "alexis, the man of god"], era: "modern" },
  { name: "Tikhon of Moscow (Patriarch)", any: ["tikhon of moscow", "tikhon, patriarch", "tikhon, enlight"], era: "modern" },
  { name: "John Kochurov", any: ["kochurov"], era: "modern" },
  { name: "Alexander Hotovitzky", any: ["hotovitzky"], era: "modern" },
  { name: "Sebastian Dabovich (dup)", any: ["dabovich"], era: "modern" },

  // ── Russian New Martyrs & 19th–20th c. (modern) ──
  { name: "John of Kronstadt", any: ["kronstadt"], era: "modern" },
  { name: "Theophan the Recluse", any: ["theophan the rec"], era: "modern" },
  { name: "Ignatius Brianchaninov", any: ["brianchaninov", "brianchininov"], era: "modern" },
  { name: "Matrona of Moscow", any: ["matrona of moscow"], era: "modern" },
  { name: "Xenia of St. Petersburg", any: ["xenia of st. petersburg", "xenia of petersburg", "xenia the bless"], era: "modern" },
  { name: "John of Shanghai (Maximovitch)", any: ["shanghai", "maximovitch of"], era: "modern" },
  { name: "Luke of Crimea (the Surgeon)", any: ["luke of crimea", "voino"], era: "modern" },
  { name: "Elizabeth the New Martyr (Grand Duchess)", any: ["elizabeth the new", "elizabeth feod", "elizabeth, grand"], era: "modern" },
  { name: "Royal Martyrs (Tsar Nicholas II & family)", any: ["royal martyrs", "tsar nicholas", "nicholas ii", "imperial martyrs"], era: "modern" },
  { name: "Hilarion (Troitsky)", any: ["troitsky"], era: "modern" },
  { name: "Maria of Paris (Skobtsova)", any: ["skobtsova", "maria of paris"], era: "modern" },
  { name: "Seraphim of Vyritsa", any: ["vyritsa"], era: "modern" },
  { name: "Seraphim (Chichagov)", any: ["chichagov"], era: "modern" },
  { name: "Sophrony of Essex (Sakharov)", any: ["sophrony", "sakharov"], era: "modern" },
  { name: "Silouan the Athonite", any: ["silouan"], era: "modern" },

  // ── Optina Elders (modern) ──
  { name: "Ambrose of Optina", any: ["ambrose of optina"], era: "modern" },
  { name: "Macarius of Optina", any: ["macarius of optina"], era: "modern" },
  { name: "Leonid/Leo of Optina", any: ["leonid of optina", "leo of optina"], era: "modern" },
  { name: "Nektary of Optina", any: ["nektary of optina", "nectarius of optina"], era: "modern" },
  { name: "Barsanuphius of Optina", any: ["barsanuphius of optina"], era: "modern" },
  { name: "Anatoly of Optina", any: ["anatoly of optina"], era: "modern" },
  { name: "Joseph of Optina", any: ["joseph of optina"], era: "modern" },

  // ── Greek modern (19th–21st c.) ──
  { name: "Nektarios of Aegina", any: ["nektarios of aegina", "nectarios of aegina"], era: "modern" },
  { name: "Nicholas Planas", any: ["planas"], era: "modern" },
  { name: "Savvas the New of Kalymnos", any: ["savvas the new", "savvas of kalymnos"], era: "modern" },
  { name: "Arsenios the Cappadocian", any: ["arsenios the capp", "arsenius the capp"], era: "modern" },
  { name: "Paisios the Athonite", any: ["paisios the ath", "paisius the ath"], era: "modern" },
  { name: "Porphyrios of Kafsokalivia", any: ["porphyrios of k", "porphyrios the"], era: "modern" },
  { name: "Iakovos Tsalikis of Evia", any: ["tsalikis", "iakovos of evia", "jacob of evia"], era: "modern" },
  { name: "Joseph the Hesychast", any: ["hesychast"], era: "modern" },
  { name: "Ephraim of Katounakia", any: ["katounakia"], era: "modern" },
  { name: "Amphilochios Makris of Patmos", any: ["amphilochios", "amphilochius makris"], era: "modern" },
  { name: "Anthimos of Chios", any: ["anthimos of chios", "anthimus of chios"], era: "modern" },
  { name: "George Karslidis", any: ["karslidis"], era: "modern" },
  { name: "Cosmas of Aetolia (Equal-to-Apostles)", any: ["cosmas of aetolia", "kosmas of aetolia", "cosmas aitolos"], era: "modern" },

  // ── Other popular ──
  { name: "Spyridon (dup ok)", any: ["spyridon"] },
  { name: "Phanourios", any: ["phanourios", "fanourios"] },
  { name: "Stylianos of Paphlagonia", any: ["stylianos", "stylianus"] },
  { name: "John the Russian", any: ["john the russ"] },
  { name: "Ephraim of Nea Makri", any: ["nea makri", "ephraim of nea"], era: "modern" },
  { name: "Nektarios (Greek dup)", any: ["nektarios of aegina"], era: "modern" },
  { name: "Gerasimos of Kefalonia", any: ["gerasimos of kef", "gerasimus of kef"] },
  { name: "Dionysios of Zakynthos", any: ["zakynthos", "zante"] },
  { name: "Patapios", any: ["patapios", "patapius"] },
];
