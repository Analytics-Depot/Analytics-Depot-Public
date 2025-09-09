import pytest
from backend.app.models import user

def test_user_model_exists():
    assert hasattr(user, 'User'), 'User model should exist.'