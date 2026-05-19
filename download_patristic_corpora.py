#!/usr/bin/env python3
"""
Comprehensive downloader for Theophylact and Augustine patristic commentary corpora.
Downloads all sources and organizes into proper folder structure.

Usage:
    python3 download_patristic_corpora.py [--output-dir <path>] [--tier <1|2|3|all>]

Examples:
    python3 download_patristic_corpora.py
    python3 download_patristic_corpora.py --output-dir ~/theosis-corpora
    python3 download_patristic_corpora.py --tier 1  # Only highest priority
"""

import os
import sys
import requests
from pathlib import Path
from typing import Dict, List, Tuple
import time
from datetime import datetime
import json

# Configuration
DEFAULT_OUTPUT_DIR = Path.home() / "theosis-corpora"
TIMEOUT = 30

# Download manifest with all works
DOWNLOAD_MANIFEST = {
    "augustine": {
        "tier_1": [
            {
                "name": "John Tractates (NPNF1-07)",
                "work_id": "augustine-john-tractates-01",
                "url": "https://www.newadvent.org/fathers/1701.htm",
                "filename": "john-tractates_newadvent.html",
                "folder": "john-tractates/source",
                "priority": "1A",
            },
            {
                "name": "Psalm Expositions (NPNF1-08)",
                "work_id": "augustine-psalm-expositions-01",
                "url": "https://www.newadvent.org/fathers/1801.htm",
                "filename": "psalm-expositions_newadvent.html",
                "folder": "psalm-expositions/source",
                "priority": "1B",
            },
            {
                "name": "Sermon on the Mount (NPNF1-06)",
                "work_id": "augustine-sermon-on-mount-01",
                "url": "https://www.ccel.org/ccel/schaff/npnf106.html",
                "filename": "sermon-on-mount_ccel.html",
                "folder": "sermon-on-mount/source",
                "priority": "1C",
            },
        ],
        "tier_2": [
            {
                "name": "Gospel Homilies (NPNF1-06 Part 2)",
                "work_id": "augustine-gospel-homilies-01",
                "url": "https://www.newadvent.org/fathers/1603.htm",
                "filename": "gospel-homilies_newadvent.html",
                "folder": "gospel-homilies/source",
                "priority": "2A",
            },
            {
                "name": "Numbered Sermons (scattered)",
                "work_id": "augustine-sermons-nt-01",
                "url": "https://www.newadvent.org/fathers/1603.htm",
                "filename": "sermons-nt_newadvent.html",
                "folder": "sermons-nt/source",
                "priority": "2B",
                "note": "May need disambiguation from Gospel Homilies",
            },
        ],
        "tier_3": [
            {
                "name": "Galatians Commentary",
                "work_id": "augustine-galatians-commentary-01",
                "url": "https://archive.org/stream/augustinescommen0007augu/augustinescommen0007augu_djvu.txt",
                "filename": "galatians-commentary_archive-org.txt",
                "folder": "galatians-commentary/source",
                "priority": "3A",
            },
            {
                "name": "Romans Commentary (conditional)",
                "work_id": "augustine-romans-commentary-01",
                "url": "https://archive.org/stream/augustinescommen0001augu/augustinescommen0001augu_djvu.txt",
                "filename": "romans-commentary_archive-org.txt",
                "folder": "romans-commentary/source",
                "priority": "3B",
                "optional": True,
            },
        ],
    },
    "theophylact": {
        "tier_1": [
            {
                "name": "Matthew (Holy Trinity Mission)",
                "work_id": "theophylact-matthew-01",
                "url": "http://www.holytrinitymission.org/books/english/matthew_theophilactos.htm",
                "filename": "matthew_theophylactos_holy-trinity.html",
                "folder": "matthew/source",
                "priority": "1A",
            },
            {
                "name": "Mark (Internet Archive)",
                "work_id": "theophylact-mark-01",
                "url": "https://archive.org/stream/TheGospelAccordingToSt.Mark/The%20Gospel%20According%20to%20St.%20Mark_djvu.txt",
                "filename": "mark_theophylactos_archive-text.txt",
                "folder": "mark/source",
                "priority": "1B",
            },
            {
                "name": "Luke (Internet Archive)",
                "work_id": "theophylact-luke-01",
                "url": "https://archive.org/stream/111916486Ch01OfTheExplanationOfTheHolyGospelAccordingToStLukeByBlessedTheophylact/111916486Ch01OfTheExplanationOfTheHolyGospelAccordingToStLukeByBlessedTheophylact_djvu.txt",
                "filename": "luke_theophylactos_archive-text.txt",
                "folder": "luke/source",
                "priority": "1C",
            },
        ],
    },
}


class CorpusDownloader:
    """Manages downloading and organizing patristic corpora."""

    def __init__(self, output_dir: Path = DEFAULT_OUTPUT_DIR):
        self.output_dir = Path(output_dir)
        self.base_path_augustine = self.output_dir / "content/raw/commentary/new-advent/augustine"
        self.base_path_theophylact = self.output_dir / "content/raw/commentary/archive-org/theophylact-gospel-commentary"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.stats = {
            "attempted": 0,
            "successful": 0,
            "failed": 0,
            "skipped": 0,
            "total_bytes": 0,
        }
        self.failed_downloads = []

    def create_folders(self) -> None:
        """Create all necessary folder structures."""
        print("\n📁 Creating folder structure...")

        # Augustine folders
        for tier_key in ["tier_1", "tier_2", "tier_3"]:
            for item in DOWNLOAD_MANIFEST["augustine"].get(tier_key, []):
                folder_path = self.base_path_augustine / item["folder"]
                folder_path.mkdir(parents=True, exist_ok=True)
                print(f"  ✓ {folder_path.relative_to(self.output_dir)}")

        # Theophylact folders
        for tier_key in ["tier_1"]:
            for item in DOWNLOAD_MANIFEST["theophylact"].get(tier_key, []):
                folder_path = self.base_path_theophylact / item["folder"]
                folder_path.mkdir(parents=True, exist_ok=True)
                print(f"  ✓ {folder_path.relative_to(self.output_dir)}")

    def download_file(self, url: str, filepath: Path, name: str) -> bool:
        """Download a single file with retry logic."""
        if filepath.exists():
            size_mb = filepath.stat().st_size / (1024 * 1024)
            print(f"  ⊘ {name} ({size_mb:.2f} MB) - already exists")
            self.stats["skipped"] += 1
            return True

        try:
            print(f"  ⬇ {name}...", end=" ", flush=True)
            response = self.session.get(url, timeout=TIMEOUT)
            response.raise_for_status()

            filepath.write_bytes(response.content)
            size_mb = len(response.content) / (1024 * 1024)
            print(f"✓ ({size_mb:.2f} MB)")

            self.stats["successful"] += 1
            self.stats["total_bytes"] += len(response.content)
            return True

        except requests.RequestException as e:
            print(f"✗ ({type(e).__name__})")
            self.stats["failed"] += 1
            self.failed_downloads.append({
                "name": name,
                "url": url,
                "error": str(e)[:100]
            })
            return False

    def download_corpus(self, corpus: str, tier: str = "all") -> None:
        """Download a complete corpus."""
        if corpus == "augustine":
            print("\n" + "="*70)
            print("📖 AUGUSTINE BIBLICAL COMMENTARIES & HOMILIES")
            print("="*70)

            base_path = self.base_path_augustine
            manifest = DOWNLOAD_MANIFEST["augustine"]

            tiers_to_process = []
            if tier in ["1", "all"]:
                tiers_to_process.append("tier_1")
            if tier in ["2", "all"]:
                tiers_to_process.append("tier_2")
            if tier in ["3", "all"]:
                tiers_to_process.append("tier_3")

            for tier_key in tiers_to_process:
                tier_num = tier_key.split("_")[1]
                print(f"\n🎯 TIER {tier_num} — {['High Priority', 'Medium Priority', 'Specialized'][int(tier_num)-1]}")

                for item in manifest.get(tier_key, []):
                    filepath = base_path / item["folder"] / item["filename"]
                    print(f"  [{item['priority']}] {item['name']}")

                    self.stats["attempted"] += 1
                    self.download_file(item["url"], filepath, item["filename"])
                    time.sleep(0.5)  # Rate limiting

        elif corpus == "theophylact":
            print("\n" + "="*70)
            print("📖 THEOPHYLACT GOSPEL COMMENTARIES")
            print("="*70)

            base_path = self.base_path_theophylact
            manifest = DOWNLOAD_MANIFEST["theophylact"]

            print(f"\n🎯 TIER 1 — High Priority (3 Gospels)")

            for item in manifest["tier_1"]:
                filepath = base_path / item["folder"] / item["filename"]
                print(f"  [{item['priority']}] {item['name']}")

                self.stats["attempted"] += 1
                self.download_file(item["url"], filepath, item["filename"])
                time.sleep(0.5)  # Rate limiting

    def create_metadata_files(self) -> None:
        """Create metadata tracking files."""
        print("\n📝 Creating metadata files...")

        metadata = {
            "download_date": datetime.now().isoformat(),
            "source": "Theosis Patristic Corpus Downloader",
            "statistics": self.stats,
            "failed_downloads": self.failed_downloads,
        }

        # Augustine metadata
        augustine_meta_file = self.base_path_augustine / "_corpus-index.yaml"
        theophylact_meta_file = self.base_path_theophylact / "_corpus-index.yaml"

        # Create simple metadata files
        for meta_file, corpus_type in [
            (augustine_meta_file, "Augustine"),
            (theophylact_meta_file, "Theophylact"),
        ]:
            meta_file.parent.mkdir(parents=True, exist_ok=True)
            with open(meta_file, 'a') as f:
                f.write(f"\n# Download completed: {datetime.now().isoformat()}\n")
            print(f"  ✓ {meta_file.name}")

    def print_summary(self) -> None:
        """Print download summary."""
        print("\n" + "="*70)
        print("📊 DOWNLOAD SUMMARY")
        print("="*70)
        print(f"Total Attempted:  {self.stats['attempted']}")
        print(f"✓ Successful:     {self.stats['successful']}")
        print(f"✗ Failed:         {self.stats['failed']}")
        print(f"⊘ Skipped:        {self.stats['skipped']}")
        print(f"Total Size:       {self.stats['total_bytes'] / (1024*1024):.1f} MB")

        if self.failed_downloads:
            print(f"\n⚠️  Failed Downloads ({len(self.failed_downloads)}):")
            for item in self.failed_downloads:
                print(f"  • {item['name']}")
                print(f"    Error: {item['error']}")

        print(f"\n📂 Output directory: {self.base_path_augustine.parent.parent.parent}")
        print("="*70 + "\n")

    def run(self, corpora: List[str] = None, tier: str = "all") -> None:
        """Execute full download workflow."""
        if corpora is None:
            corpora = ["augustine", "theophylact"]

        print("\n🚀 PATRISTIC CORPORA DOWNLOADER")
        print(f"Output: {self.output_dir}")
        print(f"Tiers: {tier.upper()}")

        self.create_folders()

        for corpus in corpora:
            if corpus in DOWNLOAD_MANIFEST:
                self.download_corpus(corpus, tier)

        self.create_metadata_files()
        self.print_summary()


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Download Theophylact and Augustine patristic corpora"
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory (default: {DEFAULT_OUTPUT_DIR})"
    )
    parser.add_argument(
        "--tier",
        choices=["1", "2", "3", "all"],
        default="all",
        help="Download tier level (default: all)"
    )
    parser.add_argument(
        "--corpus",
        choices=["augustine", "theophylact", "all"],
        default="all",
        help="Which corpus to download (default: all)"
    )

    args = parser.parse_args()

    downloader = CorpusDownloader(args.output_dir)

    corpora = (
        ["augustine", "theophylact"]
        if args.corpus == "all"
        else [args.corpus]
    )

    try:
        downloader.run(corpora, args.tier)
    except KeyboardInterrupt:
        print("\n\n⚠️  Download interrupted by user")
        downloader.print_summary()
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
