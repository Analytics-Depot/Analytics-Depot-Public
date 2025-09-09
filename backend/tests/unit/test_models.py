import pytest
import uuid
from datetime import datetime
from app.models.user import User
from app.models.chat import Chat, ChatMessage
from tests.factories import UserFactory, AdminUserFactory, ChatFactory, ChatMessageFactory


class TestUserModel:
    """Test cases for User model"""
    
    @pytest.mark.unit
    def test_user_creation(self, db_session):
        """Test user creation with all required fields"""
        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password=User.hash_password("password123"),
            full_name="Test User"
        )
        db_session.add(user)
        db_session.commit()
        
        assert user.id is not None
        assert user.username == "testuser"
        assert user.email == "test@example.com"
        assert user.full_name == "Test User"
        assert user.is_active is True
        assert user.is_admin is False
        assert user.status == "Active"
        assert user.subscription_level == "Basic"
        assert user.created_at is not None
    
    @pytest.mark.unit
    def test_user_password_hashing(self):
        """Test password hashing functionality"""
        password = "secretpassword123"
        hashed = User.hash_password(password)
        
        assert hashed != password
        assert len(hashed) > len(password)
        assert hashed.startswith("$2b$")
    
    @pytest.mark.unit
    def test_user_password_verification(self):
        """Test password verification"""
        password = "testpassword123"
        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password=User.hash_password(password),
            full_name="Test User"
        )
        
        assert user.verify_password(password) is True
        assert user.verify_password("wrongpassword") is False
        assert user.verify_password("") is False
    
    @pytest.mark.unit
    def test_user_factory(self, db_session):
        """Test user factory creates valid users"""
        user = UserFactory()
        db_session.add(user)
        db_session.commit()
        
        assert user.id is not None
        assert user.username is not None
        assert user.email is not None
        assert "@example.com" in user.email
        assert user.hashed_password is not None
        assert user.is_active is True
        assert user.is_admin is False
    
    @pytest.mark.unit
    def test_admin_user_factory(self, db_session):
        """Test admin user factory creates admin users"""
        admin = AdminUserFactory()
        db_session.add(admin)
        db_session.commit()
        
        assert admin.is_admin is True
        assert admin.username.startswith("admin")
        assert admin.email is not None
    
    @pytest.mark.unit
    def test_user_unique_constraints(self, db_session):
        """Test unique constraints on username and email"""
        user1 = UserFactory(username="unique_user", email="unique@example.com")
        db_session.add(user1)
        db_session.commit()
        
        # Try to create another user with same username
        user2 = UserFactory(username="unique_user", email="different@example.com")
        db_session.add(user2)
        
        with pytest.raises(Exception):  # Should raise integrity error
            db_session.commit()
    
    @pytest.mark.unit
    def test_user_default_values(self, db_session):
        """Test user model default values"""
        user = User(
            username="defaultuser",
            email="default@example.com",
            hashed_password=User.hash_password("password")
        )
        db_session.add(user)
        db_session.commit()
        
        assert user.is_active is True
        assert user.is_admin is False
        assert user.status == "Active"
        assert user.subscription_level == "Basic"
        assert user.is_banned is False
        assert user.failed_login_attempts == "0"
    
    @pytest.mark.unit
    def test_user_string_representation(self, db_session):
        """Test user model string representation"""
        user = UserFactory(username="testuser")
        db_session.add(user)
        db_session.commit()
        
        # Test that user object can be converted to string without error
        str_repr = str(user)
        assert isinstance(str_repr, str)
        assert len(str_repr) > 0


class TestChatModel:
    """Test cases for Chat model"""
    
    @pytest.mark.unit
    def test_chat_creation(self, db_session):
        """Test chat creation with required fields"""
        user = UserFactory()
        db_session.add(user)
        db_session.commit()
        
        chat = Chat(
            user_id=user.id,
            name="Test Chat",
            industry="real_estate"
        )
        db_session.add(chat)
        db_session.commit()
        
        assert chat.id is not None
        assert chat.user_id == user.id
        assert chat.name == "Test Chat"
        assert chat.industry == "real_estate"
        assert chat.created_at is not None
    
    @pytest.mark.unit
    def test_chat_factory(self, db_session):
        """Test chat factory creates valid chats"""
        user = UserFactory()
        db_session.add(user)
        db_session.commit()
        
        chat = ChatFactory(user_id=user.id)
        db_session.add(chat)
        db_session.commit()
        
        assert chat.id is not None
        assert chat.user_id == user.id
        assert chat.name is not None
        assert chat.industry in ["real_estate", "legal", "finance", "medical", "insurance", "management"]
    
    @pytest.mark.unit
    def test_chat_user_relationship(self, db_session):
        """Test chat-user relationship"""
        user = UserFactory()
        db_session.add(user)
        db_session.commit()
        
        chat = ChatFactory(user_id=user.id)
        db_session.add(chat)
        db_session.commit()
        
        # Test relationship works
        assert chat.user_id == user.id
        # Note: Relationship loading would require proper SQLAlchemy setup


class TestChatMessageModel:
    """Test cases for ChatMessage model"""
    
    @pytest.mark.unit
    def test_chat_message_creation(self, db_session):
        """Test chat message creation"""
        user = UserFactory()
        db_session.add(user)
        db_session.commit()
        
        chat = ChatFactory(user_id=user.id)
        db_session.add(chat)
        db_session.commit()
        
        message = ChatMessage(
            chat_id=chat.id,
            role="user",
            content="Test message content"
        )
        db_session.add(message)
        db_session.commit()
        
        assert message.id is not None
        assert message.chat_id == chat.id
        assert message.role == "user"
        assert message.content == "Test message content"
        assert message.created_at is not None
    
    @pytest.mark.unit
    def test_chat_message_factory(self, db_session):
        """Test chat message factory"""
        user = UserFactory()
        db_session.add(user)
        db_session.commit()
        
        chat = ChatFactory(user_id=user.id)
        db_session.add(chat)
        db_session.commit()
        
        message = ChatMessageFactory(chat_id=chat.id)
        db_session.add(message)
        db_session.commit()
        
        assert message.id is not None
        assert message.chat_id == chat.id
        assert message.role in ["user", "assistant", "system"]
        assert message.content is not None
        assert len(message.content) <= 500
    
    @pytest.mark.unit
    def test_chat_message_roles(self, db_session):
        """Test different message roles"""
        user = UserFactory()
        db_session.add(user)
        db_session.commit()
        
        chat = ChatFactory(user_id=user.id)
        db_session.add(chat)
        db_session.commit()
        
        roles = ["user", "assistant", "system"]
        for role in roles:
            message = ChatMessageFactory(chat_id=chat.id, role=role)
            db_session.add(message)
        
        db_session.commit()
        
        # Verify all messages were created
        messages = db_session.query(ChatMessage).filter_by(chat_id=chat.id).all()
        assert len(messages) == 3
        assert set(msg.role for msg in messages) == set(roles)