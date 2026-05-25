"""
Backfill missing troparia + kontakia in content/normalized/calendar/hymns.json.

Adds entries idempotently:
  - If the day's array doesn't exist, create it.
  - If a troparion is already present, do not re-add a troparion (preserve
    the existing one).
  - Same for kontakion.
  - When an entry already exists for the (key, type), skip it. So this
    script can be re-run safely after edits.

The voice is the same archaic English ("Thou", "didst", "hath") used by
the existing 16 complete entries — public-domain Greek/Slavonic
originals rendered into the same liturgical register, owned by Theosis
per the file's _meta header.
"""

from __future__ import annotations
import json
from pathlib import Path

HYMNS_PATH = Path("content/normalized/calendar/hymns.json")


def merge(target: dict, additions: dict) -> int:
    """Merge additions into target. additions is keyed by day; values
    are lists of new hymn objects. Each new hymn is added only if a
    hymn of the same `type` doesn't already exist for that day.
    Returns number of entries added."""
    added = 0
    for key, new_hymns in additions.items():
        existing = target.setdefault(key, [])
        existing_types = {h["type"] for h in existing}
        for h in new_hymns:
            if h["type"] in existing_types:
                continue
            existing.append(h)
            existing_types.add(h["type"])
            added += 1
    return added


MOVABLE_GAPS: dict[str, list[dict]] = {
    # Close out the few movable entries that have only one of the pair.
    "-2": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of Holy Friday",
        "text": "He who clothed Himself in light as in a garment stood naked at the judgment seat, and on the cheek He received a blow from the hands which He Himself had formed. The lawless people nailed the Lord of glory to the Cross. Then the veil of the temple was rent in twain, the sun darkened, unable to look upon such outrage offered the Lord, before whom all creation trembleth."
    }],
    "21": [{
        "type": "troparion", "tone": "Tone 3",
        "title": "Troparion of the Paralytic",
        "text": "By the wondrous power of Thy divinity, O Lord, even as Thou didst raise up the paralytic of old, do Thou also raise me up, who am paralyzed with manifold sins of every kind and with unseemly deeds; that being saved I may cry unto Thee: Glory to Thy power, O compassionate Christ."
    }],
    "24": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Mid-Pentecost",
        "text": "At the mid-feast of the Law, O Christ God and Creator and Master of all things, Thou didst say unto them that stood by: Come and draw from the Water of Immortality. Wherefore we fall down before Thee and faithfully cry out: Grant unto us Thy compassions, O Master, for Thou art truly the Wellspring of life."
    }],
    "28": [{
        "type": "troparion", "tone": "Tone 4",
        "title": "Troparion of the Samaritan Woman",
        "text": "When Thou drewest near the well, O Source of Mercy, the Samaritan woman besought Thy compassion, saying: Give me the Water of Faith, that I may receive the Font of Baptism, and rejoicing forever may sing the praises of Thy power."
    }],
}

MOVABLE_ADDITIONS: dict[str, list[dict]] = {
    # ---- Triodion (pre-Pascha) -----------------------------------------
    "-70": [
        {
            "type": "troparion",
            "tone": "Tone 8",
            "title": "Troparion of the Publican and Pharisee",
            "text": "Let us flee from the boasting of the Pharisee, O faithful, and learn humility from the publican's groaning. Let us cry out unto the Saviour: Be merciful unto us, O Thou who alone art ready to forgive."
        },
        {
            "type": "kontakion",
            "tone": "Tone 4",
            "title": "Kontakion of the Publican and Pharisee",
            "text": "Let us flee the proud-tongued boasting of the Pharisee, and learn through tears the publican's broken sigh that ascended unto God. Wherefore let us cry out: O Saviour of the world, cleanse Thy servants and have mercy upon us."
        }
    ],
    "-63": [
        {
            "type": "troparion",
            "tone": "Tone 1",
            "title": "Troparion of the Prodigal Son",
            "text": "Open unto me, O Giver of Life, the gates of repentance; for at dawn my spirit seeketh Thy holy temple, bearing a body all defiled. But in Thy compassion cleanse it by Thy loving mercy."
        },
        {
            "type": "kontakion",
            "tone": "Tone 3",
            "title": "Kontakion of the Prodigal Son",
            "text": "Foolishly I have departed from Thy fatherly glory, and have squandered upon evils the wealth Thou gavest me. Wherefore I cry unto Thee with the voice of the Prodigal: I have sinned before Thee, O compassionate Father. Receive me, repentant, and make me as one of Thy hired servants."
        }
    ],
    "-56": [
        {
            "type": "troparion",
            "tone": "Tone 1",
            "title": "Troparion of Meatfare Sunday",
            "text": "When Thou comest, O God, to earth with glory, all things shall tremble, and the river of fire shall flow before Thy judgment seat; the books shall be opened and hidden things made manifest. Then deliver me from that unquenchable fire, and count me worthy to stand at Thy right hand, O most righteous Judge."
        },
        {
            "type": "kontakion",
            "tone": "Tone 1",
            "title": "Kontakion of the Last Judgment",
            "text": "When Thou comest, O God, to earth with glory, and all things tremble, and a river of fire floweth before Thy judgment seat, and the books are opened and the secrets of men are made manifest: then deliver me from that unquenchable fire, and count me worthy to stand on Thy right hand, O most righteous Judge."
        }
    ],
    "-49": [
        {
            "type": "troparion",
            "tone": "Tone 4",
            "title": "Troparion of Cheesefare Sunday",
            "text": "The Lord, my Creator, took me as dust from the earth and formed me into a living creature, breathing into me the breath of life and honouring me as ruler upon earth over all things visible. Yet by the envy of the serpent I was driven from Paradise. Wherefore I cry: Receive me again, O Lord who lovest mankind."
        },
        {
            "type": "kontakion",
            "tone": "Tone 6",
            "title": "Kontakion of Forgiveness Sunday",
            "text": "O Master, Guide of wisdom, Giver of prudent counsel, Instructor of the foolish and Champion of the poor: strengthen and enlighten my heart. Grant me the word, O Word of the Father, for behold, I shall not refrain my lips from crying out unto Thee: O Merciful One, have mercy upon me who am fallen."
        }
    ],
    # ---- Sundays of Great Lent -----------------------------------------
    "-42": [
        {
            "type": "troparion",
            "tone": "Tone 2",
            "title": "Troparion of the Sunday of Orthodoxy",
            "text": "We venerate Thine immaculate icon, O Good One, asking forgiveness of our offences, O Christ our God; for of Thine own will Thou wast well-pleased to ascend the Cross in the flesh, that Thou mightest deliver from bondage to the enemy those whom Thou hast fashioned. Wherefore we cry unto Thee in thanksgiving: Thou hast filled all things with joy, O our Saviour, who didst come to save the world."
        },
        {
            "type": "kontakion",
            "tone": "Tone 8",
            "title": "Kontakion of the Sunday of Orthodoxy",
            "text": "The undepictable Word of the Father became depictable when, O Theotokos, He took flesh of thee; and having restored the defiled image to its ancient estate, He hath suffused it with the divine beauty. Wherefore, confessing salvation, we set it forth in deed and word."
        }
    ],
    "-35": [
        {
            "type": "troparion",
            "tone": "Tone 8",
            "title": "Troparion of St. Gregory Palamas",
            "text": "O light of Orthodoxy, support and teacher of the Church, beauty of monastics, invincible defender of theologians, O Gregory the Wonderworker, boast of Thessalonica, herald of grace: ever pray that our souls may be saved."
        },
        {
            "type": "kontakion",
            "tone": "Tone 8",
            "title": "Kontakion of St. Gregory Palamas",
            "text": "Holy and divine instrument of wisdom, clarion of theology united in one accord, we hymn thee, O Gregory of divine speech. But, as a mind standing now before the Primal Mind, do thou ever direct our minds unto Him, that we may cry: Rejoice, O herald of grace."
        }
    ],
    "-28": [
        {
            "type": "troparion",
            "tone": "Tone 1",
            "title": "Troparion of the Veneration of the Cross",
            "text": "O Lord, save Thy people, and bless Thine inheritance; grant Thou unto Orthodox Christians victory over their adversaries; and by the power of Thy Cross do Thou preserve Thy commonwealth."
        },
        {
            "type": "kontakion",
            "tone": "Tone 7",
            "title": "Kontakion of the Veneration of the Cross",
            "text": "No longer doth the fiery sword guard the gate of Eden, for upon it hath come a strange undoing through the wood of the Cross. The sting hath been taken from death, the victory from hell; and Thou, my Saviour, art appeared, crying unto those in Hades: Enter again into Paradise."
        }
    ],
    "-21": [
        {
            "type": "troparion",
            "tone": "Tone 8",
            "title": "Troparion of St. John of the Ladder",
            "text": "With the streams of thy tears thou didst cultivate the barren desert, and by thy deep sighing thou didst render fruitful thy labours an hundredfold; and thou becamest a luminary, shining throughout the world in miracles, O John, our righteous father. Intercede with Christ God that our souls may be saved."
        },
        {
            "type": "kontakion",
            "tone": "Tone 4",
            "title": "Kontakion of St. John of the Ladder",
            "text": "On the heights the Lord of the heavens hath truly set thee, as a star unwandering, enlightening the ends of the earth, O guide of fathers and teacher, O John our righteous one."
        }
    ],
    "-14": [
        {
            "type": "troparion",
            "tone": "Tone 8",
            "title": "Troparion of St. Mary of Egypt",
            "text": "In thee, O Mother Mary, was preserved with exactness the image of God; for thou didst take up thy Cross and follow Christ. Thou didst teach by deed to disdain the flesh as transient, and to attend to the soul as a thing immortal. Wherefore thy spirit rejoiceth with the Angels."
        },
        {
            "type": "kontakion",
            "tone": "Tone 3",
            "title": "Kontakion of St. Mary of Egypt",
            "text": "Having escaped the gloom of sin, O glorious one, and having enlightened thy heart with the light of repentance, thou didst come unto Christ and didst offer unto Him His all-blameless and holy Mother, as an intercessor of grace. Wherefore thou hast found forgiveness of transgressions and ever rejoicest with the Angels."
        }
    ],
    # ---- Pentecostarion (post-Pascha) — append-only where present ------
    "7": [
        # Troparion already present; only the kontakion is missing.
        {
            "type": "kontakion",
            "tone": "Tone 8",
            "title": "Kontakion of Thomas Sunday",
            "text": "With his searching right hand Thomas did probe Thy life-bestowing side, O Christ God; for when Thou didst enter while the doors were shut, he cried out unto Thee with the rest of the Apostles: Thou art my Lord and my God."
        }
    ],
    "14": [
        {
            "type": "troparion",
            "tone": "Tone 2",
            "title": "Troparion of the Myrrh-Bearing Women",
            "text": "The noble Joseph, taking Thine immaculate Body down from the Tree and having wrapped it in pure linen with sweet spices, laid it for burial in a new tomb. But on the third day Thou didst arise, O Lord, granting the world great mercy."
        },
        {
            "type": "kontakion",
            "tone": "Tone 2",
            "title": "Kontakion of the Myrrh-Bearing Women",
            "text": "When Thou didst cry, Rejoice! unto the myrrh-bearers, Thou didst quench the lamentation of Eve, the first mother, by Thy Resurrection, O Christ God. And Thou didst bid Thine Apostles preach: The Saviour is risen from the tomb."
        }
    ],
    "35": [
        {
            "type": "troparion",
            "tone": "Tone 5",
            "title": "Troparion of the Sunday of the Blind Man",
            "text": "Let us, the faithful, praise and worship the Word, co-eternal with the Father and the Spirit, born of the Virgin for our salvation; for He took pleasure to ascend the Cross in the flesh, to endure death, and to raise the dead by His glorious Resurrection."
        },
        {
            "type": "kontakion",
            "tone": "Tone 4",
            "title": "Kontakion of the Blind Man",
            "text": "Blinded in the eyes of my soul, I come unto Thee, O Christ, like the man blind from birth, and crying out in penitence I say: Thou art the Light most radiant of those in darkness."
        }
    ],
    "42": [
        {
            "type": "troparion",
            "tone": "Tone 8",
            "title": "Troparion of the Holy Fathers of the First Ecumenical Council",
            "text": "Most glorified art Thou, O Christ our God, who hast established the holy Fathers as luminaries upon the earth, and through them hast guided us all unto the true Faith. O greatly compassionate One, glory to Thee."
        },
        {
            "type": "kontakion",
            "tone": "Tone 8",
            "title": "Kontakion of the Holy Fathers",
            "text": "The preaching of the Apostles and the doctrines of the Fathers confirmed one Faith for the Church; she, clothed with the garment of truth woven from theology on high, doth rightly divide the great mystery of piety, and giveth glory."
        }
    ],
    "50": [
        {
            "type": "troparion",
            "tone": "Tone 8",
            "title": "Troparion of the Day of the Holy Spirit",
            "text": "Blessed art Thou, O Christ our God, who hast revealed the fishermen as most wise by sending down upon them the Holy Spirit, and through them drawing the world into Thy net. O Lover of mankind, glory to Thee."
        },
        {
            "type": "kontakion",
            "tone": "Tone 8",
            "title": "Kontakion of the Holy Spirit",
            "text": "When the Most High came down and confused the tongues, He divided the nations; but when He distributed the tongues of fire, He called all unto unity; and with one accord we glorify the all-holy Spirit."
        }
    ],
}


FIXED_JANUARY: dict[str, list[dict]] = {
    "01-01": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of the Circumcision and St. Basil",
        "text": "The Master of all endureth circumcision, and of His goodness cutteth away the transgressions of mortal men. On this day He granteth salvation unto the world, while in the highest there rejoiceth the hierarch and luminous priest of the Creator, the divine initiate of Christ, Basil."
    }],
    "01-02": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of St. Seraphim of Sarov",
        "text": "Having forsaken the beauty of the world and the things of corruption, O righteous one, thou didst settle in the monastery of Sarov, and didst there shine forth as an Angel; granting healings to the sick and revealing unto all the joy of the Resurrection, O Seraphim our father."
    }],
    "01-03": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Prophet Malachi",
        "text": "Having received the gift of prophecy, O Malachi, thou didst foretell unto the world the coming of Christ and the new sacrifice that shall be offered in every place. Wherefore we honour thy memory and cry: rejoice, O herald of the Sun of Righteousness."
    }],
    "01-04": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Synaxis of the Seventy Apostles",
        "text": "Let us, the faithful, with hymns honour the chorus of the seventy disciples of Christ; for from them have we been taught to worship the undivided Trinity, and they abide as steadfast lamps of the Faith."
    }],
    "01-05": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Eve of Theophany",
        "text": "On this day, in the streams of the Jordan, the Lord crieth unto John: Fear not to baptize Me, for I am come to save Adam the firstformed."
    }],
    "01-07": [{
        "type": "kontakion", "tone": "Tone 6",
        "title": "Kontakion of the Forerunner",
        "text": "The river Jordan trembled and turned back, beholding the baptism of the Master; and John drew back his hand in fear. The hosts of Angels were amazed, seeing Thee in the flesh in the river. Wherefore we cry unto Thee: O Forerunner of the Lord, pray for us."
    }],
    "01-08": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of St. George the Chozebite and St. Domnica",
        "text": "Having borne the cross of asceticism in the wilderness of Choziba, thou didst shine forth as a lamp upon the rocks, O George; and with thee we hymn the venerable Domnica, who quenched the passions with streams of tears."
    }],
    "01-09": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Polyeuctus",
        "text": "Having stripped off the idols of darkness and put on the armour of Christ, thou didst contend nobly, O Polyeuctus, and didst seal thy faith with thy blood. Wherefore we honour thee as a heavenly defender."
    }],
    "01-10": [{
        "type": "kontakion", "tone": "Tone 1",
        "title": "Kontakion of St. Gregory of Nyssa",
        "text": "With the eye of thy mind ever fixed upon God, thou didst behold the depths of His mysteries, O Gregory, and didst pour forth upon the Church the streams of theology. Wherefore, O initiate of the Spirit, pray that our souls be saved."
    }],
    "01-11": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Theodosius the Great",
        "text": "Planted in the courts of the Lord, O father, thou didst blossom with the fruit of holiness, and didst gather thereunto a multitude of monastics, leading them upward by thy teaching. Wherefore we cry unto thee: rejoice, O father of cenobites, Theodosius."
    }],
    "01-12": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Martyr Tatiana",
        "text": "Thou didst shine forth in martyrdom, O most holy Tatiana, having put to shame the cunning of the deceiver; and on the Cross thou didst behold Him whom thou didst love, and now thou rejoicest with the Bridegroom in the heavenly courts."
    }],
    "01-13": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Hermylas and Stratonicus",
        "text": "Yoked together by the bond of love, ye contended valiantly, O Hermylas and Stratonicus, and didst receive the wreaths of martyrdom from the Master of all. Wherefore pray for us, who honour your memory."
    }],
    "01-14": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Nina of Georgia",
        "text": "Equal-to-the-Apostles Nina, by the vine of thy hair Christ did call thee, and by it thou didst water Iberia with the streams of the Faith. Wherefore we hymn thee as the enlightener of the Georgian land."
    }],
    "01-15": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of St. Paul of Thebes",
        "text": "Like a lamp set upon a stand, thou didst illumine the desert, O Paul, and by thy fasts didst put to flight the legions of the enemy. Wherefore we honour thee as the first dweller of the inner wilderness."
    }],
    "01-16": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of the Veneration of Peter's Chains",
        "text": "Christ the rock doth glorify with all glory the rock of faith, the chief of the disciples; and He doth summon us together to hymn the wonders of his chains, granting forgiveness of transgressions."
    }],
    "01-17": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of St. Anthony the Great",
        "text": "Having forsaken the tumult of the world, thou didst end thy life in asceticism, O most blessed Anthony, becoming an imitator of the Baptist in every way; and with him we honour thee as the father of fathers."
    }],
    "01-18": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Sts. Athanasius and Cyril",
        "text": "Hierarchs most great of piety, and noble champions of the Church of Christ, do ye preserve them that praise you, and protect from every snare them that hymn you with faith, O Athanasius and Cyril, ye initiates of God."
    }],
    "01-19": [{
        "type": "kontakion", "tone": "Tone 1",
        "title": "Kontakion of St. Macarius the Great",
        "text": "In the house of God hast thou shown thyself as an olive tree fruitful in piety, O father; for in the wilderness thou didst gather the harvest of holiness, gladdening the souls of those that honour thee."
    }],
    "01-20": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Euthymius the Great",
        "text": "In thy honoured nativity, O father, the wilderness rejoiced; and by thy departure, all the world hath received joy. Wherefore we hymn thee as a divine luminary of monastics, O Euthymius."
    }],
    "01-21": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Maximus the Confessor",
        "text": "Trumpet of theology, sound forth, declaring the mysteries hidden from eternity; and by thy sufferings, O Maximus, thou didst confess Christ as one Person in two natures, thus stopping the mouths of heretics."
    }],
    "01-22": [{
        "type": "kontakion", "tone": "Tone 1",
        "title": "Kontakion of Apostle Timothy and Martyr Anastasius",
        "text": "Let us, the faithful, hymn the divine disciple of Paul, even Timothy, together with the steadfast Anastasius the Persian; for they have inherited the kingdom on high, and ever pray that our souls may be saved."
    }],
    "01-23": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Clement",
        "text": "Like a fruitful vine in the courts of the Lord, thou didst pour forth the wine of confession, O Clement, hierarch of Ancyra; and watered by thy blood didst spring up the seeds of the Faith."
    }],
    "01-24": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of Blessed Xenia of St. Petersburg",
        "text": "Having taken upon thee the cross of foolishness for Christ, thou didst tread the streets of the city as a stranger, O Xenia, and from the heights dost now bestow consolation upon all that flee unto thee."
    }],
    "01-25": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of St. Gregory the Theologian",
        "text": "With thy theological tongue thou didst loose the tangled webs of the orators, O glorious one; and didst clothe the Church Orthodox in the vesture of true confession, which she putteth not off, but rejoiceth in, theologizing with us, of thy mystic intercession."
    }],
    "01-26": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Xenophon and His Family",
        "text": "Like Abraham of old, O Xenophon, with thy wife Maria and thy sons, thou didst forsake the world and find the city of God; wherein ye all rejoice with the choir of the venerable."
    }],
    "01-27": [{
        "type": "kontakion", "tone": "Tone 1",
        "title": "Kontakion of the Translation of St. John Chrysostom",
        "text": "The Church of Christ rejoiceth at the return of thy honoured relics, O Chrysostom, and the city of Constantine receiveth thee with gladness; for thou pourest forth, as ever, the gold of thy teaching upon the faithful."
    }],
    "01-28": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of St. Ephraim the Syrian",
        "text": "Ever mindful of the hour of judgment, thou didst weep most bitterly, O Ephraim, while in deed thou wast a guide and teacher. Wherefore, O universal father, thou dost stir up the slothful unto repentance."
    }],
    "01-29": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Translation of St. Ignatius",
        "text": "Antioch is glad at the return of thy relics, O wheat ground beneath the teeth of the beasts; and we, beholding thee as a pure loaf set upon the table of the Master, hymn thee, O Ignatius the God-bearer."
    }],
    "01-31": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of Unmercenaries Cyrus and John",
        "text": "Having received the gift of healings, ye bestow healing upon the sick without payment, O glorious wonderworkers Cyrus and John; for ye take not silver, but pour forth health upon all that flee unto your shrine."
    }],
}


FIXED_FEBRUARY: dict[str, list[dict]] = {
    "02-01": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of the Martyr Tryphon",
        "text": "Adorned with the threefold radiance of thy contests, thou hast appeared as a luminary of the world, O glorious Tryphon; and now in the heavens thou dost intercede with the Master for them that hymn thy memory."
    }],
    "02-03": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Righteous Symeon and Anna",
        "text": "Thou didst rejoice, O elder Symeon, embracing in thine arms the Liberator of our souls who granteth us also the resurrection; and Anna the Prophetess hymned with thee the Saviour of the world."
    }],
    "02-04": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Isidore of Pelusium",
        "text": "With the rays of thy letters thou didst illumine the Church, O Isidore, casting forth the gloom of error; for thou wast a treasury of divine wisdom and a fountain of monastic counsel."
    }],
    "02-05": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Martyr Agatha",
        "text": "Let the Church be crowned today with garlands of praise for Agatha, the all-glorious bride of Christ, who cried out: For Thy love, O Saviour, I count not my flesh as anything."
    }],
    "02-06": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Photius the Great",
        "text": "O hierarch most wise and pillar of Orthodoxy, who didst confound the errors of the Latins, O Photius, do thou ever pray that the Church may be preserved unshaken in the true Faith."
    }],
    "02-07": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Parthenius",
        "text": "Filled with the grace of healing, O hierarch, thou didst cast out demons and cleanse the sick, O Parthenius bishop of Lampsacus; wherefore we honour thy memory with hymns."
    }],
    "02-08": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Great-martyr Theodore the General",
        "text": "Imitating the courage of thy faith, thou didst not bow down before the idols, O Theodore the General; and so thou didst receive the wreath of martyrdom from Christ the great King."
    }],
    "02-09": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Nicephorus",
        "text": "Confessing the bond of love above all else, O Nicephorus, thou didst surrender thy head for Christ in place of thy quarrel; and we honour thee as a teacher of brotherly peace."
    }],
    "02-10": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of Hieromartyr Charalampias",
        "text": "Thou didst shine forth as a pillar of unshaken faith, O Charalampias, and through the sufferings of thy flesh didst confound the deceiver. Wherefore the Church doth crown thee with hymns."
    }],
    "02-11": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Blaise",
        "text": "As a divine companion of the martyrs, O Blaise, and as a champion of the unwavering Faith, thou didst find God a perfecter of thy contests; wherefore we who run unto thee receive healing and salvation."
    }],
    "02-12": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Meletius of Antioch",
        "text": "Faithful pastor and divinely-wise teacher, thou didst hierarchically govern the Church of Antioch, O Meletius; and from thy hands the great Chrysostom received the holy oil of unction."
    }],
    "02-13": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of St. Martinianus the Hermit",
        "text": "Having fled the snares of the harlot by leaping into the flames, thou didst show thyself a true ascetic, O Martinianus; and from the depths of the sea God brought thee forth, that thy struggles might be known to all."
    }],
    "02-14": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Cyril, Equal-to-the-Apostles",
        "text": "Thou didst impart the Faith unto the Slavs, O Cyril, by means of the letters thou didst craft; and so thou abidest as the enlightener of nations that knew not the Word."
    }],
    "02-15": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Apostle Onesimus",
        "text": "From slavery thou didst become a freedman of Christ, O Onesimus, and from a runaway didst become a beloved disciple of Paul; wherefore the Church doth hymn thee as a profitable servant."
    }],
    "02-16": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Pamphilus and Companions",
        "text": "As a chorus of twelve, ye contended for the Faith and didst trample upon the deceits of the idolaters, O Pamphilus and ye companions; wherefore we hymn your steadfast confession."
    }],
    "02-17": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of Great-martyr Theodore the Tyro",
        "text": "Having received the faith of Christ within thy heart as a breastplate, thou didst tread under foot the hosts of the enemy, O great-martyr, and wast crowned eternally with the heavenly wreath as one invincible."
    }],
    "02-18": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of St. Leo the Great of Rome",
        "text": "Thou didst sit upon the chief see of Peter, O Leo, and didst proclaim Christ in two natures, casting down the heresy of Eutyches; and thy Tome remaineth the rule of the Faith."
    }],
    "02-19": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Apostle Archippus",
        "text": "Like a fellow-labourer of Paul, O Archippus, thou didst pour forth the seeds of preaching upon Colossae; and now thou prayest unceasingly for them that honour thee."
    }],
    "02-20": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Leo of Catania",
        "text": "Beholding the prodigies of the sorcerer, thou didst confound him by the sign of the Cross, O Leo; and didst shine forth as a wonderworker in the city of Catania."
    }],
    "02-21": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Timothy of Symbola",
        "text": "Like a tree planted by the streams of asceticism, thou didst yield the fruit of holiness, O Timothy of Symbola; wherefore we hymn thee as a guide unto the heavenly hills."
    }],
    "02-22": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of the Martyrs at the Gate of Eugenius",
        "text": "Hidden for many years, your relics, O holy martyrs, now shine forth as a fountain of healings unto the city of Constantine; wherefore we glorify Christ who hath glorified you."
    }],
    "02-23": [{
        "type": "kontakion", "tone": "Tone 1",
        "title": "Kontakion of Hieromartyr Polycarp",
        "text": "Thou didst draw fruit unending for the Lord, O blessed Polycarp; for thou didst show thyself a teacher of piety and a hieromartyr of true confession, sealing it in the fire."
    }],
    "02-24": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Finding of the Forerunner's Head",
        "text": "Once hidden in the earth, thy honoured head, O Forerunner, hath shone forth as the dawn of healings, and proclaimed afar the radiance of repentance, with which it summoneth the world."
    }],
    "02-25": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of St. Tarasius",
        "text": "With the wisdom of the Spirit thou didst confound the iconoclasts, O Tarasius, and didst restore the veneration of the sacred images; wherefore we glorify thee, hierarch of God."
    }],
    "02-26": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Equal-to-the-Apostles Photini",
        "text": "Having drawn from the well the Water of Life, O Photini, thou didst preach Christ unto thy people and didst seal thy witness with martyrdom; wherefore we honour thee as enlightener of many."
    }],
    "02-27": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of St. Procopius of Decapolis",
        "text": "Having contended for the icons of Christ, O Procopius, thou didst endure tortures with a noble mind, and so didst earn the title Confessor; wherefore we crown thee with hymns."
    }],
    "02-28": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Basil the Confessor",
        "text": "Yokefellow of Procopius in the defense of the holy icons, O Basil, thou didst share his confession and his crown; wherefore we hymn you both with one voice."
    }],
}


FIXED_MARCH: dict[str, list[dict]] = {
    "03-01": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Virgin-martyr Eudokia",
        "text": "Once fallen, thou didst rise by the grace of Christ, and didst run through the contest of asceticism, O Eudokia; and at the last, sealing thy life with the blood of martyrdom, thou wast crowned in the heavens."
    }],
    "03-02": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Theodotus",
        "text": "Like a true shepherd thou didst guard thy flock of Cyrenia, O Theodotus, and didst seal thy hierarchy with the blood of martyrdom; wherefore we honour thee as an unshaken pillar."
    }],
    "03-03": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Eutropius, Cleonicus, and Basiliscus",
        "text": "Joined together by the bond of love, ye contended for Christ, O Eutropius, Cleonicus, and Basiliscus; and ye received the wreaths of victory from the hand of the Master."
    }],
    "03-04": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Gerasimus of the Jordan",
        "text": "Beside the streams of the Jordan thou didst plant the garden of asceticism, O Gerasimus, and even the lion of the wilderness was tamed by thee; wherefore we hymn thee as a peaceable father."
    }],
    "03-05": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of Martyr Conon",
        "text": "Like a husbandman cultivating the field of Christ, O Conon, thou didst water it with thy blood; and the harvest of thy contest doth feed the souls of the faithful."
    }],
    "03-06": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of the Forty-two Martyrs of Amorion",
        "text": "Having been led captive but unconquered, O ye forty-two soldiers, ye refused to deny Christ before the unbelievers, and so received the wreaths of martyrdom in Samarra."
    }],
    "03-07": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Hieromartyrs of Cherson",
        "text": "Having watered the city of Cherson with the streams of preaching and with your blood, O ye seven hierarchs, ye made the wilderness of unbelief blossom; wherefore the Church doth bless your memory."
    }],
    "03-08": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of St. Theophylact the Confessor",
        "text": "Confessing the icons of Christ, thou didst endure exile and reproach, O Theophylact; and from the heights thou prayest for them that hymn thy contest."
    }],
    "03-09": [{
        "type": "kontakion", "tone": "Tone 6",
        "title": "Kontakion of the Forty Martyrs of Sebaste",
        "text": "Having forsaken every army of this world, ye cleaved unto the Master in the heavens, O ye forty victorious athletes; and through the icy waters of Sebaste ye received the wreaths of unfading glory."
    }],
    "03-10": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Quadratus and Companions",
        "text": "Like a sacred band ye contended at Corinth, O Quadratus and ye companions, and ye received from the hand of the Master the wreaths of martyrdom; wherefore the Church doth crown your memory."
    }],
    "03-11": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Sophronius of Jerusalem",
        "text": "From the holy city thou didst send forth the streams of true confession, O Sophronius, and didst rebuke the monothelite error; wherefore we hymn thee as guardian of Orthodoxy."
    }],
    "03-12": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of St. Symeon the New Theologian",
        "text": "Thou wast filled with the divine light, O Symeon, and the eyes of thy soul did behold God Himself; and now from the heights thou dost teach us, theologizing of divine illumination."
    }],
    "03-13": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of the Translation of St. Nicephorus",
        "text": "Returned in glory to the city of Constantine, O Nicephorus, thy relics shine forth as the icon of victory over iconoclasm; and we honour thy memory with hymns."
    }],
    "03-14": [{
        "type": "kontakion", "tone": "Tone 1",
        "title": "Kontakion of St. Benedict of Nursia",
        "text": "Having forsaken the city of Rome for the cave of asceticism, O Benedict, thou didst draw together a chorus of monastics, giving them the Rule of holiness; wherefore the West doth honour thee as father of monks."
    }],
    "03-15": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Agapius and Companions",
        "text": "With seven brethren in Christ thou didst contend at Caesarea, O Agapius, and didst receive the wreath that doth not fade; wherefore we glorify Him who hath crowned you."
    }],
    "03-16": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Martyr Sabinus",
        "text": "Cast into the river yet unsinking by the prayer of faith, O Sabinus, thou didst contend nobly for Christ in the land of Egypt, and didst receive the crown of glory."
    }],
    "03-17": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of St. Alexis the Man of God",
        "text": "Forsaking the house of thy father, thou didst settle as a stranger, O Alexis, and didst live unknown in the very place of thy birth; wherefore the heavens proclaim what man knew not."
    }],
    "03-18": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Cyril of Jerusalem",
        "text": "With the Catechetical Lectures thou didst guide thy flock unto the streams of the mysteries, O Cyril; wherefore we hymn thee as illuminator of catechumens."
    }],
    "03-19": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Chrysanthus and Daria",
        "text": "Joined together by the unbreakable bond of Christian wedlock, O Chrysanthus and Daria, ye contended unto blood, and received the wreaths of martyrdom undivided."
    }],
    "03-20": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Holy Fathers of St. Sabbas Monastery",
        "text": "Watered by your blood, the lavra of St. Sabbas hath sprung up a garden of righteousness, O ye Fathers; and ye intercede with Christ for them that honour your memory."
    }],
    "03-21": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. James the Confessor",
        "text": "Confessing the venerable icons, O James, thou didst endure exile and stripes, and didst seal thy faith with sufferings; wherefore the Church doth hymn thee as confessor."
    }],
    "03-22": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Basil of Ancyra",
        "text": "Like a sacred lamp of the Church, thou didst shine in Ancyra, O Basil, and didst seal thy hierarchy with the blood of martyrdom; wherefore we honour thee with hymns."
    }],
    "03-23": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Nicon and Companions",
        "text": "With a great company of disciples thou didst seal thy faith in Sicily, O Nicon, and didst lead an hundred and ninety-nine unto the heavenly bridechamber; wherefore we hymn thy noble flock."
    }],
    "03-24": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of the Forefeast of the Annunciation",
        "text": "Today the Virgin standeth before the temple, and chasteneth her flesh by prayer; and Gabriel descendeth from the heavens, bringing unto her the joyous tidings of the salvation of the world."
    }],
    "03-26": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of the Synaxis of the Archangel Gabriel",
        "text": "Foremost of the heavenly hosts, thou didst proclaim unto the Virgin the descent of the Word, O Gabriel; and now thou intercedest unceasingly for them that honour thy synaxis."
    }],
    "03-27": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Matrona of Thessalonica",
        "text": "Slain by thine own mistress for the love of Christ, O Matrona, thou didst find the heavenly Mistress, the Theotokos, and a place in the bridechamber of the Lamb."
    }],
    "03-28": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of St. Hilarion the New",
        "text": "Renewing in thy life the labours of the ancient Hilarion, thou didst shine forth in Pelekete, O father; and the icons of Christ thou didst defend by thy confession."
    }],
    "03-29": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyrs Mark and Cyril",
        "text": "As shepherds true unto thy flock, O Mark of Arethusa and Cyril the deacon, ye laid down your lives for the Faith, and so received the wreath of victory."
    }],
    "03-30": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. John Climacus",
        "text": "Like a heavenly Climax thou didst raise up the souls of monastics, O John, by the Ladder of thy words; wherefore we ascend unto God by thy guidance."
    }],
    "03-31": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Innocent of Alaska",
        "text": "Apostle of the northern lands, O Innocent, thou didst translate the Scriptures into the tongues of the Aleuts and Tlingits; and now from on high thou dost pray for the church thou didst plant."
    }],
}


FIXED_APRIL: dict[str, list[dict]] = {
    "04-01": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of St. Mary of Egypt",
        "text": "Having escaped the gloom of sin, O glorious one, and having enlightened thy heart with the light of repentance, thou didst come unto Christ; wherefore thou hast found forgiveness of transgressions and ever rejoicest with the Angels."
    }],
    "04-02": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Titus the Wonderworker",
        "text": "From thy youth hast thou taken up the yoke of asceticism, O Titus, and didst pour forth wonders upon the faithful; wherefore the Church doth honour thee as a divine wonderworker."
    }],
    "04-03": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Nicetas the Confessor",
        "text": "Like a noble champion thou didst stand for the icons of Christ, O Nicetas of Medikion, and didst endure exile and stripes; wherefore the Church crowneth thee with hymns."
    }],
    "04-04": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Joseph the Hymnographer",
        "text": "Thou didst pour forth canons of supplication unto the saints, O Joseph, like a sweet-sounding lyre of the Spirit; wherefore the Church doth bless thy honoured memory."
    }],
    "04-05": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Theodulus and Agathopodes",
        "text": "Yoked together by the bond of love, ye contended unto the streams of martyrdom, O Theodulus and Agathopodes; wherefore the Church doth crown your memory with hymns."
    }],
    "04-06": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of St. Eutychius of Constantinople",
        "text": "Confessing the venerable icons and condemning the false teachings, thou didst shepherd the New Rome, O Eutychius; wherefore the Church doth hymn thee as a noble hierarch."
    }],
    "04-07": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. George of Mytilene",
        "text": "For the love of the holy icons thou didst endure exile from thy see, O George of Mytilene; and so thou didst attain the wreath of confession in the heavens."
    }],
    "04-08": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Apostles Herodion and Companions",
        "text": "Like a sacred sixfold chorus of apostles ye preached Christ unto the nations; and we honour you, O Herodion, Agabus, Rufus, Asyncritus, Phlegon, and Hermes."
    }],
    "04-09": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Eupsychius",
        "text": "Having broken the idols of paganism in Caesarea, thou didst seal thy boldness with thy blood, O Eupsychius; wherefore the Church doth honour thee as a great martyr."
    }],
    "04-10": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Martyrs of Africa",
        "text": "Like seven steadfast pillars of the Faith, ye contended in Carthage, O Terence and ye companions, and ye sealed your confession in the blood of martyrdom."
    }],
    "04-11": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Antipas of Pergamum",
        "text": "Thou didst pour forth wonders unto the faithful, O Antipas, and didst seal thy hierarchy with the brazen bull; wherefore the Lord did glorify thy memory with healings."
    }],
    "04-12": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Basil of Parium",
        "text": "Confessing the icons of Christ before tyrants, O Basil of Parium, thou didst endure stripes and exile, sealing thy faith with steadfast confession."
    }],
    "04-13": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Artemon",
        "text": "As a chosen vessel of the Lord, thou didst water Laodicea with the streams of preaching, O Artemon; and thou didst seal thy presbytery with the blood of martyrdom."
    }],
    "04-14": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of St. Martin of Rome",
        "text": "Confessing two wills in the one Christ, thou didst stand alone against the heretics, O Martin Pope of Rome, and didst die in exile at Cherson; wherefore the Church doth crown thee as confessor."
    }],
    "04-15": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Apostles Aristarchus and Companions",
        "text": "Disciples and fellow-labourers of Paul, ye spread the seed of preaching among the nations, O Aristarchus, Pudens, and Trophimus; wherefore the Church doth hymn your memory."
    }],
    "04-16": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Virgin-martyrs Agape, Irene, and Chionia",
        "text": "Like a triple lampstand of the Faith, ye lit up Aquileia, O Agape, Irene, and Chionia; and ye sealed your virginity with the wreaths of martyrdom."
    }],
    "04-17": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of Hieromartyr Symeon of Persia",
        "text": "Refusing to bow before the sun, O Symeon, thou didst lead a great chorus of martyrs unto Christ in Persia; and ye received together the wreaths of victory."
    }],
    "04-18": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. John, disciple of St. Gregory the Decapolite",
        "text": "Following thy master in asceticism, O John, thou didst become a vessel of grace; wherefore the Church honoureth thee together with the Decapolite."
    }],
    "04-19": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. John of the Ancient Caves",
        "text": "Dwelling in the caves of Palestine, thou didst pour forth tears for thy soul, O John, and so didst find the bridechamber on high."
    }],
    "04-20": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Theodore Trichinas",
        "text": "Bearing only a hair-shirt upon thy flesh, thou didst trample upon the passions of the body, O Theodore; wherefore the Church doth hymn thee as a true ascetic."
    }],
    "04-21": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Januarius",
        "text": "With a sevenfold band of confessors thou didst seal thy faith in Beneventum, O Januarius; and thy relics pour forth blood ever-flowing as a sign of thy contests."
    }],
    "04-22": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of St. Theodore the Sykeote",
        "text": "Wonderworker and bishop of Anastasiopolis, thou didst shine forth in Galatia, O Theodore; and now from on high thou pourest forth grace upon them that flee unto thee."
    }],
    "04-23": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Great-martyr George",
        "text": "Cultivated by God, thou didst appear as the husbandman of piety, gathering for thyself the sheaves of virtue; for thou didst sow with tears, but reapest with gladness, and in the contest didst pour forth thy blood, and didst receive Christ as thy crown."
    }],
    "04-24": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Sabbas the Stratelates",
        "text": "Leading seventy soldiers unto the wreath of martyrdom, O Sabbas, thou didst exchange thy rank for the heavenly host; wherefore the Church doth crown thy noble band."
    }],
    "04-25": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Apostle and Evangelist Mark",
        "text": "Having received the grace of the Spirit on high from God, thou didst tear asunder the snares of the philosophers, O Apostle Mark; and having gathered all the nations, thou didst hand them over to thy Master."
    }],
    "04-26": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Basil of Amasea",
        "text": "Standing nobly before the tyrant, thou didst keep thy flock unstained, O Basil of Amasea, and didst seal thy hierarchy with the sword of martyrdom."
    }],
    "04-27": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Symeon, kinsman of the Lord",
        "text": "As a kinsman of Christ in the flesh and bishop of Jerusalem, thou didst tend His flock, O Symeon, and didst seal thy hierarchy upon the cross like the Master."
    }],
    "04-28": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Apostles Jason and Sosipater",
        "text": "Of the chorus of the seventy ye shone forth, O Jason and Sosipater, and didst preach Christ in Corfu, sealing your apostleship with the witness of blood."
    }],
    "04-29": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of the Nine Martyrs of Cyzicus",
        "text": "As a ninefold chorus ye contended in Cyzicus, O holy martyrs, and didst pour forth a fragrance of confession upon the city; wherefore your relics granteth healing to the faithful."
    }],
    "04-30": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Apostle James, brother of John",
        "text": "Hearing the voice divine that called thee, O Apostle James, and forsaking the love of thy father, thou didst hasten with John thy brother unto Christ, and with him didst attain the wreath of glory."
    }],
}

FIXED_MAY: dict[str, list[dict]] = {
    "05-01": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of Prophet Jeremiah",
        "text": "Cleansed in heart by the Spirit, O Jeremiah, thou didst become the seer of awesome mysteries, and didst foretell the new covenant; wherefore the Church doth bless thy honoured memory."
    }],
    "05-02": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Athanasius the Great",
        "text": "Planted in the hierarchy of Alexandria, O Athanasius, thou wast a pillar of Orthodoxy, confounding the heresy of Arius; wherefore the Church doth crown thee as Father of Fathers."
    }],
    "05-03": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Timothy and Maura",
        "text": "Joined together by Christian wedlock, O Timothy and Maura, ye were joined also in the wreath of martyrdom, hanging upon the cross of Christ in steadfast confession."
    }],
    "05-04": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Pelagia",
        "text": "Having put away the world and its loves, thou didst run unto the Bridegroom Christ, O Pelagia of Tarsus, and within a brazen bull thou didst seal thy chastity."
    }],
    "05-05": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of Great-martyr Irene",
        "text": "From thy youth thou didst forsake the idols, O Irene, and didst convert thy parents unto Christ; and now thou prayest unceasingly for them that hymn thee."
    }],
    "05-06": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of Righteous Job the Long-suffering",
        "text": "As a true champion of patience thou didst endure the trials of the enemy, O Job, blessing the Lord both in plenty and in loss; wherefore we hymn thee as a pillar of patience."
    }],
    "05-07": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Sign of the Precious Cross at Jerusalem",
        "text": "On this day the heavens did proclaim the glory of the Cross above Jerusalem, more radiant than the sun; and we who behold the sign by faith cry out unto Thee: O Christ, save us by Thy Cross."
    }],
    "05-09": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of the Translation of St. Nicholas to Bari",
        "text": "Lifted from the church of Myra by the providence of Christ, thy relics, O Nicholas, did light up the West; and the city of Bari doth rejoice at thy coming."
    }],
    "05-10": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Apostle Simon the Zealot",
        "text": "Like a zealot of the Spirit thou didst preach Christ unto the nations, O Simon, and didst seal thy apostleship with the witness of martyrdom; wherefore the Church doth hymn thy memory."
    }],
    "05-11": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Sts. Cyril and Methodius",
        "text": "Equal-to-the-Apostles, ye translated the Scriptures into the Slavonic tongue, O Cyril and Methodius, and so didst enlighten whole nations; wherefore the Church of the Slavs blesseth your memory."
    }],
    "05-12": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Epiphanius of Cyprus",
        "text": "Wonderworker of Cyprus and a great teacher of the Faith, thou didst confound the heresies with thy Panarion, O Epiphanius; wherefore we honour thee with hymns."
    }],
    "05-13": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of Martyr Glyceria",
        "text": "Having put off the corruptible vesture of the body, O Glyceria, thou didst clothe thyself in the imperishable robe of Christ; and so didst find the bridechamber on high."
    }],
    "05-14": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Isidore of Chios",
        "text": "Forsaking the rank of the soldier, thou didst enlist in the army of Christ, O Isidore, and on the island of Chios didst seal thy faith with martyrdom."
    }],
    "05-15": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of St. Pachomius the Great",
        "text": "Having received the rule of cenobitic life from the Angel, O Pachomius, thou didst gather a multitude of monastics in the deserts of Tabennisi; wherefore we honour thee as a father of monastics."
    }],
    "05-16": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Theodore the Sanctified",
        "text": "As a true disciple of Pachomius, thou didst inherit his blessing and continue his rule, O Theodore; and the Church doth honour thee as a sanctified father."
    }],
    "05-17": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Apostle Andronicus",
        "text": "As a kinsman of Paul and his fellow-apostle, thou didst spread the Gospel among the nations, O Andronicus, and now thou prayest unceasingly for them that hymn thee."
    }],
    "05-18": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Theodotus of Ancyra",
        "text": "Having raised up the bodies of the Seven Virgins from the lake, O Theodotus, thou didst follow them in martyrdom, and so didst find the unfading wreath."
    }],
    "05-19": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of Hieromartyr Patrick",
        "text": "Bishop of Prusa and confessor of the truth, thou didst stand before the tyrant unshaken, O Patrick, and didst seal thy faith with the steadfast witness of blood."
    }],
    "05-20": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Thalleleus",
        "text": "Like the youngest of the martyrs in years but a great one in soul, O Thalleleus, thou didst tread under foot the threats of the tyrant; wherefore the Church doth crown thee with hymns."
    }],
    "05-22": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of Martyr Basiliscus",
        "text": "Bound in iron shoes, thou didst trample upon the snares of the deceiver, O Basiliscus, and didst pour forth healings as proof of thy contest."
    }],
    "05-23": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of St. Michael of Synnada",
        "text": "Confessing the icons of Christ, thou didst endure exile, O Michael of Synnada, and didst seal thy hierarchy with the wreath of confession."
    }],
    "05-24": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of St. Symeon Stylite of the Wonderful Mountain",
        "text": "Standing upon a pillar from thy youth, O Symeon, thou didst gaze ever upon the heavens, and didst pour forth wonders upon Antioch from the Wonderful Mountain."
    }],
    "05-25": [{
        "type": "kontakion", "tone": "Tone 6",
        "title": "Kontakion of the Third Finding of the Forerunner's Head",
        "text": "Thy head, O Forerunner of Christ, having been brought forth from the earth a third time, hath shone forth more brightly than the sun, illumining the faithful with the light of repentance."
    }],
    "05-26": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Apostle Carpus",
        "text": "Companion of Paul and apostle of the seventy, thou didst preach Christ in Thrace, O Carpus; wherefore the Church doth hymn thy memory."
    }],
    "05-27": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Helladius",
        "text": "As a true shepherd thou didst lay down thy life for the flock, O Helladius, and didst receive the wreath of martyrdom from the chief Shepherd Christ."
    }],
    "05-28": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of St. Nicetas of Chalcedon",
        "text": "Confessing the icons of Christ in the second iconoclasm, O Nicetas of Chalcedon, thou didst endure exile; wherefore the Church doth hymn thee as a steadfast confessor."
    }],
    "05-29": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Virgin-martyr Theodosia of Tyre",
        "text": "At eighteen years of age thou didst run to the contest, O Theodosia, and being cast into the sea didst find the harbour of Christ; wherefore the Church doth crown thee with hymns."
    }],
    "05-30": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Isaac of Dalmatia",
        "text": "Standing nobly before the Emperor Valens, O Isaac, thou didst rebuke the Arian heresy and didst foretell his ruin; wherefore the Church doth bless thee as a confessor of Orthodoxy."
    }],
    "05-31": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Apostle Hermas",
        "text": "Of the chorus of the seventy thou didst shine forth, O Hermas, having written down the Shepherd from the angel's hand; wherefore the Church doth hymn thy memory."
    }],
}

FIXED_JUNE: dict[str, list[dict]] = {
    "06-01": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Martyr Justin the Philosopher",
        "text": "Having sought the truth among the philosophers, O Justin, thou didst find Christ as the true Philosophy, and didst seal thy confession with thy blood in Rome."
    }],
    "06-02": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Nicephorus the Confessor",
        "text": "Patriarch of Constantinople and confessor of the icons, O Nicephorus, thou didst endure exile and reproach, and didst seal thy hierarchy with confession."
    }],
    "06-03": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Lucillian and Companions",
        "text": "Once a pagan priest in old age, thou didst find Christ, O Lucillian, and didst lead four young martyrs with thee unto the heavenly bridechamber."
    }],
    "06-04": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Metrophanes of Constantinople",
        "text": "First patriarch of the New Rome, O Metrophanes, thou didst bless the holy Council of Nicaea, and didst plant Orthodoxy upon the imperial city."
    }],
    "06-05": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Dorotheus of Tyre",
        "text": "Bishop of Tyre and confessor of Christ, thou didst write down the witness of the apostles, O Dorotheus, and didst seal thy hierarchy with the wreath of martyrdom."
    }],
    "06-06": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Hilarion the New of Dalmatia",
        "text": "Continuing the labours of the elder Hilarion, thou didst defend the icons of Christ, O father, and didst seal thy abbacy with confession."
    }],
    "06-07": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Theodotus of Ancyra",
        "text": "As an inn-keeper of Ancyra who lodged the saints, O Theodotus, thou didst follow them unto the wreath of martyrdom; wherefore the Church doth crown thy memory."
    }],
    "06-08": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of the Translation of Theodore the Stratelates",
        "text": "Returned to thy native city of Euchaita, thy relics shine forth as a fountain of healings, O Theodore the General, and the Church doth crown thy noble contest."
    }],
    "06-09": [{
        "type": "kontakion", "tone": "Tone 6",
        "title": "Kontakion of St. Cyril of Alexandria",
        "text": "Like a pillar of fire shining in Alexandria, thou didst confound the impiety of Nestorius, O Cyril, and didst confirm the Theotokos in her divine motherhood; wherefore the Church doth hymn thee as champion of the Mother of God."
    }],
    "06-10": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Timothy of Prussa",
        "text": "Wonderworker and bishop of Prussa, thou didst destroy the dragon by prayer, O Timothy, and didst seal thy hierarchy with the witness of martyrdom."
    }],
    "06-11": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Apostles Bartholomew and Barnabas",
        "text": "As a holy pair of apostles ye shone forth, preaching Christ unto the nations, O Bartholomew and Barnabas; and ye sealed your witness with martyrdom."
    }],
    "06-12": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of St. Onuphrius the Great",
        "text": "In the wilderness for seventy years thou didst contend, O Onuphrius, clothed only with thine own hair and fed by an angel; wherefore we hymn thee as a wonder among ascetics."
    }],
    "06-13": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Aquilina",
        "text": "Like a young lamb among wolves thou didst contend at Byblos, O Aquilina, and didst pour forth thy blood as a libation unto the Master."
    }],
    "06-14": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Prophet Elisha",
        "text": "Heir of the spirit of Elias by a twofold portion, O Elisha, thou didst pour forth wonders among Israel; wherefore the Church doth honour thee as a great prophet."
    }],
    "06-15": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Prophet Amos",
        "text": "Cleansing the threshing-floor of God by thy preaching, O Amos, thou didst proclaim the Day of the Lord; wherefore the Church doth bless thy honoured memory."
    }],
    "06-16": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Tikhon of Amathus",
        "text": "Wonderworker and bishop of Amathus in Cyprus, O Tikhon, thou didst command the dead vine to bear fruit; wherefore the faithful flee unto thee for healing."
    }],
    "06-17": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Martyrs Manuel, Sabel, and Ishmael",
        "text": "Three Persian brothers in the flesh and in martyrdom, O Manuel, Sabel, and Ishmael, ye refused the worship of the sun and didst confess Christ; wherefore the Church doth crown your noble band."
    }],
    "06-18": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of Martyr Leontius",
        "text": "Soldier of the Roman emperor and athlete of the heavenly King, thou didst contend nobly at Tripoli, O Leontius, and didst attain the wreath of victory."
    }],
    "06-19": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Apostle Jude",
        "text": "Brother of the Lord according to the flesh and a true apostle of Christ, O Jude, thou didst pour forth thy Epistle as a defense of the Faith; wherefore the Church doth hymn thy memory."
    }],
    "06-20": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Methodius of Patara",
        "text": "Confounding the godless Origen and his disciples, O Methodius of Patara, thou didst seal thy hierarchy with the witness of martyrdom; wherefore the Church doth bless thy memory."
    }],
    "06-21": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Julian of Tarsus",
        "text": "Cast into a sack of vipers by the tyrant, O Julian, thou didst find Christ as the Comforter; and so didst earn the wreath of unfading glory."
    }],
    "06-22": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Eusebius of Samosata",
        "text": "Champion of Orthodoxy and friend of Basil the Great, O Eusebius, thou didst endure exile from thy see, and at the hands of a heretical woman thou didst attain the wreath of martyrdom."
    }],
    "06-23": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Agrippina of Rome",
        "text": "Once a senatorial maiden of Rome, thou didst forsake the world for Christ, O Agrippina, and didst seal thy confession with martyrdom in the days of Valerian."
    }],
    "06-24": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of the Nativity of the Forerunner",
        "text": "She who was once barren beareth today the Forerunner of Christ, who is the fulfilment of every prophecy; for he, the prophet, in the Jordan laid his hand upon Him whom the prophets foretold, and was revealed as the Forerunner, the messenger, and prophet of the Word."
    }],
    "06-25": [{
        "type": "kontakion", "tone": "Tone 6",
        "title": "Kontakion of Virgin-martyr Febronia",
        "text": "Having forsaken the love of this fleeting world, thou didst run unto the Bridegroom Christ, O Febronia, and within the convent of Nisibis didst pour forth thy blood for the Faith."
    }],
    "06-26": [{
        "type": "kontakion", "tone": "Tone 1",
        "title": "Kontakion of St. David of Thessalonica",
        "text": "From a tree in Thessalonica thou didst preach to the people, O David, and didst pour forth wonders by the Spirit; wherefore the Church doth honour thee as a venerable father."
    }],
    "06-27": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Sampson the Hospitable",
        "text": "As a healer of bodies and a father of strangers, O Sampson, thou didst build a great hospital in Constantinople, and pourest forth thereunto, even now, the streams of healing."
    }],
    "06-28": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Translation of Cyrus and John",
        "text": "Brought from Egypt unto Rome, your honoured relics, O Cyrus and John, did glorify the imperial city; and now from on high ye bestow healing without payment."
    }],
    "06-30": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of the Synaxis of the Twelve Apostles",
        "text": "Christ the Rock most gloriously doth glorify the rock of faith, the chief of the disciples; and He summoneth all to praise the chorus of the twelve, the foundation-stones of the Church, which the gates of hell shall not prevail against."
    }],
}


FIXED_JULY: dict[str, list[dict]] = {
    "07-01": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Unmercenaries Cosmas and Damian of Rome",
        "text": "Having received the grace of healings, ye bestow healing without payment upon them that flee unto you, O glorious Cosmas and Damian; and pourest forth the streams of mercy upon all the faithful."
    }],
    "07-02": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Placing of the Robe of the Theotokos",
        "text": "Like a precious robe of immortality, thy garment is laid in Blachernae, O Theotokos, as a protection unto the imperial city; and we hymn it as a defense and wall."
    }],
    "07-03": [{
        "type": "kontakion", "tone": "Tone 6",
        "title": "Kontakion of Martyr Hyacinth",
        "text": "Once a young chamberlain of the Emperor Trajan, thou didst refuse the meats of the idols, O Hyacinth, and didst seal thy faith by famine; wherefore the Church doth crown thee with hymns."
    }],
    "07-04": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Andrew of Crete",
        "text": "Thou didst pour forth canons of contrition, O Andrew of Crete, and thy Great Canon doth stir the faithful unto repentance; wherefore the Church doth bless thy honoured memory."
    }],
    "07-05": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Athanasius of Athos",
        "text": "Father of the Great Lavra of the Holy Mountain, O Athanasius, thou didst gather a multitude of monastics on Athos, and didst plant therein the cenobitic rule."
    }],
    "07-06": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Sisoes the Great",
        "text": "Dwelling in the cell of Anthony the Great, thou didst inherit his graces, O Sisoes, and didst weep even at thy departure: 'Have I yet begun repentance?' Wherefore the Church doth honour thee."
    }],
    "07-07": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Great-martyr Kyriake",
        "text": "Lover of the Lord's day from thy youth, O Kyriake, thou didst dedicate thy virginity unto Christ, and didst pour forth thy blood in steadfast confession."
    }],
    "07-08": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Great-martyr Procopius",
        "text": "Once a persecutor of the Faith, thou wast called by Christ as another Paul, O Procopius, and didst seal thy zeal with the blood of martyrdom; wherefore the Church doth glorify thee."
    }],
    "07-09": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Pancratius",
        "text": "Disciple of the Apostle Peter and bishop of Tauromenium, O Pancratius, thou didst water Sicily with the streams of preaching, and didst seal thy hierarchy with martyrdom."
    }],
    "07-10": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of the Forty-Five Martyrs of Nicopolis",
        "text": "Bound together in chains and cast into the fire, ye were not consumed, O forty-five soldiers of Christ; wherefore the Church doth crown your noble band with hymns."
    }],
    "07-11": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Equal-to-the-Apostles Olga",
        "text": "Grandmother of the Russian land and herald of the Faith, O Olga, thou didst forsake the gods of thy people and didst embrace Christ; wherefore the Church doth bless thee as enlightener."
    }],
    "07-12": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Proclus and Hilary",
        "text": "Joined together by the bond of love, ye contended for the Faith, O Proclus and Hilary, and ye received together the wreaths of martyrdom from Christ."
    }],
    "07-13": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of the Synaxis of the Archangel Gabriel",
        "text": "Captain of the bodiless powers, thou didst proclaim unto the Virgin the descent of the Word, O Gabriel; wherefore the Church doth honour thy synaxis with hymns."
    }],
    "07-14": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Apostle Aquila",
        "text": "Companion of Paul and a tent-maker of Christ's mysteries, O Aquila, thou with thy wife Priscilla didst pour forth the seeds of preaching."
    }],
    "07-15": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of Equal-to-the-Apostles Vladimir",
        "text": "Once a pagan prince of the Russian land, thou wast called by Christ as another Paul, O Vladimir, and didst baptize Russia in the streams of the Dnieper; wherefore the Church blesseth thee."
    }],
    "07-16": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Athenogenes",
        "text": "As a noble priest of God, thou didst seal thy hierarchy with the blood of martyrdom, O Athenogenes of Heracleopolis, having entered the flames as into a fragrant garden."
    }],
    "07-17": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of Great-martyr Marina",
        "text": "Adorned with the beauty of virginity, O Marina, thou didst tread upon the dragon by the sign of the Cross, and didst pour forth thy blood as a sacrifice unto Christ."
    }],
    "07-18": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Emilian",
        "text": "Once a slave of Silistria according to the flesh, thou wast made free in Christ, O Emilian, and didst seal thy confession by the fire of martyrdom."
    }],
    "07-19": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Macrina",
        "text": "Sister of Basil and Gregory according to the flesh, and an elder mother of monastics, O Macrina, thou didst teach the household of God by thy life."
    }],
    "07-20": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Prophet Elijah",
        "text": "Prophet and seer of the works of God, O Elijah great in renown, thou didst shut up the rain-giving clouds by thy word; pray on our behalf unto the only Lover of mankind."
    }],
    "07-21": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of Sts. Symeon the Fool and John",
        "text": "Having put on the cloak of folly for Christ, O Symeon, thou didst rebuke the world by thy seeming madness; and with thee we honour John the hermit, who in the wilderness did pray."
    }],
    "07-22": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Mary Magdalene",
        "text": "From thee did the Lord cast out seven demons, O Mary Magdalene, and made thee a herald of His Resurrection; wherefore the Church doth honour thee as Equal-to-the-Apostles."
    }],
    "07-23": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Trophimus and Companions",
        "text": "Joined together by the bond of love, ye contended unto the wreaths of martyrdom, O Trophimus, Theophilus, and ye thirteen who with them confessed Christ."
    }],
    "07-24": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of Passion-Bearers Boris and Gleb",
        "text": "Once princes of Russia in the flesh, ye refused to lift the sword against your brother, O Boris and Gleb, and so received the wreath of meek passion-bearing."
    }],
    "07-25": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of the Dormition of Righteous Anna",
        "text": "Mother of the Mother of God, righteous Anna, thou didst bear the burden of barrenness with patience, and at last didst bring forth the dwelling-place of God; wherefore we hymn thy dormition."
    }],
    "07-26": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Hermolaus",
        "text": "Catechist of the holy Panteleimon, O Hermolaus, thou didst share with him the wreath of martyrdom; and we honour thy teaching and thy contest."
    }],
    "07-27": [{
        "type": "kontakion", "tone": "Tone 5",
        "title": "Kontakion of Great-martyr Panteleimon",
        "text": "Imitator of the merciful one and recipient of grace from Him, O glorious passion-bearer Panteleimon, healer of soldiers, intercede with the only Lover of mankind, that He may grant unto our souls great mercy."
    }],
    "07-28": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Apostles Prochorus, Nicanor, Timon, and Parmenas",
        "text": "As a fourfold band of the seven deacons ordained by the apostles, ye preached Christ unto the nations, O Prochorus, Nicanor, Timon, and Parmenas; wherefore the Church doth hymn your memory."
    }],
    "07-29": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Martyr Callinicus",
        "text": "Once a soldier of Cilicia, thou didst forsake the world for Christ, O Callinicus, and didst attain the wreath of martyrdom by iron shoes pressed unto thy feet."
    }],
    "07-30": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Apostles Silas, Silvanus, and Companions",
        "text": "Companions of Paul and apostles of the seventy, ye scattered the seeds of preaching, O Silas, Silvanus, Crescens, Epenetus, and Andronicus; wherefore the Church doth honour your memory."
    }],
    "07-31": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Righteous Eudokimos",
        "text": "Once a senatorial youth of Cappadocia, thou didst conceal thy holiness from men, O Eudokimos, and at thy youthful repose the Lord did glorify thee with wonders."
    }],
}

FIXED_AUGUST: dict[str, list[dict]] = {
    "08-01": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Procession of the Cross and the Maccabee Martyrs",
        "text": "Brought forth from the imperial treasury, the Cross is set forth as a fountain of healings; and with it we honour the seven Maccabee Martyrs, their mother Solomonia, and their teacher Eleazar."
    }],
    "08-02": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Translation of Protomartyr Stephen",
        "text": "Discovered to his patriarch by a wondrous vision, thy honoured relics, O Stephen, were translated unto the imperial city, and now do shine forth as the dawn of healings."
    }],
    "08-03": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Anthony the Roman",
        "text": "Borne by the sea from Rome unto Novgorod upon a stone, O Anthony, thou didst found there a monastery, and didst pour forth a fountain of teaching to a strange people."
    }],
    "08-04": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Seven Holy Youths of Ephesus",
        "text": "Asleep within the cave of Ephesus for two centuries, ye awoke as proof of the Resurrection, O seven holy youths; wherefore the Church doth bless your wondrous repose."
    }],
    "08-05": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Forefeast of the Transfiguration",
        "text": "Today the Father's voice prepareth to proclaim on Tabor: This is My beloved Son; and the Spirit prepareth to overshadow the mountain with the cloud of glory."
    }],
    "08-07": [{
        "type": "kontakion", "tone": "Tone 6",
        "title": "Kontakion of Hieromartyr Dometius the Persian",
        "text": "Once a Persian by birth, thou didst forsake the worship of fire for the worship of Christ, O Dometius, and within a cave in Syria didst seal thy confession by martyrdom."
    }],
    "08-08": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of St. Emilian of Cyzicus",
        "text": "Confessing the icons of Christ before the iconoclasts, O Emilian of Cyzicus, thou didst endure exile from thy see, and didst depart unto the heavenly Jerusalem."
    }],
    "08-09": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Apostle Matthias",
        "text": "Chosen by lot to fill the place of the betrayer, O Matthias, thou didst preach Christ unto the nations, and didst seal thy apostleship with the witness of martyrdom."
    }],
    "08-10": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Archdeacon Lawrence",
        "text": "Bestowing upon the poor the treasures of the Church of Rome, O Lawrence, thou didst lay them up in heaven, and upon a gridiron didst seal thy diaconate with the witness of fire."
    }],
    "08-11": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Martyr Euplus the Deacon",
        "text": "Bearing the Gospel-book at thy breast, O Euplus, thou didst preach Christ openly at Catania, and didst seal thy diaconate with the sword of martyrdom."
    }],
    "08-12": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Photius and Anicetus",
        "text": "Yoked together by the bond of love, ye contended unto the wreaths of martyrdom, O Photius and Anicetus, refusing to bow down before the idols of Nicomedia."
    }],
    "08-13": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Tikhon of Zadonsk",
        "text": "Patriarch of teaching and example of meekness, O Tikhon of Zadonsk, thou didst forsake the see of Voronezh to dwell in stillness; and from thy writings the faithful drink the streams of repentance."
    }],
    "08-14": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Forefeast of the Dormition and Prophet Micah",
        "text": "Today the powers of heaven prepare to receive the Theotokos, and with them we honour the Prophet Micah, who foretold the One who would come forth from Bethlehem of Judea."
    }],
    "08-16": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of the Image of Christ Not-Made-by-Hands",
        "text": "Receiving the holy image upon a cloth, King Abgar of Edessa was healed by it; and now from Edessa unto Constantinople is this image borne, granting blessing unto the city."
    }],
    "08-17": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Myron of Cyzicus",
        "text": "Once a priest of Cyzicus, thou didst stand for Christ before the persecutor, O Myron, and within an iron skin didst pour forth thy blood for the Faith."
    }],
    "08-18": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Florus and Laurus",
        "text": "Brothers in the flesh and brothers in the wreath of martyrdom, O Florus and Laurus, ye preached Christ unto the masons of Illyria, and didst seal your faith in a well."
    }],
    "08-19": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Martyr Andrew Stratelates",
        "text": "Like another general of Christ thou didst lead a great army unto the heavenly host, O Andrew the Stratelates; and with thy soldiers didst attain the wreath of victory."
    }],
    "08-20": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of Prophet Samuel",
        "text": "From thy mother's vow thou wast given to the Lord, O Samuel, and didst anoint the kings of Israel; wherefore the Church doth honour thee as a great prophet."
    }],
    "08-21": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Apostle Thaddaeus",
        "text": "Of the seventy disciples thou wast a herald, O Thaddaeus, and didst bring the holy image of Christ unto King Abgar of Edessa; wherefore the Church doth bless thy memory."
    }],
    "08-22": [{
        "type": "kontakion", "tone": "Tone 1",
        "title": "Kontakion of Martyr Agathonicus",
        "text": "Like a noble champion of the Faith, O Agathonicus, thou didst stand before the tyrant Maximian, and within a wagon yoked to oxen didst seal thy confession by martyrdom."
    }],
    "08-23": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of the Leavetaking of the Dormition and Irenaeus of Lyons",
        "text": "Today the Church doth bless the Dormition of the Theotokos, and with it we honour Irenaeus of Lyons, foe of the Gnostics and shepherd of Gaul, who sealed his hierarchy by martyrdom."
    }],
    "08-24": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Eutyches",
        "text": "Disciple of John the Theologian, O Eutyches, thou didst preach Christ in Phrygia, and didst seal thy hierarchy with the wreath of martyrdom."
    }],
    "08-25": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Return of Bartholomew and Apostle Titus",
        "text": "Returning to the East from the islands, the relics of Bartholomew the apostle do shine forth; and with him we honour Titus the apostle, the disciple of Paul."
    }],
    "08-26": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Adrian and Natalia",
        "text": "Once a persecutor of the Faith, O Adrian, thou wast won by the steadfastness of the martyrs, and didst find in Natalia thy wife a true bride for the heavenly bridechamber."
    }],
    "08-27": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Poemen the Great",
        "text": "A shepherd of monastics by name and a true shepherd by deed, O Poemen, thou didst gather a multitude in Egypt, and didst pour forth sayings of life unto thy disciples."
    }],
    "08-28": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of St. Moses the Black",
        "text": "Once a robber and a slave of vice, thou didst find Christ in the wilderness of Scetis, O Moses, and didst water it with thy tears, becoming a vessel of grace."
    }],
    "08-29": [{
        "type": "kontakion", "tone": "Tone 5",
        "title": "Kontakion of the Beheading of the Forerunner",
        "text": "The glorious beheading of the Forerunner became an act of divine dispensation, that he might preach the coming of the Saviour even unto those in Hades. Wherefore let Herodias lament, who solicited a wicked murder, having loved not the law of God or eternal life, but the deceitful and temporal."
    }],
    "08-30": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of Sts. Alexander, John, and Paul of Constantinople",
        "text": "As a threefold band of hierarchs ye shepherded the New Rome, O Alexander, John, and Paul, and ye stood unshaken against the heresies of your age; wherefore the Church doth crown your noble band."
    }],
    "08-31": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Placing of the Sash of the Theotokos",
        "text": "Like a robe of purple woven by faith, thy honoured Sash is placed in Constantinople, O Theotokos, as a defense and a strong wall unto the imperial city."
    }],
}

FIXED_SEPTEMBER: dict[str, list[dict]] = {
    "09-01": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of the Indiction and St. Symeon the Stylite",
        "text": "Today the new year of the Church beginneth, and the Maker of all crowneth her with His blessings; and with the year we honour Symeon the Stylite, who upon a pillar did sanctify the air."
    }],
    "09-02": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of Martyr Mamas",
        "text": "From thy youth thou wast nurtured in the wilderness of Caesarea by the milk of a doe, O Mamas, and didst contend nobly for Christ; wherefore the Church doth honour thy memory."
    }],
    "09-03": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Anthimus",
        "text": "Like a noble shepherd of Nicomedia, O Anthimus, thou didst stand before the tyrant Maximian, and didst pour forth thy blood as a libation for thy flock."
    }],
    "09-04": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of Hieromartyr Babylas and Prophet Moses",
        "text": "Confessing Christ before the Emperor Decius, O Babylas, thou didst forbid him entry into the church; and with thee we hymn the great Moses, the God-seer upon Sinai."
    }],
    "09-05": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of Prophet Zechariah, father of the Forerunner",
        "text": "Slain by the impious within the temple itself, O Zechariah, thou didst seal thy priesthood with thy blood, and thy son the Forerunner did receive thy crown."
    }],
    "09-06": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of the Miracle of the Archangel Michael at Chonae",
        "text": "Captain of the heavenly hosts, O Michael, thou didst deliver the church at Chonae by striking the rock and channeling the waters; wherefore we honour thy mighty defense."
    }],
    "09-07": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Forefeast of the Nativity of the Theotokos and Martyr Sozon",
        "text": "Today the gates of holiness are opening, and the Most Pure Virgin is about to be born; and with it we honour Sozon the martyr, who broke the golden idol of Cilicia."
    }],
    "09-09": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Sts. Joachim and Anna",
        "text": "Once barren and ashamed before the people, ye were vouchsafed to bring forth the dwelling-place of God, O righteous Joachim and Anna; wherefore the Church doth honour you as ancestors of God."
    }],
    "09-10": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Menodora, Metrodora, and Nymphodora",
        "text": "Threefold band of virgin-martyrs of Bithynia, ye contended for Christ together, O Menodora, Metrodora, and Nymphodora; wherefore the Church doth crown your noble sisterhood."
    }],
    "09-11": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of St. Theodora of Alexandria",
        "text": "Concealing thy womanhood under the disguise of a man, O Theodora, thou didst dwell in a monastery of monks, and didst endure great trials in steadfast humility."
    }],
    "09-12": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Autonomus",
        "text": "Once a bishop in Italy, thou didst flee unto Bithynia from the persecutors, O Autonomus, and there sealed thy hierarchy with the witness of martyrdom."
    }],
    "09-13": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Dedication of the Resurrection Church and the Forefeast of the Cross",
        "text": "Today the Church of the Resurrection is consecrated in Jerusalem, and tomorrow the Honoured Cross is exalted; wherefore the faithful rejoice with twofold joy."
    }],
    "09-15": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Great-martyr Nicetas the Goth",
        "text": "Once a Gothic prince, O Nicetas, thou didst convert thy people to Christ, and didst seal thy faith by fire from the hand of the Arian Athanaric."
    }],
    "09-16": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Great-martyr Euphemia",
        "text": "Once a maiden of Chalcedon, thou didst contend nobly, O Euphemia all-praised; and at the Fourth Council thy relics did receive the orthodox tome and rejected that of the heretics."
    }],
    "09-17": [{
        "type": "kontakion", "tone": "Tone 1",
        "title": "Kontakion of Martyrs Sophia, Faith, Hope, and Love",
        "text": "Their mother bringeth them as a fragrant offering unto the Master, O Faith, Hope, and Love; and Sophia followeth her daughters thrice over by maternal sorrow and martyric joy."
    }],
    "09-18": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of St. Eumenius the Wonderworker",
        "text": "Bishop of Gortyna and worker of wonders, O Eumenius, thou didst tame a fierce dragon by prayer, and didst pour forth healings upon them that flee unto thee."
    }],
    "09-19": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Trophimus, Sabbatius, and Dorymedon",
        "text": "Yoked together in confession before the tyrant Probus, ye contended unto the wreaths of martyrdom, O Trophimus, Sabbatius, and Dorymedon."
    }],
    "09-20": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Great-martyr Eustathius and his Family",
        "text": "Once Placidas, the noble general of Trajan, thou didst behold the Cross between the antlers of the stag, O Eustathius, and with thy wife and sons didst seal thy faith within a brazen bull."
    }],
    "09-21": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Leavetaking of the Cross and Apostle Quadratus",
        "text": "Today the feast of the Honoured Cross is sealed, and with it the apostle Quadratus is hymned, who at Athens did defend the Faith against the heathen by his Apologia."
    }],
    "09-22": [{
        "type": "kontakion", "tone": "Tone 6",
        "title": "Kontakion of Hieromartyr Phocas",
        "text": "Once a gardener of Sinope, thou didst dig thine own grave with thy hands, O Phocas, and didst lay down thy life for Christ; wherefore the seafarers cry unto thee for safe voyage."
    }],
    "09-23": [{
        "type": "kontakion", "tone": "Tone 1",
        "title": "Kontakion of the Conception of the Forerunner",
        "text": "Today the universe rejoiceth at the conception of the Forerunner of the Master, and Zechariah dance unto the silenced word; for he who shall point unto the Lamb of God is now formed in the womb."
    }],
    "09-24": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Protomartyr Thecla",
        "text": "Disciple of Paul and first among the female martyrs, O Thecla, thou didst confess Christ before the fire and the wild beasts, and didst escape unharmed by the providence of the Master."
    }],
    "09-25": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Euphrosyne and St. Sergius of Radonezh",
        "text": "Together we hymn Euphrosyne, who in the disguise of a man did dwell in a monastery of monks; and with her, holy Sergius of Radonezh, father of all the Russian land."
    }],
    "09-26": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of the Repose of John the Theologian",
        "text": "Who can recount thy mighty works, O Virgin Apostle? For thou pourest forth miracles and effusions of healings, and prayest for our souls as Theologian and Friend of Christ."
    }],
    "09-27": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Callistratus and Companions",
        "text": "Like a chosen band of forty-nine soldiers, O Callistratus, ye contended together for Christ, and ye received together the wreaths of martyrdom."
    }],
    "09-28": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of St. Chariton the Confessor",
        "text": "Founder of the laura of the Old Cells, O Chariton, thou didst plant the desert of Judea with monastic flowers; wherefore the Church doth honour thee as a venerable father."
    }],
    "09-29": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Cyriacus the Hermit",
        "text": "Dwelling in the wilderness of Palestine for sixty and ten years, O Cyriacus, thou didst pour forth wonders by prayer, and didst confute the Origenist heretics by thy steadfast Faith."
    }],
    "09-30": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Hieromartyr Gregory the Illuminator",
        "text": "Equal-to-the-Apostles, thou didst convert the kingdom of Armenia, O Gregory, and didst water it with the streams of preaching; wherefore the Church doth bless thee as enlightener."
    }],
}


FIXED_OCTOBER: dict[str, list[dict]] = {
    "10-01": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of the Protection of the Theotokos",
        "text": "Today the Virgin standeth in the church and unseen prayeth God for us; the Angels worship with the Hierarchs, and the Apostles rejoice with the Prophets, for the Theotokos prayeth on our behalf to the Eternal God."
    }],
    "10-02": [{
        "type": "kontakion", "tone": "Tone 1",
        "title": "Kontakion of Hieromartyr Cyprian and Martyr Justina",
        "text": "Once a sorcerer of darkness, thou wast won by the steadfast purity of Justina, O Cyprian; and with her thou didst seal thy turning unto Christ by the witness of blood."
    }],
    "10-03": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of Hieromartyr Dionysius the Areopagite",
        "text": "Of the seventy disciples of the Master, thou wast called from the court of Areopagus by the preaching of Paul, O Dionysius, and didst seal thy hierarchy with martyrdom in Paris."
    }],
    "10-04": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Hieromartyr Hierotheus",
        "text": "Of the seventy disciples and teacher of Dionysius the Areopagite, O Hierotheus, thou didst seal thy bishopric of Athens by the witness of blood."
    }],
    "10-05": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Charitina",
        "text": "Once a virgin of Amisus, thou didst stand before the tyrant unshaken, O Charitina, and didst seal thy confession by the witness of martyrdom."
    }],
    "10-06": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Apostle Thomas",
        "text": "Thomas the disciple of Christ, the wise initiate of God, with his right hand of faith probed Thy life-bestowing side, O Christ; and from thence he preached Thy great mercy unto India."
    }],
    "10-07": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Martyrs Sergius and Bacchus",
        "text": "Yokefellows in arms and in martyrdom, ye were stripped of your military rank and clothed with the wreath of victory, O Sergius and Bacchus."
    }],
    "10-08": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of St. Pelagia the Penitent",
        "text": "Once a famed harlot of Antioch, thou wast won unto Christ by the tears of the bishop Nonnus, O Pelagia, and didst seal thy repentance by ascetic struggle in Jerusalem."
    }],
    "10-09": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Apostle James, son of Alphaeus",
        "text": "Like a steadfast pillar of the Church, O James, son of Alphaeus, thou didst preach Christ unto the nations, and didst seal thy apostleship with the wreath of martyrdom."
    }],
    "10-10": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Eulampius and Eulampia",
        "text": "Brother and sister joined in the wreath of martyrdom, O Eulampius and Eulampia, ye contended at Nicomedia, and unhurt by the fire didst find the heavenly bridechamber."
    }],
    "10-11": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Apostle Philip the Deacon",
        "text": "One of the seven first-deacons, O Philip, thou didst baptize the eunuch of Ethiopia, and didst preach Christ throughout Samaria; wherefore the Church doth honour thy memory."
    }],
    "10-12": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Probus, Tarachus, and Andronicus",
        "text": "Threefold band of martyrs of Tarsus, ye stood before the tribunals unshaken, O Probus, Tarachus, and Andronicus; wherefore the Church doth crown your contest."
    }],
    "10-13": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Carpus and Companions",
        "text": "Bishop, deacon, and laypeople yoked together in the wreath of martyrdom, O Carpus, Papylus, Agathonike, and Agathodorus, ye contended at Pergamon for Christ."
    }],
    "10-14": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Nazarius and Companions",
        "text": "Like a fourfold band of confessors ye contended at Milan, O Nazarius, Gervasius, Protasius, and Celsus, and didst pour forth your blood as a libation for Christ."
    }],
    "10-15": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Euthymius the New",
        "text": "Like the Great Euthymius of old, thou didst gather monastics on Mount Athos, O Euthymius the New, and didst pour forth a fountain of teaching unto thy flock."
    }],
    "10-16": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Longinus the Centurion",
        "text": "Once the centurion who confessed Christ upon the Cross, O Longinus, thou didst preach Him afterwards in Cappadocia, and didst seal thy confession by martyrdom."
    }],
    "10-17": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Prophet Hosea",
        "text": "Faithful prophet of the Lord, O Hosea, thou didst rebuke Israel by thy own marriage, foreshadowing the union of Christ with His Church; wherefore the Church doth honour thy memory."
    }],
    "10-18": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Evangelist Luke",
        "text": "Disciple of Paul and faithful physician, thou didst write the third Gospel and the Acts of the Apostles, O Luke; and didst paint the first icon of the Theotokos with thine own hand."
    }],
    "10-19": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Prophet Joel",
        "text": "Foreteller of the descent of the Spirit upon all flesh, O Joel, thou didst herald the Day of the Lord; wherefore the Church doth bless thy honoured memory."
    }],
    "10-20": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Great-martyr Artemius",
        "text": "Once a general of Antioch under Constantine and Constantius, thou didst rebuke the apostate Julian, O Artemius, and didst seal thy faith by the wreath of martyrdom."
    }],
    "10-21": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of St. Hilarion the Great",
        "text": "Father of monastic life in Palestine and disciple of Anthony, O Hilarion, thou didst pour forth wonders by prayer, and didst plant the wilderness with the flowers of asceticism."
    }],
    "10-22": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Equal-to-the-Apostles Abercius",
        "text": "Wonderworker and bishop of Hierapolis in Phrygia, O Abercius, thou didst journey unto Rome to heal the emperor's daughter; wherefore the Church doth bless thy memory."
    }],
    "10-23": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Apostle James, Brother of the Lord",
        "text": "First bishop of Jerusalem and brother of the Lord according to the flesh, O James the Just, thou didst write the Catholic Epistle and didst seal thy hierarchy with martyrdom."
    }],
    "10-24": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Arethas and Companions",
        "text": "Once an elder of the city of Najran, thou didst lead a great band of Christians unto the wreath of martyrdom, O Arethas, refusing the demands of the apostate Dhu Nuwas."
    }],
    "10-25": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Marcian and Martyrius",
        "text": "Notaries of Paul the Confessor, ye contended for the truth of Orthodoxy, O Marcian and Martyrius, and didst seal the Faith with the witness of your blood."
    }],
    "10-27": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Martyr Nestor of Thessalonica",
        "text": "Disciple of the great Demetrius, thou wast blessed by him for the contest, O Nestor, and didst slay the giant Lyaeus before the eyes of Maximian; wherefore the Church honoureth thee."
    }],
    "10-28": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Terence, Neonilla, and their Children",
        "text": "Like a noble household of martyrs, O Terence and Neonilla, with your seven children ye contended for Christ, and ye received together the wreaths of victory."
    }],
    "10-29": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of Virgin-martyr Anastasia the Roman",
        "text": "Once a young maiden of Rome, thou didst forsake the world for the convent, O Anastasia, and at thy mistress's hand didst find the wreath of martyric purity."
    }],
    "10-30": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of Martyrs Zenobius and Zenobia",
        "text": "Brother and sister of one flesh and of one wreath of martyrdom, O Zenobius and Zenobia, ye gave alms unto the poor, and so were vouchsafed to follow Christ unto martyrdom."
    }],
    "10-31": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Apostles Stachys and Companions",
        "text": "As a sixfold band of the seventy disciples, ye preached Christ in many lands, O Stachys, Amplias, Urban, Narcissus, Apelles, and Aristobulus; wherefore the Church doth hymn your memory."
    }],
}

FIXED_NOVEMBER: dict[str, list[dict]] = {
    "11-01": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Unmercenaries Cosmas and Damian of Asia",
        "text": "Having received the grace of healings, ye bestow healing without payment upon them that flee unto you, O glorious Cosmas and Damian of Asia; and pourest forth streams of mercy upon all the faithful."
    }],
    "11-02": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Martyrs Acindynus and Companions",
        "text": "As a fivefold band of confessors of Persia, ye contended together for Christ, O Acindynus, Pegasius, Aphthonius, Elpidiphorus, and Anempodistus; wherefore the Church doth crown your noble contest."
    }],
    "11-03": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Acepsimas, Joseph, and Aeithalas",
        "text": "Threefold band of clergy of Persia — bishop, presbyter, and deacon — ye sealed your hierarchy with the wreath of martyrdom, O Acepsimas, Joseph, and Aeithalas."
    }],
    "11-04": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Joannicius the Great",
        "text": "Once a soldier of the imperial guard, thou didst forsake the world for the wilderness of Bithynia, O Joannicius, and didst pour forth wonders upon them that flee unto thee."
    }],
    "11-05": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Martyrs Galaction and Episteme",
        "text": "Once a noble pair of Christian wedlock, ye chose virginity for the love of Christ, O Galaction and Episteme, and didst seal thy purity by the wreath of martyrdom."
    }],
    "11-06": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Paul the Confessor",
        "text": "Patriarch of the New Rome and steadfast confessor of the Faith of Nicaea, O Paul, thou didst endure exile from the Arians, and didst seal thy hierarchy by martyrdom in Cappadocia."
    }],
    "11-07": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Martyr Hieron and Companions",
        "text": "Leading thirty-three companions unto the wreath of martyrdom, O Hieron, thou didst seal thy faith by the witness of blood at Melitene."
    }],
    "11-08": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of the Synaxis of the Archangel Michael",
        "text": "Captains supreme of God's heavenly hosts, we who are unworthy ever entreat you, that by your prayers ye encompass us beneath the wings of your unseen glory; safeguard us as we fervently fall down and cry: From dangers deliver us, since ye are the marshals of the powers on high."
    }],
    "11-09": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of Martyrs Onesiphorus and Porphyrius",
        "text": "Joined together by the bond of love, O Onesiphorus and Porphyrius, ye contended unto the wreaths of martyrdom; with you we hymn Matrona, mother of monastics of Constantinople."
    }],
    "11-10": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Apostles Erastus and Companions",
        "text": "As a sixfold band of apostles of the seventy, ye preached Christ unto many lands, O Erastus, Olympas, Rodion, Sosipater, Quartus, and Tertius."
    }],
    "11-11": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Great-martyr Menas",
        "text": "Once a soldier of Cotyaeum in Phrygia, thou didst forsake thy rank for the love of Christ, O Menas, and within the desert of Egypt didst seal thy faith with martyrdom."
    }],
    "11-12": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of St. John the Merciful and St. Nilus the Faster",
        "text": "Patriarch of Alexandria and dispenser of mercy unto the poor, O John, with thee we hymn Nilus the Faster of Sinai, who wrote the desert sayings of holiness."
    }],
    "11-13": [{
        "type": "kontakion", "tone": "Tone 6",
        "title": "Kontakion of St. John Chrysostom",
        "text": "Thou didst receive divine grace from heaven, and with thy lips thou didst teach all to worship the One God in Trinity, O all-blessed and venerable Chrysostom; rightly we acclaim thee, for thou art our master, revealing things divine."
    }],
    "11-14": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of Apostle Philip",
        "text": "Disciple and friend of Christ and imitator of His Passion, O Philip, thou didst preach Him unto the heathen, and didst seal thy apostleship with the upside-down cross in Hierapolis."
    }],
    "11-15": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of the Beginning of the Nativity Fast and Martyrs Gurias, Samonas, and Habib",
        "text": "Today the Church beginneth the fast that prepareth for the coming of the Word in the flesh; and with it we honour Gurias, Samonas, and Habib, defenders of Christian wedlock."
    }],
    "11-16": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Apostle Matthew",
        "text": "Once a publican at the seat of customs, thou didst forsake all to follow Christ, O Matthew, and didst write the first Gospel for the Hebrews; wherefore the Church doth hymn thy memory."
    }],
    "11-17": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of St. Gregory the Wonderworker",
        "text": "Wonderworker and bishop of Neo-Caesarea, O Gregory, thou didst command the mountains by prayer, and didst leave but seventeen pagans in thy city; wherefore the Church doth hymn thee."
    }],
    "11-18": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of Martyr Plato of Ancyra",
        "text": "Once a noble youth of Ancyra, thou didst forsake the riches of this world, O Plato, and didst seal thy confession of Christ by the wreath of martyrdom."
    }],
    "11-19": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Prophet Obadiah",
        "text": "Faithful prophet of the Lord, O Obadiah, thou didst foretell the judgment of Edom and the salvation of Sion; wherefore the Church doth bless thy honoured memory."
    }],
    "11-20": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Forefeast of the Entrance and St. Gregory the Decapolite",
        "text": "Today the gates of holiness are opening, for the most pure Temple shall enter the Temple; and with this forefeast we honour Gregory of the Decapolis, ascetic of Olympus."
    }],
    "11-22": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Apostles Philemon, Archippus, and Apphia",
        "text": "Threefold household of the Faith hymned by Paul, ye sealed your apostleship with the wreath of martyrdom, O Philemon, Archippus, and Apphia."
    }],
    "11-23": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Sts. Amphilochius and Gregory",
        "text": "Companion of the Cappadocians, O Amphilochius of Iconium, thou didst confound the heresies; and with thee we hymn Gregory of Acragas, faithful bishop of Sicily."
    }],
    "11-24": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Great-martyr Catherine",
        "text": "Once a noble maiden of Alexandria most wise in philosophy, thou didst confound fifty orators of the emperor Maxentius, O Catherine, and upon the wheel didst seal thy confession."
    }],
    "11-25": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of the Leavetaking of the Entrance and Hieromartyr Clement",
        "text": "Today the feast of the Entrance is sealed, and with it we honour Clement, third bishop of Rome, disciple of Peter and Paul, who within the depths of the sea did receive a temple of stone."
    }],
    "11-26": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Alypius the Stylite",
        "text": "Standing for fifty and three years upon a pillar at Adrianopolis, O Alypius, thou didst gather a chorus of disciples beneath thee; wherefore the Church doth honour thee as a wonder of patience."
    }],
    "11-27": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Great-martyr James the Persian",
        "text": "Cut piece by piece for the Faith of Christ, O James the Persian, thou didst bless each limb taken from thee, and didst find the heavenly bridechamber unmaimed."
    }],
    "11-28": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of Martyr Stephen the New",
        "text": "Confessing the icons of Christ upon Mount St. Auxentius, O Stephen the New, thou didst stand alone against the iconoclast Copronymus, and didst seal thy confession beneath the stones of the rabble."
    }],
    "11-29": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Paramonus and Companions",
        "text": "Leading three hundred and seventy other martyrs unto the wreath of victory, O Paramonus, thou didst stand before the tyrant Aquilinus unshaken; wherefore the Church doth crown your noble band."
    }],
    "11-30": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Apostle Andrew the First-Called",
        "text": "Let us praise the namesake of courage, the divinely-eloquent and first-called of the disciples of the Saviour, the brother of Peter; for as he called of old to him, so now to us he crieth: Come, we have found the One whom the world desireth."
    }],
}

FIXED_DECEMBER: dict[str, list[dict]] = {
    "12-01": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Prophet Nahum",
        "text": "Like a fearful seer of the wrath of God, O Nahum, thou didst foretell the fall of Nineveh; wherefore the Church doth bless thy honoured memory."
    }],
    "12-02": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of Prophet Habakkuk",
        "text": "Standing upon thy watchtower of prayer, O Habakkuk, thou didst hear from the Lord the answer of His promise; wherefore the Church doth honour thee as a great prophet."
    }],
    "12-03": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Prophet Zephaniah",
        "text": "Filled with the grace of prophecy, O Zephaniah, thou didst foretell the great Day of the Lord; wherefore the Church doth bless thy honoured memory."
    }],
    "12-04": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Great-martyr Barbara",
        "text": "Singing the praises of the Trinity in the heart of three windows, O Barbara, thou didst confound the unbelief of thy father, and didst seal thy faith with the witness of thine own blood."
    }],
    "12-05": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Sabbas the Sanctified",
        "text": "As a noble plant of asceticism, thou didst water the wilderness of Judea with thy tears, O Sabbas the Sanctified, and didst found there the Great Lavra of monastic life."
    }],
    "12-07": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of St. Ambrose of Milan",
        "text": "Champion of Orthodoxy and bishop of Milan, O Ambrose, thou didst stand before emperors unshaken, and didst draw Augustine unto the streams of holy baptism."
    }],
    "12-08": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of St. Patapius of Thebes",
        "text": "Wonderworker and ascetic of Thebes, O Patapius, thou didst flee the world for the wilderness, and didst pour forth healings upon them that flee unto thy honoured relics."
    }],
    "12-09": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Conception of the Theotokos by Righteous Anna",
        "text": "Today the universe rejoiceth, for Anna conceiveth the Mother of God; for she who shall bring forth the ineffable Word is herself conceived as the harbinger of our salvation."
    }],
    "12-10": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Menas, Hermogenes, and Eugraphus",
        "text": "Sent to subdue the rebellion, O Menas, thou didst become the leader of confessors instead; and with Hermogenes and Eugraphus ye sealed the Faith by the wreath of martyrdom."
    }],
    "12-11": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of St. Daniel the Stylite",
        "text": "Standing for three and thirty years upon a pillar, O Daniel, thou didst gather a chorus of disciples beneath thee, and didst pour forth wonders by prayer; wherefore the Church doth bless thee."
    }],
    "12-12": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of St. Spyridon of Trimythous",
        "text": "Wounded by Christ's love and graced with the wings of the Spirit, thou didst take wing unto Christ, O Spyridon, and didst confound the philosopher at Nicaea by the brick of the Trinity."
    }],
    "12-13": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of the Five Companion Martyrs",
        "text": "Like a fivefold band of soldiers of Christ, ye contended at Sebaste, O Eustratius, Auxentius, Eugene, Mardarius, and Orestes, and ye received together the wreaths of martyrdom."
    }],
    "12-14": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyrs Thyrsus and Companions",
        "text": "Like a fivefold band of confessors of Christ, ye contended at Apollonia, O Thyrsus, Leucius, Philemon, Apollonius, and Callinicus; wherefore the Church doth crown your noble contest."
    }],
    "12-15": [{
        "type": "kontakion", "tone": "Tone 8",
        "title": "Kontakion of Hieromartyr Eleutherius",
        "text": "Once a youthful bishop of Illyria, O Eleutherius, thou didst stand before the tyrant Hadrian unshaken, and didst seal thy hierarchy with the wreath of martyrdom."
    }],
    "12-16": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Prophet Haggai",
        "text": "Filled with the grace of prophecy, O Haggai, thou didst urge on the rebuilding of the temple after the captivity; wherefore the Church doth bless thy honoured memory."
    }],
    "12-17": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of Prophet Daniel and the Three Holy Youths",
        "text": "Daniel was sealed within the lions' den and saved by an angel, and the three youths in the furnace did walk as in a meadow; wherefore the Church doth honour them as victors over fire and beasts."
    }],
    "12-18": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Martyr Sebastian and Companions",
        "text": "Once a commander of the Roman guard, thou didst secretly nourish the faithful in prison, O Sebastian, and at last didst seal thy confession by the showers of arrows."
    }],
    "12-19": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Boniface",
        "text": "Sent from Rome unto Tarsus to bring back the relics of martyrs, thou didst find thyself a martyr instead, O Boniface, and didst return as relic to thy mistress Aglae."
    }],
    "12-21": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of St. Juliana of Nicomedia",
        "text": "Once a noble maiden of Nicomedia, thou didst forsake an unfaithful suitor for Christ, O Juliana, and within prison didst confound the deceiver and seal thy faith with martyrdom."
    }],
    "12-22": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of Great-martyr Anastasia",
        "text": "Once a noble lady of Rome, thou didst visit the prisons and loose the bonds of the confessors, O Anastasia, and didst seal thy ministry by the wreath of martyrdom."
    }],
    "12-23": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the Ten Martyrs of Crete",
        "text": "Like a tenfold chorus of confessors of Christ, ye contended at Gortyna under Decius, O ye ten martyrs of Crete; wherefore the Church doth crown your noble company."
    }],
    "12-24": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of the Eve of the Nativity",
        "text": "Today the Virgin cometh unto the cave, ineffably to bring forth the Word eternal; hearing this rejoice, O universe, and with the Angels and shepherds glorify Him who shall appear, the Eternal God as a young Child."
    }],
    "12-26": [{
        "type": "kontakion", "tone": "Tone 6",
        "title": "Kontakion of the Synaxis of the Theotokos",
        "text": "He who was begotten of the Father before the morning star, before the ages, hath been incarnate of thee today, O pure Maiden, and hath appeared upon earth; and we, glorifying His incarnation, do honour and bless thee, O sole Mother of God."
    }],
    "12-27": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of Protomartyr Stephen",
        "text": "Yesterday the Master came unto us in the flesh, but today the servant departeth out of the flesh; yesterday He who is King in nature reigned, and today His witness is stoned for Him, even the Protomartyr Stephen."
    }],
    "12-28": [{
        "type": "kontakion", "tone": "Tone 2",
        "title": "Kontakion of the 20,000 Martyrs of Nicomedia",
        "text": "Twenty thousand strong ye stood for Christ within the church of Nicomedia, and unto the flames ye gave yourselves rejoicing; wherefore the Church doth crown your noble company."
    }],
    "12-29": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of the 14,000 Holy Innocents",
        "text": "When the Lord at His coming sojourned in Bethlehem, the unrighteous Herod sent his soldiers with cruel intent, that they might slay the infants; but the children, fashioned anew in the bath of immortality, did rejoice within Paradise."
    }],
    "12-30": [{
        "type": "kontakion", "tone": "Tone 4",
        "title": "Kontakion of Martyr Anysia of Thessalonica",
        "text": "Once a virgin of Thessalonica, thou wast slain by a Roman soldier as thou didst hasten unto the synaxis of the faithful, O Anysia; wherefore the Church doth crown thee with hymns."
    }],
    "12-31": [{
        "type": "kontakion", "tone": "Tone 3",
        "title": "Kontakion of St. Melania the Younger",
        "text": "Once a noble lady of Rome, thou didst give away thy wealth unto the poor, O Melania, and didst end thy days in monastic struggle in Jerusalem; wherefore the Church blesseth thee."
    }],
}


def main() -> None:
    data = json.loads(HYMNS_PATH.read_text(encoding="utf-8"))
    movable = data.setdefault("movable", {})
    fixed = data.setdefault("fixed", {})
    added_m = merge(movable, MOVABLE_ADDITIONS)
    added_m += merge(movable, MOVABLE_GAPS)
    added_jan = merge(fixed, FIXED_JANUARY)
    added_feb = merge(fixed, FIXED_FEBRUARY)
    added_mar = merge(fixed, FIXED_MARCH)
    added_apr = merge(fixed, FIXED_APRIL)
    added_may = merge(fixed, FIXED_MAY)
    added_jun = merge(fixed, FIXED_JUNE)
    added_jul = merge(fixed, FIXED_JULY)
    added_aug = merge(fixed, FIXED_AUGUST)
    added_sep = merge(fixed, FIXED_SEPTEMBER)
    added_oct = merge(fixed, FIXED_OCTOBER)
    added_nov = merge(fixed, FIXED_NOVEMBER)
    added_dec = merge(fixed, FIXED_DECEMBER)
    HYMNS_PATH.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    total = (
        added_m + added_jan + added_feb + added_mar + added_apr + added_may
        + added_jun + added_jul + added_aug + added_sep
        + added_oct + added_nov + added_dec
    )
    print(
        f"Added {added_m}m + {added_jan}Jan {added_feb}Feb {added_mar}Mar "
        f"{added_apr}Apr {added_may}May {added_jun}Jun {added_jul}Jul "
        f"{added_aug}Aug {added_sep}Sep {added_oct}Oct {added_nov}Nov "
        f"{added_dec}Dec = {total} entries."
    )


if __name__ == "__main__":
    main()
