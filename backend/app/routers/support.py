# app/routers/support.py
from fastapi import APIRouter, Depends, HTTPException, Query,Request, Response
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

from ..db.database import get_db
from ..models.support import SupportMessage
from ..models.user import User

router = APIRouter()


@router.post("/messages", response_model=Dict[str, Any])
async def create_support_message(
    request: Request, response: Response, db: Session = Depends(get_db)
):
    """Create a new support message (public endpoint)"""
    