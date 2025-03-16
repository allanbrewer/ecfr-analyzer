"""
Data analyzer for eCFR data, providing key insights such as word counts,
historical changes, DEI footprint, waste footprint, and bureaucracy metrics.
"""

import json
import os
import re
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Union
import glob

import nltk
import pandas as pd
from tqdm import tqdm

# Ensure NLTK data is downloaded - but we'll avoid using tokenizers directly
nltk.download("stopwords", quiet=True)

try:
    from nltk.corpus import stopwords

    STOPWORDS = set(stopwords.words("english"))
except:
    # Fallback stopwords if NLTK fails
    STOPWORDS = set(
        [
            "a",
            "an",
            "the",
            "and",
            "or",
            "but",
            "if",
            "in",
            "of",
            "on",
            "to",
            "for",
            "with",
        ]
    )

# Paths
from ecfr_analyzer.backend.ecfr_api import (
    RAW_DATA_DIR,
    ECFRApiClient,
    ADMIN_DATA_DIR,
    CORRECTION_DATA_DIR,
    STRUCT_DIR,
    TEXT_DIR,
    CACHE_DATA_DIR,
)

ANALYSIS_DIR = Path("data") / "analysis"
ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)

# Word sets for analysis
DEI_WORDS = {
    "equity",
    "diversity",
    "inclusion",
    "social justice",
    "equality",
    "discrimination",
    "marginalized",
    "underrepresented",
    "minority",
    "inclusive",
    "equitable",
    "diverse",
    "multicultural",
    "accessibility",
}

WASTE_WORDS = {
    "cost",
    "efficiency",
    "redundancy",
    "overlap",
    "duplication",
    "inefficient",
    "expensive",
    "burden",
    "bureaucracy",
    "overhead",
    "streamline",
    "consolidate",
    "wasteful",
    "unnecessary",
    "excessive",
}

BUREAUCRACY_WORDS = {
    "compliance",
    "procedure",
    "regulation",
    "requirement",
    "directive",
    "mandatory",
    "authorization",
    "approval",
    "form",
    "submit",
    "request",
    "certify",
    "document",
    "report",
    "filing",
    "paperwork",
    "deadline",
}

VAGUE_PHRASES = {
    "as appropriate",
    "as necessary",
    "as applicable",
    "as required",
    "reasonable",
    "may",
    "might",
    "could",
    "should",
    "approximately",
    "generally",
    "typically",
    "at the discretion of",
    "appropriate measures",
    "adequate",
    "satisfactory",
    "sufficient",
    "other relevant",
}


class ECFRDataAnalyzer:
    """Analyzer for eCFR data to extract key insights."""

    def __init__(self):
        """Initialize the analyzer."""
        self.corrections_dir = CORRECTION_DATA_DIR
        self.structure_dir = STRUCT_DIR
        self.text_dir = TEXT_DIR
        self.admin_dir = ADMIN_DATA_DIR
        self.analysis_results = {}
        self.api_client = ECFRApiClient()
        self.title_summary = self._load_title_summary()
        self.agencies_data = self._load_agencies_data()
        # Maps titles to agencies
        self.title_agency_map = self._build_title_agency_map()
        # Maps child agencies to parent agencies
        self.agency_hierarchy = self._build_agency_hierarchy()

    def _load_title_summary(self) -> Dict:
        """Load title summary data.

        Returns:
            Title summary data from the eCFR Admin API
        """
        title_summary_file = self.admin_dir / "title_summary.json"
        if not title_summary_file.exists():
            # If file doesn't exist, fetch it from the API
            title_summary_data = self.api_client.get_title_summary()
            with open(title_summary_file, "w") as f:
                json.dump(title_summary_data, f, indent=2)
            return title_summary_data

        with open(title_summary_file, "r") as f:
            return json.load(f)

    def _build_title_agency_map(self) -> Dict[int, List[str]]:
        """Build a mapping of title numbers to agency slugs.

        Returns:
            Dictionary mapping title numbers to lists of agency slugs
        """
        title_agency_map = defaultdict(list)

        # Process top-level agencies first
        for agency in self.agencies_data.get("agencies", []):
            agency_slug = agency.get("slug", "")

            # Add CFR references for the agency itself
            for cfr_ref in agency.get("cfr_references", []):
                title_num = cfr_ref.get("title")
                if title_num:
                    title_agency_map[title_num].append(agency_slug)

            # Process children
            for child in agency.get("children", []):
                child_slug = child.get("slug", "")

                # Add CFR references for each child
                for cfr_ref in child.get("cfr_references", []):
                    title_num = cfr_ref.get("title")
                    if title_num:
                        title_agency_map[title_num].append(child_slug)
                        # Also add the parent agency for this title
                        if (
                            agency_slug
                            and agency_slug not in title_agency_map[title_num]
                        ):
                            title_agency_map[title_num].append(agency_slug)

        return dict(title_agency_map)

    def _build_agency_hierarchy(self) -> Dict[str, str]:
        """Build a mapping of child agency slugs to parent agency slugs.

        Returns:
            Dictionary mapping child agency slugs to parent agency slugs
        """
        agency_hierarchy = {}

        for agency in self.agencies_data.get("agencies", []):
            parent_slug = agency.get("slug", "")

            for child in agency.get("children", []):
                child_slug = child.get("slug", "")
                if child_slug:
                    agency_hierarchy[child_slug] = parent_slug

        return agency_hierarchy

    def _get_agency_by_slug(self, slug: str) -> Dict:
        """Get agency data by slug.

        Args:
            slug: Agency slug

        Returns:
            Agency data or empty dict if not found
        """
        # Search for the agency in the top-level agencies
        for agency in self.agencies_data.get("agencies", []):
            if agency.get("slug") == slug:
                return agency

            # Check children if not found at top level
            for child in agency.get("children", []):
                if child.get("slug") == slug:
                    return child

        return {}

    def _load_agencies_data(self) -> Dict:
        """Load agency data from the eCFR Admin API.

        Returns:
            Agency data from the eCFR Admin API
        """
        agency_file = self.admin_dir / "agencies.json"
        if not agency_file.exists():
            # If file doesn't exist, fetch it from the API
            agencies_data = self.api_client.get_admin_agencies()
            with open(agency_file, "w") as f:
                json.dump(agencies_data, f, indent=2)
            return agencies_data

        with open(agency_file, "r") as f:
            return json.load(f)

    def _load_corrections_data(self) -> Dict[int, Dict]:
        """Load corrections data for all titles.

        Returns:
            Dictionary mapping title numbers to corrections data
        """
        corrections_data = {}
        for title in range(1, 51):
            corrections_file = self.corrections_dir / f"title_{title}_corrections.json"
            if not corrections_file.exists():
                # If file doesn't exist, fetch it from the API
                corrections_data[title] = self.api_client.get_title_corrections(title)
                with open(corrections_file, "w") as f:
                    json.dump(corrections_data[title], f, indent=2)
            else:
                with open(corrections_file, "r") as f:
                    corrections_data[title] = json.load(f)

        return corrections_data

    def _load_title_data(self, title_number: int, date: Optional[str] = None) -> bytes:
        """Load XML data for a specific title.

        Args:
            title_number: CFR title number
            date: Date in YYYY-MM-DD format (optional)

        Returns:
            Title XML data as bytes
        """
        # If date is not provided, use the latest issue date from title summary
        if not date:
            for title_info in self.title_summary.get("titles", []):
                if title_info.get("number") == title_number:
                    date = title_info.get("latest_issue_date")
                    break

        if not date:
            raise ValueError(f"No date found for title {title_number}")

        # Check if the file exists
        file_pattern = f"title_{title_number}_{date}_full_text.xml"
        file_path = list(self.text_dir.glob(file_pattern))

        if not file_path:
            # If file doesn't exist, fetch it from the API
            print(f"Downloading text data for title {title_number} on date {date}")
            xml_data = self.api_client.get_full_text(title_number, date)
            output_file = self.text_dir / file_pattern
            with open(output_file, "wb") as f:
                f.write(xml_data)
            return xml_data

        # Read the existing file
        with open(file_path[0], "rb") as f:
            return f.read()

    def _load_all_titles(self) -> Dict[int, bytes]:
        """Load XML data for all available titles.

        Returns:
            Dictionary mapping title numbers to title XML data
        """
        titles_data = {}

        # First check what titles we have data for in the title summary
        title_dates = {}
        for title_info in self.title_summary.get("titles", []):
            title_num = title_info.get("number")
            if title_num and not title_info.get("reserved", False):
                title_dates[title_num] = title_info.get("latest_issue_date")

        # Now load each title
        for title_num, date in tqdm(title_dates.items(), desc="Loading titles"):
            try:
                titles_data[title_num] = self._load_title_data(title_num, date)
            except Exception as e:
                print(f"Error loading title {title_num}: {e}")

        return titles_data

    def _extract_text_from_xml(self, xml_data: bytes) -> str:
        """Extract text content from XML data.

        Args:
            xml_data: XML data as bytes

        Returns:
            Extracted text content
        """
        try:
            # Parse the XML
            root = ET.fromstring(xml_data)

            # Extract all text elements recursively
            text_parts = []
            self._extract_text_from_element(root, text_parts)

            return " ".join(text_parts)
        except Exception as e:
            print(f"Error parsing XML: {e}")
            return ""

    def _extract_text_from_element(self, element: ET.Element, text_parts: List[str]):
        """Extract text recursively from an XML element.

        Args:
            element: XML element
            text_parts: List to append text to
        """
        # Extract text from this element if it has any
        if element.text and element.text.strip():
            text_parts.append(element.text.strip())

        # Process child elements
        for child in element:
            self._extract_text_from_element(child, text_parts)

        # Handle tail text
        if element.tail and element.tail.strip():
            text_parts.append(element.tail.strip())

    def _simple_tokenize(self, text: str) -> List[str]:
        """Simple tokenization function to avoid NLTK dependency issues.

        Args:
            text: Text to tokenize

        Returns:
            List of words
        """
        # Convert to lowercase
        text = text.lower()

        # Replace non-alphanumeric with spaces
        text = re.sub(r"[^a-z0-9\s]", " ", text)

        # Split on whitespace and filter empty strings
        return [word for word in text.split() if word]

    def analyze_word_count_by_agency(self):
        """Analyze word count per agency."""
        titles_data = self._load_all_titles()
        agency_word_counts = defaultdict(int)
        agency_title_texts = defaultdict(list)

        # First pass: extract text from each title and map to agencies
        for title_number, xml_data in tqdm(
            titles_data.items(), desc="Extracting text from titles"
        ):
            text = self._extract_text_from_xml(xml_data)

            # Map this title's text to all relevant agencies
            for agency_slug in self.title_agency_map.get(title_number, []):
                agency_title_texts[agency_slug].append(text)

        # Second pass: count words for each agency, including parent agencies' counts
        for agency_slug, texts in tqdm(
            agency_title_texts.items(), desc="Counting words by agency"
        ):
            # Combine all texts for this agency
            combined_text = " ".join(texts)

            # Count words - simple tokenization to avoid NLTK issues
            words = self._simple_tokenize(combined_text)
            word_count = len(words)

            # Add to this agency's count
            agency_word_counts[agency_slug] += word_count

            # Add to parent agency's count (for hierarchical totals)
            parent_slug = self.agency_hierarchy.get(agency_slug)
            if parent_slug:
                agency_word_counts[parent_slug] += word_count

        # Prepare results
        total_word_count = sum(agency_word_counts.values())

        results = {
            "timestamp": datetime.now().isoformat(),
            "total_word_count": total_word_count,
            "agencies": [
                {
                    "slug": slug,
                    "name": self._get_agency_by_slug(slug).get(
                        "name", "Unknown Agency"
                    ),
                    "word_count": count,
                    "percentage": (
                        (count / total_word_count * 100) if total_word_count > 0 else 0
                    ),
                }
                for slug, count in sorted(
                    agency_word_counts.items(), key=lambda x: x[1], reverse=True
                )
            ],
        }

        # Save results
        output_path = ANALYSIS_DIR / "word_count_by_agency.json"
        with open(output_path, "w") as f:
            json.dump(results, f, indent=2)

        self.analysis_results["word_count_by_agency"] = results
        return results

    def analyze_corrections(self, years_back: int = 5):
        """Analyze corrections over time per agency.

        Args:
            years_back: Number of years to analyze
        """
        # Load corrections data for all titles
        corrections_by_title = self._load_corrections_data()

        # Create structure for results
        current_year = datetime.now().year
        years = list(range(current_year - years_back, current_year + 1))

        # Initialize agency correction tracking
        agency_corrections = defaultdict(
            lambda: {
                "name": "",
                "total_corrections": 0,
                "corrections_by_year": {str(year): 0 for year in years},
            }
        )

        # Process corrections by title and map to agencies
        for title_num, corrections_data in corrections_by_title.items():
            # Get the agencies associated with this title
            agency_slugs = self.title_agency_map.get(title_num, [])

            # Process the corrections
            for correction in corrections_data.get("ecfr_corrections", []):
                correction_date = correction.get("effective_date", "")

                if correction_date:
                    try:
                        # Parse YYYY-MM-DD format
                        correction_year = int(correction_date.split("-")[0])

                        # Check if within our analysis period
                        if correction_year in years:
                            # Count this correction for each associated agency
                            for agency_slug in agency_slugs:
                                agency_data = self._get_agency_by_slug(agency_slug)
                                agency_name = agency_data.get("name", "Unknown Agency")

                                # Set agency name
                                agency_corrections[agency_slug]["name"] = agency_name

                                # Count the correction
                                agency_corrections[agency_slug][
                                    "total_corrections"
                                ] += 1
                                agency_corrections[agency_slug]["corrections_by_year"][
                                    str(correction_year)
                                ] += 1

                                # Add to parent agency's count too
                                parent_slug = self.agency_hierarchy.get(agency_slug)
                                if parent_slug:
                                    parent_agency = self._get_agency_by_slug(
                                        parent_slug
                                    )
                                    parent_name = parent_agency.get(
                                        "name", "Unknown Agency"
                                    )

                                    agency_corrections[parent_slug][
                                        "name"
                                    ] = parent_name
                                    agency_corrections[parent_slug][
                                        "total_corrections"
                                    ] += 1
                                    agency_corrections[parent_slug][
                                        "corrections_by_year"
                                    ][str(correction_year)] += 1
                    except (ValueError, IndexError):
                        # Skip corrections with invalid dates
                        continue

        # Prepare final results
        results = {
            "timestamp": datetime.now().isoformat(),
            "years_analyzed": years,
            "corrections_by_agency": {
                slug: data
                for slug, data in sorted(
                    agency_corrections.items(),
                    key=lambda x: x[1]["total_corrections"],
                    reverse=True,
                )
            },
        }

        # Save results
        output_path = ANALYSIS_DIR / "corrections_over_time.json"
        with open(output_path, "w") as f:
            json.dump(results, f, indent=2)

        self.analysis_results["corrections"] = results
        return results

    def analyze_keyword_footprint(self, keyword_set: Set[str], name: str):
        """Analyze footprint of specific keywords by agency.

        Args:
            keyword_set: Set of keywords to analyze
            name: Name for this analysis (e.g., "dei", "waste")
        """
        titles_data = self._load_all_titles()
        agency_keyword_counts = defaultdict(Counter)
        agency_total_words = defaultdict(int)

        # First pass: extract text and count words for each title
        title_texts = {}
        title_word_counts = {}

        for title_number, xml_data in tqdm(
            titles_data.items(), desc=f"Processing titles for {name} analysis"
        ):
            # Extract text
            text = self._extract_text_from_xml(xml_data)
            title_texts[title_number] = (
                text.lower()
            )  # Store lowercase for keyword matching

            # Count total words - simple tokenization to avoid NLTK issues
            words = self._simple_tokenize(text)
            title_word_counts[title_number] = len(words)

        # Second pass: map titles to agencies and aggregate counts
        for title_number, text_lower in tqdm(
            title_texts.items(), desc=f"Analyzing {name} footprint by agency"
        ):
            # Get agencies for this title
            agency_slugs = self.title_agency_map.get(title_number, [])

            # Skip if no agencies mapped
            if not agency_slugs:
                continue

            # Get word count for this title
            word_count = title_word_counts[title_number]

            # Count keywords in this title
            title_keyword_counts = Counter()
            for keyword in keyword_set:
                count = len(re.findall(r"\b" + re.escape(keyword) + r"\b", text_lower))
                if count > 0:
                    title_keyword_counts[keyword] = count

            # Attribute counts to each agency
            for agency_slug in agency_slugs:
                # Add total words
                agency_total_words[agency_slug] += word_count

                # Add keyword counts
                for keyword, count in title_keyword_counts.items():
                    agency_keyword_counts[agency_slug][keyword] += count

                # Attribute to parent agency as well
                parent_slug = self.agency_hierarchy.get(agency_slug)
                if parent_slug:
                    # Add total words
                    agency_total_words[parent_slug] += word_count

                    # Add keyword counts
                    for keyword, count in title_keyword_counts.items():
                        agency_keyword_counts[parent_slug][keyword] += count

        # Prepare results
        agencies = []
        for agency_slug, keyword_counts in agency_keyword_counts.items():
            agency_data = self._get_agency_by_slug(agency_slug)
            agency_name = agency_data.get("name", "Unknown Agency")

            total_count = sum(keyword_counts.values())
            agencies.append(
                {
                    "slug": agency_slug,
                    "name": agency_name,
                    "total_count": total_count,
                    "percentage": (
                        (total_count / agency_total_words[agency_slug]) * 100
                        if agency_total_words[agency_slug] > 0
                        else 0
                    ),
                    "keywords": [
                        {"keyword": kw, "count": count}
                        for kw, count in keyword_counts.most_common(10)
                    ],
                }
            )

        # Sort agencies by total count
        agencies.sort(key=lambda x: x["total_count"], reverse=True)

        results = {
            "timestamp": datetime.now().isoformat(),
            "name": name,
            "total_count": sum(
                sum(counts.values()) for counts in agency_keyword_counts.values()
            ),
            "agencies": agencies,
        }

        # Save results
        output_path = ANALYSIS_DIR / f"{name}_footprint.json"
        with open(output_path, "w") as f:
            json.dump(results, f, indent=2)

        self.analysis_results[f"{name}_footprint"] = results
        return results

    def analyze_vague_language(self):
        """Analyze vague language and bureaucratic complexity by agency."""
        # Reuse the keyword footprint analysis but with vague phrases
        return self.analyze_keyword_footprint(VAGUE_PHRASES, "vague_language")

    def analyze_bureaucracy_footprint(self):
        """Analyze bureaucratic language by agency."""
        return self.analyze_keyword_footprint(BUREAUCRACY_WORDS, "bureaucracy")

    def analyze_dei_footprint(self):
        """Analyze DEI language by agency."""
        return self.analyze_keyword_footprint(DEI_WORDS, "dei")

    def analyze_waste_footprint(self):
        """Analyze waste-related language by agency."""
        return self.analyze_keyword_footprint(WASTE_WORDS, "waste")

    def run_all_analyses(self):
        """Run all analyses and compile results."""
        print("Starting analysis of eCFR data...")

        # Ensure we have title summary data
        if not self.title_summary.get("titles"):
            print("No title summary data found. Downloading...")
            self.title_summary = self._load_title_summary()

        # Basic analyses
        print("Analyzing word count by agency...")
        self.analyze_word_count_by_agency()

        print("Analyzing corrections over time...")
        self.analyze_corrections()

        # Keyword analyses
        print("Analyzing DEI footprint...")
        self.analyze_dei_footprint()

        print("Analyzing waste footprint...")
        self.analyze_waste_footprint()

        print("Analyzing bureaucracy footprint...")
        self.analyze_bureaucracy_footprint()

        print("Analyzing vague language...")
        self.analyze_vague_language()

        # Compile all results
        summary = {
            "timestamp": datetime.now().isoformat(),
            "analyses_performed": list(self.analysis_results.keys()),
            "result_paths": {
                key: str(ANALYSIS_DIR / f"{key}.json")
                for key in self.analysis_results.keys()
            },
        }

        # Save summary
        with open(ANALYSIS_DIR / "analysis_summary.json", "w") as f:
            json.dump(summary, f, indent=2)

        print(f"Analysis complete. Results saved to {ANALYSIS_DIR}")
        return summary


if __name__ == "__main__":
    analyzer = ECFRDataAnalyzer()
    analyzer.run_all_analyses()
