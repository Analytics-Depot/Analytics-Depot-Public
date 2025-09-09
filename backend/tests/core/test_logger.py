import pytest
from backend.app.core import logger

def test_logger_exists():
    assert hasattr(logger, 'logger'), 'Logger module should have a logger object.'