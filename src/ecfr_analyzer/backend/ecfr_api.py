"""
ECFR API Client for accessing the Electronic Code of Federal Regulations API.
"""

import json
import os
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional
import logging
import requests
import zipfile
import io

import requests
from dotenv import load_dotenv
from tqdm import tqdm

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# API Endpoints
ECFR_API_BASE_URL = "https://www.ecfr.gov/api"

# Data storage paths
DATA_DIR = Path("data")
RAW_DATA_DIR = DATA_DIR / "raw"
ADMIN_DATA_DIR = DATA_DIR / "admin"
CORRECTION_DATA_DIR = RAW_DATA_DIR / "corrections"
TEXT_DIR = RAW_DATA_DIR / "text"
STRUCT_DIR = RAW_DATA_DIR / "struct"
CACHE_DATA_DIR = DATA_DIR / "cache"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
ADMIN_DATA_DIR.mkdir(parents=True, exist_ok=True)
CORRECTION_DATA_DIR.mkdir(parents=True, exist_ok=True)
TEXT_DIR.mkdir(parents=True, exist_ok=True)
STRUCT_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DATA_DIR.mkdir(parents=True, exist_ok=True)


class ECFRApiClient:
    """Client for interacting with the ECFR API."""

    def __init__(self, cache_days: int = 1):
        """Initialize the ECFR API client.

        Args:
            cache_days: Number of days to cache API responses
        """
        self.cache_days = cache_days
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})

    def _get_cache_path(self, endpoint: str, params: Optional[Dict] = None) -> Path:
        """Generate a cache file path for an API endpoint.

        Args:
            endpoint: API endpoint
            params: URL parameters

        Returns:
            Path to cache file
        """
        # Create a simplified string representation of params for filename
        params_str = ""
        if params:
            params_str = "_".join(f"{k}_{v}" for k, v in sorted(params.items()))
            params_str = params_str.replace("/", "_").replace("\\", "_")

        # Create a filename based on the endpoint, params and date
        filename = (
            f"{endpoint.replace('/', '_')}_{params_str}"
            if params_str
            else f"{endpoint.replace('/', '_')}"
        )
        return CACHE_DATA_DIR / filename

    def _get(self, url: str, params: Optional[Dict] = None, cache: bool = True) -> Dict:
        """Make a GET request to the API.

        Args:
            url: API endpoint URL
            params: URL parameters
            cache: Whether to use/update cache

        Returns:
            JSON response as dictionary
        """
        request_params = params.copy() if params else {}

        cache_path = self._get_cache_path(
            url.split("/api/")[1] if "/api/" in url else url, params
        )

        # Return cached response if recent enough
        if cache and cache_path.exists():
            logger.info(f"Checking cache age for {url}")
            cache_age = datetime.now() - datetime.fromtimestamp(
                cache_path.stat().st_mtime
            )
            if cache_age < timedelta(days=self.cache_days):
                logger.info(f"Using cached response for {url}")
                # If cache_path is json then load json
                if cache_path.suffix == ".json":
                    with open(cache_path, "r") as f:
                        return json.load(f)
                # If cache_path is xml then load xml
                elif cache_path.suffix == ".xml":
                    with open(cache_path, "rb") as f:
                        return f.read()

        # Make API request
        response = self.session.get(url, params=request_params)
        logger.info(f"Request headers: {self.session.headers}")
        response.raise_for_status()
        if self.session.headers["Accept"] == "application/xml":
            data = response.content
            # Cache response
            if cache:
                with open(cache_path, "wb") as f:
                    f.write(data)
        elif self.session.headers["Accept"] == "application/json":
            data = response.json()
            # Cache response
            if cache:
                with open(cache_path, "w") as f:
                    json.dump(data, f, indent=2)

        return data

    def get_admin_agencies(self) -> Dict:
        """Get detailed information about all agencies from the admin API.

        Returns:
            Detailed agency information
        """
        try:
            self.session.headers.update({"Accept": "application/json"})
            return self._get(f"{ECFR_API_BASE_URL}/admin/v1/agencies.json")
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                logger.info(f"Warning: Agency endpoint not available: {e}")
                return {"agencies": [], "timestamp": datetime.now().isoformat()}
            raise

    def get_title_corrections(self, title: int) -> Dict:
        """Get corrections data for a specific title.

        Args:
            title: Title number

        Returns:
            Corrections data for the title or dict with empty corrections if endpoint unavailable
        """
        try:
            self.session.headers.update({"Accept": "application/json"})
            return self._get(
                f"{ECFR_API_BASE_URL}/admin/v1/corrections/title/{title}.json"
            )
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                logger.info(
                    f"Warning: Title corrections endpoint not available for title {title}: {e}"
                )
                # Return a structured empty response
                return {"ecfr_corrections": [], "timestamp": datetime.now().isoformat()}
            raise

    def get_title_summary(self) -> Dict:
        """Get the summary of a title.

        Returns:
            Structure information for the title or dict with empty structure if endpoint unavailable
        """
        try:
            self.session.headers.update({"Accept": "application/json"})
            return self._get(f"{ECFR_API_BASE_URL}/versioner/v1/titles.json")
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                logger.info(f"Warning: Title summary endpoint not available: {e}")
                return {
                    "titles": [],
                    "meta": {"date": None},
                    "timestamp": datetime.now().isoformat(),
                }
            raise

    def get_structure(self, title: int, date: str) -> Dict:
        """Get the structure of a title

        Args:
            title: Title number
            date: Date in YYYY-MM-DD format

        Returns:
            Structure information for the title or dict with empty structure if endpoint unavailable
        """
        try:
            self.session.headers.update({"Accept": "application/json"})
            return self._get(
                f"{ECFR_API_BASE_URL}/versioner/v1/structure/{date}/title-{title}.json"
            )
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                logger.info(
                    f"Warning: Structure endpoint not available for title {title}: {e}"
                )
                return {"identifier": str(title), "type": "title", "children": []}
            raise

    def get_full_text(self, title: int, date: str) -> Dict:
        """Get full text for a title or part.

        Args:
            title: Title number
            date: Date in YYYY-MM-DD format

        Returns:
            Full text content
        """

        endpoint = f"{ECFR_API_BASE_URL}/versioner/v1/full/{date}/title-{title}.xml"

        try:
            self.session.headers.update({"Accept": "application/xml"})
            return self._get(endpoint)
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                logger.info(
                    f"Warning: Full text endpoint not available for title {title}: {e}"
                )
                root = ET.Element("data")
                ET.SubElement(root, "title").text = str(title)
                ET.SubElement(root, "date").text = date
                return ET.tostring(root, encoding="utf-8")
            raise


def download_admin_data():
    """Download administrative data including agencies and corrections."""
    client = ECFRApiClient()

    # Download agency data
    try:
        logger.info("Downloading agency information...")
        agencies_data = client.get_admin_agencies()
        output_file = ADMIN_DATA_DIR / "agencies.json"
        with open(output_file, "w") as f:
            json.dump(agencies_data, f, indent=2)
        logger.info(f"Agency data saved to {output_file}")
    except Exception as e:
        logger.info(f"Error downloading agency data: {e}")

    # Download title summary data
    try:
        logger.info("Downloading title summary data...")
        title_summary_data = client.get_title_summary()
        output_file = ADMIN_DATA_DIR / "title_summary.json"
        with open(output_file, "w") as f:
            json.dump(title_summary_data, f, indent=2)
        logger.info(f"Title summary data saved to {output_file}")
    except Exception as e:
        logger.info(f"Error downloading title summary data: {e}")

    # Download title corrections data
    try:
        logger.info("Downloading title data...")
        titles = [{"number": i} for i in range(1, 51)]

        # Save the titles data
        output_file = ADMIN_DATA_DIR / "titles.json"
        with open(output_file, "w") as f:
            json.dump({"data": titles}, f, indent=2)
        logger.info(f"Title data saved to {output_file}")

        # Download title-specific corrections
        logger.info("Downloading title-specific corrections...")
        for title_info in tqdm(titles, desc="Downloading title corrections"):
            try:
                title_number = title_info.get("number", 0)
                if title_number == 0:
                    continue

                corrections_data = client.get_title_corrections(title_number)
                output_file = (
                    CORRECTION_DATA_DIR / f"title_{title_number}_corrections.json"
                )
                with open(output_file, "w") as f:
                    json.dump(corrections_data, f, indent=2)
                logger.info(f"Title {title_number} corrections saved to {output_file}")
                time.sleep(1)  # Avoid rate limiting
            except Exception as e:
                logger.info(
                    f"Error downloading corrections for title {title_number}: {e}"
                )

    except Exception as e:
        logger.info(f"Error in title corrections download process: {e}")
        # Create an empty titles file as fallback
        output_file = PROCESSED_DATA_DIR / "titles.json"
        with open(output_file, "w") as f:
            json.dump({"data": [{"number": i} for i in range(1, 51)]}, f, indent=2)
        logger.info(f"Created fallback title data at {output_file}")


def download_bulk_data(title_summary_data: Dict):
    """
    Download bulk data for test titles.
    """
    client = ECFRApiClient()

    for item in title_summary_data["titles"]:
        title = item["number"]
        date = item["latest_issue_date"]
        # Download title summary data
        try:
            logger.info("Downloading title structure data...")
            structure = client.get_structure(title, date)
            output_file = STRUCT_DIR / f"title_{title}_{date}_structure.json"
            with open(output_file, "w") as f:
                json.dump(structure, f, indent=2)
            logger.info(f"Structure data saved to {output_file}")
        except Exception as e:
            logger.info(f"Error downloading structure for title {title}: {e}")
            return

        # Download full text
        try:
            logger.info("Downloading full text data...")
            full_text = client.get_full_text(title, date)
            output_file = TEXT_DIR / f"title_{title}_{date}_full_text.xml"
            with open(output_file, "wb") as f:
                f.write(full_text)
            logger.info(f"Full text data saved to {output_file}")
        except Exception as e:
            logger.info(f"Error downloading full text for title {title}: {e}")
            return


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == "download_admin_data":
            download_admin_data()
        elif command == "download_bulk_data":
            download_bulk_data(
                title_summary_data=json.load(
                    open(ADMIN_DATA_DIR / "title_summary.json")
                )
            )
        else:
            logger.info(f"Unknown command: {command}")
            logger.info("Available commands: download_admin_data, download_bulk_data")
            sys.exit(1)
