import pytest
from backend.app.models import monitoring

def test_monitoring_model_exists():
    assert hasattr(monitoring, 'Monitoring'), 'Monitoring model should exist.'