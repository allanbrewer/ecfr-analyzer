"""
Local development server for the eCFR Analyzer website.
This script runs a Flask server to serve the website locally.
"""

import argparse
import json
import os
from datetime import datetime
from pathlib import Path

from flask import Flask, render_template, send_from_directory, jsonify, request

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


@app.route("/index.html")
def index_html():
    """Redirect /index.html to root path."""
    return index()


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


@app.route("/static/<path:path>")
def serve_static(path):
    """Serve static files."""
    return send_from_directory("static", path)


@app.route("/data/<path:path>")
def serve_data(path):
    """Serve data files."""
    # Get the absolute path to the project root directory
    script_path = Path(__file__).resolve()
    # server.py is in src/ecfr_analyzer/website, so go up 3 levels to reach project root
    project_root = script_path.parent

    # Use environment variable if set, otherwise use default path relative to project root
    data_dir = Path(os.environ.get("ECFR_DATA_DIR", project_root / "data"))

    # Check if the path is directly in the data directory
    if (data_dir / path).exists():
        return send_from_directory(data_dir, path)

    # Check if the path is in the analysis subdirectory
    analysis_dir = data_dir / "analysis"
    if (analysis_dir / path).exists():
        return send_from_directory(analysis_dir, path)

    # If the file doesn't exist in either location, return a 404
    return f"File not found: {path}", 404


@app.route("/api/search")
def api_search():
    """API endpoint for searching agencies."""
    query = request.args.get("q", "").lower()
    if not query or len(query) < 2:
        return jsonify({"error": "Search query too short", "results": []})

    # Load agency hierarchy
    hierarchy = load_agency_hierarchy_data()
    if not hierarchy or "agencies" not in hierarchy:
        return jsonify({"error": "Agency data not available", "results": []})

    # Load other data for enrichment
    word_count_data = load_word_count_data()
    corrections_data = load_corrections_data()

    results = []

    # Search through parent agencies and their children
    for agency in hierarchy.get("agencies", []):
        agency_name = agency.get("name", "").lower()
        agency_slug = agency.get("slug", "")

        # Check if this agency matches
        if query in agency_name:
            # Get word count data
            word_count = 0
            if word_count_data and "agencies" in word_count_data:
                agency_word_count = word_count_data.get("agencies", {}).get(
                    agency_slug, {}
                )
                word_count = agency_word_count.get("word_count", 0)

            # Get corrections data
            corrections_count = 0
            if corrections_data and "agencies" in corrections_data:
                agency_corrections = corrections_data.get("agencies", {}).get(
                    agency_slug, {}
                )
                corrections_count = agency_corrections.get("total_corrections", 0)

            results.append(
                {
                    "name": agency.get("name", ""),
                    "slug": agency_slug,
                    "is_parent": True,
                    "word_count": word_count,
                    "corrections_count": corrections_count,
                    "children_count": len(agency.get("children", [])),
                }
            )

        # Check children
        for child in agency.get("children", []):
            child_name = child.get("name", "").lower()
            child_slug = child.get("slug", "")

            if query in child_name:
                # Get word count data
                word_count = 0
                if word_count_data and "agencies" in word_count_data:
                    child_word_count = word_count_data.get("agencies", {}).get(
                        child_slug, {}
                    )
                    word_count = child_word_count.get("word_count", 0)

                # Get corrections data
                corrections_count = 0
                if corrections_data and "agencies" in corrections_data:
                    child_corrections = corrections_data.get("agencies", {}).get(
                        child_slug, {}
                    )
                    corrections_count = child_corrections.get("total_corrections", 0)

                results.append(
                    {
                        "name": child.get("name", ""),
                        "slug": child_slug,
                        "is_parent": False,
                        "parent_name": agency.get("name", ""),
                        "parent_slug": agency_slug,
                        "word_count": word_count,
                        "corrections_count": corrections_count,
                    }
                )

    return jsonify({"query": query, "results": results, "count": len(results)})


def load_summary_data():
    """Load summary data or generate it from the other data files."""
    summary = {
        "total_word_count": 0,
        "total_corrections": 0,
        "total_parent_agencies": 0,
        "total_child_agencies": 0,
        "total_agencies_analyzed": 0,
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
        # There are two formats we need to handle:
        # 1. Simple dict mapping child slugs to parent slugs
        # 2. Structured hierarchy with "agencies" list

        if "agencies" in hierarchy:
            # This is the structured hierarchy format
            parent_agencies = len(hierarchy.get("agencies", []))
            child_agencies = 0

            for agency in hierarchy.get("agencies", []):
                # Each agency entry has a childre list attribute, but some are empty lists
                if agency.get("children"):
                    child_agencies += len(agency.get("children", []))

            summary["total_parent_agencies"] = parent_agencies
            summary["total_child_agencies"] = child_agencies
        else:
            # This is the simple mapping format (child_slug -> parent_slug)
            # Every key is a child agency, unique parent slugs are parent agencies
            child_agencies = len(hierarchy)
            parent_agencies = len(set(hierarchy.values()))

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


def load_agency_hierarchy_data():
    """Load agency hierarchy data from the analysis files."""
    return load_data_file("agency_hierarchy_map.json")


def load_data_file(filename):
    """Load a data file from the analysis directory."""
    # Get the absolute path to the project root directory
    script_path = Path(__file__).resolve()
    # server.py is in src/ecfr_analyzer/website, so go up 3 levels to reach project root
    project_root = script_path.parent

    # Use environment variable if set, otherwise use default path relative to project root
    data_dir = Path(os.environ.get("ECFR_DATA_DIR", project_root / "data"))

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
