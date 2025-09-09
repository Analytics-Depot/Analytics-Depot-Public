import pytest
from backend.app.integrations.connectors.processors import document_processor

def test_document_processor_class_exists():
    assert hasattr(document_processor, 'DocumentProcessor'), 'DocumentProcessor class should exist.'