# app/routers/webhooks.py
from fastapi import APIRouter, Request, HTTPException, Depends, Header
from sqlalchemy.orm import Session
import stripe
import os
import json
from typing import Optional

from ..db.database import get_db
from ..models.billing import Transaction, UserSubscription
from ..models.user import User

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Set Stripe API key
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

