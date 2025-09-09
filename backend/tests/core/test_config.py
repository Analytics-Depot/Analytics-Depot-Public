import pytest
from backend.app.core import config

def test_config_has_settings():
    assert hasattr(config, 'settings'), 'Config should have settings attribute.'