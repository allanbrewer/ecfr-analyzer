"""
Command-line interface for the eCFR Analyzer.
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

from ecfr_analyzer.backend.ecfr_api import (
    ECFRApiClient,
    download_all_current_titles,
    download_historical_data,
)
from ecfr_analyzer.backend.data_analyzer import ECFRDataAnalyzer
from ecfr_analyzer.website.generator import WebsiteGenerator


def download_data(args=None):
    """Command-line interface for downloading eCFR data."""
    parser = argparse.ArgumentParser(description="Download eCFR data")
    parser.add_argument(
        "--all-titles", action="store_true", help="Download all current CFR titles"
    )
    parser.add_argument(
        "--historical",
        type=int,
        default=0,
        help="Download historical data for specified number of years",
    )
    parser.add_argument("--title", type=int, help="Download a specific title")
    parser.add_argument(
        "--part", type=str, help="Download a specific part (requires --title)"
    )
    parser.add_argument(
        "--date", type=str, help="Download data for specific date (YYYY-MM-DD)"
    )

    if args is None:
        args = parser.parse_args()
    else:
        args = parser.parse_args(args)

    client = ECFRApiClient()

    if args.all_titles:
        print("Downloading all current CFR titles...")
        download_all_current_titles()

    if args.historical > 0:
        print(f"Downloading historical data for the past {args.historical} years...")
        download_historical_data(args.historical)

    if args.title:
        print(f"Downloading title {args.title}...")
        params = {}
        if args.date:
            params["date"] = args.date

        if args.part:
            print(f"Downloading part {args.part}...")
            data = client.get_full_text(args.title, args.part, args.date)
        else:
            data = client.get_full_text(args.title, date=args.date)

        # Save data
        output_dir = Path("data") / "processed"
        output_dir.mkdir(parents=True, exist_ok=True)

        output_file = output_dir / f"title_{args.title}.json"
        if args.part:
            output_file = output_dir / f"title_{args.title}_part_{args.part}.json"

        with open(output_file, "w") as f:
            json.dump(data, f, indent=2)

        print(f"Data saved to {output_file}")

    if not (args.all_titles or args.historical > 0 or args.title):
        parser.print_help()

    return 0


def analyze_data(args=None):
    """Command-line interface for analyzing eCFR data."""
    parser = argparse.ArgumentParser(description="Analyze eCFR data")
    parser.add_argument("--all", action="store_true", help="Run all analyses")
    parser.add_argument(
        "--word-count", action="store_true", help="Analyze word count by agency"
    )
    parser.add_argument(
        "--historical", action="store_true", help="Analyze historical changes"
    )
    parser.add_argument(
        "--corrections", action="store_true", help="Analyze corrections over time"
    )
    parser.add_argument("--dei", action="store_true", help="Analyze DEI footprint")
    parser.add_argument("--waste", action="store_true", help="Analyze waste footprint")
    parser.add_argument(
        "--bureaucracy", action="store_true", help="Analyze bureaucracy footprint"
    )
    parser.add_argument("--vague", action="store_true", help="Analyze vague language")
    parser.add_argument(
        "--years", type=int, default=5, help="Number of years for historical analyses"
    )

    if args is None:
        args = parser.parse_args()
    else:
        args = parser.parse_args(args)

    analyzer = ECFRDataAnalyzer()

    if args.all:
        print("Running all analyses...")
        analyzer.run_all_analyses()
        return 0

    # Run individual analyses as requested
    if args.word_count:
        print("Analyzing word count by agency...")
        analyzer.analyze_word_count_by_agency()

    if args.historical:
        print("Analyzing historical changes...")
        analyzer.analyze_historical_changes(args.years)

    if args.corrections:
        print("Analyzing corrections over time...")
        analyzer.analyze_corrections(args.years)

    if args.dei:
        print("Analyzing DEI footprint...")
        from ecfr_analyzer.backend.data_analyzer import DEI_WORDS

        analyzer.analyze_keyword_footprint(DEI_WORDS, "dei")

    if args.waste:
        print("Analyzing waste footprint...")
        from ecfr_analyzer.backend.data_analyzer import WASTE_WORDS

        analyzer.analyze_keyword_footprint(WASTE_WORDS, "waste")

    if args.bureaucracy:
        print("Analyzing bureaucracy footprint...")
        from ecfr_analyzer.backend.data_analyzer import BUREAUCRACY_WORDS

        analyzer.analyze_keyword_footprint(BUREAUCRACY_WORDS, "bureaucracy")

    if args.vague:
        print("Analyzing vague language...")
        analyzer.analyze_vague_language()

    if not any(
        [
            args.all,
            args.word_count,
            args.historical,
            args.corrections,
            args.dei,
            args.waste,
            args.bureaucracy,
            args.vague,
        ]
    ):
        parser.print_help()

    return 0


def generate_site(args=None):
    """Command-line interface for generating the website."""
    parser = argparse.ArgumentParser(description="Generate website for eCFR analysis")
    parser.add_argument(
        "--output-dir",
        type=str,
        default="docs",
        help="Output directory for the generated website",
    )
    parser.add_argument(
        "--title",
        type=str,
        default="eCFR Analyzer - Department of Government Efficiency",
        help="Website title",
    )
    parser.add_argument(
        "--static-data",
        action="store_true",
        help="Generate website with static data (no APIs)",
    )
    parser.add_argument(
        "--generate-samples",
        action="store_true",
        help="Generate sample data if no real data exists",
    )

    if args is None:
        args = parser.parse_args()
    else:
        args = parser.parse_args(args)

    generator = WebsiteGenerator(
        output_dir=args.output_dir, title=args.title, static_data=args.static_data
    )

    if args.generate_samples and not Path("data/analysis").exists():
        print("Generating sample data...")
        analyzer = ECFRDataAnalyzer()
        analyzer.run_all_analyses()

    print(f"Generating website in {args.output_dir}...")
    generator.generate()

    return 0


if __name__ == "__main__":
    sys.exit(download_data())
