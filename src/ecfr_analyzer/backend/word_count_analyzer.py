"""
Word count analyzer for eCFR data.
"""

import logging
import re
import nltk
import time
from datetime import datetime
from collections import defaultdict

from ecfr_analyzer.backend.base_analyzer import BaseECFRAnalyzer

# Configure logging
logger = logging.getLogger(__name__)

# Download NLTK resources if not already available
try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt")

# Common stopwords for filtering
STOPWORDS = {
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "if",
    "because",
    "as",
    "what",
    "when",
    "where",
    "how",
    "who",
    "which",
    "this",
    "that",
    "these",
    "those",
    "then",
    "just",
    "so",
    "than",
    "such",
    "both",
    "through",
    "about",
    "for",
    "is",
    "of",
    "while",
    "during",
    "to",
    "from",
    "in",
    "on",
    "by",
    "at",
    "shall",
    "must",
    "may",
    "should",
    "would",
    "could",
    "can",
    "are",
    "be",
    "with",
    "not",
    # Additional administrative stopwords
    "federal",
    "register",
    "cfr",
    "code",
    "regulation",
    "regulations",
    "regulatory",
    "agency",
    "office",
    "department",
    "section",
    "subsection",
    "paragraph",
    "gov",
    "accessibility",
}


class WordCountAnalyzer(BaseECFRAnalyzer):
    """Analyzer for counting words in eCFR text by agency."""

    def __init__(self):
        """Initialize the word count analyzer."""
        super().__init__()
        self.stopwords = STOPWORDS
        self.word_count_data = None

    def _tokenize_text(self, text):
        """Tokenize text into words, filtering out stopwords and non-alphabetic tokens.

        Args:
            text: Text to tokenize

        Returns:
            List of words
        """
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

    def _word_count_analysis_function(self, agency_slug, ref_text, ref_desc):
        """Analysis function for word counting.

        Args:
            agency_slug: Agency slug
            ref_text: Extracted text for the reference
            ref_desc: Description of the reference

        Returns:
            Dictionary with word count information
        """
        if not ref_text:
            return None

        # Count words
        tokens = self._tokenize_text(ref_text)
        word_count = len(tokens)

        logger.debug(f"Agency {agency_slug} has {word_count} words for {ref_desc}")

        return {
            "count": word_count,
            "description": ref_desc,
        }

    def analyze_word_count_by_agency(self):
        """Analyze word count for each agency based on their CFR references.

        Returns:
            Dictionary with word count data by agency
        """
        logger.info("Starting word count analysis by agency...")
        start_time = time.time()

        # Process agency references with word count analysis
        agency_ref_counts = self._process_agency_references(
            self._word_count_analysis_function
        )

        # Calculate totals for each agency
        agency_totals = defaultdict(int)
        for agency_slug, ref_counts in agency_ref_counts.items():
            agency_totals[agency_slug] = sum(
                data["count"] for data in ref_counts.values()
            )

        # Calculate the unique total (avoiding double-counting)
        title_totals = defaultdict(int)
        # Track which references we've counted for the global total
        counted_refs = set()

        for agency_slug, ref_counts in agency_ref_counts.items():
            for ref_key, ref_data in ref_counts.items():
                # Only count each reference once for the global total
                if ref_key not in counted_refs:
                    title_num = ref_key[0]  # Title is first element in the tuple
                    title_totals[title_num] += ref_data["count"]
                    counted_refs.add(ref_key)

        # Calculate the total word count across all agencies
        total_word_count = sum(title_totals.values())

        # Prepare the agency data structure for the roll-up function
        agency_data = {
            agency_slug: {
                "total": agency_totals[agency_slug],
                "references": {
                    ref_key: ref_data for ref_key, ref_data in ref_counts.items()
                },
            }
            for agency_slug, ref_counts in agency_ref_counts.items()
        }

        # Roll up child agency data to parent agencies
        rolled_up_agency_data = self._roll_up_agency_totals(
            agency_data, metric_key="total", ref_data_key="count"
        )

        # Prepare the final word count data
        word_count_data = {
            "timestamp": datetime.now().isoformat(),
            "total_word_count": total_word_count,
            "title_totals": dict(title_totals),
            "agencies": rolled_up_agency_data,
        }

        total_time = time.time() - start_time
        logger.info(f"Total word count analysis took {total_time:.2f} seconds")
        logger.info(f"Total word count across all agencies: {total_word_count}")

        # Save the results
        self._save_analysis_results(
            word_count_data, "word_count_by_agency.json", "word count"
        )

        # Store for potential use by other analyses
        self.word_count_data = word_count_data

        return word_count_data
