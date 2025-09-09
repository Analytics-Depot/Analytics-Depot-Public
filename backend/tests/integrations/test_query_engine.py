import pytest
from app.integrations.connectors.query_engine import QueryEngine

def test_query_engine_class_exists():
    assert QueryEngine is not None, 'QueryEngine class should exist.'