from sqlalchemy import Column, String, DateTime, Text, Index, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid
from ..db.database import Base
from pydantic import BaseModel

class Chat(Base):
    __tablename__ = 'chats'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)  # Store Supabase user ID directly
    name = Column(String, nullable=False)
    industry = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships (no foreign key to users table since we use Supabase)
    messages = relationship("ChatMessage", back_populates="chat", cascade="all, delete-orphan")
    file_data = relationship("ChatFileData", back_populates="chat", cascade="all, delete-orphan")

    __table_args__ = (
        Index('idx_chats_user_time', 'user_id', 'created_at'),
    )

class ChatMessage(Base):
    __tablename__ = 'chat_messages'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    chat_id = Column(String, ForeignKey('chats.id', ondelete='CASCADE'), nullable=False)
    role = Column(String(50), nullable=False)  # 'user', 'assistant', or 'system'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    chat = relationship("Chat", back_populates="messages")

    __table_args__ = (
        Index('idx_messages_chat_time', 'chat_id', 'created_at'),
    )

class ChatFileData(Base):
    __tablename__ = 'chat_file_data'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    chat_id = Column(String, ForeignKey('chats.id', ondelete='CASCADE'), nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # 'csv', 'json'
    content = Column(JSON, nullable=False)  # Store the actual file content as JSON
    summary = Column(Text, nullable=True)  # Store analysis summary
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    chat = relationship("Chat", back_populates="file_data")

    __table_args__ = (
        Index('idx_file_data_chat', 'chat_id'),
    )

class SpecialistProfile(BaseModel):
    profile: str