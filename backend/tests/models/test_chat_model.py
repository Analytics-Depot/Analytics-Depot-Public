import pytest
from backend.app.models import chat

def test_chat_model_exists():
    assert hasattr(chat, 'Chat'), 'Chat model should exist.'