"""
Website generator for eCFR Analyzer.
Creates a static website with interactive visualizations of eCFR analysis.
"""

import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Union

from jinja2 import Environment, FileSystemLoader


class WebsiteGenerator:
    """Generator for the eCFR Analyzer website."""

    def __init__(
        self,
        output_dir: str = "docs",
        title: str = "eCFR Analyzer - Department of Government Efficiency",
        static_data: bool = True,
    ):
        """Initialize the website generator.

        Args:
            output_dir: Directory to output the generated website
            title: Website title
            static_data: Whether to use static data or APIs
        """
        self.output_dir = Path(output_dir)
        self.title = title
        self.static_data = static_data

        # Paths
        self.template_dir = Path(__file__).parent / "templates"
        self.static_dir = Path(__file__).parent / "static"
        self.data_dir = Path("data") / "analysis"

        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Initialize Jinja2 environment
        self.jinja_env = Environment(
            loader=FileSystemLoader(self.template_dir), autoescape=True
        )

    def _load_analysis_data(self) -> Dict:
        """Load all analysis data.

        Returns:
            Dictionary of analysis data
        """
        analysis_data = {}

        # Try to load the summary first
        summary_path = self.data_dir / "analysis_summary.json"
        if summary_path.exists():
            with open(summary_path, "r") as f:
                analysis_data["summary"] = json.load(f)

        # Load all other analysis files
        for data_file in self.data_dir.glob("*.json"):
            if data_file.name == "analysis_summary.json":
                continue

            data_key = data_file.stem
            with open(data_file, "r") as f:
                analysis_data[data_key] = json.load(f)

        return analysis_data

    def _copy_static_files(self):
        """Copy static files to the output directory."""
        # Create static directory if it doesn't exist
        static_output_dir = self.output_dir / "static"
        static_output_dir.mkdir(exist_ok=True)

        # Copy all static files
        if self.static_dir.exists():
            for file_path in self.static_dir.glob("**/*"):
                if file_path.is_file():
                    # Get relative path from static_dir
                    rel_path = file_path.relative_to(self.static_dir)
                    # Create target directory if needed
                    target_dir = static_output_dir / rel_path.parent
                    target_dir.mkdir(parents=True, exist_ok=True)
                    # Copy file
                    shutil.copy2(file_path, static_output_dir / rel_path)

    def _copy_data_files(self):
        """Copy analysis data files to the output directory."""
        # Create data directory in output
        data_output_dir = self.output_dir / "data"
        data_output_dir.mkdir(exist_ok=True)

        # Copy all data files
        if self.data_dir.exists():
            for file_path in self.data_dir.glob("*.json"):
                shutil.copy2(file_path, data_output_dir / file_path.name)

    def _render_template(self, template_name: str, output_name: str, **context):
        """Render a template and write it to the output directory.

        Args:
            template_name: Name of template file
            output_name: Name of output file
            **context: Template context variables
        """
        template = self.jinja_env.get_template(template_name)
        output = template.render(**context)

        output_path = self.output_dir / output_name
        with open(output_path, "w") as f:
            f.write(output)

    def generate(self):
        """Generate the website."""
        # Load analysis data
        try:
            analysis_data = self._load_analysis_data()
        except Exception as e:
            print(f"Error loading analysis data: {e}")
            analysis_data = {}

        # Copy static files and data
        self._copy_static_files()
        self._copy_data_files()

        # Generate pages
        self._generate_index_page(analysis_data)
        self._generate_agency_page(analysis_data)
        self._generate_historical_page(analysis_data)
        self._generate_insights_page(analysis_data)
        self._generate_search_page()
        self._generate_about_page()

        # Generate JavaScript for the website
        self._generate_js_files(analysis_data)

        print(f"Website generation complete. Output directory: {self.output_dir}")

    def _generate_index_page(self, analysis_data: Dict):
        """Generate the index page.

        Args:
            analysis_data: Analysis data dictionary
        """
        self._render_template(
            "index.html",
            "index.html",
            title=self.title,
            page_title="Dashboard",
            static_data=self.static_data,
            summary=analysis_data.get("summary", {}),
            word_count=analysis_data.get("word_count_by_agency", {}),
            timestamp=datetime.now().strftime("%Y-%m-%d"),
            active_page="home",
        )

    def _generate_agency_page(self, analysis_data: Dict):
        """Generate the agency analysis page.

        Args:
            analysis_data: Analysis data dictionary
        """
        self._render_template(
            "agency.html",
            "agency.html",
            title=self.title,
            page_title="Agency Analysis",
            static_data=self.static_data,
            word_count=analysis_data.get("word_count_by_agency", {}),
            dei_footprint=analysis_data.get("dei_footprint", {}),
            waste_footprint=analysis_data.get("waste_footprint", {}),
            bureaucracy_footprint=analysis_data.get("bureaucracy_footprint", {}),
            timestamp=datetime.now().strftime("%Y-%m-%d"),
            active_page="agency",
        )

    def _generate_historical_page(self, analysis_data: Dict):
        """Generate the historical analysis page.

        Args:
            analysis_data: Analysis data dictionary
        """
        self._render_template(
            "historical.html",
            "historical.html",
            title=self.title,
            page_title="Historical Analysis",
            static_data=self.static_data,
            historical_changes=analysis_data.get("historical_changes", {}),
            corrections=analysis_data.get("corrections_over_time", {}),
            timestamp=datetime.now().strftime("%Y-%m-%d"),
            active_page="historical",
        )

    def _generate_insights_page(self, analysis_data: Dict):
        """Generate the insights page.

        Args:
            analysis_data: Analysis data dictionary
        """
        self._render_template(
            "insights.html",
            "insights.html",
            title=self.title,
            page_title="Regulatory Insights",
            static_data=self.static_data,
            bureaucratic_complexity=analysis_data.get("bureaucratic_complexity", {}),
            dei_footprint=analysis_data.get("dei_footprint", {}),
            waste_footprint=analysis_data.get("waste_footprint", {}),
            timestamp=datetime.now().strftime("%Y-%m-%d"),
            active_page="insights",
        )

    def _generate_search_page(self):
        """Generate the search page."""
        self._render_template(
            "search.html",
            "search.html",
            title=self.title,
            page_title="Search Regulations",
            static_data=self.static_data,
            timestamp=datetime.now().strftime("%Y-%m-%d"),
            active_page="search",
        )

    def _generate_about_page(self):
        """Generate the about page."""
        self._render_template(
            "about.html",
            "about.html",
            title=self.title,
            page_title="About the eCFR Analyzer",
            static_data=self.static_data,
            timestamp=datetime.now().strftime("%Y-%m-%d"),
            active_page="about",
        )

    def _generate_js_files(self, analysis_data: Dict):
        """Generate JavaScript files for the website.

        Args:
            analysis_data: Analysis data dictionary
        """
        # Generate app.js
        self._render_template(
            "app.js", "static/js/app.js", static_data=self.static_data
        )

        # Generate charts.js
        self._render_template(
            "charts.js", "static/js/charts.js", static_data=self.static_data
        )

        # Generate search.js
        self._render_template(
            "search.js", "static/js/search.js", static_data=self.static_data
        )
