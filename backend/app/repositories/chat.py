from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from ..models.chat import Chat, ChatMessage, ChatFileData
from ..models.user import User
from typing import List, Optional, Dict, Any, Union
import logging
from datetime import datetime
from uuid import UUID
import time

logger = logging.getLogger(__name__)

class ChatRepository:
    def __init__(self, db: Session):
        self.db = db
        # Simple in-memory cache for chat data
        self._chat_cache = {}
        self._cache_ttl = 60  # 1 minute cache TTL

    def _get_cached_chats(self, user_id: str, skip: int, limit: int) -> Optional[List[Chat]]:
        """Get cached chats if still valid"""
        cache_key = f"{user_id}_{skip}_{limit}"
        if cache_key in self._chat_cache:
            cached_data, timestamp = self._chat_cache[cache_key]
            if time.time() - timestamp < self._cache_ttl:
                logger.debug(f"Using cached chats for user: {user_id}")
                return cached_data
            else:
                # Remove expired cache entry
                del self._chat_cache[cache_key]
        return None

    def _cache_chats(self, user_id: str, skip: int, limit: int, chats: List[Chat]):
        """Cache chats with timestamp"""
        cache_key = f"{user_id}_{skip}_{limit}"
        self._chat_cache[cache_key] = (chats, time.time())
        logger.debug(f"Cached chats for user: {user_id}")

    def _ensure_string_id(self, id_value: Union[str, UUID]) -> str:
        """Ensure ID is a string for database operations"""
        if isinstance(id_value, UUID):
            return str(id_value)
        return str(id_value)

    def create_chat(self, user_id: Union[str, UUID], name: str, industry: Optional[str] = None) -> Optional[Chat]:
        """Create a new chat session for a user"""
        try:
            user_id_str = self._ensure_string_id(user_id)
            chat = Chat(user_id=user_id_str, name=name, industry=industry)
            self.db.add(chat)
            self.db.commit()
            self.db.refresh(chat)
            logger.info(f"Created chat session {chat.id} for user {user_id_str}")

            # Clear cache for this user to ensure fresh data
            self._clear_user_cache(user_id_str)

            return chat
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating chat for user {user_id}: {e}")
            return None

    def _clear_user_cache(self, user_id: str):
        """Clear all cached data for a specific user"""
        keys_to_remove = [k for k in self._chat_cache.keys() if k.startswith(f"{user_id}_")]
        for key in keys_to_remove:
            del self._chat_cache[key]
        logger.debug(f"Cleared cache for user: {user_id}")

    def get_chats_by_user(self, user_id: Union[str, UUID], skip: int = 0, limit: int = 20) -> List[Chat]:
        """Get chat sessions for a user with pagination"""
        try:
            user_id_str = self._ensure_string_id(user_id)
            return self.db.query(Chat)\
                .filter(Chat.user_id == user_id_str)\
                .order_by(Chat.created_at.desc())\
                .offset(skip)\
                .limit(limit)\
                .all()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching chats for user {user_id}: {e}")
            return []

    def get_chats_by_user_with_date_filter(self, user_id: Union[str, UUID], start_date: datetime = None, end_date: datetime = None, skip: int = 0, limit: int = 100) -> List[Chat]:
        """Get chat sessions for a user with date range filtering"""
        try:
            user_id_str = self._ensure_string_id(user_id)
            query = self.db.query(Chat).filter(Chat.user_id == user_id_str)

            # Apply date filters if provided
            if start_date:
                query = query.filter(Chat.created_at >= start_date)
            if end_date:
                query = query.filter(Chat.created_at <= end_date)

            return query\
                .order_by(Chat.created_at.desc())\
                .offset(skip)\
                .limit(limit)\
                .all()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching chats for user {user_id} with date filter: {e}")
            return []

    def get_user_chats(self, user_id: Union[str, UUID], skip: int = 0, limit: int = 20) -> List[Chat]:
        """Get chat sessions for a user with pagination, ensuring data integrity"""
        try:
            user_id_str = self._ensure_string_id(user_id)

            # Check cache first
            cached_chats = self._get_cached_chats(user_id_str, skip, limit)
            if cached_chats:
                return cached_chats

            # Query with explicit filtering and validation
            chats = self.db.query(Chat)\
                .filter(Chat.user_id == user_id_str)\
                .filter(Chat.id.isnot(None))\
                .order_by(Chat.created_at.desc())\
                .offset(skip)\
                .limit(limit)\
                .all()

            # Additional validation to ensure chat integrity
            valid_chats = []
            for chat in chats:
                if chat and chat.id and chat.user_id == user_id_str:
                    valid_chats.append(chat)
                else:
                    logger.warning(f"Found invalid chat record: {chat}")

            # Cache the valid chats
            self._cache_chats(user_id_str, skip, limit, valid_chats)

            return valid_chats
        except SQLAlchemyError as e:
            logger.error(f"Error fetching chats for user {user_id}: {e}")
            return []

    def get_chat_by_id(self, chat_id: Union[str, UUID], user_id: Union[str, UUID] = None) -> Optional[Chat]:
        """Get a specific chat, optionally filtered by user"""
        try:
            chat_id_str = self._ensure_string_id(chat_id)
            query = self.db.query(Chat).filter(Chat.id == chat_id_str)
            if user_id:
                user_id_str = self._ensure_string_id(user_id)
                query = query.filter(Chat.user_id == user_id_str)
            return query.first()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching chat {chat_id}: {e}")
            return None

    def add_message(self, chat_id: Union[str, UUID], role: str, content: str, msg_type: str = None) -> Optional[ChatMessage]:
        """Add a message to a chat session with optional type"""
        try:
            chat_id_str = self._ensure_string_id(chat_id)
            message = ChatMessage(chat_id=chat_id_str, role=role, content=content)
            self.db.add(message)
            self.db.commit()
            self.db.refresh(message)
            logger.info(f"Added message by '{role}' to chat {chat_id_str}")
            return message
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error adding message to chat {chat_id}: {e}")
            return None

    def add_file_data(self, chat_id: Union[str, UUID], filename: str, file_type: str, content: Dict[str, Any], summary: str = None) -> Optional[ChatFileData]:
        """Add file data to a chat session"""
        try:
            chat_id_str = self._ensure_string_id(chat_id)
            file_data = ChatFileData(
                chat_id=chat_id_str,
                filename=filename,
                file_type=file_type,
                content=content,
                summary=summary
            )
            self.db.add(file_data)
            self.db.commit()
            self.db.refresh(file_data)
            logger.info(f"Added file data '{filename}' to chat {chat_id_str}")
            return file_data
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error adding file data to chat {chat_id}: {e}")
            return None

    def get_chat_file_data(self, chat_id: Union[str, UUID]) -> List[ChatFileData]:
        """Get all file data associated with a chat"""
        try:
            chat_id_str = self._ensure_string_id(chat_id)
            return self.db.query(ChatFileData)\
                .filter(ChatFileData.chat_id == chat_id_str)\
                .order_by(ChatFileData.uploaded_at.desc())\
                .all()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching file data for chat {chat_id}: {e}")
            return []

    def get_latest_file_data(self, chat_id: Union[str, UUID]) -> Optional[ChatFileData]:
        """Get the most recently uploaded file data for a chat"""
        try:
            chat_id_str = self._ensure_string_id(chat_id)
            return self.db.query(ChatFileData)\
                .filter(ChatFileData.chat_id == chat_id_str)\
                .order_by(ChatFileData.uploaded_at.desc())\
                .first()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching latest file data for chat {chat_id}: {e}")
            return None

    def get_messages_by_chat_id(self, chat_id: Union[str, UUID], limit: int = 100) -> List[ChatMessage]:
        """Get messages for a chat, ordered oldest first."""
        try:
            chat_id_str = self._ensure_string_id(chat_id)
            safe_limit = min(limit, 500)
            return self.db.query(ChatMessage)\
                .filter(ChatMessage.chat_id == chat_id_str)\
                .order_by(ChatMessage.created_at.asc())\
                .limit(safe_limit)\
                .all()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching messages for chat {chat_id}: {e}")
            return []

    def delete_chat(self, chat_id: Union[str, UUID], user_id: Union[str, UUID] = None) -> bool:
        """Delete a chat and all associated messages"""
        try:
            chat_id_str = self._ensure_string_id(chat_id)
            query = self.db.query(Chat).filter(Chat.id == chat_id_str)
            if user_id:
                user_id_str = self._ensure_string_id(user_id)
                query = query.filter(Chat.user_id == user_id_str)

            chat = query.first()
            if not chat:
                return False

            # Clear cache for this user
            if user_id:
                self._clear_user_cache(str(user_id))

            self.db.delete(chat)
            self.db.commit()
            logger.info(f"Deleted chat {chat_id_str}")
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting chat {chat_id}: {e}")
            return False

    def associate_file_with_chat(self, chat_id: Union[str, UUID], file_data: Dict[str, Any]) -> bool:
        """Associate a file with a chat session"""
        try:
            chat_id_str = self._ensure_string_id(chat_id)
            # Implementation depends on your file data model
            # For now, return True as placeholder
            logger.info(f"Associated file with chat {chat_id_str}")
            return True
        except Exception as e:
            logger.error(f"Error associating file with chat {chat_id}: {e}")
            return False

    def get_chat_files(self, chat_id: Union[str, UUID]) -> List[Dict[str, Any]]:
        """Get files associated with a chat session"""
        try:
            chat_id_str = self._ensure_string_id(chat_id)
            # Implementation depends on your file data model
            # For now, return empty list as placeholder
            logger.info(f"Retrieved files for chat {chat_id_str}")
            return []
        except Exception as e:
            logger.error(f"Error getting files for chat {chat_id}: {e}")
            return []

    def update_chat_name(self, chat_id: Union[str, UUID], user_id: Union[str, UUID], new_name: str) -> Optional[Chat]:
        """Update the name of a chat if it belongs to the user."""
        try:
            chat_id_str = self._ensure_string_id(chat_id)
            user_id_str = self._ensure_string_id(user_id)
            chat = self.get_chat_by_id(chat_id_str, user_id_str)
            if not chat:
                logger.warning(f"Attempt to rename non-existent or unauthorized chat {chat_id_str} by user {user_id_str}")
                return None

            chat.name = new_name
            self.db.commit()
            self.db.refresh(chat)
            logger.info(f"Updated name for chat {chat_id_str} by user {user_id_str}")
            return chat
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating chat {chat_id} name for user {user_id}: {e}")
            return None

    def get_recent_messages(self, chat_id: Union[str, UUID], limit: int = 10) -> List[ChatMessage]:
        """Get recent messages for a chat, ordered by creation time (oldest first)."""
        try:
            chat_id_str = self._ensure_string_id(chat_id)
            safe_limit = min(limit, 50)
            return self.db.query(ChatMessage)\
                .filter(ChatMessage.chat_id == chat_id_str)\
                .order_by(ChatMessage.created_at.desc())\
                .limit(safe_limit)\
                .all()[::-1]
        except SQLAlchemyError as e:
            logger.error(f"Error fetching recent messages for chat {chat_id}: {e}")
            return []