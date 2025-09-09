import pytest
from backend.app.repositories import metrics

def test_metrics_repository_class_exists():
    assert hasattr(metrics, 'MetricsRepository'), 'MetricsRepository class should exist.'