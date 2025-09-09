# app/routers/auth.py
from ..models.user import User
from fastapi import APIRouter, HTTPException, Depends, Request, Response

from ..db.database import get_db



router = APIRouter()

