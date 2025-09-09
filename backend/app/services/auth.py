# app/services/auth.py
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import jwt
from datetime import datetime, timedelta
import logging

from ..db.database import get_db
from ..repositories.user import UserRepository
from ..utils.security import verify_token, security, get_current_user_from_token
from ..models.user import User

logger = logging.getLogger(__name__)

# Use the consistent authentication method from security.py
get_current_user = get_current_user_from_token