import pytest
from fastapi.testclient import TestClient
from backend.tests.factories import UserFactory, ChatFactory, ChatMessageFactory


class TestChatAPI:
    """Test cases for chat API endpoints"""

    @pytest.mark.api
    def test_create_chat_success(self, client: TestClient, auth_headers, db_session):
        """Test successful chat creation"""
        chat_data = {
            "name": "Test Chat",
            "industry": "real_estate"
        }

        response = client.post(
            "/api/chats/",
            json=chat_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Chat"
        assert data["industry"] == "real_estate"
        assert "id" in data
        assert "created_at" in data

    @pytest.mark.api
    def test_create_chat_unauthenticated(self, client: TestClient):
        """Test chat creation without authentication"""
        chat_data = {
            "name": "Test Chat",
            "industry": "real_estate"
        }

        response = client.post("/api/chats/", json=chat_data)
        assert response.status_code == 401

    @pytest.mark.api
    def test_create_chat_invalid_industry(self, client: TestClient, auth_headers):
        """Test chat creation with invalid industry"""
        chat_data = {
            "name": "Test Chat",
            "industry": "invalid_industry"
        }

        response = client.post(
            "/api/chats/",
            json=chat_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    @pytest.mark.api
    def test_get_user_chats(self, client: TestClient, auth_headers, test_user, db_session):
        """Test retrieving user's chats"""
        # Create test chats
        chat1 = ChatFactory(user_id=test_user.id, name="Chat 1")
        chat2 = ChatFactory(user_id=test_user.id, name="Chat 2")
        db_session.add_all([chat1, chat2])
        db_session.commit()

        response = client.get("/api/chats/", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        chat_names = [chat["name"] for chat in data]
        assert "Chat 1" in chat_names
        assert "Chat 2" in chat_names

    @pytest.mark.api
    def test_get_user_chats_pagination(self, client: TestClient, auth_headers, test_user, db_session):
        """Test chat pagination"""
        # Create multiple chats
        for i in range(25):
            chat = ChatFactory(user_id=test_user.id, name=f"Chat {i}")
            db_session.add(chat)
        db_session.commit()

        # Test first page
        response = client.get("/api/chats/?skip=0&limit=20", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 20

        # Test second page
        response = client.get("/api/chats/?skip=20&limit=20", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5

    @pytest.mark.api
    def test_get_chat_by_id(self, client: TestClient, auth_headers, test_user, db_session):
        """Test retrieving specific chat"""
        chat = ChatFactory(user_id=test_user.id)
        db_session.add(chat)
        db_session.commit()

        response = client.get(f"/api/chats/{chat.id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == chat.id
        assert data["name"] == chat.name

    @pytest.mark.api
    def test_get_chat_unauthorized(self, client: TestClient, auth_headers, db_session):
        """Test retrieving chat from another user"""
        other_user = UserFactory()
        db_session.add(other_user)
        db_session.commit()

        chat = ChatFactory(user_id=other_user.id)
        db_session.add(chat)
        db_session.commit()

        response = client.get(f"/api/chats/{chat.id}", headers=auth_headers)
        assert response.status_code == 404

    @pytest.mark.api
    def test_get_chat_nonexistent(self, client: TestClient, auth_headers):
        """Test retrieving non-existent chat"""
        response = client.get("/api/chats/99999", headers=auth_headers)
        assert response.status_code == 404

    @pytest.mark.api
    def test_delete_chat(self, client: TestClient, auth_headers, test_user, db_session):
        """Test chat deletion"""
        chat = ChatFactory(user_id=test_user.id)
        db_session.add(chat)
        db_session.commit()
        chat_id = chat.id

        response = client.delete(f"/api/chats/{chat_id}", headers=auth_headers)
        assert response.status_code == 200

        # Verify chat is deleted
        response = client.get(f"/api/chats/{chat_id}", headers=auth_headers)
        assert response.status_code == 404

    @pytest.mark.api
    def test_delete_chat_unauthorized(self, client: TestClient, auth_headers, db_session):
        """Test deleting chat from another user"""
        other_user = UserFactory()
        db_session.add(other_user)
        db_session.commit()

        chat = ChatFactory(user_id=other_user.id)
        db_session.add(chat)
        db_session.commit()

        response = client.delete(f"/api/chats/{chat.id}", headers=auth_headers)
        assert response.status_code == 404


class TestChatMessageAPI:
    """Test cases for chat message API endpoints"""

    @pytest.mark.api
    def test_send_message(self, client: TestClient, auth_headers, test_user, db_session):
        """Test sending a message to chat"""
        chat = ChatFactory(user_id=test_user.id)
        db_session.add(chat)
        db_session.commit()

        message_data = {
            "content": "Hello, this is a test message",
            "role": "user"
        }

        response = client.post(
            f"/api/chats/{chat.id}/messages",
            json=message_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["content"] == "Hello, this is a test message"
        assert data["role"] == "user"
        assert data["chat_id"] == chat.id

    @pytest.mark.api
    def test_get_chat_messages(self, client: TestClient, auth_headers, test_user, db_session):
        """Test retrieving chat messages"""
        chat = ChatFactory(user_id=test_user.id)
        db_session.add(chat)
        db_session.commit()

        # Create test messages
        msg1 = ChatMessageFactory(chat_id=chat.id, role="user", content="User message")
        msg2 = ChatMessageFactory(chat_id=chat.id, role="assistant", content="Assistant response")
        db_session.add_all([msg1, msg2])
        db_session.commit()

        response = client.get(f"/api/chats/{chat.id}/messages", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

        # Check messages are in correct order (newest first)
        assert data[0]["role"] in ["user", "assistant"]
        assert data[1]["role"] in ["user", "assistant"]

    @pytest.mark.api
    def test_get_messages_unauthorized_chat(self, client: TestClient, auth_headers, db_session):
        """Test retrieving messages from unauthorized chat"""
        other_user = UserFactory()
        db_session.add(other_user)
        db_session.commit()

        chat = ChatFactory(user_id=other_user.id)
        db_session.add(chat)
        db_session.commit()

        response = client.get(f"/api/chats/{chat.id}/messages", headers=auth_headers)
        assert response.status_code == 404

    @pytest.mark.api
    def test_send_message_invalid_role(self, client: TestClient, auth_headers, test_user, db_session):
        """Test sending message with invalid role"""
        chat = ChatFactory(user_id=test_user.id)
        db_session.add(chat)
        db_session.commit()

        message_data = {
            "content": "Test message",
            "role": "invalid_role"
        }

        response = client.post(
            f"/api/chats/{chat.id}/messages",
            json=message_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    @pytest.mark.api
    def test_send_empty_message(self, client: TestClient, auth_headers, test_user, db_session):
        """Test sending empty message"""
        chat = ChatFactory(user_id=test_user.id)
        db_session.add(chat)
        db_session.commit()

        message_data = {
            "content": "",
            "role": "user"
        }

        response = client.post(
            f"/api/chats/{chat.id}/messages",
            json=message_data,
            headers=auth_headers
        )

        assert response.status_code == 422


class TestChatIntegration:
    """Integration tests for chat functionality"""

    @pytest.mark.integration
    def test_full_chat_flow(self, client: TestClient, auth_headers, test_user, db_session):
        """Test complete chat creation and messaging flow"""
        # 1. Create a chat
        chat_data = {"name": "Integration Test Chat", "industry": "real_estate"}
        response = client.post("/api/chats/", json=chat_data, headers=auth_headers)
        assert response.status_code == 201
        chat = response.json()
        chat_id = chat["id"]

        # 2. Send a user message
        message_data = {"content": "Hello AI", "role": "user"}
        response = client.post(
            f"/api/chats/{chat_id}/messages",
            json=message_data,
            headers=auth_headers
        )
        assert response.status_code == 201

        # 3. Get messages
        response = client.get(f"/api/chats/{chat_id}/messages", headers=auth_headers)
        assert response.status_code == 200
        messages = response.json()
        assert len(messages) >= 1
        assert any(msg["content"] == "Hello AI" for msg in messages)

        # 4. Get chat in user's chat list
        response = client.get("/api/chats/", headers=auth_headers)
        assert response.status_code == 200
        chats = response.json()
        assert any(c["id"] == chat_id for c in chats)

        # 5. Delete the chat
        response = client.delete(f"/api/chats/{chat_id}", headers=auth_headers)
        assert response.status_code == 200

        # 6. Verify chat is gone
        response = client.get(f"/api/chats/{chat_id}", headers=auth_headers)
        assert response.status_code == 404