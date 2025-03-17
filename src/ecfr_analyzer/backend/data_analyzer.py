"""
Data analyzer for eCFR data, providing key insights such as word counts,
historical changes, DEI footprint, and bureaucracy metrics.
"""

import logging
import json

from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Import the eCFR API client and new analyzer modules
from ecfr_analyzer.backend.ecfr_api import ECFRApiClient
from ecfr_analyzer.backend.base_analyzer import BaseECFRAnalyzer
from ecfr_analyzer.backend.word_count_analyzer import WordCountAnalyzer
from ecfr_analyzer.backend.footprint_analyzer import (
    FootprintAnalyzer,
    DEI_WORDS,
    BUREAUCRACY_WORDS,
)
from ecfr_analyzer.backend.corrections_analyzer import CorrectionsAnalyzer

# Paths
ANALYSIS_DIR = Path("data") / "analysis"
ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)


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
        self.xml_dir = self.raw_dir / "text"

        # Create directories if they don't exist
        self.xml_dir.mkdir(parents=True, exist_ok=True)
        self.analysis_dir.mkdir(parents=True, exist_ok=True)

        # Initialize the specialized analyzers
        self.base_analyzer = BaseECFRAnalyzer()
        self.word_count_analyzer = WordCountAnalyzer()
        self.footprint_analyzer = FootprintAnalyzer()
        self.corrections_analyzer = CorrectionsAnalyzer()

        # Share the word count analyzer with the footprint analyzer for efficiency
        self.footprint_analyzer.word_count_analyzer = self.word_count_analyzer

        # Load API client for data access
        self.api_client = ECFRApiClient()
        self.title_summary = self._load_title_summary()
        self.agencies_data = self._load_agencies_data()

        # Maps titles to agencies
        self.title_agency_map = self._build_title_agency_map()

        # Maps child agencies to parent agencies
        self.agency_hierarchy = self._build_agency_hierarchy()
        self.agency_hierarchy_map = self._generate_agency_hierarchy_map()

        # Dictionary to store analysis results
        self.analysis_results = {}

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

    def analyze_word_count_by_agency(self):
        """Analyze word count for each agency based on their specific CFR references.

        Calculates word counts for each agency, tracking specific references to
        titles, chapters, parts, etc., and organizing by agency hierarchy.

        Returns:
            Dictionary with word count data by agency
        """
        logger.info("Starting word count analysis by agency...")
        result = self.word_count_analyzer.analyze_word_count_by_agency()
        self.analysis_results["word_count"] = result

    def analyze_dei_footprint(self):
        """Analyze DEI footprint for each agency.

        Returns:
            Dictionary with DEI footprint data
        """
        # Get DEI keywords
        dei_keywords = DEI_WORDS

        # Initialize footprint analyzer if needed
        if not self.footprint_analyzer:
            self.footprint_analyzer = FootprintAnalyzer()

        # Run the analysis
        result = self.footprint_analyzer.analyze_keyword_footprint(dei_keywords, "dei")
        self.analysis_results["dei_footprint"] = result

    def analyze_bureaucracy_footprint(self):
        """Analyze bureaucracy footprint for each agency.

        Returns:
            Dictionary with bureaucracy footprint data
        """
        # Get bureaucracy keywords
        bureaucracy_keywords = BUREAUCRACY_WORDS

        # Initialize footprint analyzer if needed
        if not self.footprint_analyzer:
            self.footprint_analyzer = FootprintAnalyzer()

        # Run the analysis
        result = self.footprint_analyzer.analyze_keyword_footprint(
            bureaucracy_keywords, "bureaucracy"
        )
        self.analysis_results["bureaucracy_footprint"] = result

    def analyze_custom_footprint(self, keywords, footprint_name):
        """Analyze custom keyword footprint for each agency.

        Args:
            keywords: Set of keywords to search for
            footprint_name: Name of the footprint for reporting

        Returns:
            Dictionary with custom footprint data
        """
        # Initialize footprint analyzer if needed
        if not self.footprint_analyzer:
            self.footprint_analyzer = FootprintAnalyzer()

        # Run the analysis
        result = self.footprint_analyzer.analyze_keyword_footprint(
            keywords, footprint_name
        )
        self.analysis_results[footprint_name.lower() + "_footprint"] = result
        return result

    def analyze_corrections(self):
        """Analyze corrections made to regulations for each agency.

        Returns:
            Dictionary with corrections data by agency
        """
        # Initialize corrections analyzer if needed
        if not self.corrections_analyzer:
            self.corrections_analyzer = CorrectionsAnalyzer()

        # Run the analysis
        result = self.corrections_analyzer.analyze_corrections_by_agency()
        self.analysis_results["corrections"] = result
        return result

    def analyze_corrections_over_time(self):
        """Analyze corrections over time for each agency.

        Returns:
            Dictionary with corrections data over time
        """
        # Initialize corrections analyzer if needed
        if not self.corrections_analyzer:
            self.corrections_analyzer = CorrectionsAnalyzer()

        # Run the analysis
        result = self.corrections_analyzer.analyze_corrections_over_time()
        self.analysis_results["corrections_over_time"] = result
        return result

    def run_all_analyses(self):
        """Run all analyses and compile results."""
        logger.info("Running all analyses...")
        start_time = time.time()

        # Run each analysis
        self.analyze_word_count_by_agency()
        self.analyze_dei_footprint()
        self.analyze_bureaucracy_footprint()
        self.analyze_corrections()
        self.analyze_corrections_over_time()

        # Compile summary
        self.summary = {
            "timestamp": datetime.now().isoformat(),
            "totals": {
                "total_word_count": self.analysis_results.get("word_count", {}).get(
                    "total_word_count", 0
                ),
                "total_dei_matches": self.analysis_results.get("dei_footprint", {}).get(
                    "total_matches", 0
                ),
                "total_bureaucracy_matches": self.analysis_results.get(
                    "bureaucracy_footprint", {}
                ).get("total_matches", 0),
                "total_corrections": self.analysis_results.get("corrections", {}).get(
                    "total_corrections", 0
                ),
            },
        }

        # Save summary
        summary_file = self.analysis_dir / "analysis_summary.json"
        with open(summary_file, "w") as f:
            json.dump(self.summary, f, indent=2)

        # Log total time
        total_time = time.time() - start_time
        logger.info(f"Analysis complete. Summary written to {summary_file}")
        logger.info(f"Total analysis time: {total_time:.2f} seconds")
        return self.summary


def main():
    """Run the eCFR data analysis."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    logger.info("Starting eCFR data analysis...")

    # Run the full analysis
    analyzer = ECFRDataAnalyzer()
    summary = analyzer.run_all_analyses()

    logger.info(f"Analysis complete with {len(summary['totals'])} analyses")
    logger.info(f"Total word count: {summary['totals']['total_word_count']} words")
    logger.info(f"Total DEI matches: {summary['totals']['total_dei_matches']} matches")
    logger.info(
        f"Total bureaucracy matches: {summary['totals']['total_bureaucracy_matches']} matches"
    )
    logger.info(
        f"Total corrections: {summary['totals']['total_corrections']} corrections"
    )


if __name__ == "__main__":
    main()
