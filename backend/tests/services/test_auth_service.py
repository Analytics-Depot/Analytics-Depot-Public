import pytest
from backend.app.services import auth

def test_auth_function_exists():
    assert hasattr(auth, 'authenticate_user'), 'Auth module should have authenticate_user function.'