from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime
from typing import List, Optional, Union
from ..models.user import User
import logging
from uuid import UUID

# Set up logging
logger = logging.getLogger(__name__)

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def _ensure_string_id(self, id_value: Union[str, UUID]) -> str:
        """Ensure ID is a string for database operations"""
        if isinstance(id_value, UUID):
            return str(id_value)
        return str(id_value)

    def create_user(
        self,
        email: str,
        full_name: str,
        external_id: str,  # Supabase user ID
        role: str = "user",
        status: str = "Active",
        subscription_level: str = "Free"
    ) -> User:
        """Create a new user for Supabase authentication (no password needed)"""
        user = User(
            email=email,
            full_name=full_name,
            external_id=external_id,
            role=role,
            status=status,
            subscription_level=subscription_level,
            is_active=True,
            is_banned=False,
            failed_login_attempts=0
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def create_user_from_supabase(self, supabase_id: str, email: str, full_name: str = "", role: str = "user") -> User:
        """Create a new user from Supabase authentication data"""
        
        # Create user without password since auth is handled by Supabase
        new_user = User(
            id=supabase_id,  # Use Supabase ID as primary key
            external_id=supabase_id,  # Also store as external_id for consistency
            email=email,
            full_name=full_name,
            role=role,
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)
        
        return new_user

    def get_user_by_id(self, user_id: Union[str, UUID]) -> Optional[User]:
        user_id_str = self._ensure_string_id(user_id)
        return self.db.query(User).filter(User.id == user_id_str).first()

    def get_user_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def get_user_by_supabase_id(self, supabase_id: str) -> Optional[User]:
        """Get user by Supabase ID (stored in external_id field)"""
        return self.db.query(User).filter(User.external_id == supabase_id).first()

    def get_or_create_user_from_supabase(
        self,
        supabase_id: str,
        email: str,
        full_name: str,
        role: str = "user"
    ) -> User:
        """Get existing user by Supabase ID or create new one"""
        # First try to find by Supabase ID
        user = self.get_user_by_supabase_id(supabase_id)
        if user:
            # Update user info but PRESERVE existing role
            user.email = email
            user.full_name = full_name
            # DON'T overwrite role for existing users
            self.db.commit()
            self.db.refresh(user)
            return user

        # If not found by Supabase ID, check if email exists
        existing_user = self.get_user_by_email(email)
        if existing_user:
            # Update existing user with Supabase ID but PRESERVE role
            existing_user.external_id = supabase_id
            existing_user.full_name = full_name
            # DON'T overwrite role for existing users
            self.db.commit()
            self.db.refresh(existing_user)
            return existing_user

        # Create new user (only new users get the default role)
        return self.create_user_from_supabase(
            supabase_id=supabase_id,
            email=email,
            full_name=full_name,
            role=role
        )

    def get_users(self, skip: int = 0, limit: int = 10, search: Optional[str] = None) -> List[User]:
        query = self.db.query(User)

        if search:
            if "=" in search:
                # Handle direct field comparisons
                field, value = search.split('=')
                value = value.strip("'")
                if hasattr(User, field):
                    query = query.filter(getattr(User, field) == value)
            else:
                # Handle text search across fields
                search_filter = or_(
                    User.full_name.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%")
                )
                query = query.filter(search_filter)

        return query.offset(skip).limit(limit).all()

    def get_total_users(self, search: Optional[str] = None) -> int:
        query = self.db.query(User)

        if search:
            if "=" in search:
                # Handle direct field comparisons (e.g. "status=Active")
                field, value = search.split('=')
                value = value.strip("'")
                if hasattr(User, field):
                    query = query.filter(getattr(User, field) == value)
            else:
                # Handle text search across fields
                search_filter = or_(
                    User.full_name.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%")
                )
                query = query.filter(search_filter)

        return query.count()

    def update_user(self, user_id: Union[str, UUID], **kwargs) -> Optional[User]:
        user = self.get_user_by_id(user_id)
        if not user:
            return None

        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)

        self.db.commit()
        self.db.refresh(user)
        return user

    def delete_user(self, user_id: Union[str, UUID]) -> bool:
        user = self.get_user_by_id(user_id)
        if not user:
            return False

        self.db.delete(user)
        self.db.commit()
        return True

    def update_last_login(self, user_id: Union[str, UUID]) -> None:
        user = self.get_user_by_id(user_id)
        if user:
            user.last_login = datetime.utcnow()
            self.db.commit()

    def increment_failed_login(self, user_id: Union[str, UUID]) -> None:
        user = self.get_user_by_id(user_id)
        if user:
            # Handle the case where details might not exist yet
            try:
                details = user.details or {}
                details['failedLoginAttempts'] = details.get('failedLoginAttempts', 0) + 1
                user.details = details
                self.db.commit()
            except Exception as e:
                logger.error(f"Error updating failed login attempts: {str(e)}")
                # Fallback to using the string field
                current = int(user.failed_login_attempts or "0")
                user.failed_login_attempts = str(current + 1)
                self.db.commit()

    def reset_failed_login(self, user_id: Union[str, UUID]) -> None:
        user = self.get_user_by_id(user_id)
        if user:
            # Handle the case where details might not exist yet
            try:
                details = user.details or {}
                details['failedLoginAttempts'] = 0
                user.details = details
                self.db.commit()
            except Exception as e:
                logger.error(f"Error resetting failed login attempts: {str(e)}")
                # Fallback to using the string field
                user.failed_login_attempts = "0"
                self.db.commit()

    # Note: Password verification methods removed since we use Supabase for authentication
        return user