import pytest
from backend.app.db import database

def test_database_engine_exists():
    assert hasattr(database, 'engine'), 'Database module should have an engine.'