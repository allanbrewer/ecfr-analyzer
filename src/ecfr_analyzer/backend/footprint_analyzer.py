"""
Footprint analyzer for eCFR data, focusing on specific keyword patterns.
"""

import json
import logging
import re
import time
from datetime import datetime
from typing import Dict, List, Set, Tuple, Any
from collections import defaultdict, Counter

from ecfr_analyzer.backend.base_analyzer import BaseECFRAnalyzer
from ecfr_analyzer.backend.word_count_analyzer import WordCountAnalyzer

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

    def _footprint_analysis_function(
        self, agency_slug, ref_key, ref_text, ref_desc, pattern
    ):
        """Analysis function for keyword footprint.

        Args:
            agency_slug: Agency slug
            ref_key: Reference key
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
        """Analyze footprint of specific keywords by agency.

        Args:
            keywords: Set of keywords to search for
            footprint_name: Name of the footprint for logging and output

        Returns:
            Dictionary with footprint data by agency
        """
        start_time = time.time()
        logger.info(f"Starting {footprint_name} footprint analysis...")

        # Compile regex pattern once for efficiency
        pattern = self._compile_regex_pattern(keywords)

        # Create a function that includes our pattern
        def analysis_function(agency_slug, ref_key, ref_text, ref_desc):
            return self._footprint_analysis_function(
                agency_slug, ref_key, ref_text, ref_desc, pattern
            )

        # Process agency references with footprint analysis
        agency_ref_footprints = self._process_agency_references(analysis_function)

        # Get word count data for relative calculations
        if not hasattr(self, "word_count_data") or not self.word_count_data:
            # Initialize word count analyzer if needed
            if not self.word_count_analyzer:
                self.word_count_analyzer = WordCountAnalyzer()
                self.word_count_data = (
                    self.word_count_analyzer.analyze_word_count_by_agency()
                )
            else:
                self.word_count_data = self.word_count_analyzer.word_count_data

        # Calculate totals and relative values for each agency
        agency_totals = defaultdict(int)
        agency_relative = {}

        for agency_slug, ref_footprints in agency_ref_footprints.items():
            # Sum up all matches for this agency
            total_matches = sum(
                data["total_matches"] for data in ref_footprints.values()
            )
            agency_totals[agency_slug] = total_matches

            # Calculate relative footprint (matches per 10,000 words)
            agency_word_count = (
                self.word_count_data.get("agencies", {})
                .get(agency_slug, {})
                .get("total", 0)
            )
            if agency_word_count > 0:
                relative_value = (total_matches / agency_word_count) * 10000
                agency_relative[agency_slug] = round(relative_value, 2)
            else:
                agency_relative[agency_slug] = 0

        # Prepare the final results
        footprint_data = {
            "timestamp": datetime.now().isoformat(),
            "footprint_name": footprint_name,
            "total_matches": sum(agency_totals.values()),
            "agencies": {
                slug: {
                    "total_matches": agency_totals[slug],
                    "relative_per_10k_words": agency_relative.get(slug, 0),
                    "references": {
                        f"{data['description']}": {
                            "total_matches": data["total_matches"],
                            "keyword_matches": data["keyword_matches"],
                        }
                        for ref_key, data in ref_footprints.items()
                    },
                }
                for slug, ref_footprints in agency_ref_footprints.items()
            },
        }

        total_time = time.time() - start_time
        logger.info(
            f"Total {footprint_name} footprint analysis took {total_time:.2f} seconds"
        )
        logger.info(
            f"Total {footprint_name} matches across all agencies: {footprint_data['total_matches']}"
        )

        # Save the results
        self._save_analysis_results(
            footprint_data,
            f"{footprint_name}_footprint.json",
            f"{footprint_name} footprint",
        )

        # Store for future reference
        self.footprint_results[footprint_name] = footprint_data

        return footprint_data

    def analyze_dei_footprint(self):
        """Analyze DEI language by agency."""
        return self.analyze_keyword_footprint(DEI_WORDS, "dei")

    def analyze_bureaucracy_footprint(self):
        """Analyze bureaucratic language by agency."""
        return self.analyze_keyword_footprint(BUREAUCRACY_WORDS, "bureaucracy")
