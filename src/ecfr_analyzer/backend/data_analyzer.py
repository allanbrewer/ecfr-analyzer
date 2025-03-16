"""
Data analyzer for eCFR data, providing key insights such as word counts,
historical changes, DEI footprint, waste footprint, and bureaucracy metrics.
"""

import logging
import json
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set
from bs4 import BeautifulSoup
import time

import nltk
from tqdm import tqdm

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Paths
from ecfr_analyzer.backend.ecfr_api import ECFRApiClient

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

    def __init__(self, data_dir=None):
        """Initialize the analyzer.

        Args:
            data_dir: Optional path to data directory
        """
        self.data_dir = Path(data_dir) if data_dir else Path("data")
        self.raw_dir = self.data_dir / "raw"
        self.admin_dir = self.data_dir / "admin"
        self.analysis_dir = self.data_dir / "analysis"

        # Directory where text XML files are stored
        self.text_dir = self.raw_dir / "text"

        # Create directories if they don't exist
        self.text_dir.mkdir(parents=True, exist_ok=True)
        self.analysis_dir.mkdir(parents=True, exist_ok=True)

        # Initialize NLTK resources and stopwords
        try:
            nltk.download("stopwords", quiet=True)
            nltk.download("punkt", quiet=True)
            self.stopwords = set(nltk.corpus.stopwords.words("english"))
            logger.info("NLTK stopwords loaded successfully")
        except Exception as e:
            logger.warning(f"Failed to load NLTK resources: {e}")
            # Fall back to a minimal set of stopwords if NLTK fails
            self.stopwords = {
                "the",
                "a",
                "an",
                "and",
                "or",
                "but",
                "is",
                "are",
                "was",
                "were",
                "in",
                "on",
                "at",
                "to",
                "for",
                "with",
                "by",
                "of",
            }

        # Load API client for data access
        self.api_client = ECFRApiClient()
        self.title_summary = self._load_title_summary()
        self.agencies_data = self._load_agencies_data()
        # Maps titles to agencies
        self.title_agency_map = self._build_title_agency_map()
        # Maps child agencies to parent agencies
        self.agency_hierarchy = self._build_agency_hierarchy()
        self.agency_hierarchy_map = self._generate_agency_hierarchy_map()

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

    def _build_title_agency_map(self) -> Dict[str, List[str]]:
        """Build a mapping from title number to agency slugs.

        Returns:
            Dictionary mapping title numbers to list of agency slugs
        """
        title_agency_map = defaultdict(list)

        # Process top-level agencies first
        for agency in self.agencies_data.get("agencies", []):
            agency_slug = agency.get("slug", "")

            # Add CFR references for the agency itself
            for cfr_ref in agency.get("cfr_references", []):
                title_num = cfr_ref.get("title")
                if title_num:
                    # Store title number as string for consistent lookup
                    title_agency_map[str(title_num)].append(agency_slug)

            # Process children
            for child in agency.get("children", []):
                child_slug = child.get("slug", "")

                # Add CFR references for each child
                for cfr_ref in child.get("cfr_references", []):
                    title_num = cfr_ref.get("title")
                    if title_num:
                        # Store as string
                        title_agency_map[str(title_num)].append(child_slug)
                        # Also add the parent agency for this title
                        if (
                            agency_slug
                            and agency_slug not in title_agency_map[str(title_num)]
                        ):
                            title_agency_map[str(title_num)].append(agency_slug)

        # Debug information about the mapping
        logger.info(
            f"Built title-agency map with {len(title_agency_map) + 1} title entries"
        )
        for title, agencies in sorted(title_agency_map.items()):
            logger.info(f"Title {title} -> {len(agencies)} agencies")

        # Save the title-agency map
        output_file = self.admin_dir / "title_agency_map.json"
        with open(output_file, "w") as f:
            json.dump(dict(title_agency_map), f, indent=2)

        return dict(title_agency_map)

    def _generate_agency_hierarchy_map(self):
        """Generate and save a simplified hierarchical structure of agencies.

        This creates a clean representation of the agency hierarchy that can be used
        for UI visualization and navigation.

        Returns:
            Dictionary with the hierarchical agency structure
        """
        # Initialize the structure
        hierarchy = {"timestamp": datetime.now().isoformat(), "agencies": []}

        # Process top-level agencies
        for agency in self.agencies_data.get("agencies", []):
            # Create top-level agency entry
            agency_entry = {
                "slug": agency.get("slug", ""),
                "name": agency.get("name", ""),
                "children": [],
            }

            # Process children
            for child in agency.get("children", []):
                child_entry = {
                    "slug": child.get("slug", ""),
                    "name": child.get("name", ""),
                }

                # Add grandchildren if they exist
                grandchildren = child.get("children", [])
                if grandchildren:
                    child_entry["children"] = [
                        {
                            "slug": grandchild.get("slug", ""),
                            "name": grandchild.get("name", ""),
                        }
                        for grandchild in grandchildren
                    ]

                agency_entry["children"].append(child_entry)

            # Add to main structure
            hierarchy["agencies"].append(agency_entry)

        # Save to file
        output_path = ANALYSIS_DIR / "agency_hierarchy_map.json"
        with open(output_path, "w") as f:
            json.dump(hierarchy, f, indent=2)

        logger.info(f"Agency hierarchy saved to {output_path}")
        return hierarchy

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

        # Save the agency hierarchy
        output_file = self.admin_dir / "agency_hierarchy.json"
        with open(output_file, "w") as f:
            json.dump(agency_hierarchy, f, indent=2)

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
            logger.info(
                f"Downloading text data for title {title_number} on date {date}"
            )
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
                logger.info(f"Error loading title {title_num}: {e}")

        return titles_data

    def _extract_text_from_xml(self, xml_data: bytes) -> str:
        """Extract text from XML data, focusing only on content within DIV elements.

        Args:
            xml_data: The XML data to extract text from

        Returns:
            The extracted text as a string
        """
        if not xml_data:
            return ""

        start_time = time.time()
        try:
            # Use BeautifulSoup for faster and more targeted parsing
            soup = BeautifulSoup(xml_data, "lxml-xml")

            # Find all DIV elements (DIV1, DIV2, DIV3, etc.)
            div_elements = soup.find_all(
                lambda tag: tag.name
                and tag.name.startswith("DIV")
                and tag.name[3:].isdigit()
            )
            parse_time = time.time() - start_time
            logger.info(
                f"Parsing XML took {parse_time:.2f} seconds, found {len(div_elements)} DIV elements"
            )

            # Extract text only from the DIV elements (skipping metadata, headers, etc.)
            text_parts = []
            for div in div_elements:
                # Get all text within this DIV
                text = div.get_text(separator=" ", strip=True)
                if text:
                    text_parts.append(text)

            combined_text = " ".join(text_parts)
            total_time = time.time() - start_time
            logger.info(
                f"Extracted {len(combined_text)} characters of content text in {total_time:.2f} seconds"
            )
            return combined_text
        except Exception as e:
            logger.error(f"Error parsing XML: {e}")
            return ""

    def _fast_tokenize(self, text):
        """Fast tokenization method that's much quicker than NLTK.

        Args:
            text: Text to tokenize

        Returns:
            List of tokens (words)
        """
        start_time = time.time()
        # Remove punctuation and convert to lowercase
        text = re.sub(r"[^\w\s]", " ", text.lower())

        # Split on whitespace and filter out empty strings and stopwords
        tokens = [word for word in text.split() if word and word not in self.stopwords]

        tokenize_time = time.time() - start_time
        logger.info(
            f"Tokenization took {tokenize_time:.2f} seconds, found {len(tokens)} tokens"
        )
        return tokens

    def _extract_text_for_reference(self, xml_data, ref):
        """Extract text for a specific CFR reference from the XML data.

        This parses the XML and finds the exact section specified by the reference,
        navigating through the CFR hierarchy:
        Title (DIV1) -> Subtitle (DIV2) -> Chapter (DIV3) ->
        Subchapter (DIV4) -> Part (DIV5) -> Subpart (DIV6) ->
        Subject Group (DIV7) -> Section (DIV8)

        Note: The XML structure may not strictly follow sequential nesting. For example,
        a DIV8 element might be directly nested under a DIV3 without DIV4-DIV7 in between.

        Args:
            xml_data: XML data for the title
            ref: CFR reference dictionary with title, subtitle, chapter, etc.

        Returns:
            Tuple of (extracted text, reference description)
        """
        if not xml_data:
            return "", "No XML data"

        try:
            # Use BeautifulSoup for parsing
            soup = BeautifulSoup(xml_data, "lxml-xml")

            # Start by finding the title (DIV1)
            title_num = ref.get("title")
            div1_elements = soup.find_all("DIV1")

            # Track the hierarchy levels we found for logging
            found_levels = ["title"]
            description = f"Title {title_num}"

            # Start with all DIV1 elements (we'll filter further as needed)
            target_elements = div1_elements

            # Track the furthest level we've successfully matched
            last_matched_level = "title"

            # Helper function to search for elements at any level
            def find_matching_elements(
                parent_elements, div_tag, ref_key, level_name, level_desc
            ):
                nonlocal found_levels, description, last_matched_level
                ref_value = ref.get(ref_key)
                if not ref_value:
                    return None  # No reference at this level

                matched_elements = []
                # Search in all parent elements
                for parent in parent_elements:
                    # Find all elements of this type within the parent,
                    # including those that might be nested several levels deep
                    divs = parent.find_all(div_tag, recursive=True)
                    for div in divs:
                        n = div.get("N")
                        if n and ref_value.lower() in n.lower():
                            matched_elements.append(div)

                if matched_elements:
                    found_levels.append(level_name)
                    description += f", {level_desc} {ref_value}"
                    last_matched_level = level_name
                    return matched_elements
                return None

            # Check for subtitle (DIV2)
            div2_elements = find_matching_elements(
                target_elements, "DIV2", "subtitle", "subtitle", "Subtitle"
            )
            if div2_elements:
                target_elements = div2_elements

            # Check for chapter (DIV3)
            div3_elements = find_matching_elements(
                target_elements, "DIV3", "chapter", "chapter", "Chapter"
            )
            if div3_elements:
                target_elements = div3_elements

            # Check for subchapter (DIV4)
            div4_elements = find_matching_elements(
                target_elements, "DIV4", "subchapter", "subchapter", "Subchapter"
            )
            if div4_elements:
                target_elements = div4_elements

            # Check for part (DIV5)
            div5_elements = find_matching_elements(
                target_elements, "DIV5", "part", "part", "Part"
            )
            if div5_elements:
                target_elements = div5_elements

            # Check for subpart (DIV6)
            div6_elements = find_matching_elements(
                target_elements, "DIV6", "subpart", "subpart", "Subpart"
            )
            if div6_elements:
                target_elements = div6_elements

            # Check for subject group (DIV7)
            div7_elements = find_matching_elements(
                target_elements, "DIV7", "subjgrp", "subjgrp", "Subject Group"
            )
            if div7_elements:
                target_elements = div7_elements

            # Check for section (DIV8)
            div8_elements = find_matching_elements(
                target_elements, "DIV8", "section", "section", "Section"
            )
            if div8_elements:
                target_elements = div8_elements

            # Extract text from the target elements
            text_parts = []
            for element in target_elements:
                # Get all text within this element
                text = element.get_text(separator=" ", strip=True)
                if text:
                    text_parts.append(text)

            combined_text = " ".join(text_parts)
            logger.info(
                f"Extracted text for {description} ({len(combined_text)} chars, found levels: {', '.join(found_levels)}, deepest match: {last_matched_level})"
            )

            return combined_text, description

        except Exception as e:
            logger.error(f"Error extracting text for reference {ref}: {e}")
            return "", f"Error: {str(e)}"

    def _create_ref_key(self, ref):
        """Create a unique key for a CFR reference.

        Args:
            ref: CFR reference dictionary

        Returns:
            Tuple that uniquely identifies this reference up to the part level
        """
        return (
            ref.get("title", ""),
            ref.get("subtitle", ""),
            ref.get("chapter", ""),
            ref.get("subchapter", ""),
            ref.get("part", ""),
        )

    def _tokenize_text(self, text):
        """Tokenize text into words using NLTK for accuracy.

        Args:
            text: Text to tokenize

        Returns:
            List of words
        """
        # Use NLTK for more accurate tokenization since we're processing smaller chunks now
        try:
            # Tokenize and filter
            tokens = nltk.word_tokenize(text.lower())
            # Keep only alphabetic tokens and remove stopwords
            filtered_tokens = [
                token
                for token in tokens
                if token.isalpha() and token not in self.stopwords
            ]
            return filtered_tokens
        except Exception as e:
            logger.warning(
                f"NLTK tokenization failed: {e}, falling back to simple tokenization"
            )
            # Fall back to simpler tokenization
            text = re.sub(r"[^\w\s]", " ", text.lower())
            return [
                word for word in text.split() if word and word not in self.stopwords
            ]

    def analyze_word_count_by_agency(self):
        """Analyze word count for each agency based on their specific CFR references.

        Calculates word counts for each agency, tracking specific references to
        titles, chapters, parts, etc., and organizing by agency hierarchy.

        Returns:
            Dictionary with word count data by agency
        """
        start_time = time.time()

        # Step 1: Get all agency references
        agency_refs = self._get_agency_cfr_references()
        logger.info(
            f"Found {sum(len(refs) for refs in agency_refs.values())} total CFR references across {len(agency_refs)} agencies"
        )

        # Step 2: Create inverse mapping from titles to agencies that reference them
        title_to_agencies = defaultdict(list)
        for agency_slug, refs in agency_refs.items():
            for ref in refs:
                title_num = ref.get("title")
                if title_num:
                    # Store the complete reference along with the agency
                    title_to_agencies[title_num].append((agency_slug, ref))

        logger.info(
            f"Created inverse mapping from {len(title_to_agencies)} titles to agencies"
        )

        # Step 3: Initialize data structures
        agency_ref_counts = defaultdict(
            dict
        )  # Word counts per reference key per agency
        ref_texts = {}  # Cache for reference texts
        agency_hierarchy = (
            self._build_agency_hierarchy()
        )  # Map child agencies to parents
        processed_title_agency_pairs = (
            set()
        )  # Track processed pairs to avoid duplicates
        top_level_agencies = set()  # Track top-level agencies

        # Find all top-level agencies
        for agency in self.agencies_data.get("agencies", []):
            top_level_agencies.add(agency.get("slug", ""))

        # Step 4: Process one title at a time
        titles_to_process = sorted(title_to_agencies.keys())
        for title_num in tqdm(titles_to_process, desc="Processing titles"):
            logger.info(f"\n--- Processing Title {title_num} ---")
            title_start_time = time.time()

            # 4.1: Load this title's data
            xml_data = self._load_title_data(title_num)
            if not xml_data:
                logger.warning(f"No data found for title {title_num}, skipping")
                continue

            load_time = time.time() - title_start_time
            logger.info(f"Loading title {title_num} took {load_time:.2f} seconds")

            # Track references we've processed for this title to avoid duplicate work
            processed_refs_for_title = set()

            # 4.2: Process each agency referencing this title
            for agency_slug, ref in title_to_agencies[title_num]:
                # Create a unique key for this reference
                ref_key = self._create_ref_key(ref)

                # Skip if we've already processed this exact reference for this agency
                agency_ref_pair = (agency_slug, ref_key)
                if agency_ref_pair in processed_title_agency_pairs:
                    continue

                processed_title_agency_pairs.add(agency_ref_pair)

                # Skip if we've already processed this reference for this title (reuse the cached result)
                if ref_key in processed_refs_for_title:
                    # If we've already processed this reference, copy the count from the cache
                    if ref_key in ref_texts:
                        word_count = len(self._tokenize_text(ref_texts[ref_key][0]))
                        agency_ref_counts[agency_slug][ref_key] = {
                            "count": word_count,
                            "description": ref_texts[ref_key][1],
                        }
                    continue

                # Extract text for this specific reference
                if ref_key not in ref_texts:
                    ref_text, ref_desc = self._extract_text_for_reference(xml_data, ref)
                    ref_texts[ref_key] = (ref_text, ref_desc)
                    processed_refs_for_title.add(ref_key)
                else:
                    ref_text, ref_desc = ref_texts[ref_key]

                # Count words if we have text
                if ref_text:
                    tokens = self._tokenize_text(ref_text)
                    word_count = len(tokens)

                    # Store the count for this agency and reference
                    agency_ref_counts[agency_slug][ref_key] = {
                        "count": word_count,
                        "description": ref_desc,
                    }

                    logger.debug(
                        f"Agency {agency_slug} has {word_count} words for {ref_desc}"
                    )

            # Free up memory
            del xml_data

            title_process_time = time.time() - title_start_time
            logger.info(
                f"Completed processing title {title_num} in {title_process_time:.2f} seconds"
            )

        # Step 5: Calculate totals for each agency, avoiding double-counting
        agency_totals = defaultdict(int)

        for agency_slug, ref_counts in agency_ref_counts.items():
            # Sum up all reference counts for this agency
            agency_totals[agency_slug] = sum(
                data["count"] for data in ref_counts.values()
            )

        # Step 6: Prepare the final results
        word_count_data = {
            "timestamp": datetime.now().isoformat(),
            "total_word_count": sum(agency_totals[slug] for slug in top_level_agencies),
            "counts_by_agency": dict(agency_totals),
            "detailed_counts_by_agency": {
                slug: {
                    "total": agency_totals[slug],
                    "references": {
                        f"{desc}": count
                        for ref_key, data in counts.items()
                        for desc, count in [(data["description"], data["count"])]
                    },
                }
                for slug, counts in agency_ref_counts.items()
            },
        }

        total_time = time.time() - start_time
        logger.info(f"Total word count analysis took {total_time:.2f} seconds")
        logger.info(
            f"Total word count across all top-level agencies: {word_count_data['total_word_count']}"
        )

        # Step 7: Save the results
        output_file = self.analysis_dir / "word_count_by_agency.json"
        with open(output_file, "w") as f:
            json.dump(word_count_data, f, indent=2)

        return word_count_data

    def _get_agency_cfr_references(self) -> Dict[str, List[Dict]]:
        """Extract all CFR references for each agency.

        Returns:
            Dictionary mapping agency slugs to their CFR references
        """
        agency_refs = defaultdict(list)

        # Log the agency structure to debug
        logger.info(
            f"Total number of agencies: {len(self.agencies_data.get('agencies', []))}"
        )

        # Process top-level agencies
        for agency in self.agencies_data.get("agencies", []):
            agency_slug = agency.get("slug", "")
            logger.info(f"Processing agency: {agency_slug} - {agency.get('name', '')}")

            # Add agency's own references
            for ref in agency.get("cfr_references", []):
                if ref.get("title"):
                    agency_refs[agency_slug].append(ref)

            # Process children
            for child in agency.get("children", []):
                child_slug = child.get("slug", "")
                logger.info(
                    f"Processing child agency: {child_slug} - {child.get('name', '')}"
                )

                # Add child's references
                for ref in child.get("cfr_references", []):
                    if ref.get("title"):
                        agency_refs[child_slug].append(ref)

                # Process grandchildren (if any)
                for grandchild in child.get("children", []):
                    grandchild_slug = grandchild.get("slug", "")
                    for ref in grandchild.get("cfr_references", []):
                        if ref.get("title"):
                            agency_refs[grandchild_slug].append(ref)

        # Count total references found
        total_refs = sum(len(refs) for refs in agency_refs.values())
        logger.info(
            f"Found {total_refs} CFR references across {len(agency_refs)} agencies"
        )

        return agency_refs

    def analyze_corrections(self, years_back: int = 20, debug: bool = True):
        """Analyze corrections over time per agency.

        Args:
            years_back: Number of years to look back
            debug: Whether to print debug information
        """
        # Load corrections data for all titles
        corrections_by_title = self._load_corrections_data()
        if debug:
            logger.info(
                f"Loaded corrections data for {len(corrections_by_title)} titles"
            )

            # Debug: Check which titles we have corrections for
            titles_with_corrections = list(corrections_by_title.keys())
            logger.info(f"Titles with corrections: {titles_with_corrections[:10]}...")

            # Check if titles are strings or integers
            title_types = {
                title: type(title).__name__ for title in titles_with_corrections[:5]
            }
            logger.info(f"Title types: {title_types}")

        # Create structure for results
        current_year = datetime.now().year
        years = list(range(current_year - years_back, current_year + 1))

        # Initialize agency correction tracking
        agency_corrections = defaultdict(
            lambda: {
                "name": "",  # Initialize with empty name
                "total_corrections": 0,
                "corrections_by_year": {str(year): 0 for year in years},
            }
        )

        # Process corrections by title and map to agencies
        total_corrections_processed = 0
        corrections_mapped_to_agencies = 0

        for title_num, corrections_data in corrections_by_title.items():
            # Convert title_num to string for consistent lookup
            title_num_str = str(title_num)

            # Get the agencies associated with this title
            agency_slugs = self.title_agency_map.get(title_num_str, [])
            if not agency_slugs and debug:
                logger.info(f"WARNING: No agencies found for title {title_num_str}")
                continue

            if debug:
                # Debug info for this title
                logger.info(
                    f"Processing title {title_num_str} with {len(corrections_data.get('ecfr_corrections', []))} corrections"
                )
                logger.info(f"  Mapped to agencies: {agency_slugs}")

            # Process the corrections
            for correction in corrections_data.get("ecfr_corrections", []):
                total_corrections_processed += 1
                correction_date = correction.get("error_corrected", "")

                if correction_date:
                    try:
                        # Parse YYYY-MM-DD format
                        correction_year = int(correction_date.split("-")[0])

                        # Check if within our analysis period
                        if correction_year in years:
                            # Count this correction for each associated agency
                            for agency_slug in agency_slugs:
                                corrections_mapped_to_agencies += 1
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
                    except (ValueError, IndexError) as e:
                        if debug:
                            logger.info(
                                f"Error processing correction date '{correction_date}': {e}"
                            )
                        # Skip corrections with invalid dates
                        continue

        if debug:
            logger.info(f"Processed {total_corrections_processed} total corrections")
            logger.info(
                f"Mapped {corrections_mapped_to_agencies} corrections to agencies"
            )
            logger.info(f"Found {len(agency_corrections)} agencies with corrections")

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
            words = self._fast_tokenize(text)
            title_word_counts[title_number] = len(words)

        # Second pass: map titles to agencies and aggregate counts
        for title_number, text_lower in tqdm(
            title_texts.items(), desc=f"Analyzing {name} footprint by agency"
        ):
            # Get agencies for this title
            agency_slugs = self.title_agency_map.get(str(title_number), [])

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
        logger.info("Starting analysis of eCFR data...")

        # Ensure we have title summary data
        if not self.title_summary.get("titles"):
            logger.info("No title summary data found. Downloading...")
            self.title_summary = self._load_title_summary()

        # Basic analyses
        logger.info("Analyzing word count by agency...")
        self.analyze_word_count_by_agency()

        logger.info("Analyzing corrections over time...")
        self.analyze_corrections()

        # Keyword analyses
        logger.info("Analyzing DEI footprint...")
        self.analyze_dei_footprint()

        logger.info("Analyzing waste footprint...")
        self.analyze_waste_footprint()

        logger.info("Analyzing bureaucracy footprint...")
        self.analyze_bureaucracy_footprint()

        logger.info("Analyzing vague language...")
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

        logger.info(f"Analysis complete. Results saved to {ANALYSIS_DIR}")
        return summary


if __name__ == "__main__":
    # Setup root logger
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    logger.info("Starting word count analysis...")

    # Run the analysis
    analyzer = ECFRDataAnalyzer()
    result = analyzer.analyze_word_count_by_agency()
    logger.info(
        f"Analysis complete. Found {result['total_word_count']} words across agencies."
    )
