import pytest
from backend.app.repositories import user

def test_user_repository_class_exists():
    assert hasattr(user, 'UserRepository'), 'UserRepository class should exist.'