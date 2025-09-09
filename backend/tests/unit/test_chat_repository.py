import pytest
from unittest.mock import Mock, patch
from uuid import uuid4
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError
from app.repositories.chat import ChatRepository
from app.models.chat import Chat, ChatMessage, ChatFileData
from app.models.user import User


class TestChatRepository:
    """Test suite for chat repository"""

    @pytest.fixture
    def chat_repo(self, db_session):
        """Create chat repository instance"""
        return ChatRepository(db_session)

    @pytest.fixture
    def sample_chat(self, db_session, test_user):
        """Create a sample chat for testing"""
        chat = Chat(
            user_id=test_user.id,
            name="Test Chat",
            industry="finance"
        )
        db_session.add(chat)
        db_session.commit()
        db_session.refresh(chat)
        return chat

    def test_create_chat_success(self, chat_repo, test_user):
        """Test successful chat creation"""
        chat = chat_repo.create_chat(
            user_id=test_user.id,
            name="New Chat",
            industry="real_estate"
        )
        
        assert chat is not None
        assert chat.name == "New Chat"
        assert chat.industry == "real_estate"
        assert chat.user_id == test_user.id
        assert chat.created_at is not None

    def test_create_chat_minimal_params(self, chat_repo, test_user):
        """Test chat creation with minimal parameters"""
        chat = chat_repo.create_chat(
            user_id=test_user.id,
            name="Minimal Chat"
        )
        
        assert chat is not None
        assert chat.name == "Minimal Chat"
        assert chat.industry is None

    def test_create_chat_database_error(self, chat_repo, test_user):
        """Test chat creation with database error"""
        with patch.object(chat_repo.db, 'add', side_effect=SQLAlchemyError("DB Error")):
            chat = chat_repo.create_chat(
                user_id=test_user.id,
                name="Error Chat"
            )
            assert chat is None

    def test_get_chat_by_id_success(self, chat_repo, sample_chat, test_user):
        """Test successful chat retrieval by ID"""
        retrieved_chat = chat_repo.get_chat_by_id(sample_chat.id, test_user.id)
        
        assert retrieved_chat is not None
        assert retrieved_chat.id == sample_chat.id
        assert retrieved_chat.name == sample_chat.name

    def test_get_chat_by_id_not_found(self, chat_repo, test_user):
        """Test chat retrieval with non-existent ID"""
        fake_id = uuid4()
        retrieved_chat = chat_repo.get_chat_by_id(fake_id, test_user.id)
        assert retrieved_chat is None

    def test_get_chat_by_id_wrong_user(self, chat_repo, sample_chat, admin_user):
        """Test chat retrieval with wrong user ID"""
        retrieved_chat = chat_repo.get_chat_by_id(sample_chat.id, admin_user.id)
        assert retrieved_chat is None

    def test_get_user_chats_success(self, chat_repo, test_user, db_session):
        """Test successful retrieval of user chats"""
        # Create multiple chats
        chat1 = Chat(user_id=test_user.id, name="Chat 1", industry="finance")
        chat2 = Chat(user_id=test_user.id, name="Chat 2", industry="legal")
        db_session.add_all([chat1, chat2])
        db_session.commit()
        
        chats = chat_repo.get_user_chats(test_user.id)
        
        assert len(chats) == 2
        chat_names = [chat.name for chat in chats]
        assert "Chat 1" in chat_names
        assert "Chat 2" in chat_names

    def test_get_user_chats_with_pagination(self, chat_repo, test_user, db_session):
        """Test user chats retrieval with pagination"""
        # Create multiple chats
        for i in range(5):
            chat = Chat(user_id=test_user.id, name=f"Chat {i}")
            db_session.add(chat)
        db_session.commit()
        
        # Test pagination
        chats_page1 = chat_repo.get_user_chats(test_user.id, skip=0, limit=2)
        chats_page2 = chat_repo.get_user_chats(test_user.id, skip=2, limit=2)
        
        assert len(chats_page1) == 2
        assert len(chats_page2) == 2
        
        # Ensure different chats on different pages
        page1_ids = {chat.id for chat in chats_page1}
        page2_ids = {chat.id for chat in chats_page2}
        assert page1_ids.isdisjoint(page2_ids)

    def test_get_user_chats_empty(self, chat_repo, test_user):
        """Test user chats retrieval when no chats exist"""
        chats = chat_repo.get_user_chats(test_user.id)
        assert chats == []

    def test_update_chat_success(self, chat_repo, sample_chat, test_user):
        """Test successful chat update"""
        updated_chat = chat_repo.update_chat(
            sample_chat.id, 
            test_user.id, 
            name="Updated Chat Name"
        )
        
        assert updated_chat is not None
        assert updated_chat.name == "Updated Chat Name"
        assert updated_chat.updated_at is not None

    def test_update_chat_not_found(self, chat_repo, test_user):
        """Test chat update with non-existent chat"""
        fake_id = uuid4()
        updated_chat = chat_repo.update_chat(fake_id, test_user.id, name="New Name")
        assert updated_chat is None

    def test_update_chat_wrong_user(self, chat_repo, sample_chat, admin_user):
        """Test chat update with wrong user"""
        updated_chat = chat_repo.update_chat(
            sample_chat.id, 
            admin_user.id, 
            name="Hacked Name"
        )
        assert updated_chat is None

    def test_delete_chat_success(self, chat_repo, sample_chat, test_user):
        """Test successful chat deletion"""
        result = chat_repo.delete_chat(sample_chat.id, test_user.id)
        assert result is True
        
        # Verify chat is deleted
        deleted_chat = chat_repo.get_chat_by_id(sample_chat.id, test_user.id)
        assert deleted_chat is None

    def test_delete_chat_not_found(self, chat_repo, test_user):
        """Test chat deletion with non-existent chat"""
        fake_id = uuid4()
        result = chat_repo.delete_chat(fake_id, test_user.id)
        assert result is False

    def test_delete_chat_wrong_user(self, chat_repo, sample_chat, admin_user):
        """Test chat deletion with wrong user"""
        result = chat_repo.delete_chat(sample_chat.id, admin_user.id)
        assert result is False

    def test_add_message_success(self, chat_repo, sample_chat):
        """Test successful message addition"""
        message = chat_repo.add_message(
            chat_id=sample_chat.id,
            role="user",
            content="Test message",
            message_type="text"
        )
        
        assert message is not None
        assert message.role == "user"
        assert message.content == "Test message"
        assert message.type == "text"
        assert message.chat_id == sample_chat.id

    def test_add_message_default_type(self, chat_repo, sample_chat):
        """Test message addition with default type"""
        message = chat_repo.add_message(
            chat_id=sample_chat.id,
            role="assistant",
            content="Response message"
        )
        
        assert message is not None
        assert message.type == "text"  # default value

    def test_add_message_database_error(self, chat_repo, sample_chat):
        """Test message addition with database error"""
        with patch.object(chat_repo.db, 'add', side_effect=SQLAlchemyError("DB Error")):
            message = chat_repo.add_message(
                chat_id=sample_chat.id,
                role="user",
                content="Error message"
            )
            assert message is None

    def test_get_chat_messages_success(self, chat_repo, sample_chat, db_session):
        """Test successful retrieval of chat messages"""
        # Add multiple messages
        msg1 = ChatMessage(
            chat_id=sample_chat.id,
            role="user",
            content="Hello",
            type="text"
        )
        msg2 = ChatMessage(
            chat_id=sample_chat.id,
            role="assistant",
            content="Hi there!",
            type="text"
        )
        db_session.add_all([msg1, msg2])
        db_session.commit()
        
        messages = chat_repo.get_chat_messages(sample_chat.id)
        
        assert len(messages) == 2
        assert messages[0].content in ["Hello", "Hi there!"]
        assert messages[1].content in ["Hello", "Hi there!"]

    def test_get_chat_messages_empty(self, chat_repo, sample_chat):
        """Test message retrieval when no messages exist"""
        messages = chat_repo.get_chat_messages(sample_chat.id)
        assert messages == []

    def test_get_chat_messages_with_limit(self, chat_repo, sample_chat, db_session):
        """Test message retrieval with limit"""
        # Add multiple messages
        for i in range(5):
            msg = ChatMessage(
                chat_id=sample_chat.id,
                role="user",
                content=f"Message {i}",
                type="text"
            )
            db_session.add(msg)
        db_session.commit()
        
        messages = chat_repo.get_chat_messages(sample_chat.id, limit=3)
        assert len(messages) == 3

    def test_add_file_data_success(self, chat_repo, sample_chat):
        """Test successful file data addition"""
        file_data = chat_repo.add_file_data(
            chat_id=sample_chat.id,
            filename="test.csv",
            file_type="csv",
            content={"data": [1, 2, 3]},
            summary="Test file upload"
        )
        
        assert file_data is not None
        assert file_data.filename == "test.csv"
        assert file_data.file_type == "csv"
        assert file_data.content == {"data": [1, 2, 3]}
        assert file_data.summary == "Test file upload"

    def test_add_file_data_database_error(self, chat_repo, sample_chat):
        """Test file data addition with database error"""
        with patch.object(chat_repo.db, 'add', side_effect=SQLAlchemyError("DB Error")):
            file_data = chat_repo.add_file_data(
                chat_id=sample_chat.id,
                filename="error.csv",
                file_type="csv",
                content={},
                summary="Error test"
            )
            assert file_data is None

    def test_get_chat_file_data_success(self, chat_repo, sample_chat, db_session):
        """Test successful retrieval of chat file data"""
        # Add file data
        file_data = ChatFileData(
            chat_id=sample_chat.id,
            filename="test.json",
            file_type="json",
            content={"test": "data"},
            summary="Test file"
        )
        db_session.add(file_data)
        db_session.commit()
        
        retrieved_data = chat_repo.get_chat_file_data(sample_chat.id)
        
        assert len(retrieved_data) == 1
        assert retrieved_data[0].filename == "test.json"
        assert retrieved_data[0].content == {"test": "data"}

    def test_get_chat_file_data_empty(self, chat_repo, sample_chat):
        """Test file data retrieval when no data exists"""
        file_data = chat_repo.get_chat_file_data(sample_chat.id)
        assert file_data == []

    def test_get_chat_file_data_multiple_files(self, chat_repo, sample_chat, db_session):
        """Test retrieval of multiple file data entries"""
        # Add multiple file data entries
        file1 = ChatFileData(
            chat_id=sample_chat.id,
            filename="file1.csv",
            file_type="csv",
            content={"data1": "test1"},
            summary="File 1"
        )
        file2 = ChatFileData(
            chat_id=sample_chat.id,
            filename="file2.json",
            file_type="json",
            content={"data2": "test2"},
            summary="File 2"
        )
        db_session.add_all([file1, file2])
        db_session.commit()
        
        file_data = chat_repo.get_chat_file_data(sample_chat.id)
        
        assert len(file_data) == 2
        filenames = [fd.filename for fd in file_data]
        assert "file1.csv" in filenames
        assert "file2.json" in filenames