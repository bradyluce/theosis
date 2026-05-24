# Dump SWORD modules to a flat text format the TS ingest can consume.
# Output: one line per verse: "<bookSlug>|<chapter>|<verse>|<text>"
# Book names come from pysword (English names regardless of module language)
# and are mapped to our canonical slugs in the TS parser.
#
# Usage:
#   python scripts/ingest/sword-to-text.py <sword_zip_dir> <module_name> <output_file>
import os
import sys
import re
from pysword.modules import SwordModules

# Map pysword book names (English, "I"/"II"/"III" Roman-numeral prefix
# for numbered books) to our canonical slugs.
BOOK_NAME_TO_SLUG = {
    "Genesis": "genesis", "Exodus": "exodus", "Leviticus": "leviticus",
    "Numbers": "numbers", "Deuteronomy": "deuteronomy", "Joshua": "joshua",
    "Judges": "judges", "Ruth": "ruth",
    "I Samuel": "first-samuel", "II Samuel": "second-samuel",
    "I Kings": "first-kings", "II Kings": "second-kings",
    "I Chronicles": "first-chronicles", "II Chronicles": "second-chronicles",
    "Ezra": "ezra", "Nehemiah": "nehemiah", "Esther": "esther",
    "Job": "job", "Psalms": "psalms", "Proverbs": "proverbs",
    "Ecclesiastes": "ecclesiastes", "Song of Solomon": "song-of-solomon",
    "Isaiah": "isaiah", "Jeremiah": "jeremiah", "Lamentations": "lamentations",
    "Ezekiel": "ezekiel", "Daniel": "daniel", "Hosea": "hosea",
    "Joel": "joel", "Amos": "amos", "Obadiah": "obadiah", "Jonah": "jonah",
    "Micah": "micah", "Nahum": "nahum", "Habakkuk": "habakkuk",
    "Zephaniah": "zephaniah", "Haggai": "haggai", "Zechariah": "zechariah",
    "Malachi": "malachi",
    # Deuterocanon — pysword uses Roman numerals
    "Tobit": "tobit", "Tobias": "tobit",
    "Judith": "judith", "Wisdom": "wisdom",
    "Wisdom of Solomon": "wisdom",
    "Sirach": "sirach", "Ecclesiasticus": "sirach",
    "Baruch": "baruch",
    "Letter of Jeremiah": "epistle-of-jeremiah",
    "Epistle of Jeremiah": "epistle-of-jeremiah",
    "Prayer of Azariah": "prayer-of-azariah",
    "Song of the Three Young Men": "prayer-of-azariah",
    "Song of Three Young Men": "prayer-of-azariah",
    "Susanna": "susanna",
    "Bel and the Dragon": "bel-and-the-dragon",
    "Prayer of Manasses": "prayer-of-manasseh",
    "Prayer of Manasseh": "prayer-of-manasseh",
    "I Maccabees": "first-maccabees", "II Maccabees": "second-maccabees",
    "III Maccabees": "third-maccabees", "IV Maccabees": "fourth-maccabees",
    "I Esdras": "first-esdras", "II Esdras": "second-esdras",
    "Additions to Esther": "esther-greek",
    "Greek Esther": "esther-greek",
    "Additional Psalm": "psalm-151",  # not in canon, will be filtered
    "Laodiceans": "_skip",  # apocryphal — not in our canon, skip silently
    # NT — pysword uses Roman numerals for numbered books
    "Matthew": "matthew", "Mark": "mark", "Luke": "luke", "John": "john",
    "Acts": "acts", "Romans": "romans",
    "I Corinthians": "first-corinthians", "II Corinthians": "second-corinthians",
    "Galatians": "galatians", "Ephesians": "ephesians",
    "Philippians": "philippians", "Colossians": "colossians",
    "I Thessalonians": "first-thessalonians",
    "II Thessalonians": "second-thessalonians",
    "I Timothy": "first-timothy", "II Timothy": "second-timothy",
    "Titus": "titus", "Philemon": "philemon", "Hebrews": "hebrews",
    "James": "james",
    "I Peter": "first-peter", "II Peter": "second-peter",
    "I John": "first-john", "II John": "second-john", "III John": "third-john",
    "Jude": "jude", "Revelation of John": "revelation",
    "Revelation": "revelation",
}

# Strip SWORD markup tags: <note>...</note>, <transChange>...</transChange>,
# <w>...</w>, <FI>...<Fi> (Strong's wraps), <RF>...<Rf> (footnotes), etc.
# Different modules use different markup; cover the common ones.
NOTE_PATTERNS = [
    re.compile(r"<note\b[^>]*>.*?</note>", re.DOTALL),
    re.compile(r"<RF\b[^>]*>.*?<Rf>", re.DOTALL),
    re.compile(r"<FI\b[^>]*>.*?<Fi>", re.DOTALL),
    re.compile(r"<f\b[^>]*>.*?</f>", re.DOTALL),
]
TAG_PATTERN = re.compile(r"<[^>]+>")
WHITESPACE_PATTERN = re.compile(r"\s+")

def clean_text(text):
    """Strip SWORD-specific markup and normalize whitespace."""
    if not text:
        return ""
    for pat in NOTE_PATTERNS:
        text = pat.sub(" ", text)
    text = TAG_PATTERN.sub(" ", text)
    text = WHITESPACE_PATTERN.sub(" ", text)
    return text.strip()


def dump_module(sword_dir, module_name, output_path):
    modules = SwordModules(sword_dir)
    modules.parse_modules()
    bible = modules.get_bible_from_module(module_name)

    structure = bible.get_structure()
    book_groups = structure.get_books()

    out_lines = []
    skipped_books = set()

    for testament in ("ot", "nt", "ap"):
        if testament not in book_groups:
            continue
        for book in book_groups[testament]:
            book_name = book.name
            slug = BOOK_NAME_TO_SLUG.get(book_name)
            if not slug:
                skipped_books.add(book_name)
                continue
            if slug.startswith("_") or slug == "psalm-151":
                # Explicit skips (apocryphal Laodiceans, Psalm 151 — not in
                # our canon yet). Silently drop without noise.
                continue

            for chapter_idx, num_verses in enumerate(book.chapter_lengths, start=1):
                for verse_num in range(1, num_verses + 1):
                    try:
                        raw = bible.get(
                            books=[book_name],
                            chapters=[chapter_idx],
                            verses=[verse_num],
                        )
                    except Exception as exc:
                        # Don't swallow silently — log once per book so a
                        # whole-module failure can't pass for "0 verses".
                        print(
                            f"  ! {book_name} {chapter_idx}:{verse_num}: {exc}",
                            file=sys.stderr,
                        )
                        continue
                    text = clean_text(raw)
                    if text:
                        out_lines.append(f"{slug}|{chapter_idx}|{verse_num}|{text}")

    with open(output_path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(out_lines) + "\n")

    print(f"  Wrote {len(out_lines)} verses to {output_path}")
    if skipped_books:
        print(f"  Skipped (unmapped) books: {sorted(skipped_books)}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(
            "Usage: python sword-to-text.py <sword_zip_dir> <module_name> <output_file>"
        )
        sys.exit(1)
    sword_dir = os.path.abspath(sys.argv[1])
    module_name = sys.argv[2]
    output_path = os.path.abspath(sys.argv[3])
    dump_module(sword_dir, module_name, output_path)
