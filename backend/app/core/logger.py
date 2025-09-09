"""
Centralized logging configuration for Analytics Depot Backend.
This is the single source of truth for all logging setup.
"""

import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path

# Create logs directory in the backend folder (single location)
backend_dir = Path(__file__).parent.parent.parent  # Go up to backend/
logs_dir = backend_dir / "logs"
logs_dir.mkdir(exist_ok=True)

# Configure the main logger
logger = logging.getLogger("analytics_depot")
logger.setLevel(logging.INFO)

# Prevent duplicate logs if logger is already configured
if not logger.handlers:
    # File handler with rotation
    log_file = logs_dir / "app.log"
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.INFO)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    
    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    
    # Add handlers to logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

# Make logger available for import
__all__ = ['logger']
