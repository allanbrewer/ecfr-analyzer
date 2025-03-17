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
        timestamp=datetime.now().strftime("%Y-%m-%d"),
        active_page="agency",
    )


@app.route("/historical.html")
def historical():
    """Serve the historical corrections analysis page."""
    # Load corrections over time data
    corrections_over_time_data = load_corrections_over_time_data()

    # Prepare JSON data for JavaScript
    corrections_over_time_json = "[]"
    stats = {
        "total_corrections": 0,
        "avg_per_year": 0,
        "peak_year": "N/A",
        "top_agency": "N/A",
    }

    if corrections_over_time_data:
        # Convert the data format for JavaScript
        corrections_list = []
        total_corrections = 0
        peak_year = None
        peak_count = 0

        for year, count in corrections_over_time_data.items():
            # Skip non-year keys that might be in the data
            if year == "timestamp" or not year.isdigit():
                continue

            year_int = int(year)
            corrections_list.append({"year": year_int, "count": count})
            total_corrections += count

            if peak_year is None or count > peak_count:
                peak_year = year_int
                peak_count = count

        # Sort by year
        corrections_list.sort(key=lambda x: x["year"])

        # Calculate average per year
        avg_per_year = (
            round(total_corrections / len(corrections_list)) if corrections_list else 0
        )

        # Update stats
        stats["total_corrections"] = total_corrections
        stats["avg_per_year"] = avg_per_year
        stats["peak_year"] = peak_year if peak_year else "N/A"

        # Convert to JSON for JavaScript
        corrections_over_time_json = json.dumps(corrections_list)

    # Load agency hierarchy for filters
    agency_hierarchy = load_agency_hierarchy_data()
    agency_hierarchy_json = json.dumps(agency_hierarchy)

    return render_template(
        "historical.html",
        title="eCFR Historical Corrections Analysis",
        stats=stats,
        corrections_over_time_json=corrections_over_time_json,
        agency_hierarchy_json=agency_hierarchy_json,
        active_page="historical",
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
    project_root = script_path.parent.parent.parent.parent

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


@app.route("/agency-detail.html")
def agency_detail():
    agency_slug = request.args.get("id", "")
    if not agency_slug:
        return render_template(
            "error.html",
            title="eCFR Analyzer - Error",
            page_title="Error",
            error_message="No agency ID provided",
            timestamp=datetime.now().strftime("%Y-%m-%d"),
            active_page="agency",
        )

    # Load agency hierarchy
    hierarchy = load_agency_hierarchy_data()
    if not hierarchy or "agencies" not in hierarchy:
        return render_template(
            "error.html",
            title="eCFR Analyzer - Error",
            page_title="Error",
            error_message="Agency data not available",
            timestamp=datetime.now().strftime("%Y-%m-%d"),
            active_page="agency",
        )

    # Find the agency
    agency_data = None
    is_parent = True
    parent_agency = None

    # Check if it's a parent agency
    for agency in hierarchy.get("agencies", []):
        if agency.get("slug") == agency_slug:
            agency_data = agency
            break

        # Check if it's a child agency
        for child in agency.get("children", []):
            if child.get("slug") == agency_slug:
                agency_data = child
                is_parent = False
                parent_agency = agency
                break

        if agency_data and not is_parent:
            break

    if not agency_data:
        return render_template(
            "error.html",
            title="eCFR Analyzer - Error",
            page_title="Error",
            error_message=f"Agency with ID '{agency_slug}' not found",
            timestamp=datetime.now().strftime("%Y-%m-%d"),
            active_page="agency",
        )

    # Load additional data
    word_count_data = load_word_count_data()
    corrections_data = load_corrections_data()
    corrections_over_time = load_corrections_over_time_data()

    # Get specific data for this agency
    agency_word_count = (
        word_count_data.get("agencies", {}).get(agency_slug, {})
        if word_count_data
        else {}
    )
    agency_corrections = (
        corrections_data.get("agencies", {}).get(agency_slug, {})
        if corrections_data
        else {}
    )

    # For parent agencies, collect child data
    child_agencies = []
    if is_parent:
        for child in agency_data.get("children", []):
            child_slug = child.get("slug")
            child_word_count = (
                word_count_data.get("agencies", {}).get(child_slug, {})
                if word_count_data
                else {}
            )
            child_corrections = (
                corrections_data.get("agencies", {}).get(child_slug, {})
                if corrections_data
                else {}
            )

            child_agencies.append(
                {
                    "name": child.get("name"),
                    "slug": child_slug,
                    "word_count": child_word_count.get("word_count", 0),
                    "corrections": child_corrections.get("total_corrections", 0),
                }
            )

    # Prepare JSON data for JavaScript
    agency_json = json.dumps(
        {
            "name": agency_data.get("name", ""),
            "slug": agency_data.get("slug", ""),
            "isParent": is_parent,
        }
    )

    # Prepare word count data for JavaScript
    word_count_json = "[]"
    if agency_word_count and "titles" in agency_word_count:
        word_count_list = []
        for title_num, title_data in agency_word_count["titles"].items():
            word_count_list.append(
                {
                    "title": f"Title {title_num}",
                    "wordCount": title_data.get("word_count", 0),
                }
            )
        word_count_json = json.dumps(word_count_list)

    # Prepare corrections data for JavaScript
    corrections_json = "[]"
    if agency_corrections and "corrections_by_year" in agency_corrections:
        corrections_list = []
        for year, count in agency_corrections["corrections_by_year"].items():
            corrections_list.append({"year": int(year), "count": count})
        corrections_json = json.dumps(corrections_list)

    return render_template(
        "agency-detail.html",
        title=f"{agency_data.get('name')} - Agency Detail",
        page_title=agency_data.get("name"),
        agency=agency_data,
        is_parent=is_parent,
        parent_agency=parent_agency,
        word_count=agency_word_count,
        corrections=agency_corrections,
        child_agencies=child_agencies,
        agency_json=agency_json,
        word_count_json=word_count_json,
        corrections_json=corrections_json,
        timestamp=datetime.now().strftime("%Y-%m-%d"),
        active_page="agency",
    )


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
    project_root = script_path.parent.parent.parent.parent

    # Use environment variable if set, otherwise use default path relative to project root
    data_dir = Path(os.environ.get("ECFR_DATA_DIR", project_root / "data" / "analysis"))

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
