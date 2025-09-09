from sqlalchemy import Boolean, Column, String, DateTime, JSON, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
import uuid
from ..db.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    external_id = Column(String, nullable=False, unique=True, index=True)  # Supabase user ID - required
    role = Column(String, default="user")  # user, admin, expert
    status = Column(String, default="active")  # active, inactive, banned, suspended
    subscription_level = Column(String, default="Free")  # Changed default to Free
    
    # Payment and subscription fields
    stripe_customer_id = Column(String, nullable=True)
    subscription_status = Column(String, default="inactive")  # inactive, active, cancelled, expired
    subscription_plan = Column(String, nullable=True)  # basic, pro, expert_sessions
    subscription_expires_at = Column(DateTime(timezone=True), nullable=True)
    usage_count = Column(Integer, default=0)  # Track monthly API calls
    monthly_limit = Column(Integer, default=20)  # Default to freemium tier
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    failed_login_attempts = Column(Integer, default=0)  # Changed to Integer



    def is_admin(self) -> bool:
        """Check if user has admin role"""
        return self.role == "admin"
    
    def is_expert(self) -> bool:
        """Check if user has expert role"""
        return self.role == "expert"
    
    def is_active(self) -> bool:
        """Check if user account is active"""
        return self.status == "active"
    
    def is_banned(self) -> bool:
        """Check if user account is banned"""
        return self.status == "banned"
    
    def is_suspended(self) -> bool:
        """Check if user account is suspended"""
        return self.status == "suspended"
    
    def has_active_subscription(self) -> bool:
        """Check if user has an active subscription"""
        if not self.subscription_status or self.subscription_status != "active":
            return False
        
        if not self.subscription_expires_at:
            return False
            
        return self.subscription_expires_at > datetime.now(timezone.utc)
    
    def can_make_request(self) -> bool:
        """Check if user can make API requests based on their subscription and usage"""
        # First check if account is active
        if not self.is_active():
            return False
            
        if self.role == "admin":
            return True
        
        # For free tier users, check monthly limit
        if self.subscription_level == "Free":
            return self.usage_count < self.monthly_limit
        
        if not self.has_active_subscription():
            return False
            
        if self.monthly_limit <= 0:  # Unlimited
            return True
            
        return self.usage_count < self.monthly_limit
    
    def increment_usage(self) -> None:
        """Increment the usage count"""
        self.usage_count += 1
    
    def reset_usage(self) -> None:
        """Reset monthly usage count (called at billing cycle)"""
        self.usage_count = 0
    
    def increment_failed_login(self) -> None:
        """Increment failed login attempts"""
        self.failed_login_attempts += 1
    
    def reset_failed_logins(self) -> None:
        """Reset failed login attempts"""
        self.failed_login_attempts = 0
    
    def is_locked(self) -> bool:
        """Check if account is locked due to too many failed attempts"""
        return self.failed_login_attempts >= 15  # Lock after 5 failed attempts
    
    def update_last_login(self) -> None:
        """Update last login timestamp"""
        self.last_login = datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        """Convert user object to dictionary for JSON serialization"""
        return {
            "id": str(self.id),
            "email": self.email,
            "name": self.full_name,
            "external_id": self.external_id,
            "is_active": self.is_active(),
            "role": self.role,
            "is_admin": self.is_admin(),
            "is_expert": self.is_expert(),
            "status": self.status,
            "is_banned": self.is_banned(),
            "subscription_level": self.subscription_level,
            "subscription_status": self.subscription_status,
            "subscription_plan": self.subscription_plan,
            "subscription_expires_at": self.subscription_expires_at.isoformat() if self.subscription_expires_at else None,
            "usage_count": self.usage_count,
            "monthly_limit": self.monthly_limit,
            "has_active_subscription": self.has_active_subscription(),
            "can_make_request": self.can_make_request(),
            "is_locked": self.is_locked(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "failed_login_attempts": self.failed_login_attempts,
        }