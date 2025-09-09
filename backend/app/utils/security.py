# app/utils/security.py
import jwt
import json
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import logging
import httpx

from ..db.database import get_db
from ..models.user import User
from ..core.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer()

# Supabase configuration
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_JWT_SECRET = settings.SUPABASE_JWT_SECRET

async def verify_supabase_token(token: str) -> Dict[str, Any]:
    """Verify Supabase JWT token and return user data"""
    try:
        logger.info(f"Verifying token, SUPABASE_JWT_SECRET configured: {'Yes' if SUPABASE_JWT_SECRET else 'No'}")
        
        if not SUPABASE_JWT_SECRET:
            logger.error("SUPABASE_JWT_SECRET not configured")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication not properly configured"
            )
        
        # Decode the JWT token using Supabase secret
        payload = jwt.decode(
            token, 
            SUPABASE_JWT_SECRET, 
            algorithms=["HS256"],
            audience="authenticated"
        )
        
        logger.info(f"Token verified successfully for user: {payload.get('sub')}")
        
        # Check if token is expired
        exp = payload.get('exp')
        if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
            logger.warning("Token has expired")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired signature error")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )

async def get_current_user_from_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current user from Supabase JWT token"""
    
    logger.info("Attempting to authenticate user from token")
    
    if not credentials:
        logger.warning("No credentials provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required"
        )
    
    # Verify the Supabase token
    token_data = await verify_supabase_token(credentials.credentials)
    
    # Get user ID from token (Supabase user ID)
    user_id = token_data.get('sub')
    if not user_id:
        logger.error("Token missing user ID (sub)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user ID"
        )
    
    logger.info(f"Looking for user with external_id: {user_id}")
    
    # Find user in local database by external_id (Supabase user ID)
    user = db.query(User).filter(User.external_id == user_id).first()
    
    if not user:
        logger.error(f"User with external_id {user_id} not found in local database")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in local database"
        )
    
    logger.info(f"Found user: {user.email}, role: {user.role}")
    
    # Check if user account is active
    if not user.is_active():
        logger.warning(f"User {user.email} account is not active")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is not active"
        )
    
    # Check if user account is locked
    if user.is_locked():
        logger.warning(f"User {user.email} account is locked")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is locked due to too many failed login attempts"
        )
    
    # Update last login
    user.update_last_login()
    db.commit()
    
    logger.info(f"Successfully authenticated user: {user.email}")
    return user

async def get_current_admin_user(
    current_user: User = Depends(get_current_user_from_token)
) -> User:
    """Get current user and verify admin privileges"""
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

async def get_current_expert_user(
    current_user: User = Depends(get_current_user_from_token)
) -> User:
    """Get current user and verify expert privileges"""
    if not current_user.is_expert() and not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Expert privileges required"
        )
    return current_user

def require_subscription(
    current_user: User = Depends(get_current_user_from_token)
) -> User:
    """Require user to have active subscription or be admin"""
    if current_user.is_admin():
        return current_user
    
    if not current_user.can_make_request():
        if current_user.subscription_level == "Free" and current_user.usage_count >= current_user.monthly_limit:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Monthly request limit exceeded. Please upgrade your subscription."
            )
        elif not current_user.has_active_subscription():
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Active subscription required"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Request limit exceeded"
            )
    
    return current_user

# Legacy function for compatibility
verify_token = verify_supabase_token
