#!/usr/bin/env python3
"""
Download Orthodox Christian icons from Wikimedia Commons into content/normalized/icons/.

Usage:
    python3 download_icons.py                       # saves into ./content/normalized/icons/
    python3 download_icons.py /path/to/your/repo    # saves into <repo>/content/normalized/icons/
    python3 download_icons.py --out /abs/target/dir # saves directly into the given directory

Notes:
- Sources are Wikimedia Commons files, referenced through the stable
  Special:FilePath/<filename> endpoint, which always redirects to the current
  binary regardless of the underlying hashed upload path.
- A descriptive User-Agent is sent, as required by the Wikimedia user-agent policy.
- Each file is saved as <slug>.<original-extension>. Existing files are skipped
  unless --force is passed.
- The script prints a per-item result and a final summary. For any failure it
  prints the Commons file page so you can grab a replacement by hand.
"""

import argparse
import os
import sys
import time
import urllib.parse
import urllib.request

USER_AGENT = "OrthodoxIconFetcher/1.0 (personal liturgical-calendar project; contact: bkluce13@gmail.com)"
FILEPATH_BASE = "https://commons.wikimedia.org/wiki/Special:FilePath/"
FILEPAGE_BASE = "https://commons.wikimedia.org/wiki/File:"

# (slug, feast_date, label, tier, commons_filename, license_note)
# commons_filename is the Commons title WITHOUT the leading "File:" prefix.
ICONS = [
    # ---- Tier 1: major feasts ----
    ("beheading-of-the-forerunner", "Aug 29", "Beheading of John the Forerunner", 1,
     "19 Beheading of Saint John the Baptist Icon in Assumption of Mary Church in Agios Vasileios.jpg", "Public domain"),
    ("protection-of-the-theotokos", "Oct 1", "Protection of the Theotokos (Pokrov)", 1,
     "Pokrov icon from Ivano-Frankivsk, Ukraine.jpg", "Public domain"),
    ("conception-of-the-theotokos", "Dec 9", "Conception of the Theotokos by Anna", 1,
     "020 Conception of Saint Anne Icon from Saint Paraskevi Church in Langadas.jpg", "Public domain"),
    ("conception-of-the-forerunner", "Sep 23", "Conception of the Forerunner", 1,
     "Conception of John Baptist (icon, Russia, 15 c).jpg", "Public domain"),
    ("procession-of-the-cross", "Aug 1", "Procession of the Cross", 1,
     "Exaltation of the Cross - Palekh icon (19 c, priv.coll).jpg", "Public domain"),
    ("translation-of-the-image-not-made-by-hands", "Aug 16", "Translation of the Image Not-Made-by-Hands", 1,
     "Image of Edessa icon.jpg", "Public domain"),
    ("synaxis-of-the-forerunner", "Jan 7", "Synaxis of the Forerunner", 1,
     "Собор Святого Иоанна Предтечи.png", "Public domain"),
    ("synaxis-of-the-theotokos", "Dec 26", "Synaxis of the Theotokos", 1,
     "Synaxis of the Theotokos (16th c, Palekh museum).jpg", "Public domain"),
    ("holy-innocents-of-bethlehem", "Dec 29", "14,000 Holy Innocents of Bethlehem", 1,
     "Nikola-Obrazopisov-Belyova-church-Massacre-of-the-Innocents-1869.jpg", "Public domain"),

    # ---- Tier 2: widely venerated saints ----
    ("sisoes-the-great", "Jul 6", "Sisoes the Great", 2,
     "Saint Sisoes facing the tomb of Alexander the Great (Byzantine museum).jpg", "Likely public domain (verify)"),
    ("kyriake-of-nicomedia", "Jul 7", "Great-martyr Kyriake", 2,
     "Saint nedelja (kyriaki) bulgaria icon.gif", "Unknown (verify)"),
    ("procopius-of-caesarea", "Jul 8", "Great-martyr Procopius", 2,
     "St. Procopius Icon.jpg", "Unknown (verify)"),
    ("seven-youths-of-ephesus", "Aug 4", "Seven Holy Youths of Ephesus", 2,
     "Seven Sleepers (Vladimir, Old Believers, 1895, priv.coll).jpg", "Likely public domain (verify)"),
    ("florus-and-laurus", "Aug 18", "Florus and Laurus", 2,
     "Unknown Russan (Novgorod) - Icon, The Archangel Michael Blessing the Martyred Saints Florus and Laurus of Dalmatia - 75.62 - Minneapolis Institute of Arts.jpg", "Public domain"),
    ("adrian-and-natalia", "Aug 26", "Adrian and Natalia", 2,
     "Adrian and Natalia.jpg", "Unknown (verify)"),
    ("poemen-the-great", "Aug 27", "Poemen the Great", 2,
     "Hosios Loukas (nave, vault over south-west bay) - S.Poimen.jpg", "Likely public domain (verify)"),
    ("euphemia-the-all-praised", "Sep 16", "Great-martyr Euphemia", 2,
     "Sancte Euphemia Kadıköy.jpg", "Unknown (verify)"),
    ("sergius-and-bacchus", "Oct 7", "Sergius and Bacchus", 2,
     "Saints Sergius and Bacchus, 7th century BC.jpg", "Public domain"),
    ("pelagia-the-penitent", "Oct 8", "Pelagia the Penitent", 2,
     "St. Pelagia (3444743378).jpg", "Unknown (verify)"),
    ("longinus-the-centurion", "Oct 16", "Longinus the Centurion", 2,
     "Longin - legionista rzymski.jpg", "Likely public domain (verify)"),
    ("joannicius-the-great", "Nov 4", "Joannicius the Great", 2,
     "Joannicius the Great (Menologion of Basil II).jpg", "Public domain"),
    ("menas-of-egypt", "Nov 11", "Great-martyr Menas of Egypt", 2,
     "Christ and Menas.jpg", "Public domain"),
    ("john-the-merciful", "Nov 12", "John the Merciful", 2,
     "Saint Athanasius, John Eleimon and Cyril of Alexandria Icon by Veniamin of Galatista, 1833.jpg", "Public domain"),
    ("stephen-the-new", "Nov 28", "Stephen the New", 2,
     "Hosios Loukas (nave, south west bay) - S.Stephen the Younger.jpg", "Likely public domain (verify)"),

    # ---- Tier 3: remaining minor prophets ----
    ("prophet-amos", "Jun 15", "Prophet Amos", 3,
     "Mural depicting the Prophet Amos at the Cathedral of Athens on June 4, 2022.jpg", "Unknown / modern mural (verify)"),
    ("prophet-hosea", "Oct 17", "Prophet Hosea", 3,
     "Hosea (Menologion of Basil II).jpg", "Public domain"),
    ("prophet-joel", "Oct 19", "Prophet Joel", 3,
     "Fethiye Camii, parekklesion, dome, mosaics, Istanbul, Turkey - Joel, detail of bust - MSBZ004 BF S 1979 0421 - Dumbarton Oaks.jpg", "Unknown (verify)"),
    ("prophet-obadiah", "Nov 19", "Prophet Obadiah", 3,
     "Prophet Obadiah (Menologion of Basil II).jpg", "Public domain"),
    ("prophet-nahum", "Dec 1", "Prophet Nahum", 3,
     "Pammakaristos Church - mosaics of the main dome of the parekklesion - P1030457.JPG", "Unknown (verify); group mosaic, no solo icon on Commons"),
    ("prophet-zephaniah", "Dec 3", "Prophet Zephaniah", 3,
     "Mural depicting the Prophet Zephaniah (Sophonias) at the Cathedral of Athens on June 4, 2022.jpg", "Unknown / modern mural (verify)"),
    ("prophet-haggai", "Dec 16", "Prophet Haggai", 3,
     "Haggai (Menologion of Basil II).jpg", "Public domain"),

    # ---- Tier 4: Apostles of the Seventy & deep bench ----
    ("apostle-timothy", "Jan 22", "Apostle Timothy of the Seventy", 4,
     "Saint Timothy (Menologion of Basil II).jpg", "Public domain"),
    ("apostle-onesimus", "Feb 15", "Apostle Onesimus of the Seventy", 4,
     "St Onesimus the apostle.jpg", "Unknown (verify)"),
    ("joseph-the-hymnographer", "Apr 4", "Joseph the Hymnographer", 4,
     "Saint Hymnographers Theophanus and Joseph LIPLJAN.jpg", "Unknown (verify); shown with St Theophanes"),
    ("tarasius-of-constantinople", "Feb 25", "Tarasius of Constantinople", 4,
     "Tarasios of Constantinople, Menologion of Basil II.png", "Public domain"),
    ("sophronius-of-jerusalem", "Mar 11", "Sophronius of Jerusalem", 4,
     "Athonite Fresco Icon of Saint Sophronios of Jerusalem.jpg", "Unknown (verify)"),
    ("onuphrius-the-great", "Jun 12", "Onuphrius the Great", 4,
     "Saint Onuphrius Emmanuel Tzanes.png", "Public domain"),
    ("sampson-the-hospitable", "Jun 27", "Sampson the Hospitable", 4,
     "Feodorovskaya and Samson and Mary of Egypt.jpeg", "Unknown (verify); shown with Theotokos & Mary of Egypt"),
    ("alexis-the-man-of-god", "Mar 17", "Alexis the Man of God", 4,
     "Alexius of Rome and Mary of Egypt (1648).jpg", "Public domain"),
]


def file_url(commons_filename: str) -> str:
    # Special:FilePath accepts the title with spaces; we percent-encode for safety.
    return FILEPATH_BASE + urllib.parse.quote(commons_filename)


def file_page(commons_filename: str) -> str:
    return FILEPAGE_BASE + urllib.parse.quote(commons_filename.replace(" ", "_"))


def ext_of(commons_filename: str) -> str:
    ext = os.path.splitext(commons_filename)[1].lower()
    return ext if ext else ".jpg"


def download_one(commons_filename: str, dest_path: str, timeout: int = 60) -> int:
    """Download to dest_path. Returns number of bytes written."""
    req = urllib.request.Request(file_url(commons_filename), headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        ctype = resp.headers.get("Content-Type", "")
        data = resp.read()
    if data[:15].lstrip().lower().startswith(b"<!doctype html") or data[:6].lower() == b"<html>":
        raise ValueError("server returned an HTML page, not an image (filename probably wrong)")
    if "image" not in ctype and len(data) < 1024:
        raise ValueError(f"unexpected content-type '{ctype}' and tiny payload ({len(data)} bytes)")
    tmp = dest_path + ".part"
    with open(tmp, "wb") as fh:
        fh.write(data)
    os.replace(tmp, dest_path)
    return len(data)


def main() -> int:
    ap = argparse.ArgumentParser(description="Download Orthodox icons from Wikimedia Commons.")
    ap.add_argument("repo_root", nargs="?", default=".",
                    help="Project root; files go to <root>/content/normalized/icons/ (default: current dir)")
    ap.add_argument("--out", default=None,
                    help="Write images directly into this directory instead of <root>/content/normalized/icons/")
    ap.add_argument("--force", action="store_true", help="Re-download even if the file already exists")
    ap.add_argument("--delay", type=float, default=0.5, help="Seconds to wait between downloads (be polite)")
    args = ap.parse_args()

    out_dir = args.out if args.out else os.path.join(args.repo_root, "content", "normalized", "icons")
    os.makedirs(out_dir, exist_ok=True)
    print(f"Saving {len(ICONS)} icons to: {os.path.abspath(out_dir)}\n")

    ok, skipped, failed = [], [], []
    for slug, date, label, tier, fname, lic in ICONS:
        dest = os.path.join(out_dir, slug + ext_of(fname))
        if os.path.exists(dest) and not args.force:
            print(f"  skip   {slug:<42} (already present)")
            skipped.append(slug)
            continue
        try:
            n = download_one(fname, dest)
            print(f"  ok     {slug:<42} {n//1024:>5} KB")
            ok.append(slug)
        except Exception as e:  # noqa: BLE001
            print(f"  FAIL   {slug:<42} {e}")
            print(f"         -> check: {file_page(fname)}")
            failed.append((slug, fname, str(e)))
        time.sleep(args.delay)

    print("\n" + "=" * 60)
    print(f"Downloaded: {len(ok)}   Skipped: {len(skipped)}   Failed: {len(failed)}")
    if failed:
        print("\nThese need a manual replacement (open the page, pick another file in")
        print("the same category, and update the filename in this script):")
        for slug, fname, err in failed:
            print(f"  - {slug}: {file_page(fname)}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
