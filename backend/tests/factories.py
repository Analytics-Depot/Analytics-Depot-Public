import factory
from factory import LazyAttribute, SubFactory
from faker import Faker
from backend.app.models.user import User
from backend.app.models.chat import Chat, ChatMessage
import uuid

fake = Faker()


class UserFactory(factory.Factory):
    """Factory for creating test users"""

    class Meta:
        model = User

    id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    hashed_password = factory.LazyFunction(lambda: User.hash_password("testpassword123"))
    full_name = factory.Faker("name")
    is_active = True
    is_admin = False
    status = "Active"
    subscription_level = "Basic"
    is_banned = False
    failed_login_attempts = "0"


class AdminUserFactory(UserFactory):
    """Factory for creating test admin users"""

    username = factory.Sequence(lambda n: f"admin{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    is_admin = True
    full_name = factory.Faker("name")


class ChatFactory(factory.Factory):
    """Factory for creating test chats"""

    class Meta:
        model = Chat

    id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    user_id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    name = factory.Faker("catch_phrase")
    industry = factory.Faker("random_element", elements=["real_estate", "legal", "finance", "medical", "insurance", "management"])


class ChatMessageFactory(factory.Factory):
    """Factory for creating test chat messages"""

    class Meta:
        model = ChatMessage

    id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    chat_id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    role = factory.Faker("random_element", elements=["user", "assistant", "system"])
    content = factory.Faker("text", max_nb_chars=500)


class TestDataBuilder:
    """Builder class for creating complex test scenarios"""

    @staticmethod
    def create_user_with_chats(db_session, num_chats=3):
        """Create a user with multiple chats"""
        user = UserFactory()
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        chats = []
        for _ in range(num_chats):
            chat = ChatFactory(user_id=user.id)
            db_session.add(chat)
            chats.append(chat)

        db_session.commit()
        return user, chats

    @staticmethod
    def create_chat_with_messages(db_session, user_id=None, num_messages=5):
        """Create a chat with multiple messages"""
        if not user_id:
            user = UserFactory()
            db_session.add(user)
            db_session.commit()
            user_id = user.id

        chat = ChatFactory(user_id=user_id)
        db_session.add(chat)
        db_session.commit()
        db_session.refresh(chat)

        messages = []
        for i in range(num_messages):
            role = "user" if i % 2 == 0 else "assistant"
            message = ChatMessageFactory(chat_id=chat.id, role=role)
            db_session.add(message)
            messages.append(message)

        db_session.commit()
        return chat, messages