"""
Local development server for the eCFR Analyzer website.
This script runs a Flask server to serve the website locally.
"""

import argparse
import json
import os
from datetime import datetime
from pathlib import Path

from flask import Flask, render_template, send_from_directory, jsonify

app = Flask(__name__)


@app.route("/")
def index():
    """Serve the home page."""
    return render_template(
        "index.html",
        title="eCFR Analyzer - Dashboard",
        page_title="Dashboard",
        summary=load_summary_data(),
        timestamp=datetime.now().strftime("%Y-%m-%d"),
        active_page="home",
    )


@app.route("/agency.html")
def agency():
    """Serve the agency page."""
    return render_template(
        "agency.html",
        title="eCFR Analyzer - Agency Analysis",
        page_title="Agency Analysis",
        word_count=load_word_count_data(),
        corrections=load_corrections_data(),
        corrections_over_time=load_corrections_over_time_data(),
        dei_footprint=load_dei_footprint_data(),
        bureaucracy_footprint=load_bureaucracy_footprint_data(),
        timestamp=datetime.now().strftime("%Y-%m-%d"),
        active_page="agency",
    )


@app.route("/historical.html")
def historical():
    """Serve the historical page."""
    return render_template(
        "historical.html",
        title="eCFR Analyzer - Historical Analysis",
        page_title="Historical Analysis",
        corrections=load_corrections_data(),
        corrections_over_time=load_corrections_over_time_data(),
        timestamp=datetime.now().strftime("%Y-%m-%d"),
        active_page="historical",
    )


@app.route("/insights.html")
def insights():
    """Serve the insights page."""
    return render_template(
        "insights.html",
        title="eCFR Analyzer - Insights",
        page_title="Insights",
        dei_footprint=load_dei_footprint_data(),
        bureaucracy_footprint=load_bureaucracy_footprint_data(),
        timestamp=datetime.now().strftime("%Y-%m-%d"),
        active_page="insights",
    )


@app.route("/search.html")
def search():
    """Serve the search page."""
    return render_template(
        "search.html",
        title="eCFR Analyzer - Search",
        page_title="Search",
        timestamp=datetime.now().strftime("%Y-%m-%d"),
        active_page="search",
    )


@app.route("/about.html")
def about():
    """Serve the about page."""
    return render_template(
        "about.html",
        title="eCFR Analyzer - About",
        page_title="About",
        timestamp=datetime.now().strftime("%Y-%m-%d"),
        active_page="about",
    )


@app.route("/static/<path:path>")
def serve_static(path):
    """Serve static files."""
    return send_from_directory("static", path)


@app.route("/data/<path:path>")
def serve_data(path):
    """Serve data files."""
    data_dir = Path(
        os.environ.get(
            "ECFR_DATA_DIR", Path.cwd().parent.parent.parent / "data" / "analysis"
        )
    )
    return send_from_directory(data_dir, path)


def load_summary_data():
    """Load summary data from the analysis files."""
    # Create a summary by combining data from various files
    summary = {
        "total_word_count": 0,
        "total_corrections": 0,
        "total_agencies_analyzed": 0,
        "total_parent_agencies": 0,
        "total_child_agencies": 0,
    }

    # Get word count data
    word_count = load_word_count_data()
    if word_count:
        summary["total_word_count"] = word_count.get("total_word_count", 0)
        summary["total_agencies_analyzed"] = len(word_count.get("agencies", {}))

    # Get corrections data
    corrections = load_corrections_data()
    if corrections:
        summary["total_corrections"] = corrections.get("total_corrections", 0)

    # Get agency hierarchy data to count parent and child agencies
    hierarchy = load_agency_hierarchy_data()
    if hierarchy:
        parent_agencies = 0
        child_agencies = 0

        for agency_id, agency_data in hierarchy.items():
            if agency_data.get("parent"):
                child_agencies += 1
            else:
                parent_agencies += 1

        summary["total_parent_agencies"] = parent_agencies
        summary["total_child_agencies"] = child_agencies

    return summary


def load_word_count_data():
    """Load word count data from the analysis files."""
    return load_data_file("word_count_by_agency.json")


def load_corrections_data():
    """Load corrections data from the analysis files."""
    return load_data_file("corrections_by_agency.json")


def load_corrections_over_time_data():
    """Load corrections over time data from the analysis files."""
    return load_data_file("corrections_over_time.json")


def load_dei_footprint_data():
    """Load DEI footprint data from the analysis files."""
    return load_data_file("dei_footprint.json")


def load_bureaucracy_footprint_data():
    """Load bureaucracy footprint data from the analysis files."""
    return load_data_file("bureaucracy_footprint.json")


def load_agency_hierarchy_data():
    """Load agency hierarchy data from the analysis files."""
    return load_data_file("agency_hierarchy_map.json")


def load_data_file(filename):
    """Load a data file from the analysis directory."""
    # Get the absolute path to the project root directory
    script_path = Path(__file__).resolve()
    # server.py is in src/ecfr_analyzer/website, so go up 3 levels to reach project root
    project_root = script_path.parent.parent.parent.parent
    
    # Use environment variable if set, otherwise use default path relative to project root
    data_dir = Path(
        os.environ.get(
            "ECFR_DATA_DIR", project_root / "data" / "analysis"
        )
    )
    
    # Print debugging information
    print(f"Looking for data in: {data_dir}")
    
    file_path = data_dir / filename
    
    if file_path.exists():
        try:
            with open(file_path, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {filename}: {e}")
            return {}
    else:
        print(f"Warning: {filename} not found at {file_path}")
        return {}


def main():
    """Run the Flask server."""
    parser = argparse.ArgumentParser(
        description="Run the eCFR Analyzer website locally."
    )
    parser.add_argument("--host", default="127.0.0.1", help="Host to run the server on")
    parser.add_argument(
        "--port", type=int, default=8080, help="Port to run the server on"
    )
    parser.add_argument("--debug", action="store_true", help="Run in debug mode")
    parser.add_argument("--data-dir", help="Path to the analysis data directory")

    args = parser.parse_args()

    if args.data_dir:
        os.environ["ECFR_DATA_DIR"] = args.data_dir

    app.run(host=args.host, port=args.port, debug=args.debug)


if __name__ == "__main__":
    main()
