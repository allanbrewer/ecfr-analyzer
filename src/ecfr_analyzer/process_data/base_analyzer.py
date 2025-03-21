"""
Base analyzer for eCFR data, providing shared functionality for different analyses.
"""

import json
import logging
import time
from pathlib import Path
from typing import Dict, List
from collections import defaultdict
import copy

from bs4 import BeautifulSoup
from tqdm import tqdm

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Common paths
ANALYSIS_DIR = Path("data") / "analysis"
ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)


class BaseECFRAnalyzer:
    """Base class for eCFR data analysis providing common functionality."""

    def __init__(self):
        """Initialize the base analyzer with common data structures."""
        self.data_dir = Path("data")
        self.raw_dir = self.data_dir / "raw"
        self.xml_dir = self.raw_dir / "text"
        self.analysis_dir = self.data_dir / "analysis"
        self.admin_dir = self.data_dir / "admin"

        # Ensure directory structure exists
        self.analysis_dir.mkdir(parents=True, exist_ok=True)
        self.xml_dir.mkdir(parents=True, exist_ok=True)

        # Load agencies data
        agencies_file = self.admin_dir / "agencies.json"
        if not agencies_file.exists():
            raise FileNotFoundError(f"Agencies file not found: {agencies_file}")

        with open(agencies_file, "r") as f:
            self.agencies_data = json.load(f)

        # Initialize caches
        self.xml_data_cache = {}  # Cache for XML data by title
        self.extracted_text_cache = {}  # Cache for extracted text by ref_key
        self.title_agency_mapping = None  # Will be populated during analysis

    def _load_title_data(self, title_number):
        """Load XML data for a specific title from files.

        Args:
            title_number: The CFR title number to load

        Returns:
            XML data as string or None if not found
        """
        # Check if already cached
        if title_number in self.xml_data_cache:
            return self.xml_data_cache[title_number]

        # First, try to find the file with the specific date format
        files = list(self.xml_dir.glob(f"title_{title_number}_*_full_text.xml"))

        if not files:
            logger.warning(
                f"XML file not found for title {title_number}: {self.xml_dir}/title_{title_number}_*_full_text.xml"
            )
            return None

        # Sort by date (newest first) if there are multiple files
        if len(files) > 1:
            # Extract date from filename (format: title_1_2023-01-01_full_text.xml)
            def extract_date(filename):
                parts = filename.stem.split("_")
                # The date is typically the third element (index 2)
                if len(parts) >= 4:
                    return parts[2]
                return ""

            files.sort(key=extract_date, reverse=True)

        # Use the most recent file
        xml_file = files[0]

        try:
            with open(xml_file, "r", encoding="utf-8") as f:
                xml_data = f.read()

            # Cache the data
            self.xml_data_cache[title_number] = xml_data
            logger.info(f"Loaded XML data for title {title_number} from {xml_file}")
            return xml_data
        except Exception as e:
            logger.error(f"Error loading title {title_number}: {e}")
            return None

    def _get_agency_cfr_references(self) -> Dict[str, List[Dict]]:
        """Extract all CFR references for each agency.

        Returns:
            Dictionary mapping agency slugs to lists of CFR reference dictionaries
        """
        references = {}
        count_parent = 0
        count_child = 0

        # Process top-level agencies
        for agency in self.agencies_data.get("agencies", []):
            agency_slug = agency.get("slug", "")
            if not agency_slug:
                continue

            count_parent += 1

            # Get references for this agency
            agency_refs = agency.get("cfr_references", [])
            references[agency_slug] = agency_refs

            # Process child agencies if any
            for child in agency.get("children", []):
                child_slug = child.get("slug", "")
                if not child_slug:
                    continue

                count_child += 1

                # Get references for this child agency
                child_refs = child.get("cfr_references", [])
                references[child_slug] = child_refs

        logger.info(
            f"Found {sum(len(refs) for refs in references.values())} CFR references across {len(references)} agencies"
        )
        logger.info(
            f"Total of {count_parent} parent agencies and {count_child} child agencies"
        )
        return references

    def _build_agency_hierarchy(self) -> Dict[str, str]:
        """Build a mapping from child agencies to their parent agencies.

        Returns:
            Dictionary mapping child agency slugs to parent agency slugs
        """
        hierarchy = {}

        # Process each top-level agency
        for agency in self.agencies_data.get("agencies", []):
            parent_slug = agency.get("slug", "")
            if not parent_slug:
                continue

            # Map each child to this parent
            for child in agency.get("children", []):
                child_slug = child.get("slug", "")
                if child_slug:
                    hierarchy[child_slug] = parent_slug

        return hierarchy

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
            # Use BeautifulSoup for parsing with more lenient error handling
            try:
                soup = BeautifulSoup(xml_data, "lxml-xml")
            except Exception as e:
                logger.warning(
                    f"Failed to parse XML with lxml-xml parser: {e}. Trying html.parser instead."
                )
                try:
                    soup = BeautifulSoup(xml_data, "html.parser")
                except Exception as e2:
                    logger.error(
                        f"Failed to parse XML with html.parser: {e2}. Skipping this reference."
                    )
                    return "", f"Error parsing XML: {e2}"

            # Start by finding the title (DIV1)
            title_num = ref.get("title")
            try:
                div1_elements = soup.find_all("DIV1")
            except Exception as e:
                logger.warning(
                    f"Failed to find DIV1 elements: {e}. Trying case-insensitive search."
                )
                # Try to find divs with case-insensitive search
                div1_elements = soup.find_all(
                    lambda tag: tag.name and tag.name.lower() == "div1"
                )

            if not div1_elements:
                logger.warning(
                    "No DIV1 elements found in XML. Trying to extract text from the whole document."
                )
                return (
                    soup.get_text(separator=" ", strip=True),
                    f"Title {title_num} (full text)",
                )

            # Track the hierarchy levels we found for logging
            found_levels = ["title"]
            description = f"Title {title_num}"

            # Start with all DIV1 elements (we'll filter further as needed)
            target_elements = div1_elements

            # Track the furthest level we've successfully matched
            last_matched_level = "title"

            # Helper function to search for elements at any level with better error handling
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
                    try:
                        # Find all elements of this type within the parent
                        divs = parent.find_all(div_tag, recursive=True)
                        for div in divs:
                            n = div.get("N")
                            if n and ref_value.lower() in n.lower():
                                matched_elements.append(div)
                    except Exception as e:
                        logger.warning(f"Error finding {div_tag} elements: {e}")
                        continue

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
                try:
                    # Get all text within this element
                    text = element.get_text(separator=" ", strip=True)
                    if text:
                        text_parts.append(text)
                except Exception as e:
                    logger.warning(f"Error extracting text from element: {e}")
                    continue

            combined_text = " ".join(text_parts)
            logger.info(
                f"Extracted text for {description} ({len(combined_text)} chars, found levels: {', '.join(found_levels)}, deepest match: {last_matched_level})"
            )

            return combined_text, description

        except Exception as e:
            logger.error(f"Error extracting text for reference {ref}: {e}")
            return "", f"Error: {str(e)}"

    def _process_agency_references(self, analysis_function):
        """Process all agency references and apply the given analysis function.

        This is the core method for iterating through agencies, titles, and references.
        It handles the loading of XML data, extraction of text, and tracking of processed
        references to avoid duplication.

        Args:
            analysis_function: Function that processes extracted text and returns results
                The function should accept (agency_slug, ref_text, ref_desc)

        Returns:
            Analysis results organized by agency
        """
        start_time = time.time()

        logger.info("Starting to process agency references...")
        # Step 1: Get all agency references
        agency_refs = self._get_agency_cfr_references()
        logger.info(
            f"Loaded {sum(len(refs) for refs in agency_refs.values())} total CFR references across {len(agency_refs)} agencies"
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

        # Store for other methods to use
        self.title_agency_mapping = title_to_agencies

        # Step 3: Initialize data structures
        agency_results = defaultdict(dict)
        processed_title_agency_pairs = (
            set()
        )  # Track processed pairs to avoid duplicates

        # Step 4: Process one title at a time
        titles_to_process = sorted(title_to_agencies.keys())
        for title_num in tqdm(titles_to_process, desc="Processing titles"):
            logger.info(f"\n--- Processing Title {title_num} ---")
            title_start_time = time.time()

            # 4.1: Load this title's data
            xml_data = self._load_title_data(title_num)
            if not xml_data:
                logger.warning(f"Skipping title {title_num}: no XML data found")
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
                    # If we've already processed this reference, use the cached text
                    if ref_key in self.extracted_text_cache:
                        ref_text, ref_desc = self.extracted_text_cache[ref_key]
                        # Apply the analysis function
                        result = analysis_function(agency_slug, ref_text, ref_desc)
                        if result:
                            agency_results[agency_slug][ref_key] = result
                    continue

                # Extract text for this specific reference
                if ref_key not in self.extracted_text_cache:
                    ref_text, ref_desc = self._extract_text_for_reference(xml_data, ref)
                    self.extracted_text_cache[ref_key] = (ref_text, ref_desc)
                    processed_refs_for_title.add(ref_key)
                else:
                    ref_text, ref_desc = self.extracted_text_cache[ref_key]

                # Apply the analysis function if we have text
                if ref_text:
                    result = analysis_function(agency_slug, ref_text, ref_desc)
                    if result:
                        agency_results[agency_slug][ref_key] = result

            # Free up memory (but keep the cache)
            if title_num in self.xml_data_cache and len(titles_to_process) > 5:
                # Only clear from cache if we have many titles to process
                del self.xml_data_cache[title_num]

            title_process_time = time.time() - title_start_time
            logger.info(
                f"Completed processing title {title_num} in {title_process_time:.2f} seconds"
            )

        total_time = time.time() - start_time
        logger.info(f"Total processing took {total_time:.2f} seconds")

        return agency_results

    def _save_analysis_results(self, results, filename, analysis_type):
        """Save analysis results to a JSON file.

        Args:
            results: Analysis results to save
            filename: Name of the file to save to
            analysis_type: Type of analysis for logging
        """
        output_file = self.analysis_dir / filename

        # Convert any tuple keys to strings before serializing
        results_json_safe = self._convert_for_json(results)

        with open(output_file, "w") as f:
            json.dump(results_json_safe, f, indent=2)

        logger.info(f"Saved {analysis_type} results to {output_file}")

    def _convert_for_json(self, obj):
        """Convert Python objects to JSON-serializable objects.

        Specifically handles:
        - Converting tuple keys in dictionaries to strings
        - Converting sets to lists
        - Converting tuples to lists

        Args:
            obj: The Python object to convert

        Returns:
            A JSON-serializable version of the object
        """
        if isinstance(obj, dict):
            # Create a new dict with string keys
            return {
                str(k) if isinstance(k, tuple) else k: self._convert_for_json(v)
                for k, v in obj.items()
            }
        elif isinstance(obj, list):
            return [self._convert_for_json(item) for item in obj]
        elif isinstance(obj, set):
            return [self._convert_for_json(item) for item in obj]
        elif isinstance(obj, tuple):
            return [self._convert_for_json(item) for item in obj]
        else:
            return obj

    def _roll_up_agency_totals(
        self, agency_data, metric_key="total", ref_data_key=None
    ):
        """Roll up totals from child agencies to parent agencies while avoiding double-counting.

        This function takes a dictionary of agency data with metrics and references,
        and calculates aggregated totals for parent agencies based on their children.
        It avoids double-counting by tracking which references have already been counted.

        Args:
            agency_data: Dictionary mapping agency slugs to their metric data
            metric_key: The key in the agency data dictionary that contains the metric to sum up
                        (e.g., "total" for word count, "total_matches" for footprint analysis)
            ref_data_key: Optional key within reference data that contains the metric
                         (e.g., "count" for word count, "total_matches" for footprint)

        Returns:
            Dictionary with updated totals for all agencies, with parent agencies
            including aggregated data from their children
        """
        logger.info("Rolling up agency totals to include child agencies...")
        start_time = time.time()

        # Build agency hierarchy if not already built
        agency_hierarchy = self._build_agency_hierarchy()

        # Create a mapping from parent agencies to their children
        parent_to_children = defaultdict(list)
        for child, parent in agency_hierarchy.items():
            parent_to_children[parent].append(child)

        # Make a copy of the original data to avoid modifying it in place
        updated_agency_data = copy.deepcopy(agency_data)

        # First, collect all references for each agency to avoid double-counting
        agency_refs = {}
        for agency_slug, data in updated_agency_data.items():
            if "references" in data:
                agency_refs[agency_slug] = set(data["references"].keys())
            else:
                agency_refs[agency_slug] = set()

        # Process each parent agency
        for parent_agency, child_agencies in parent_to_children.items():
            # Skip if parent agency is not in the data
            if parent_agency not in updated_agency_data:
                continue

            # Track references we've already counted for this parent
            counted_refs = set(agency_refs.get(parent_agency, set()))

            # Calculate additional metrics from children
            for child_agency in child_agencies:
                # Skip if child agency is not in the data
                if child_agency not in updated_agency_data:
                    continue

                # Get child's references we haven't counted yet for the parent
                child_refs = agency_refs.get(child_agency, set())
                new_refs = child_refs - counted_refs

                # Add child's data to parent for new references
                for ref_key in new_refs:
                    # Skip if child doesn't have data for this reference
                    if "references" not in updated_agency_data[child_agency]:
                        continue
                    if ref_key not in updated_agency_data[child_agency]["references"]:
                        continue

                    # Add reference to parent if it doesn't exist
                    if "references" not in updated_agency_data[parent_agency]:
                        updated_agency_data[parent_agency]["references"] = {}
                    if ref_key not in updated_agency_data[parent_agency]["references"]:
                        updated_agency_data[parent_agency]["references"][ref_key] = {}

                    # Add the reference metric to parent total
                    child_ref_data = updated_agency_data[child_agency]["references"][
                        ref_key
                    ]

                    # If ref_data_key is provided, use it to get the specific metric
                    if ref_data_key:
                        if ref_data_key not in child_ref_data:
                            continue

                        # Initialize the metric in parent if needed
                        if (
                            ref_key
                            not in updated_agency_data[parent_agency]["references"]
                        ):
                            updated_agency_data[parent_agency]["references"][
                                ref_key
                            ] = {}
                        if (
                            ref_data_key
                            not in updated_agency_data[parent_agency]["references"][
                                ref_key
                            ]
                        ):
                            updated_agency_data[parent_agency]["references"][ref_key][
                                ref_data_key
                            ] = 0

                        # Add the metric value to parent
                        updated_agency_data[parent_agency]["references"][ref_key][
                            ref_data_key
                        ] += child_ref_data[ref_data_key]

                        # Update parent's total
                        if metric_key not in updated_agency_data[parent_agency]:
                            updated_agency_data[parent_agency][metric_key] = 0
                        updated_agency_data[parent_agency][
                            metric_key
                        ] += child_ref_data[ref_data_key]
                    else:
                        # If no ref_data_key, just add the entire reference data to parent
                        updated_agency_data[parent_agency]["references"][
                            ref_key
                        ] = child_ref_data

                        # Update parent's total if there's a metric to add
                        if (
                            metric_key in child_ref_data
                            and metric_key in updated_agency_data[parent_agency]
                        ):
                            updated_agency_data[parent_agency][
                                metric_key
                            ] += child_ref_data[metric_key]

                # Mark these references as counted
                counted_refs.update(new_refs)

        # Calculate the new totals for each agency based on their references
        for agency_slug in updated_agency_data:
            if "references" in updated_agency_data[agency_slug]:
                if ref_data_key:
                    # Sum up the specific metric from each reference
                    updated_agency_data[agency_slug][metric_key] = sum(
                        ref_data.get(ref_data_key, 0)
                        for ref_data in updated_agency_data[agency_slug][
                            "references"
                        ].values()
                        if ref_data_key in ref_data
                    )
                else:
                    # Sum up the main metric from each reference
                    updated_agency_data[agency_slug][metric_key] = sum(
                        ref_data.get(metric_key, 0)
                        for ref_data in updated_agency_data[agency_slug][
                            "references"
                        ].values()
                        if metric_key in ref_data
                    )

        total_time = time.time() - start_time
        logger.info(f"Completed agency rollup in {total_time:.2f} seconds")

        return updated_agency_data
