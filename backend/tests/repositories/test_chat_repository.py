import pytest
from backend.app.repositories import chat

def test_chat_repository_class_exists():
    assert hasattr(chat, 'ChatRepository'), 'ChatRepository class should exist.'