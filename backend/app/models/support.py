# app/models/support.py
from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..db.database import Base

class SupportMessage(Base):
    __tablename__ = 'support_messages'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id'), nullable=True)  # Can be null for non-logged-in users
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    priority = Column(String, default='normal')  # high, normal, low
    status = Column(String, default='open')  # open, in_progress, resolved, closed
    admin_response = Column(Text, nullable=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    responded_by = Column(String, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    admin_user = relationship("User", foreign_keys=[responded_by])
    
    def to_dict(self):
        """Convert support message to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "email": self.email,
            "subject": self.subject,
            "message": self.message,
            "priority": self.priority,
            "status": self.status,
            "admin_response": self.admin_response,
            "responded_at": self.responded_at.isoformat() if self.responded_at else None,
            "responded_by": self.responded_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "user_info": {
                "name": self.user.full_name if self.user else self.name,
                "email": self.user.email if self.user else self.email,
                "subscription_plan": self.user.subscription_plan if self.user else None,
                "role": self.user.role if self.user else None
            } if self.user else {
                "name": self.name,
                "email": self.email,
                "subscription_plan": None,
                "role": None
            }
        }
