"""
Footprint analyzer for eCFR data, focusing on specific keyword patterns.
"""

import logging
import re
import time
from datetime import datetime
from collections import defaultdict, Counter

from ecfr_analyzer.process_data.base_analyzer import BaseECFRAnalyzer

# Configure logging
logger = logging.getLogger(__name__)

# Keyword sets for different types of footprint analysis
DEI_WORDS = {
    "diversity",
    "equity",
    "inclusion",
    "inclusive",
    "equality",
    "minority",
    "minorities",
    "underrepresented",
    "underserved",
    "disadvantaged",
    "gender equity",
    "marginalized",
    "multicultural",
    "race",
    "racial",
    "ethnic",
    "ethnicity",
    "discrimination",
    "harassment",
    "accessibility",
    "social justice",
    "environment",
    "sexual orientation",
    "gender identity",
}

BUREAUCRACY_WORDS = {
    "compliance",
    "procedure",
    "procedures",
    "process",
    "processes",
    "requirement",
    "requirements",
    "regulation",
    "regulations",
    "regulatory",
    "mandate",
    "mandates",
    "mandated",
    "approval",
    "approvals",
    "paperwork",
    "documentation",
    "report",
    "reporting",
    "deadline",
    "submit",
    "request",
    "certify",
    "filing",
    "authorization",
    "form",
}


class FootprintAnalyzer(BaseECFRAnalyzer):
    """Analyzer for keyword footprints in eCFR text by agency."""

    def __init__(self):
        """Initialize the footprint analyzer."""
        super().__init__()
        self.word_count_analyzer = None
        self.footprint_results = {}

    def _compile_regex_pattern(self, keywords):
        """Compile a regex pattern for efficient matching of keywords.

        Args:
            keywords: Set of keywords to match

        Returns:
            Compiled regex pattern
        """
        # Escape special regex characters and join with OR
        pattern = "|".join(re.escape(word) for word in keywords)
        # Case insensitive matching with word boundaries
        return re.compile(r"\b(" + pattern + r")\b", re.IGNORECASE)

    def _count_keyword_matches(self, text, pattern):
        """Count matches for each keyword in the text.

        Args:
            text: Text to search in
            pattern: Compiled regex pattern

        Returns:
            Counter with counts for each matched word
        """
        if not text:
            return Counter()

        # Find all matches
        matches = pattern.findall(text.lower())
        return Counter(matches)

    def _footprint_analysis_function(self, agency_slug, ref_text, ref_desc, pattern):
        """Analysis function for keyword footprint.

        Args:
            agency_slug: Agency slug
            ref_text: Extracted text for the reference
            ref_desc: Description of the reference
            pattern: Compiled regex pattern for keywords

        Returns:
            Dictionary with footprint information
        """
        if not ref_text:
            return None

        # Count keyword matches
        match_counter = self._count_keyword_matches(ref_text, pattern)
        total_matches = sum(match_counter.values())

        if total_matches == 0:
            return None

        # Get individual keyword matches
        keyword_matches = {word: count for word, count in match_counter.items()}

        logger.debug(
            f"Agency {agency_slug} has {total_matches} keyword matches for {ref_desc}"
        )

        return {
            "total_matches": total_matches,
            "keyword_matches": keyword_matches,
            "description": ref_desc,
        }

    def analyze_keyword_footprint(self, keywords, footprint_name):
        """Analyze footprint of specific keywords by agency."""
        # Compile regex pattern once for efficiency
        pattern = self._compile_regex_pattern(keywords)

        logger.info(f"Starting {footprint_name} footprint analysis...")
        start_time = time.time()

        # Process agency references with footprint analysis function
        agency_ref_matches = self._process_agency_references(
            lambda agency_slug, ref_text, ref_desc: self._footprint_analysis_function(
                agency_slug, ref_text, ref_desc, pattern
            )
        )

        # Calculate totals for each agency
        agency_totals = defaultdict(int)
        for agency_slug, ref_matches in agency_ref_matches.items():
            agency_totals[agency_slug] = sum(
                data["total_matches"] for data in ref_matches.values() if data
            )

        # Calculate the unique total (avoiding double-counting)
        title_totals = defaultdict(int)
        counted_refs = set()

        for agency_slug, ref_matches in agency_ref_matches.items():
            for ref_key, ref_data in ref_matches.items():
                if ref_data and ref_key not in counted_refs:
                    title_num = ref_key[0]  # Title is first element in the tuple
                    title_totals[title_num] += ref_data["total_matches"]
                    counted_refs.add(ref_key)

        # Prepare the agency data structure for the roll-up function
        agency_data = {
            agency_slug: {
                "total": agency_totals[agency_slug],
                "references": {
                    ref_key: ref_data
                    for ref_key, ref_data in ref_matches.items()
                    if ref_data  # Only include non-None data
                },
            }
            for agency_slug, ref_matches in agency_ref_matches.items()
        }

        # Roll up child agency data to parent agencies
        rolled_up_agency_data = self._roll_up_agency_totals(
            agency_data, metric_key="total", ref_data_key="total_matches"
        )

        # Prepare the final footprint data
        footprint_data = {
            "timestamp": datetime.now().isoformat(),
            "footprint_name": footprint_name,
            "keywords": list(keywords),
            "total_matches": sum(title_totals.values()),
            "title_totals": dict(title_totals),
            "agencies": rolled_up_agency_data,
        }

        total_time = time.time() - start_time
        logger.info(
            f"{footprint_name} footprint analysis took {total_time:.2f} seconds"
        )
        logger.info(
            f"Total {footprint_name} footprint: {footprint_data['total_matches']}"
        )

        # Save the results
        filename = f"{footprint_name.lower()}_footprint.json"
        self._save_analysis_results(
            footprint_data, filename, f"{footprint_name} footprint"
        )

        return footprint_data

    def analyze_dei_footprint(self):
        """Analyze DEI language by agency."""
        return self.analyze_keyword_footprint(DEI_WORDS, "dei")

    def analyze_bureaucracy_footprint(self):
        """Analyze bureaucratic language by agency."""
        return self.analyze_keyword_footprint(BUREAUCRACY_WORDS, "bureaucracy")
