# eCFR Analyzer

A comprehensive tool for analyzing U.S. Electronic Code of Federal Regulations (eCFR) data to extract insights about regulatory complexity, historical changes, and agency-specific metrics.

## Project Overview

The eCFR Analyzer retrieves and processes data from the [Electronic Code of Federal Regulations](https://www.ecfr.gov/) and [GovInfo](https://www.govinfo.gov/) to provide analytics on regulatory content. It uses real-time API data and bulk downloads to analyze:

- Regulatory word counts by agency
- Historical changes to regulations
- Corrections to published regulations
- Keyword footprint analysis across agencies
- Bureaucratic complexity and vague language metrics

## Key Features

### Data Retrieval
- Fetches real-time data from eCFR API endpoints
- Downloads bulk historical data from GovInfo
- Caches responses to minimize API requests

### Analytics
- **Word Count Analysis**: Measures regulatory volume by agency
- **Historical Changes Analysis**: Tracks changes to regulations over time
- **Corrections Analysis**: Monitors corrections made to published regulations
- **Keyword Footprint Analysis**: Identifies prevalence of specified keywords (e.g., DEI terms, waste-related terms)
- **Vague Language Analysis**: Identifies bureaucratic complexity and ambiguous language

### Visualizations
- Word count bar charts and pie charts
- Historical change timelines 
- Agency correction heat maps
- Keyword distribution visualizations
- Comparative agency metrics

## Installation

### Prerequisites
- Python 3.11 or higher
- Poetry (Python package manager)
- GovInfo API key ([request here](https://api.govinfo.gov/))

### Setup Environment

```bash
# Clone repository (if not already done)
git clone https://github.com/abrewer/ecfr-analyzer.git
cd ecfr-analyzer

# Set up Python environment with Poetry
poetry env use /usr/local/bin/python3.11
poetry install
```

### Configure API Keys

Create an environment file:

```bash
touch .env
```

Add your GovInfo API key to the `.env` file:

```
GOVINFO_API_KEY = "your-govinfo-api-key"
```

## Usage

### Download Data

Download necessary eCFR data before running analyses:

```bash
# Download administrative data (agencies, corrections)
poetry run python -m ecfr_analyzer.backend.ecfr_api download_admin_data

# Download JSON bulk data for historical analysis
poetry run python -m ecfr_analyzer.backend.ecfr_api download_json_bulk_data
```

### Run Analyses

Run the full suite of analyses:

```bash
poetry run python -m ecfr_analyzer.backend.data_analyzer run_all_analyses
```

Or run specific analyses:

```bash
# Word count analysis
poetry run python -m ecfr_analyzer.backend.data_analyzer analyze_word_count

# Historical changes analysis
poetry run python -m ecfr_analyzer.backend.data_analyzer analyze_historical_changes

# Corrections analysis
poetry run python -m ecfr_analyzer.backend.data_analyzer analyze_corrections

# Keyword analysis
poetry run python -m ecfr_analyzer.backend.data_analyzer analyze_keywords
```

### Web Interface

Start the web interface to view visualizations:

```bash
poetry run python -m ecfr_analyzer.website.app
```

Navigate to `http://localhost:8000` in your browser to access the dashboard.

## Output

Analysis results are stored in the `data/analysis` directory in JSON format. These can be:

1. Loaded directly into other applications
2. Visualized through the web interface
3. Exported to CSV format

## Project Structure

```
ecfr-analyzer/
├── data/                   # Data storage
│   ├── raw/                # Raw data from APIs
│   ├── processed/          # Processed intermediate data
│   └── analysis/           # Analysis results
├── src/
│   └── ecfr_analyzer/      # Source code
│       ├── backend/        # Data processing and analysis
│       │   ├── ecfr_api.py # API client for data retrieval
│       │   └── data_analyzer.py # Analysis algorithms
│       ├── website/        # Web interface
│       └── cli.py          # Command-line interface
└── tests/                  # Test suite
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
