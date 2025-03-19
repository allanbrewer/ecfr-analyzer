# ECFR Analyzer

A tool for analyzing the Electronic Code of Federal Regulations (eCFR) to identify patterns in regulatory language, particularly focusing on DEI (Diversity, Equity, and Inclusion) terminology and bureaucratic complexity.

## Project Overview

The eCFR Analyzer retrieves and processes data from the [Electronic Code of Federal Regulations](https://www.ecfr.gov/) and [GovInfo](https://www.govinfo.gov/) to provide analytics on regulatory content. It uses real-time API data and bulk downloads to analyze:

- Regulatory word counts by agency
- Historical changes to regulations
- Corrections to published regulations
- Keyword footprint analysis across agencies
- Bureaucratic complexity and vague language metrics

## Features

- Analysis of DEI-related terminology in regulations
- Measurement of bureaucratic language complexity
- Historical correction tracking
- Agency-specific analysis
- Interactive data visualization
- Modern Next.js and TypeScript implementation

## Project Structure

```
ecfr-analyzer/
├── frontend/                   # Next.js frontend application
│   ├── src/
│   │   ├── app/                # Next.js app router pages
│   │   ├── components/         # React components
│   │   ├── types/              # TypeScript type definitions
│   │   └── utils/              # Utility functions
│   ├── public/                 # Static assets
│   └── package.json            # Frontend dependencies
├── data/                       # Analysis data files
│   ├── analysis/               # Generated analysis results
│   └── raw/                    # Raw eCFR data
├── src/
│    └── ecfr_analyzer/         # Source code
│       ├── process_data/       # Data processing and analysis
│          ├── ecfr_api.py      # API client for data retrieval
│          └── data_analyzer.py # Analysis algorithms
└── README.md
```

## Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ecfr-analyzer.git
cd ecfr-analyzer
```

2. Install Python dependencies:
```bash
poetry env use python3.11
poetry install
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
# or
yarn install
```

## Development

1. Start the frontend development server:
```bash
cd frontend
npm run dev
# or
yarn dev
```

2. The application will be available at `http://localhost:3000`

## Building for Production

1. Build the frontend:
```bash
cd frontend
npm run build
# or
yarn build
```

2. Start the production server:
```bash
npm run start
# or
yarn start
```

## Deployment

The frontend can be deployed to any static hosting service that supports Next.js applications. Here are some popular options:

### Vercel (Recommended)
1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
cd frontend
vercel
```

### Netlify
1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Deploy:
```bash
cd frontend
netlify deploy
```

### GitHub Pages
1. Add the following to your `next.config.js`:
```javascript
module.exports = {
  output: 'export',
  basePath: '/ecfr-analyzer',
  images: {
    unoptimized: true
  }
}
```

2. Build and deploy:
```bash
cd frontend
npm run build
npm run export
```

## Data Analysis

The Python scripts in the `scripts` directory handle the analysis of eCFR data. These scripts generate the JSON files used by the frontend application.

### Running Analysis

1. Ensure you have the required Python packages installed:
```bash
poetry install
```
2. Download the data

```bash
# Download administrative data (agencies, corrections)
poetry run python -m ecfr_analyzer.process_data.ecfr_api download_admin_data

# Download JSON bulk data for historical analysis
poetry run python -m ecfr_analyzer.process_data.ecfr_api download_bulk_data
```

3. Run the analysis scripts:
```bash
poetry run python -m ecfr_analyzer.process_data.data_analyzer
```

The analysis results will be saved in the `data/analysis` directory.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
