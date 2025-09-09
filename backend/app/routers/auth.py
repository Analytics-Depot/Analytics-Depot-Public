# app/routers/auth.py
from fastapi import APIRouter, HTTPException, Depends, Request, Response, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
import logging

from ..models.user import User
from ..repositories.user import UserRepository
from ..db.database import get_db
from ..utils.security import get_current_user_from_token

logger = logging.getLogger(__name__)

router = APIRouter()

class UserRegistrationRequest(BaseModel):
    external_id: str  # Supabase user ID
    email: str
    full_name: str

class UserSyncRequest(BaseModel):
    user_id: str  # Supabase user ID
    email: str
    access_token: str
    full_name: Optional[str] = ""

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None

class SubscriptionUpdateRequest(BaseModel):
    subscription_plan: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    status: str
    subscription_level: str
    subscription_status: str
    usage_count: int
    monthly_limit: int
    can_make_request: bool

# Register route - called from frontend after Supabase registration
@router.post("/register")
async def register_user(
    user_data: UserRegistrationRequest,
    db: Session = Depends(get_db)
):
    """Register a new user in the local database after Supabase registration"""
    try:
        # Check if user already exists by external_id (Supabase user ID)
        existing_user = db.query(User).filter(User.external_id == user_data.external_id).first()
        if existing_user:
            logger.info(f"User with external_id {user_data.external_id} already exists")
            return {
                "message": "User already registered",
                "user": existing_user.to_dict()
            }
        
        # Check if user exists by email
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            logger.warning(f"User with email {user_data.email} already exists")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Create new user
        new_user = User(
            external_id=user_data.external_id,
            email=user_data.email,
            full_name=user_data.full_name,
            role="user",  # Default role
            status="active",  # Default status
            subscription_level="Free",  # Default to free tier
            subscription_status="inactive",
            usage_count=0,
            monthly_limit=20  # Default free tier limit
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"User {user_data.email} registered successfully with ID {new_user.id}")
        
        return {
            "message": "User registered successfully",
            "user": {
                "id": str(new_user.id),
                "email": new_user.email,
                "full_name": new_user.full_name,
                "role": new_user.role,
                "status": new_user.status,
                "subscription_level": new_user.subscription_level
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error registering user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during registration"
        )

# Sync user - called from frontend after Supabase login
@router.post("/sync-user")
async def sync_user(
    sync_data: UserSyncRequest,
    db: Session = Depends(get_db)
):
    """Sync user data with local database after Supabase login"""
    try:
        # Find user by external_id (Supabase user ID)
        user = db.query(User).filter(User.external_id == sync_data.user_id).first()
        
        if not user:
            logger.warning(f"User with external_id {sync_data.user_id} not found in local database")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found in local database. Please register first."
            )
        
        # Update user information if needed
        updated = False
        if user.email != sync_data.email:
            user.email = sync_data.email
            updated = True
        
        if sync_data.full_name and user.full_name != sync_data.full_name:
            user.full_name = sync_data.full_name
            updated = True
        
        # Update last login
        user.update_last_login()
        user.reset_failed_logins()  # Reset failed login attempts on successful login
        
        if updated:
            db.commit()
            db.refresh(user)
        
        logger.info(f"User {sync_data.email} synced successfully")
        
        return {
            "message": "User synced successfully",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "status": user.status,
                "subscription_level": user.subscription_level,
                "can_make_request": user.can_make_request(),
                "usage_count": user.usage_count,
                "monthly_limit": user.monthly_limit
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error syncing user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during user sync"
        )

# Get user profile - requires authentication
@router.get("/profile", response_model=UserResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_user_from_token)
):
    """Get the current user's profile"""
    try:
        return UserResponse(
            id=str(current_user.id),
            email=current_user.email,
            full_name=current_user.full_name,
            role=current_user.role,
            status=current_user.status,
            subscription_level=current_user.subscription_level,
            subscription_status=current_user.subscription_status,
            usage_count=current_user.usage_count,
            monthly_limit=current_user.monthly_limit,
            can_make_request=current_user.can_make_request()
        )
    except Exception as e:
        logger.error(f"Error getting user profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

# Get user role - for frontend routing decisions
@router.get("/role")
async def get_user_role(
    current_user: User = Depends(get_current_user_from_token)
):
    """Get current user's role (for frontend routing)"""
    return {
        "role": current_user.role,
        "is_admin": current_user.is_admin(),
        "is_expert": current_user.is_expert(),
        "is_active": current_user.is_active()
    }

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_update: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Update user profile information in local database"""
    user_repo = UserRepository(db)
    
    # Update only provided fields in local database
    if profile_update.full_name is not None:
        current_user.full_name = profile_update.full_name
    
    # Commit local database changes
    db.commit()
    db.refresh(current_user)
    
    # Note: Supabase auth metadata is updated from the frontend
    logger.info(f"Updated profile for user {current_user.email}")
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        status="active" if current_user.is_active() else "inactive",
        subscription_level=current_user.subscription_level,
        usage_count=current_user.usage_count,
        monthly_limit=current_user.monthly_limit,
        subscription_status=current_user.subscription_status,
        can_make_request=current_user.can_make_request()
    )

@router.put("/subscription", response_model=UserResponse)
async def update_subscription(
    subscription_update: SubscriptionUpdateRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Update user subscription plan (admin only or payment confirmation)"""
    
    # For now, allow users to downgrade to free, but paid plans require payment
    if subscription_update.subscription_plan == "free":
        current_user.subscription_plan = "free"
        current_user.subscription_level = "Free"
        current_user.subscription_status = "active"
        current_user.monthly_limit = 20
        current_user.usage_count = 0
    else:
        # For paid plans, this would typically be called after successful payment
        # For now, we'll just update the plan (in a real app, verify payment first)
        plan_mapping = {
            "basic": {"level": "Basic", "limit": 100},
            "pro": {"level": "Pro", "limit": -1},
            "expert_sessions": {"level": "Expert", "limit": -1}
        }
        
        if subscription_update.subscription_plan not in plan_mapping:
            raise HTTPException(status_code=400, detail="Invalid subscription plan")
        
        plan_details = plan_mapping[subscription_update.subscription_plan]
        current_user.subscription_plan = subscription_update.subscription_plan
        current_user.subscription_level = plan_details["level"]
        current_user.subscription_status = "active"
        current_user.monthly_limit = plan_details["limit"]
        current_user.usage_count = 0
    
    db.commit()
    db.refresh(current_user)
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        status="active" if current_user.is_active() else "inactive",
        subscription_level=current_user.subscription_level,
        usage_count=current_user.usage_count,
        monthly_limit=current_user.monthly_limit,
        subscription_status=current_user.subscription_status,
        can_make_request=current_user.can_make_request()
    )

# Test endpoint to verify authentication
@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user_from_token)
):
    """Get current user information (for testing authentication)"""
    return {
        "user_id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active(),
        "is_admin": current_user.is_admin(),
        "subscription_level": current_user.subscription_level,
        "can_make_request": current_user.can_make_request()
    }
