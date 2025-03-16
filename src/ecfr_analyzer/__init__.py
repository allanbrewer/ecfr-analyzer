"""A comprehensive tool for analyzing U.S. Electronic Code of Federal Regulations (eCFR) data to 
extract insights about regulatory complexity, historical changes, and agency-specific metrics."""

__version__ = "0.1.0"
__license__ = "MIT License"

import logging

# Configure the root logger
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Get the root logger
logger = logging.getLogger()

# Set the level for all loggers
logger.setLevel(logging.INFO)

# Log startup message
logging.info("Starting eCFR analyzer service...")
