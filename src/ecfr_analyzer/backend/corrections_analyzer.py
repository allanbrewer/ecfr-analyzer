"""
Corrections analyzer for eCFR data, tracking corrections made to agency regulations over time.
"""

import json
import logging
import time
from datetime import datetime
from pathlib import Path
from collections import defaultdict

from ecfr_analyzer.backend.base_analyzer import BaseECFRAnalyzer

# Configure logging
logger = logging.getLogger(__name__)


class CorrectionsAnalyzer(BaseECFRAnalyzer):
    """Analyzer for corrections made to agency regulations in the CFR."""

    def __init__(self, data_dir=None):
        """Initialize the corrections analyzer.

        Args:
            data_dir: Root directory for data files
        """
        # Initialize base class to get agency data and utility functions
        super().__init__(data_dir)

        # Directory for correction data
        self.corrections_dir = self.raw_dir / "corrections"

        # Ensure corrections directory exists
        self.corrections_dir.mkdir(exist_ok=True, parents=True)

        # Cache for loaded correction data
        self.corrections_cache = {}

    def _load_title_corrections(self, title_number):
        """Load corrections for a specific title.

        Args:
            title_number: Title number to load corrections for

        Returns:
            List of correction entries for the title
        """
        # Check if already cached
        if title_number in self.corrections_cache:
            return self.corrections_cache[title_number]

        # Look for the corrections file
        corrections_file = (
            self.corrections_dir / f"title_{title_number}_corrections.json"
        )

        if not corrections_file.exists():
            logger.warning(f"Corrections file not found for title {title_number}")
            return []

        # Load the corrections data
        try:
            with open(corrections_file, "r") as f:
                corrections_data = json.load(f)

            # Check if 'ecfr_corrections' key exists
            if "ecfr_corrections" in corrections_data:
                corrections = corrections_data["ecfr_corrections"]
                logger.info(
                    f"Loaded {len(corrections)} corrections for title {title_number}"
                )
                self.corrections_cache[title_number] = corrections
                return corrections
            else:
                logger.warning(
                    f"No 'ecfr_corrections' key in file for title {title_number}"
                )
                self.corrections_cache[title_number] = []
                return []

        except Exception as e:
            logger.error(f"Error loading corrections for title {title_number}: {e}")
            self.corrections_cache[title_number] = []
            return []

    def _matches_reference(self, correction_hierarchy, ref_key):
        """Check if a correction hierarchy matches a reference key.

        Args:
            correction_hierarchy: Hierarchy object from a correction entry
            ref_key: Reference key tuple from agency references

        Returns:
            True if the correction applies to this reference, False otherwise
        """
        # Extract elements from the reference key
        # Typical ref_key format: (title, chapter, part, subpart, section)
        if not ref_key or len(ref_key) < 1:
            return False

        title_num = ref_key[0]

        # Extract elements from the correction hierarchy
        corr_title = correction_hierarchy.get("title")

        # First, check if the titles match
        if corr_title != str(title_num):
            return False

        # If ref_key only has title, then we have a match if titles match
        if len(ref_key) == 1:
            return True

        # Check other hierarchy elements if present
        # For more specific matches, we need to compare additional elements

        # Handle chapter comparison
        if len(ref_key) > 1 and ref_key[1]:
            ref_chapter = ref_key[1]
            corr_chapter = correction_hierarchy.get("chapter")

            # If correction has a chapter and it doesn't match, no match
            if corr_chapter and corr_chapter != ref_chapter:
                return False

        # Handle part comparison
        if len(ref_key) > 2 and ref_key[2]:
            ref_part = ref_key[2]
            corr_part = correction_hierarchy.get("part")

            # If correction has a part and it doesn't match, no match
            if corr_part and corr_part != ref_part:
                return False

        # Handle subpart/section if present in both
        if len(ref_key) > 3 and ref_key[3]:
            ref_section = ref_key[3]
            corr_section = correction_hierarchy.get("section")

            # If correction has a section and it doesn't match, no match
            if corr_section and corr_section != ref_section:
                return False

        # If we get here, the correction is either at a higher level in the hierarchy
        # or matches what we have in the ref_key, so it's relevant
        return True

    def analyze_corrections_by_agency(self):
        """Analyze corrections made to regulations for each agency.

        Returns:
            Dictionary with corrections data by agency
        """
        logger.info("Starting corrections analysis by agency...")
        start_time = time.time()

        # Get agency references
        agency_references = self._get_agency_cfr_references()

        # Initialize results structure
        agency_corrections = defaultdict(lambda: defaultdict(list))

        # Process each agency and their references
        for agency_slug, references in agency_references.items():
            # Skip agencies with no references
            if not references:
                continue

            # Process each reference
            for ref in references:
                # Create reference key using base analyzer utility
                ref_key = self._create_ref_key(ref)

                # Skip invalid references
                if not ref_key or len(ref_key) < 1:
                    continue

                # Get the title number
                title_num = ref_key[0]

                # Load corrections for this title
                title_corrections = self._load_title_corrections(title_num)

                # Find relevant corrections for this reference
                for correction in title_corrections:
                    # Skip corrections without CFR references
                    if "cfr_references" not in correction:
                        continue

                    # Check each CFR reference in the correction
                    for cfr_ref in correction["cfr_references"]:
                        if "hierarchy" not in cfr_ref:
                            continue

                        # Check if this correction applies to this reference
                        if self._matches_reference(cfr_ref["hierarchy"], ref_key):
                            # Add this correction to the agency's list for this reference
                            # Use a tuple of reference elements as the key
                            agency_corrections[agency_slug][ref_key].append(
                                {
                                    "id": correction.get("id"),
                                    "corrective_action": correction.get(
                                        "corrective_action"
                                    ),
                                    "error_corrected": correction.get(
                                        "error_corrected"
                                    ),
                                    "error_occurred": correction.get("error_occurred"),
                                    "year": correction.get("year"),
                                    "fr_citation": correction.get("fr_citation"),
                                    "cfr_reference": cfr_ref.get("cfr_reference"),
                                    "hierarchy": cfr_ref.get("hierarchy"),
                                }
                            )

        # Calculate totals for each agency
        agency_totals = defaultdict(int)
        for agency_slug, ref_corrections in agency_corrections.items():
            agency_totals[agency_slug] = sum(
                len(corrs) for corrs in ref_corrections.values()
            )

        # Calculate the unique total (avoiding double-counting)
        title_totals = defaultdict(int)
        counted_corrections = set()  # Track IDs of counted corrections

        for agency_slug, ref_corrections in agency_corrections.items():
            for ref_key, corrections in ref_corrections.items():
                title_num = ref_key[0]

                for correction in corrections:
                    corr_id = correction.get("id")
                    if corr_id and corr_id not in counted_corrections:
                        title_totals[title_num] += 1
                        counted_corrections.add(corr_id)

        # Prepare the agency data structure for the roll-up function
        agency_data = {
            agency_slug: {
                "total": agency_totals[agency_slug],
                "references": {
                    ref_key: {"count": len(corrections), "corrections": corrections}
                    for ref_key, corrections in ref_corrections.items()
                },
            }
            for agency_slug, ref_corrections in agency_corrections.items()
        }

        # Roll up child agency data to parent agencies
        rolled_up_agency_data = self._roll_up_agency_totals(
            agency_data, metric_key="total", ref_data_key="count"
        )

        # Prepare the final corrections data
        corrections_data = {
            "timestamp": datetime.now().isoformat(),
            "total_corrections": len(counted_corrections),
            "title_totals": dict(title_totals),
            "agencies": rolled_up_agency_data,
        }

        total_time = time.time() - start_time
        logger.info(f"Corrections analysis took {total_time:.2f} seconds")
        logger.info(f"Total corrections: {len(counted_corrections)}")

        # Save the results
        self._save_analysis_results(
            corrections_data, "corrections_by_agency.json", "corrections"
        )

        return corrections_data
