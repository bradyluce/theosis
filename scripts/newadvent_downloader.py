#!/usr/bin/env python3
"""
newadvent_downloader.py
=======================
Comprehensive, resumable downloader for the New Advent Church Fathers corpus.
Targets: https://www.newadvent.org/fathers/

Usage:
    python3 newadvent_downloader.py [--base-dir <path>] [--delay <seconds>]
                                    [--category <category>] [--author <slug>]
                                    [--dry-run] [--phase <1|2|3|all>]

Phase 1  = Orthodox priority: Chrysostom, Athanasius, Basil, Greg. Nyssa,
           Greg. Naz., Cyril Jer., John Dam., Ephraim, Aphrahat, Councils
Phase 2  = Western Fathers + Historians: Augustine, Jerome, Ambrose,
           Leo, Gregory Great, Hilary, John Cassian, Vincent, Eusebius,
           Socrates, Sozomen, Theodoret, Sulpitius, Rufinus
Phase 3  = Ante-Nicene + Apocrypha + Reference: Tertullian, Origen,
           Cyprian, Irenaeus, Justin, Clement Alex., Clement Rome,
           Ignatius, Hippolytus, Lactantius + all remaining
"""

import os
import re
import sys
import json
import time
import argparse
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
except ImportError:
    print("Installing requests...")
    os.system("pip install requests --break-system-packages -q")
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Installing beautifulsoup4...")
    os.system("pip install beautifulsoup4 --break-system-packages -q")
    from bs4 import BeautifulSoup

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

BASE_URL = "https://www.newadvent.org/fathers/"
DEFAULT_BASE_DIR = Path("/sessions/zealous-elegant-rubin/mnt/theosis/content/raw")
DEFAULT_DELAY = 1.5   # seconds between requests — be polite
TIMEOUT = 30

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("newadvent")

# ─────────────────────────────────────────────────────────────────────────────
# FULL MANIFEST
# Each entry: (work_id, title, dest_folder, phase, work_type)
# work_type: homily | treatise | letter | commentary | history | council |
#             liturgy | apocrypha | reference | apologetic | creed | hagiography
# ─────────────────────────────────────────────────────────────────────────────

MANIFEST = [

    # ═══════════════════════════════════════════════════════════════════
    # PHASE 1 — ORTHODOX PRIORITY FATHERS
    # ═══════════════════════════════════════════════════════════════════

    # ── JOHN CHRYSOSTOM ────────────────────────────────────────────────
    ("2001", "Homilies on the Gospel of Matthew",        "fathers/chrysostom", 1, "homily"),
    ("2101", "Homilies on Acts",                          "fathers/chrysostom", 1, "homily"),
    ("2102", "Homilies on Romans",                        "fathers/chrysostom", 1, "homily"),
    ("2201", "Homilies on First Corinthians",             "fathers/chrysostom", 1, "homily"),
    ("2202", "Homilies on Second Corinthians",            "fathers/chrysostom", 1, "homily"),
    ("2301", "Homilies on Ephesians",                     "fathers/chrysostom", 1, "homily"),
    ("2302", "Homilies on Philippians",                   "fathers/chrysostom", 1, "homily"),
    ("2303", "Homilies on Colossians",                    "fathers/chrysostom", 1, "homily"),
    ("2304", "Homilies on First Thessalonians",           "fathers/chrysostom", 1, "homily"),
    ("2305", "Homilies on Second Thessalonians",          "fathers/chrysostom", 1, "homily"),
    ("2306", "Homilies on First Timothy",                 "fathers/chrysostom", 1, "homily"),
    ("2307", "Homilies on Second Timothy",                "fathers/chrysostom", 1, "homily"),
    ("2308", "Homilies on Titus",                         "fathers/chrysostom", 1, "homily"),
    ("2309", "Homilies on Philemon",                      "fathers/chrysostom", 1, "homily"),
    ("2310", "Commentary on Galatians",                   "fathers/chrysostom", 1, "commentary"),
    ("2401", "Homilies on the Gospel of John",            "fathers/chrysostom", 1, "homily"),
    ("2402", "Homilies on the Epistle to the Hebrews",    "fathers/chrysostom", 1, "homily"),
    ("1901", "Homilies on the Statues",                   "fathers/chrysostom", 1, "homily"),
    ("1902", "No One Can Harm the Man...",                "fathers/chrysostom", 1, "treatise"),
    ("1903", "Two Letters to Theodore After His Fall",    "fathers/chrysostom", 1, "letter"),
    ("1904", "Letter to a Young Widow",                   "fathers/chrysostom", 1, "letter"),
    ("1905", "Homily on St. Ignatius",                    "fathers/chrysostom", 1, "homily"),
    ("1906", "Homily on St. Babylas",                     "fathers/chrysostom", 1, "homily"),
    ("1907", "Homily Concerning Lowliness of Mind",       "fathers/chrysostom", 1, "homily"),
    ("1908", "Instructions to Catechumens",               "fathers/chrysostom", 1, "homily"),
    ("1910", "Homily on Father if it be possible",        "fathers/chrysostom", 1, "homily"),
    ("1911", "Homily on the Paralytic Lowered Through Roof","fathers/chrysostom",1,"homily"),
    ("1912", "Homily on If your enemy hunger",            "fathers/chrysostom", 1, "homily"),
    ("1913", "Homily Against Publishing Errors",          "fathers/chrysostom", 1, "homily"),
    ("1914", "First Homily on Eutropius",                 "fathers/chrysostom", 1, "homily"),
    ("1915", "Second Homily on Eutropius",                "fathers/chrysostom", 1, "homily"),
    ("1916", "Four Letters to Olympias",                  "fathers/chrysostom", 1, "letter"),
    ("1917", "Letter to Some Priests of Antioch",         "fathers/chrysostom", 1, "letter"),
    ("1918", "Correspondence with Pope Innocent I",       "fathers/chrysostom", 1, "letter"),
    ("1919", "Three Homilies on the Power of Satan",      "fathers/chrysostom", 1, "homily"),
    ("1922", "On the Priesthood",                         "fathers/chrysostom", 1, "treatise"),

    # ── ATHANASIUS ─────────────────────────────────────────────────────
    ("2801", "Against the Heathen",                       "fathers/athanasius", 1, "apologetic"),
    ("2802", "On the Incarnation of the Word",            "fathers/athanasius", 1, "treatise"),
    ("2803", "Deposition of Arius",                       "fathers/athanasius", 1, "creed"),
    ("2804", "Letter on the Council of Nicaea (Eusebius)","fathers/athanasius", 1, "letter"),
    ("2805", "On Luke 10:22 (Matthew 11:27)",             "fathers/athanasius", 1, "commentary"),
    ("2806", "Letters",                                   "fathers/athanasius", 1, "letter"),
    ("2807", "Circular Letter",                           "fathers/athanasius", 1, "letter"),
    ("2808", "Apologia Contra Arianos",                   "fathers/athanasius", 1, "apologetic"),
    ("2809", "De Decretis",                               "fathers/athanasius", 1, "treatise"),
    ("2810", "De Sententia Dionysii",                     "fathers/athanasius", 1, "treatise"),
    ("2811", "Vita S. Antoni (Life of St. Anthony)",      "fathers/athanasius", 1, "hagiography"),
    ("2812", "Ad Episcopus Aegypti et Libyae",            "fathers/athanasius", 1, "letter"),
    ("2813", "Apologia ad Constantium",                   "fathers/athanasius", 1, "apologetic"),
    ("2814", "Apologia de Fuga",                          "fathers/athanasius", 1, "apologetic"),
    ("2815", "Historia Arianorum",                        "fathers/athanasius", 1, "history"),
    ("2816", "Four Discourses Against the Arians",        "fathers/athanasius", 1, "treatise"),
    ("2817", "De Synodis",                                "fathers/athanasius", 1, "treatise"),
    ("2818", "Tomus ad Antiochenos",                      "fathers/athanasius", 1, "letter"),
    ("2819", "Ad Afros Epistola Synodica",                "fathers/athanasius", 1, "letter"),
    ("2820", "Historia Acephala",                         "fathers/athanasius", 1, "history"),
    ("2821", "Statement of Faith",                        "fathers/athanasius", 1, "creed"),

    # ── BASIL THE GREAT ────────────────────────────────────────────────
    ("3201", "Nine Homilies of Hexaemeron",               "fathers/basil",      1, "homily"),
    ("3202", "Letters",                                   "fathers/basil",      1, "letter"),
    ("3203", "De Spiritu Sancto",                         "fathers/basil",      1, "treatise"),

    # ── GREGORY OF NYSSA ───────────────────────────────────────────────
    ("2901", "Against Eunomius",                          "fathers/gregory-nyssa", 1, "treatise"),
    ("2902", "Answer to Eunomius Second Book",            "fathers/gregory-nyssa", 1, "treatise"),
    ("2903", "On the Holy Spirit",                        "fathers/gregory-nyssa", 1, "treatise"),
    ("2904", "On the Holy Trinity",                       "fathers/gregory-nyssa", 1, "treatise"),
    ("2905", "On Not Three Gods",                         "fathers/gregory-nyssa", 1, "treatise"),
    ("2906", "On the Faith",                              "fathers/gregory-nyssa", 1, "treatise"),
    ("2907", "On Virginity",                              "fathers/gregory-nyssa", 1, "treatise"),
    ("2908", "The Great Catechism",                       "fathers/gregory-nyssa", 1, "treatise"),
    ("2909", "Funeral Oration on Meletius",               "fathers/gregory-nyssa", 1, "homily"),
    ("2910", "On the Baptism of Christ",                  "fathers/gregory-nyssa", 1, "homily"),
    ("2911", "Letters",                                   "fathers/gregory-nyssa", 1, "letter"),
    ("2912", "On Infants Early Deaths",                   "fathers/gregory-nyssa", 1, "treatise"),
    ("2913", "On Pilgrimages",                            "fathers/gregory-nyssa", 1, "treatise"),
    ("2914", "On the Making of Man",                      "fathers/gregory-nyssa", 1, "treatise"),
    ("2915", "On the Soul and the Resurrection",          "fathers/gregory-nyssa", 1, "treatise"),

    # ── GREGORY NAZIANZEN ──────────────────────────────────────────────
    ("3102", "Orations",                                  "fathers/gregory-nazianzen", 1, "homily"),
    ("3103", "Letters",                                   "fathers/gregory-nazianzen", 1, "letter"),

    # ── CYRIL OF JERUSALEM ─────────────────────────────────────────────
    ("3101", "Catechetical Lectures",                     "fathers/cyril-jerusalem", 1, "homily"),

    # ── JOHN OF DAMASCUS ───────────────────────────────────────────────
    ("3304", "Exposition of the Faith",                   "fathers/john-damascus", 1, "treatise"),

    # ── EPHRAIM THE SYRIAN ─────────────────────────────────────────────
    ("3702", "Nisibene Hymns",                            "fathers/ephraim-syrian", 1, "homily"),
    ("3703", "On the Nativity of Christ in the Flesh",    "fathers/ephraim-syrian", 1, "homily"),
    ("3704", "For the Feast of the Epiphany",             "fathers/ephraim-syrian", 1, "homily"),
    ("3705", "On the Faith (The Pearl)",                  "fathers/ephraim-syrian", 1, "homily"),
    ("3706", "On Our Lord",                               "fathers/ephraim-syrian", 1, "homily"),
    ("3707", "On Admonition and Repentance",              "fathers/ephraim-syrian", 1, "homily"),
    ("3708", "On the Sinful Woman",                       "fathers/ephraim-syrian", 1, "homily"),

    # ── APHRAHAT ───────────────────────────────────────────────────────
    ("3701", "Demonstrations",                            "fathers/aphrahat", 1, "treatise"),

    # ── COUNCILS ───────────────────────────────────────────────────────
    ("3801", "Nicaea I (325) [ECUMENICAL]",               "councils/ecumenical/nicaea-i",          1, "council"),
    ("3808", "Constantinople I (381) [ECUMENICAL]",       "councils/ecumenical/constantinople-i",  1, "council"),
    ("3810", "Ephesus (431) [ECUMENICAL]",                "councils/ecumenical/ephesus",           1, "council"),
    ("3811", "Chalcedon (451) [ECUMENICAL]",              "councils/ecumenical/chalcedon",         1, "council"),
    ("3812", "Constantinople II (553) [ECUMENICAL]",      "councils/ecumenical/constantinople-ii", 1, "council"),
    ("3813", "Constantinople III (680) [ECUMENICAL]",     "councils/ecumenical/constantinople-iii",1, "council"),
    ("3819", "Nicaea II (787) [ECUMENICAL]",              "councils/ecumenical/nicaea-ii",         1, "council"),
    # Local councils important to Orthodoxy
    ("3818", "Carthage under Cyprian (257) [LOCAL]",      "councils/local", 1, "council"),
    ("3802", "Ancyra (314) [LOCAL]",                      "councils/local", 1, "council"),
    ("3803", "Neocaesarea (315) [LOCAL]",                 "councils/local", 1, "council"),
    ("3805", "Antioch in Encaeniis (341) [LOCAL]",        "councils/local", 1, "council"),
    ("3804", "Gangra (343) [LOCAL]",                      "councils/local", 1, "council"),
    ("3815", "Sardica (344) [LOCAL]",                     "councils/local", 1, "council"),
    ("3809", "Constantinople (382) [LOCAL]",              "councils/local", 1, "council"),
    ("3806", "Laodicea (390) [LOCAL]",                    "councils/local", 1, "council"),
    ("3817", "Constantinople under Nectarius (394) [LOCAL]","councils/local",1, "council"),
    ("3816", "Carthage (419) [LOCAL]",                    "councils/local", 1, "council"),
    ("3814", "Constantinople/Trullo/Quinisext (692) [LOCAL]","councils/local",1,"council"),

    # ── LITURGIES ──────────────────────────────────────────────────────
    ("0717", "The Liturgy of James",                      "liturgy/liturgy-of-james",    1, "liturgy"),
    ("0718", "The Liturgy of Mark",                       "liturgy/liturgy-of-mark",     1, "liturgy"),
    ("0719", "The Liturgy of the Blessed Apostles",       "liturgy/liturgy-of-apostles", 1, "liturgy"),

    # ═══════════════════════════════════════════════════════════════════
    # PHASE 2 — WESTERN FATHERS + HISTORIANS
    # ═══════════════════════════════════════════════════════════════════

    # ── AUGUSTINE ──────────────────────────────────────────────────────
    ("1101", "Confessions",                               "fathers/augustine", 2, "treatise"),
    ("1102", "Letters",                                   "fathers/augustine", 2, "letter"),
    ("1201", "City of God",                               "fathers/augustine", 2, "treatise"),
    ("1202", "Christian Doctrine",                        "fathers/augustine", 2, "treatise"),
    ("1301", "On the Holy Trinity",                       "fathers/augustine", 2, "treatise"),
    ("1302", "The Enchiridion",                           "fathers/augustine", 2, "treatise"),
    ("1303", "On the Catechising of the Uninstructed",    "fathers/augustine", 2, "treatise"),
    ("1304", "On Faith and the Creed",                    "fathers/augustine", 2, "treatise"),
    ("1305", "Concerning Faith of Things Not Seen",       "fathers/augustine", 2, "treatise"),
    ("1306", "On the Profit of Believing",                "fathers/augustine", 2, "treatise"),
    ("1307", "On the Creed: A Sermon to Catechumens",     "fathers/augustine", 2, "homily"),
    ("1308", "On Continence",                             "fathers/augustine", 2, "treatise"),
    ("1309", "On the Good of Marriage",                   "fathers/augustine", 2, "treatise"),
    ("1310", "On Holy Virginity",                         "fathers/augustine", 2, "treatise"),
    ("1311", "On the Good of Widowhood",                  "fathers/augustine", 2, "treatise"),
    ("1312", "On Lying",                                  "fathers/augustine", 2, "treatise"),
    ("1313", "To Consentius: Against Lying",              "fathers/augustine", 2, "treatise"),
    ("1314", "On the Work of Monks",                      "fathers/augustine", 2, "treatise"),
    ("1315", "On Patience",                               "fathers/augustine", 2, "treatise"),
    ("1316", "On Care to be Had For the Dead",            "fathers/augustine", 2, "treatise"),
    ("1401", "On the Morals of the Catholic Church",      "fathers/augustine", 2, "treatise"),
    ("1402", "On the Morals of the Manichaeans",          "fathers/augustine", 2, "treatise"),
    ("1403", "On Two Souls Against the Manichaeans",      "fathers/augustine", 2, "treatise"),
    ("1404", "Acts Against Fortunatus the Manichaean",    "fathers/augustine", 2, "treatise"),
    ("1405", "Against the Epistle of Manichaeus",         "fathers/augustine", 2, "treatise"),
    ("1406", "Reply to Faustus the Manichaean",           "fathers/augustine", 2, "treatise"),
    ("1407", "Concerning the Nature of Good",             "fathers/augustine", 2, "treatise"),
    ("1408", "On Baptism Against the Donatists",          "fathers/augustine", 2, "treatise"),
    ("1409", "Answer to Letters of Petilian",             "fathers/augustine", 2, "treatise"),
    ("1501", "Merits and Remission of Sin, and Infant Baptism","fathers/augustine",2,"treatise"),
    ("1502", "On the Spirit and the Letter",              "fathers/augustine", 2, "treatise"),
    ("1503", "On Nature and Grace",                       "fathers/augustine", 2, "treatise"),
    ("1504", "On Man's Perfection in Righteousness",      "fathers/augustine", 2, "treatise"),
    ("1505", "On the Proceedings of Pelagius",            "fathers/augustine", 2, "treatise"),
    ("1506", "On the Grace of Christ and Original Sin",   "fathers/augustine", 2, "treatise"),
    ("1507", "On Marriage and Concupiscence",             "fathers/augustine", 2, "treatise"),
    ("1508", "On the Soul and its Origin",                "fathers/augustine", 2, "treatise"),
    ("1509", "Against Two Letters of the Pelagians",      "fathers/augustine", 2, "treatise"),
    ("1510", "On Grace and Free Will",                    "fathers/augustine", 2, "treatise"),
    ("1512", "The Predestination of the Saints",          "fathers/augustine", 2, "treatise"),
    ("1513", "On Rebuke and Grace",                       "fathers/augustine", 2, "treatise"),
    ("1601", "Our Lord's Sermon on the Mount",            "fathers/augustine", 2, "commentary"),
    ("1602", "The Harmony of the Gospels",                "fathers/augustine", 2, "commentary"),
    ("1603", "Sermons on Selected Lessons of New Testament","fathers/augustine",2, "homily"),
    ("1701", "Tractates on the Gospel of John",           "fathers/augustine", 2, "commentary"),
    ("1702", "Homilies on the First Epistle of John",     "fathers/augustine", 2, "homily"),
    ("1703", "Soliloquies",                               "fathers/augustine", 2, "treatise"),
    ("1801", "Enarrations on the Psalms",                 "fathers/augustine", 2, "commentary"),

    # ── JEROME ─────────────────────────────────────────────────────────
    ("3001", "Letters",                                   "fathers/jerome", 2, "letter"),
    ("3002", "Prefaces",                                  "fathers/jerome", 2, "reference"),
    ("3003", "The Life of S. Hilarion",                   "fathers/jerome", 2, "hagiography"),
    ("3004", "To Pammachius Against John of Jerusalem",   "fathers/jerome", 2, "treatise"),
    ("3005", "The Dialogue Against the Luciferians",      "fathers/jerome", 2, "treatise"),
    ("3006", "The Life of Malchus the Captive Monk",      "fathers/jerome", 2, "hagiography"),
    ("3007", "The Perpetual Virginity of Blessed Mary",   "fathers/jerome", 2, "treatise"),
    ("3008", "The Life of Paulus the First Hermit",       "fathers/jerome", 2, "hagiography"),
    ("3009", "Against Jovinianus",                        "fathers/jerome", 2, "treatise"),
    ("3010", "Against Vigilantius",                       "fathers/jerome", 2, "treatise"),
    ("3011", "Against the Pelagians",                     "fathers/jerome", 2, "treatise"),
    ("2708", "De Viris Illustribus (Illustrious Men)",    "fathers/jerome", 2, "reference"),
    ("2710", "Apology against the Books of Rufinus",      "fathers/jerome", 2, "treatise"),

    # ── AMBROSE ────────────────────────────────────────────────────────
    ("3401", "On the Duties of the Clergy",               "fathers/ambrose", 2, "treatise"),
    ("3402", "On the Holy Spirit",                        "fathers/ambrose", 2, "treatise"),
    ("3403", "On the Death of Satyrus",                   "fathers/ambrose", 2, "homily"),
    ("3404", "On the Christian Faith",                    "fathers/ambrose", 2, "treatise"),
    ("3405", "On the Mysteries",                          "fathers/ambrose", 2, "treatise"),
    ("3406", "On Repentance",                             "fathers/ambrose", 2, "treatise"),
    ("3407", "Concerning Virgins",                        "fathers/ambrose", 2, "treatise"),
    ("3408", "Concerning Widows",                         "fathers/ambrose", 2, "treatise"),
    ("3409", "Letters",                                   "fathers/ambrose", 2, "letter"),
    ("3410", "Memorial of Symmachus",                     "fathers/ambrose", 2, "letter"),
    ("3411", "Sermon against Auxentius",                  "fathers/ambrose", 2, "homily"),

    # ── LEO THE GREAT ──────────────────────────────────────────────────
    ("3603", "Sermons",                                   "fathers/leo-great", 2, "homily"),
    ("3604", "Letters",                                   "fathers/leo-great", 2, "letter"),

    # ── GREGORY THE GREAT ──────────────────────────────────────────────
    ("3601", "Pastoral Rule",                             "fathers/gregory-great", 2, "treatise"),
    ("3602", "Register of Letters",                       "fathers/gregory-great", 2, "letter"),

    # ── HILARY OF POITIERS ─────────────────────────────────────────────
    ("3301", "On the Councils",                           "fathers/hilary-poitiers", 2, "treatise"),
    ("3302", "On the Trinity",                            "fathers/hilary-poitiers", 2, "treatise"),
    ("3303", "Homilies on the Psalms",                    "fathers/hilary-poitiers", 2, "commentary"),

    # ── JOHN CASSIAN ───────────────────────────────────────────────────
    ("3507", "Institutes",                                "fathers/john-cassian", 2, "treatise"),
    ("3508", "Conferences",                               "fathers/john-cassian", 2, "treatise"),
    ("3509", "On the Incarnation of the Lord",            "fathers/john-cassian", 2, "treatise"),

    # ── VINCENT OF LERINS ──────────────────────────────────────────────
    ("3506", "Commonitory",                               "fathers/vincent-lerins", 2, "treatise"),

    # ── EUSEBIUS OF CAESAREA ───────────────────────────────────────────
    ("2501", "Church History",                            "fathers/eusebius", 2, "history"),
    ("2502", "Life of Constantine",                       "fathers/eusebius", 2, "hagiography"),
    ("2503", "Oration of Constantine to the Assembly",    "fathers/eusebius", 2, "treatise"),
    ("2504", "Oration in Praise of Constantine",          "fathers/eusebius", 2, "treatise"),

    # ── SOCRATES SCHOLASTICUS ──────────────────────────────────────────
    ("2601", "Ecclesiastical History",                    "fathers/socrates-scholasticus", 2, "history"),

    # ── SOZOMEN ────────────────────────────────────────────────────────
    ("2602", "Ecclesiastical History",                    "fathers/sozomen", 2, "history"),

    # ── THEODORET ──────────────────────────────────────────────────────
    ("2701", "Counter-Statements to Cyril's 12 Anathemas","fathers/theodoret", 2, "treatise"),
    ("2702", "Ecclesiastical History",                    "fathers/theodoret", 2, "history"),
    ("2703", "Dialogues (Eranistes)",                     "fathers/theodoret", 2, "treatise"),
    ("2704", "Demonstrations by Syllogism",               "fathers/theodoret", 2, "treatise"),
    ("2707", "Letters",                                   "fathers/theodoret", 2, "letter"),

    # ── SULPITIUS SEVERUS ──────────────────────────────────────────────
    ("3501", "On the Life of St. Martin",                 "fathers/sulpitius-severus", 2, "hagiography"),
    ("3502", "Letters (Genuine)",                         "fathers/sulpitius-severus", 2, "letter"),
    ("3503", "Dialogues",                                 "fathers/sulpitius-severus", 2, "treatise"),
    ("3504", "Letters (Dubious)",                         "fathers/sulpitius-severus", 2, "letter"),
    ("3505", "Sacred History",                            "fathers/sulpitius-severus", 2, "history"),

    # ── RUFINUS ────────────────────────────────────────────────────────
    ("2709", "Apology",                                   "fathers/rufinus", 2, "apologetic"),
    ("2711", "Commentary on the Apostles Creed",          "fathers/rufinus", 2, "commentary"),
    ("2712", "Prefaces and Other Works",                  "fathers/rufinus", 2, "reference"),

    # ── GENNADIUS ──────────────────────────────────────────────────────
    ("2719", "Illustrious Men (Supplement to Jerome)",    "fathers/gennadius", 2, "reference"),

    # ── ALEXANDER OF ALEXANDRIA ────────────────────────────────────────
    ("0622", "Epistles on the Arian Heresy",              "fathers/alexander-alexandria", 2, "letter"),

    # ═══════════════════════════════════════════════════════════════════
    # PHASE 3 — ANTE-NICENE + APOCRYPHA + REFERENCE
    # ═══════════════════════════════════════════════════════════════════

    # ── TERTULLIAN ─────────────────────────────────────────────────────
    ("0301", "The Apology",                               "fathers/tertullian", 3, "apologetic"),
    ("0302", "On Idolatry",                               "fathers/tertullian", 3, "treatise"),
    ("0303", "De Spectaculis (The Shows)",                "fathers/tertullian", 3, "treatise"),
    ("0304", "De Corona (The Chaplet)",                   "fathers/tertullian", 3, "treatise"),
    ("0305", "To Scapula",                                "fathers/tertullian", 3, "apologetic"),
    ("0306", "Ad Nationes",                               "fathers/tertullian", 3, "apologetic"),
    ("0308", "An Answer to the Jews",                     "fathers/tertullian", 3, "apologetic"),
    ("0309", "The Souls Testimony",                       "fathers/tertullian", 3, "apologetic"),
    ("0310", "A Treatise on the Soul",                    "fathers/tertullian", 3, "treatise"),
    ("0311", "The Prescription Against Heretics",         "fathers/tertullian", 3, "treatise"),
    ("0312", "Against Marcion",                           "fathers/tertullian", 3, "treatise"),
    ("0313", "Against Hermogenes",                        "fathers/tertullian", 3, "treatise"),
    ("0314", "Against the Valentinians",                  "fathers/tertullian", 3, "treatise"),
    ("0315", "On the Flesh of Christ",                    "fathers/tertullian", 3, "treatise"),
    ("0316", "On the Resurrection of the Flesh",          "fathers/tertullian", 3, "treatise"),
    ("0317", "Against Praxeas",                           "fathers/tertullian", 3, "treatise"),
    ("0318", "Scorpiace",                                 "fathers/tertullian", 3, "treatise"),
    ("0319", "Appendix Against All Heresies",             "fathers/tertullian", 3, "treatise"),
    ("0320", "On Repentance",                             "fathers/tertullian", 3, "treatise"),
    ("0321", "On Baptism",                                "fathers/tertullian", 3, "treatise"),
    ("0322", "On Prayer",                                 "fathers/tertullian", 3, "treatise"),
    ("0323", "Ad Martyras",                               "fathers/tertullian", 3, "treatise"),
    ("0324", "The Martyrdom of Perpetua and Felicity",    "fathers/tertullian", 3, "hagiography"),
    ("0325", "Of Patience",                               "fathers/tertullian", 3, "treatise"),
    ("0401", "On the Pallium",                            "fathers/tertullian", 3, "treatise"),
    ("0402", "On the Apparel of Women",                   "fathers/tertullian", 3, "treatise"),
    ("0403", "On the Veiling of Virgins",                 "fathers/tertullian", 3, "treatise"),
    ("0404", "To His Wife",                               "fathers/tertullian", 3, "treatise"),
    ("0405", "On Exhortation to Chastity",                "fathers/tertullian", 3, "treatise"),
    ("0406", "On Monogamy",                               "fathers/tertullian", 3, "treatise"),
    ("0407", "On Modesty",                                "fathers/tertullian", 3, "treatise"),
    ("0408", "On Fasting",                                "fathers/tertullian", 3, "treatise"),
    ("0409", "De Fuga in Persecutione",                   "fathers/tertullian", 3, "treatise"),

    # ── ORIGEN ─────────────────────────────────────────────────────────
    ("0412", "De Principiis",                             "fathers/origen", 3, "treatise"),
    ("0413", "Africanus to Origen",                       "fathers/origen", 3, "letter"),
    ("0414", "Origen to Africanus",                       "fathers/origen", 3, "letter"),
    ("0415", "Origen to Gregory",                         "fathers/origen", 3, "letter"),
    ("0416", "Against Celsus",                            "fathers/origen", 3, "apologetic"),
    ("1014", "Letter of Origen to Gregory",               "fathers/origen", 3, "letter"),
    ("1015", "Commentary on the Gospel of John",          "fathers/origen", 3, "commentary"),
    ("1016", "Commentary on the Gospel of Matthew",       "fathers/origen", 3, "commentary"),

    # ── CYPRIAN ────────────────────────────────────────────────────────
    ("0505", "The Life and Passion of Cyprian",           "fathers/cyprian", 3, "hagiography"),
    ("0506", "The Epistles of Cyprian",                   "fathers/cyprian", 3, "letter"),
    ("0507", "The Treatises of Cyprian",                  "fathers/cyprian", 3, "treatise"),
    ("0508", "The Seventh Council of Carthage",           "fathers/cyprian", 3, "council"),

    # ── IRENAEUS ───────────────────────────────────────────────────────
    ("0103", "Adversus Haereses (Against Heresies)",      "fathers/irenaeus", 3, "treatise"),
    ("0134", "Fragments from the Lost Writings",          "fathers/irenaeus", 3, "treatise"),

    # ── IGNATIUS OF ANTIOCH ────────────────────────────────────────────
    ("0104", "Epistle to the Ephesians",                  "fathers/ignatius", 3, "letter"),
    ("0105", "Epistle to the Magnesians",                 "fathers/ignatius", 3, "letter"),
    ("0106", "Epistle to the Trallians",                  "fathers/ignatius", 3, "letter"),
    ("0107", "Epistle to the Romans",                     "fathers/ignatius", 3, "letter"),
    ("0108", "Epistle to the Philadelphians",             "fathers/ignatius", 3, "letter"),
    ("0109", "Epistle to the Smyrnaeans",                 "fathers/ignatius", 3, "letter"),
    ("0110", "Epistle to Polycarp",                       "fathers/ignatius", 3, "letter"),
    ("0114", "The Spurious Epistles",                     "fathers/ignatius", 3, "letter"),
    ("0123", "The Martyrdom of Ignatius",                 "fathers/ignatius", 3, "hagiography"),

    # ── JUSTIN MARTYR ──────────────────────────────────────────────────
    ("0126", "First Apology",                             "fathers/justin-martyr", 3, "apologetic"),
    ("0127", "Second Apology",                            "fathers/justin-martyr", 3, "apologetic"),
    ("0128", "Dialogue with Trypho",                      "fathers/justin-martyr", 3, "apologetic"),
    ("0129", "Hortatory Address to the Greeks",           "fathers/justin-martyr", 3, "apologetic"),
    ("0130", "On the Sole Government of God",             "fathers/justin-martyr", 3, "treatise"),
    ("0131", "Fragments on the Resurrection",             "fathers/justin-martyr", 3, "treatise"),
    ("0132", "Miscellaneous Fragments",                   "fathers/justin-martyr", 3, "treatise"),
    ("0133", "Martyrdom of Justin and Others",            "fathers/justin-martyr", 3, "hagiography"),
    ("0135", "Discourse to the Greeks",                   "fathers/justin-martyr", 3, "apologetic"),

    # ── CLEMENT OF ALEXANDRIA ──────────────────────────────────────────
    ("0207", "Who is the Rich Man That Shall Be Saved?",  "fathers/clement-alexandria", 3, "treatise"),
    ("0208", "Exhortation to the Heathen",                "fathers/clement-alexandria", 3, "apologetic"),
    ("0209", "The Instructor",                            "fathers/clement-alexandria", 3, "treatise"),
    ("0210", "The Stromata or Miscellanies",              "fathers/clement-alexandria", 3, "treatise"),
    ("0211", "Fragments",                                 "fathers/clement-alexandria", 3, "treatise"),

    # ── CLEMENT OF ROME ────────────────────────────────────────────────
    ("1010", "First Epistle",                             "fathers/clement-rome", 3, "letter"),
    ("1011", "Second Epistle [SPURIOUS]",                 "fathers/clement-rome", 3, "letter"),
    ("0803", "Two Epistles Concerning Virginity [SPURIOUS]","fathers/clement-rome", 3, "letter"),
    ("0804", "Recognitions [SPURIOUS]",                   "fathers/clement-rome", 3, "treatise"),
    ("0808", "Clementine Homilies [SPURIOUS]",            "fathers/clement-rome", 3, "homily"),

    # ── HIPPOLYTUS ─────────────────────────────────────────────────────
    ("0501", "The Refutation of All Heresies",            "fathers/hippolytus", 3, "treatise"),
    ("0502", "Exegetical Fragments",                      "fathers/hippolytus", 3, "commentary"),
    ("0503", "Expository Treatise Against the Jews",      "fathers/hippolytus", 3, "treatise"),
    ("0504", "The End of the World [Pseudonymous]",       "fathers/hippolytus", 3, "treatise"),
    ("0516", "The Antichrist",                            "fathers/hippolytus", 3, "treatise"),
    ("0520", "Against Plato on the Cause of the Universe","fathers/hippolytus", 3, "treatise"),
    ("0521", "Against the Heresy of Noetus",              "fathers/hippolytus", 3, "treatise"),
    ("0523", "Discourse on the Holy Theophany",           "fathers/hippolytus", 3, "homily"),
    ("0524", "The Apostles and the Disciples [Pseudo]",   "fathers/hippolytus", 3, "reference"),

    # ── LACTANTIUS ─────────────────────────────────────────────────────
    ("0701", "The Divine Institutes",                     "fathers/lactantius", 3, "treatise"),
    ("0702", "Epitome of the Divine Institutes",          "fathers/lactantius", 3, "treatise"),
    ("0703", "On the Anger of God",                       "fathers/lactantius", 3, "treatise"),
    ("0704", "On the Workmanship of God",                 "fathers/lactantius", 3, "treatise"),
    ("0705", "Of the Manner the Persecutors Died",        "fathers/lactantius", 3, "history"),
    ("0706", "Fragments of Lactantius",                   "fathers/lactantius", 3, "treatise"),
    ("0707", "The Phoenix",                               "fathers/lactantius", 3, "treatise"),
    ("0708", "A Poem on the Passion of the Lord",         "fathers/lactantius", 3, "treatise"),

    # ── POLYCARP ───────────────────────────────────────────────────────
    ("0102", "The Martyrdom of Polycarp",                 "fathers/polycarp", 3, "hagiography"),
    ("0136", "Epistle to the Philippians",                "fathers/polycarp", 3, "letter"),

    # ── BARNABAS ───────────────────────────────────────────────────────
    ("0124", "Epistle of Barnabas",                       "fathers/barnabas", 3, "letter"),

    # ── HERMAS ─────────────────────────────────────────────────────────
    ("0201", "The Pastor (The Shepherd)",                 "fathers/hermas", 3, "treatise"),

    # ── ATHENAGORAS ────────────────────────────────────────────────────
    ("0205", "A Plea for the Christians",                 "fathers/athenagoras", 3, "apologetic"),
    ("0206", "The Resurrection of the Dead",              "fathers/athenagoras", 3, "treatise"),

    # ── TATIAN ─────────────────────────────────────────────────────────
    ("0202", "Address to the Greeks",                     "fathers/tatian", 3, "apologetic"),
    ("0203", "Fragments",                                 "fathers/tatian", 3, "treatise"),
    ("1002", "The Diatessaron",                           "fathers/tatian", 3, "commentary"),

    # ── THEOPHILUS ─────────────────────────────────────────────────────
    ("0204", "Theophilus to Autolycus",                   "fathers/theophilus", 3, "apologetic"),

    # ── METHODIUS ──────────────────────────────────────────────────────
    ("0623", "The Banquet of the Ten Virgins",            "fathers/methodius", 3, "treatise"),
    ("0624", "Concerning Free Will",                      "fathers/methodius", 3, "treatise"),
    ("0625", "From the Discourse on the Resurrection",    "fathers/methodius", 3, "treatise"),
    ("0626", "Fragments",                                 "fathers/methodius", 3, "treatise"),
    ("0627", "Oration Concerning Simeon and Anna",        "fathers/methodius", 3, "homily"),
    ("0628", "Oration on the Psalms",                     "fathers/methodius", 3, "commentary"),
    ("0629", "Three Fragments on the Cross and Passion",  "fathers/methodius", 3, "homily"),

    # ── NOVATIAN ───────────────────────────────────────────────────────
    ("0511", "Treatise Concerning the Trinity",           "fathers/novatian", 3, "treatise"),
    ("0512", "On the Jewish Meats",                       "fathers/novatian", 3, "treatise"),

    # ── DIONYSIUS THE GREAT ────────────────────────────────────────────
    ("0612", "Miscellaneous Fragments",                   "fathers/dionysius-great", 3, "treatise"),
    ("0613", "Exegetical Fragments",                      "fathers/dionysius-great", 3, "commentary"),
    ("0632", "Epistles and Epistolary Fragments",         "fathers/dionysius-great", 3, "letter"),

    # ── DIONYSIUS OF ROME ──────────────────────────────────────────────
    ("0713", "Against the Sabellians",                    "fathers/dionysius-rome", 3, "treatise"),

    # ── GREGORY THAUMATURGUS ───────────────────────────────────────────
    ("0601", "A Declaration of Faith",                    "fathers/gregory-thaumaturgus", 3, "creed"),
    ("0602", "A Metaphrase of the Book of Ecclesiastes",  "fathers/gregory-thaumaturgus", 3, "commentary"),
    ("0603", "Canonical Epistle",                         "fathers/gregory-thaumaturgus", 3, "letter"),
    ("0604", "Oration and Panegyric Addressed to Origen", "fathers/gregory-thaumaturgus", 3, "treatise"),
    ("0605", "A Sectional Confession of Faith",           "fathers/gregory-thaumaturgus", 3, "creed"),
    ("0606", "On the Trinity",                            "fathers/gregory-thaumaturgus", 3, "treatise"),
    ("0607", "Twelve Topics on the Faith",                "fathers/gregory-thaumaturgus", 3, "creed"),
    ("0608", "On the Subject of the Soul",                "fathers/gregory-thaumaturgus", 3, "treatise"),
    ("0609", "Four Homilies",                             "fathers/gregory-thaumaturgus", 3, "homily"),
    ("0610", "On All the Saints",                         "fathers/gregory-thaumaturgus", 3, "homily"),
    ("0611", "On Matthew 6:22-23",                        "fathers/gregory-thaumaturgus", 3, "commentary"),

    # ── PETER OF ALEXANDRIA ────────────────────────────────────────────
    ("0619", "The Genuine Acts",                          "fathers/peter-alexandria", 3, "hagiography"),
    ("0620", "The Canonical Epistle",                     "fathers/peter-alexandria", 3, "letter"),
    ("0621", "Fragments",                                 "fathers/peter-alexandria", 3, "treatise"),

    # ── PAMPHILUS ──────────────────────────────────────────────────────
    ("0615", "Exposition on the Acts of the Apostles",   "fathers/pamphilus", 3, "commentary"),

    # ── JULIUS AFRICANUS ───────────────────────────────────────────────
    ("0614", "Extant Writings",                           "fathers/julius-africanus", 3, "reference"),

    # ── CAIUS ──────────────────────────────────────────────────────────
    ("0510", "Fragments",                                 "fathers/caius", 3, "treatise"),

    # ── PAPIAS ─────────────────────────────────────────────────────────
    ("0125", "Fragments",                                 "fathers/papias", 3, "treatise"),

    # ── BARDESANES ─────────────────────────────────────────────────────
    ("0862", "The Book of the Laws of Various Countries", "fathers/bardesanes", 3, "reference"),

    # ── MATHETES ───────────────────────────────────────────────────────
    ("0101", "Epistle to Diognetus",                      "fathers/mathetes", 3, "apologetic"),

    # ── ARCHELAUS ──────────────────────────────────────────────────────
    ("0616", "Acts of the Disputation with Manes",        "fathers/archelaus", 3, "apologetic"),

    # ── ARISTIDES ──────────────────────────────────────────────────────
    ("1012", "The Apology",                               "fathers/aristides", 3, "apologetic"),

    # ── ARNOBIUS ───────────────────────────────────────────────────────
    ("0631", "Against the Heathen",                       "fathers/arnobius", 3, "apologetic"),

    # ── MINUCIUS FELIX ─────────────────────────────────────────────────
    ("0410", "Octavius",                                  "fathers/minucius-felix", 3, "apologetic"),

    # ── MAR JACOB ──────────────────────────────────────────────────────
    ("0851", "Canticle on Edessa",                        "fathers/mar-jacob", 3, "homily"),
    ("0860", "Homily on Habib the Martyr",                "fathers/mar-jacob", 3, "homily"),
    ("0861", "Homily on Guria and Shamuna",               "fathers/mar-jacob", 3, "homily"),

    # ── MOSES OF CHORENE ───────────────────────────────────────────────
    ("0859", "History of Armenia",                        "fathers/mar-jacob", 3, "history"),

    # ── MALCHION ───────────────────────────────────────────────────────
    ("0617", "Epistle",                                   "fathers/malchion", 3, "letter"),

    # ── THEODOTUS ──────────────────────────────────────────────────────
    ("0802", "Excerpts",                                  "fathers/theodotus", 3, "treatise"),

    # ── VENANTIUS ──────────────────────────────────────────────────────
    ("0709", "Poem on Easter",                            "fathers/venantius", 3, "treatise"),

    # ── VICTORINUS ─────────────────────────────────────────────────────
    ("0711", "On the Creation of the World",              "fathers/victorinus", 3, "treatise"),
    ("0712", "Commentary on the Apocalypse",              "fathers/victorinus", 3, "commentary"),

    # ── COMMODIANUS ────────────────────────────────────────────────────
    ("0411", "Writings",                                  "fathers/commodianus", 3, "treatise"),

    # ── ALEXANDER OF LYCOPOLIS ─────────────────────────────────────────
    ("0618", "Of the Manichaeans",                        "fathers/archelaus", 3, "treatise"),

    # ── REFERENCE ──────────────────────────────────────────────────────
    ("0714", "The Didache (c. 100)",                      "reference/didache",                3, "reference"),
    ("0715", "Apostolic Constitutions (c. 400)",          "reference/apostolic-constitutions", 3, "reference"),
    ("1004", "The Legend of Barlaam and Josaphat",        "reference/miscellaneous-syriac",    3, "hagiography"),
    ("1013", "Passion of the Scillitan Martyrs",          "reference/miscellaneous-syriac",    3, "hagiography"),
    ("0514", "Treatise Against the Heretic Novatian",     "reference/miscellaneous-syriac",    3, "treatise"),
    ("0515", "Treatise on Re-Baptism",                    "reference/miscellaneous-syriac",    3, "treatise"),
    ("0850", "Remains of the Second and Third Centuries", "reference/miscellaneous-syriac",    3, "reference"),
    ("0856", "Acts of Sharbil [SYRIAC]",                  "reference/miscellaneous-syriac",    3, "hagiography"),
    ("0865", "The Martyrdom of Barsamya [SYRIAC]",        "reference/miscellaneous-syriac",    3, "hagiography"),
    ("0852", "Extracts Concerning Abgar the King [SYRIAC]","reference/miscellaneous-syriac",   3, "reference"),
    ("0853", "The Doctrine of Addai [SYRIAC]",            "reference/miscellaneous-syriac",    3, "reference"),
    ("0854", "The Teaching of the Apostles [SYRIAC]",     "reference/miscellaneous-syriac",    3, "reference"),
    ("0855", "Teaching of Simon Cephas in Rome [SYRIAC]", "reference/miscellaneous-syriac",    3, "reference"),
    ("0857", "Martyrdom of Habib the Deacon [SYRIAC]",    "reference/miscellaneous-syriac",    3, "hagiography"),
    ("0858", "Martyrdom of Shamuna Guria Habib [SYRIAC]", "reference/miscellaneous-syriac",    3, "hagiography"),
    ("0863", "A Letter of Mara Son of Serapion [SYRIAC]", "reference/miscellaneous-syriac",    3, "letter"),
    ("0864", "Ambrose [SYRIAC]",                          "reference/miscellaneous-syriac",    3, "reference"),
    ("0835", "The False Decretals (c. 850)",              "reference/miscellaneous-syriac",    3, "reference"),

    # ── APOCRYPHA ──────────────────────────────────────────────────────
    ("1003", "Apocalypse of Peter (c. 130)",              "apocrypha", 3, "apocrypha"),
    ("0847", "Protoevangelium of James (c. 150)",         "apocrypha", 3, "apocrypha"),
    ("0816", "Acts of Paul and Thecla (c. 180)",          "apocrypha", 3, "apocrypha"),
    ("1001", "Gospel of Peter (c. 190) [DOCETIC]",        "apocrypha", 3, "apocrypha"),
    ("0801", "Testaments of the Twelve Patriarchs",       "apocrypha", 3, "apocrypha"),
    ("0815", "Acts of Peter and Paul (c. 200)",           "apocrypha", 3, "apocrypha"),
    ("0846", "Gospel of Thomas (c. 200) [GNOSTIC]",       "apocrypha", 3, "apocrypha"),
    ("0823", "Acts of Thomas (c. 240) [GNOSTIC]",         "apocrypha", 3, "apocrypha"),
    ("0826", "Acts of Thaddaeus (c. 250)",                "apocrypha", 3, "apocrypha"),
    ("0819", "Acts of Andrew (c. 260) [GNOSTIC]",         "apocrypha", 3, "apocrypha"),
    ("1008", "Acts of Xanthippe and Polyxena (c. 270)",   "apocrypha", 3, "apocrypha"),
    ("0827", "Acts of John [DOCETIC]",                    "apocrypha", 3, "apocrypha"),
    ("0818", "Acts of Philip (c. 350)",                   "apocrypha", 3, "apocrypha"),
    ("1017", "Apocalypse of Paul (c. 380)",               "apocrypha", 3, "apocrypha"),
    ("0807", "Gospel of Nicodemus (Acta Pilati)",         "apocrypha", 3, "apocrypha"),
    ("0832", "Assumption of Mary (c. 400)",               "apocrypha", 3, "apocrypha"),
    ("0805", "History of Joseph the Carpenter (c. 400)",  "apocrypha", 3, "apocrypha"),
    ("0848", "Gospel of Pseudo-Matthew (c. 400)",         "apocrypha", 3, "apocrypha"),
    ("0817", "Acts of Barnabas (c. 500)",                 "apocrypha", 3, "apocrypha"),
    ("0825", "Acts of Bartholomew (c. 500) [NESTORIAN]",  "apocrypha", 3, "apocrypha"),
    ("0822", "Acts and Martyrdom of St. Matthew",         "apocrypha", 3, "apocrypha"),
    ("0806", "Arabic Gospel of the Infancy of the Saviour","apocrypha",3, "apocrypha"),
    ("0814", "Avenging of the Saviour (c. 700)",          "apocrypha", 3, "apocrypha"),
    ("0831", "Apocalypse of John",                        "apocrypha", 3, "apocrypha"),
    ("0828", "Apocalypse of Moses [JUDAISTIC]",           "apocrypha", 3, "apocrypha"),
    ("0829", "Apocalypse of Esdras [JUDAISTIC]",          "apocrypha", 3, "apocrypha"),
    ("1007", "Testament of Abraham [JUDAISTIC]",          "apocrypha", 3, "apocrypha"),
    ("1009", "Narrative of Zosimus",                      "apocrypha", 3, "apocrypha"),
    ("0849", "Gospel of the Nativity of Mary",            "apocrypha", 3, "apocrypha"),
    ("0813", "Narrative of Joseph of Arimathea",          "apocrypha", 3, "apocrypha"),
    ("0809", "Report of Pontius Pilate",                  "apocrypha", 3, "apocrypha"),
    ("0810", "Letter of Pontius Pilate",                  "apocrypha", 3, "apocrypha"),
    ("0811", "Giving Up of Pontius Pilate",               "apocrypha", 3, "apocrypha"),
    ("0812", "Death of Pilate",                           "apocrypha", 3, "apocrypha"),
    ("1005", "Apocalypse of the Virgin",                  "apocrypha", 3, "apocrypha"),
    ("1006", "Apocalypse of Sedrach",                     "apocrypha", 3, "apocrypha"),
    ("0820", "Acts of Andrew and Matthias",               "apocrypha", 3, "apocrypha"),
    ("0821", "Acts of Peter and Andrew",                  "apocrypha", 3, "apocrypha"),
    ("0824", "Consummation of Thomas the Apostle",        "apocrypha", 3, "apocrypha"),
]

# ─────────────────────────────────────────────────────────────────────────────
# HTTP SESSION
# ─────────────────────────────────────────────────────────────────────────────

def make_session() -> requests.Session:
    s = requests.Session()
    retry = Retry(total=3, backoff_factor=2,
                  status_forcelist=[429, 500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retry)
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (compatible; TheosisResearchBot/1.0; "
                      "Orthodox study app archival; educational use)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
    })
    return s


# ─────────────────────────────────────────────────────────────────────────────
# PROVENANCE METADATA
# ─────────────────────────────────────────────────────────────────────────────

def make_provenance(work_id, title, dest_folder, work_type, url,
                    subpages: List[str]) -> dict:
    return {
        "schema": "theosis-provenance-v1",
        "work_id": work_id,
        "title": title,
        "source": "New Advent — newadvent.org/fathers/",
        "source_url": url,
        "dest_folder": dest_folder,
        "work_type": work_type,
        "downloaded_at": datetime.now(timezone.utc).isoformat(),
        "subpages": subpages,
        "license_note": (
            "Transcriptions © New Advent LLC. "
            "Original patristic texts are in the public domain. "
            "Translations largely from NPNF (Nicene and Post-Nicene Fathers) "
            "series, Philip Schaff ed., also public domain."
        ),
        "normalization_status": "raw",
    }


# ─────────────────────────────────────────────────────────────────────────────
# CORE DOWNLOAD LOGIC
# ─────────────────────────────────────────────────────────────────────────────

def fetch(session: requests.Session, url: str, timeout: int = TIMEOUT) -> Optional[str]:
    """Fetch URL, return HTML string or None on failure."""
    try:
        resp = session.get(url, timeout=timeout)
        resp.raise_for_status()
        # Handle UTF-16 BOM that newadvent sometimes returns
        raw = resp.content
        if raw[:2] in (b'\xff\xfe', b'\xfe\xff'):
            return raw.decode("utf-16")
        return resp.text
    except Exception as e:
        log.warning(f"  FETCH FAILED  {url}  →  {e}")
        return None


def extract_subpage_links(html: str, work_id: str) -> List[str]:
    """
    Parse the TOC/index page for this work and extract sub-page numbers.
    Returns list of full-length IDs e.g. ['200101', '200102', ...]
    """
    soup = BeautifulSoup(html, "html.parser")
    subpages = []
    pattern = re.compile(
        r'/fathers/(' + re.escape(work_id) + r'[a-z\d]{1,5})\.htm', re.I
    )
    seen = set()
    for a in soup.find_all("a", href=True):
        m = pattern.search(a["href"])
        if m:
            sub_id = m.group(1)
            if sub_id not in seen:
                seen.add(sub_id)
                subpages.append(sub_id)
    return sorted(subpages)


def save_html(dest_dir: Path, filename: str, html: str) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    p = dest_dir / filename
    p.write_text(html, encoding="utf-8")
    return p


def save_provenance(dest_dir: Path, work_id: str, meta: dict) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    p = dest_dir / f"provenance_{work_id}.json"
    p.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    return p


def download_work(session, work_id, title, dest_folder, work_type,
                  base_dir: Path, delay: float, dry_run: bool,
                  force: bool = False) -> dict:
    """
    Download one work (index page + all sub-pages).
    Returns a summary dict for the acquisition log.
    """
    dest_dir = base_dir / dest_folder
    index_file = dest_dir / f"{work_id}.html"
    prov_file  = dest_dir / f"provenance_{work_id}.json"

    # Skip if already downloaded (unless --force)
    if not force and index_file.exists() and prov_file.exists():
        log.info(f"  SKIP (exists)  {work_id}  {title[:55]}")
        return {"work_id": work_id, "status": "skipped", "files": 0}

    index_url = f"{BASE_URL}{work_id}.htm"
    log.info(f"  GET  {work_id}  {title[:55]}")

    if dry_run:
        return {"work_id": work_id, "status": "dry-run", "files": 0}

    html = fetch(session, index_url)
    if not html:
        return {"work_id": work_id, "status": "error", "files": 0}

    # Save index page
    if not dry_run:
        save_html(dest_dir, f"{work_id}.html", html)

    time.sleep(delay)

    # Detect sub-pages
    subpages = extract_subpage_links(html, work_id)
    downloaded_subs = []

    for sub_id in subpages:
        sub_file = dest_dir / f"{sub_id}.html"
        if not force and sub_file.exists():
            log.info(f"    SKIP sub  {sub_id}")
            downloaded_subs.append(sub_id)
            continue

        sub_url = f"{BASE_URL}{sub_id}.htm"
        log.info(f"    GET  {sub_id}")
        sub_html = fetch(session, sub_url)
        if sub_html:
            save_html(dest_dir, f"{sub_id}.html", sub_html)
            downloaded_subs.append(sub_id)
        else:
            log.warning(f"    FAILED  {sub_id}")
        time.sleep(delay)

    # Save provenance
    meta = make_provenance(
        work_id=work_id,
        title=title,
        dest_folder=dest_folder,
        work_type=work_type,
        url=index_url,
        subpages=subpages,
    )
    save_provenance(dest_dir, work_id, meta)

    n_files = 1 + len(downloaded_subs)
    log.info(f"  DONE  {work_id}  ({n_files} files,  {len(subpages)} subpages)")
    return {
        "work_id": work_id,
        "title": title,
        "status": "ok",
        "files": n_files,
        "subpages": subpages,
    }


# ─────────────────────────────────────────────────────────────────────────────
# SITE INDEX PAGE
# ─────────────────────────────────────────────────────────────────────────────

def save_site_index(session, base_dir: Path, delay: float, dry_run: bool):
    """Save the main fathers/ index page for future reference."""
    index_dir = base_dir / "_index"
    index_dir.mkdir(parents=True, exist_ok=True)
    index_file = index_dir / "fathers_index.html"
    if index_file.exists():
        log.info("  SKIP site index (exists)")
        return
    log.info("  Saving site index page...")
    html = fetch(session, "https://www.newadvent.org/fathers/")
    if html and not dry_run:
        index_file.write_text(html, encoding="utf-8")
        meta_file = index_dir / "provenance_index.json"
        meta_file.write_text(json.dumps({
            "schema": "theosis-provenance-v1",
            "title": "New Advent — Fathers of the Church — Main Index",
            "source_url": "https://www.newadvent.org/fathers/",
            "downloaded_at": datetime.now(timezone.utc).isoformat(),
        }, indent=2), encoding="utf-8")
    time.sleep(delay)


# ─────────────────────────────────────────────────────────────────────────────
# ACQUISITION LOG
# ─────────────────────────────────────────────────────────────────────────────

def save_acquisition_log(base_dir: Path, results: List[dict], phase: str):
    log_dir = base_dir / "_index"
    log_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    log_file = log_dir / f"acquisition_log_phase{phase}_{timestamp}.json"

    summary = {
        "schema": "theosis-acquisition-log-v1",
        "phase": phase,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_works": len(results),
        "ok": sum(1 for r in results if r["status"] == "ok"),
        "skipped": sum(1 for r in results if r["status"] == "skipped"),
        "errors": sum(1 for r in results if r["status"] == "error"),
        "total_files": sum(r.get("files", 0) for r in results),
        "results": results,
    }
    log_file.write_text(json.dumps(summary, indent=2, ensure_ascii=False),
                        encoding="utf-8")
    log.info(f"  Acquisition log → {log_file.name}")
    return summary


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="New Advent Church Fathers downloader")
    parser.add_argument("--base-dir", default=str(DEFAULT_BASE_DIR))
    parser.add_argument("--delay",    type=float, default=DEFAULT_DELAY,
                        help="Seconds between HTTP requests (default 1.5)")
    parser.add_argument("--phase",    default="1",
                        choices=["1", "2", "3", "all"],
                        help="Download phase (1=Orthodox priority, 2=Western, 3=Ante-Nicene, all=everything)")
    parser.add_argument("--author",   default=None,
                        help="Restrict to a single dest_folder substring, e.g. 'chrysostom'")
    parser.add_argument("--dry-run",  action="store_true",
                        help="Print what would be done without downloading")
    parser.add_argument("--force",    action="store_true",
                        help="Re-download even if files already exist")
    args = parser.parse_args()

    base_dir = Path(args.base_dir)
    phase_filter = None if args.phase == "all" else int(args.phase)

    # Filter manifest
    works = MANIFEST
    if phase_filter:
        works = [w for w in works if w[3] <= phase_filter]  # w[3] = phase
    if args.author:
        works = [w for w in works if args.author.lower() in w[2].lower()]

    log.info(f"{'='*60}")
    log.info(f"New Advent Church Fathers Downloader")
    log.info(f"  Base dir : {base_dir}")
    log.info(f"  Phase    : {args.phase}")
    log.info(f"  Works    : {len(works)}")
    log.info(f"  Delay    : {args.delay}s")
    log.info(f"  Dry run  : {args.dry_run}")
    log.info(f"{'='*60}")

    session = make_session()

    # Save main index
    save_site_index(session, base_dir, args.delay, args.dry_run)

    results = []
    for i, (work_id, title, dest_folder, phase, work_type) in enumerate(works, 1):
        log.info(f"[{i:3d}/{len(works)}] Phase {phase} | {dest_folder}")
        result = download_work(
            session=session,
            work_id=work_id,
            title=title,
            dest_folder=dest_folder,
            work_type=work_type,
            base_dir=base_dir,
            delay=args.delay,
            dry_run=args.dry_run,
            force=args.force,
        )
        results.append(result)

    summary = save_acquisition_log(base_dir, results, args.phase)

    log.info(f"{'='*60}")
    log.info(f"COMPLETE")
    log.info(f"  Works processed : {summary['total_works']}")
    log.info(f"  Downloaded (ok) : {summary['ok']}")
    log.info(f"  Skipped (exist) : {summary['skipped']}")
    log.info(f"  Errors          : {summary['errors']}")
    log.info(f"  Total files     : {summary['total_files']}")
    log.info(f"{'='*60}")


if __name__ == "__main__":
    main()
