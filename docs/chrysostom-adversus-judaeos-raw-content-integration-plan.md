# Chrysostom — Eight Homilies Against the Jews (Adversus Judaeos) — Raw Content Integration Plan

**Status:** Planning document — Phase 2 Tier-2 supplementary acquisition (NOT from New Advent).


**Date inspected:** 2026-05-20
**Source:** tertullian.org (Roger Pearse curation)
**Translation:** Anonymous English translation; Pearse-declared public domain. Roger Pearse commissioned a new translation for the Pradels-discovery additions to Homily 2 in 2010.


---

## 1. Why this is a Tier-2 supplementary acquisition

The main Chrysostom corpus from New Advent (Phase 1) contains 36 works — homilies on every NT book, treatises on priesthood, the statues, and so on. But the **Adversus Judaeos** are absent from NPNF I/9–14 (likely intentionally omitted by Schaff due to their controversial content).

These homilies are:
- **Important for understanding Chrysostom's Antiochian period**
- **Historically significant** — among the most-discussed Chrysostom texts in modern scholarship
- **Often cited in contemporary Orthodox-Jewish dialogue contexts**



---

## 2. Location & Inventory

```
content/raw/fathers/chrysostom/adversus-judaeos/
├── chrysostom_adversus_judaeos_00_eintro.htm     # Pearse's editorial intro (7 KB)
├── chrysostom_adversus_judaeos_01_homily1.htm    # Homily 1 (52 KB)
├── chrysostom_adversus_judaeos_02_homily2.htm    # Homily 2 (20 KB — includes Pradels additions)
├── chrysostom_adversus_judaeos_03_homily3.htm    # Homily 3 (39 KB)
├── chrysostom_adversus_judaeos_04_homily4.htm    # Homily 4 (43 KB)
├── chrysostom_adversus_judaeos_05_homily5.htm    # Homily 5 (81 KB — longest)
├── chrysostom_adversus_judaeos_06_homily6.htm    # Homily 6 (48 KB)
├── chrysostom_adversus_judaeos_07_homily7.htm    # Homily 7 (44 KB)
├── chrysostom_adversus_judaeos_08_homily8.htm    # Homily 8 (59 KB)
└── provenance_chrysostom-adversus-judaeos.json
```

| Total | 9 HTML files | ~390 KB |
|---|---|---|

---

## 3. Translation & licensing

| Field | Value |
|---|---|
| **Translator** | Anonymous (pre-1990s); Pearse 2010 for Homily 2 additions |
| **Translation publisher** | None — text circulated on the web from the 1990s onward without clear attribution |
| **Source for our copy** | Roger Pearse's tertullian.org curation (2011) |
| **License declaration** | "public domain - copy freely" (Pearse, 2011) |
| **Probable origin** | A 1967 University of Chicago dissertation by C. Mervyn Maxwell on Chrysostom's anti-Jewish homilies was suggested as the original source, but never confirmed. The translation matches no known published edition. It may be a Fordham Medieval Sourcebook (Paul Halsall) preparation from anonymously-submitted material. |
| **Caveat** | Because the translator is unknown, this is **lower-confidence PD provenance** than e.g. the Robinson or Allies translations. However, the underlying Greek text is unambiguously PD, and any translation circulating freely online for 25+ years with no copyright claim is effectively PD. |

**Pradels discovery (1990s):** German scholar Wendy Pradels discovered manuscript material recovering missing portions of Homily 2 in a Greek monastery. Roger Pearse commissioned a new translation of that material in 2010 and released it to PD.

---

## 4. HTML structure

Standard Roger Pearse tertullian.org template:

```html
<head>
  <link REL=stylesheet HREF="fathers-all.css" TYPE="text/css">
  <meta name="AUTHOR" content="Roger Pearse">
  <title>John Chrysostom, Against the Jews. Homily N</title>
</head>
<body bgcolor="#FFFFFF">
  <p align="center">  <!-- Top navigation: Prev/TOC/Next as mroon*.gif images -->
    <a href="..."><img SRC="mroonppv.gif"></a>
    <a href="..."><img SRC="mroontoc.gif"></a>
    <a href="..."><img SRC="mroonpnx.gif"></a>
  </p>
  <p align="center"><b>John Chrysostom, Against the Jews. Homily N</b></p>
  <hr>
  <p align="center"><BIG><STRONG>HOMILY I</STRONG></BIG></p>
  <P>(1) TODAY I HAD INTENDED to complete my discussion...</P>
  <P>(2) ... </P>
  ...
</body>
```

### Parser instructions

- **Drop:** `<head>`, top nav images, page title `<p>`, footer nav
- **Capture:** `<p>(N)` numbered paragraphs as body content
- **Footnote anchors:** look for `<a name="N">` patterns; pair with footnote content
- **Paragraph numbering:** `(N)` at start of `<P>` tag is Robinson-Pearse paragraph numbering

---

## 5. Homily topics

Each homily targets a different Jewish festival or rhetorical theme:

| Homily | Length (KB) | Primary topic |
|---|---:|---|
| 1 | 52 | Against Christians who attend synagogue services and observe Jewish customs |
| 2 | 20 | Continuation; includes 1990s Pradels-discovery additions |
| 3 | 39 | Against Christians attending synagogue for the **Feast of Trumpets (Rosh Hashanah)** |
| 4 | 43 | Continuation of the anti-synagogue argument |
| 5 | 81 | The most extensive of the eight; theological argument |
| 6 | 48 | Continuation |
| 7 | 44 | Against Christians observing **Yom Kippur (Day of Atonement)** |
| 8 | 59 | Against Christians observing **Sukkot (Feast of Tabernacles)** |

---


## 7. Bible-linking strategy

The homilies cite the OT extensively — especially:

- **Galatians 4-5** (Paul's anti-Judaizing argument) — Chrysostom's foundational text
- **Romans 11** (Israel's status in the economy of salvation)
- **Hebrews 7-9** (the Levitical priesthood superseded)
- **Acts 15** (the Apostolic Council on Jewish law)
- **Matthew 23** (woes against the Pharisees)
- **Psalm 78** (the Jewish people's history)
- **Isaiah 1** (prophetic critique of Israel)
- **Daniel 9** (the seventy weeks)

These are the **primary head-verse linking opportunities**.

---

## 8. Cross-corpus links

- **Chrysostom Homilies on Romans (Romans 9-11 in particular)** — already in corpus; rich theological context
- **Chrysostom Homilies on Galatians** — already in corpus; theologically central
- **Justin Martyr Dialogue with Trypho** (already in corpus) — the most important precursor for early Christian-Jewish dialogue; pairs well with Adversus Judaeos
- **Cyril of Jerusalem Catechetical Lectures 4-5** — also addresses Christian/Jewish relationship; less polemical
- **Augustine *Adversus Judaeos*** (Augustine's tract — already in NPNF Augustine corpus) — Western parallel to Chrysostom's homilies

---

## 9. Parser strategy

Standard. Each homily is a self-contained HTML file with:
1. Page header to drop
2. Numbered paragraphs `(N)` as body content
3. Footnote anchors at the end

Output: 8 `WorkSection` entries (one per homily) + 1 `Work` entry for the collection.

---



---


---

## 12. Appendix

- Source acquisition: `2026-05-20T19:43:00+00:00` via curl from tertullian.org
- Primary URL: https://www.tertullian.org/fathers/chrysostom_adversus_judaeos_00_eintro.htm
- Pearse's introduction (chrysostom_adversus_judaeos_00_eintro.htm) provides his framing of the material
- Greek source: PG 48:843-942
- Modern translation: Paul W. Harkins, *St. John Chrysostom: Discourses Against Judaizing Christians* (Fathers of the Church, vol. 68; Washington: CUA Press, 1979) — copyrighted
