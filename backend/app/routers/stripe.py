# app/routers/payments.py
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel
import stripe
import json
import logging
from datetime import datetime, timezone, timedelta

from ..db.database import get_db
from ..utils.security import get_current_user_from_token
from ..models.user import User
from ..repositories.user import UserRepository
from ..core.config import settings

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter(tags=["payments"])

# Pydantic models
class CreateCheckoutSessionRequest(BaseModel):
    plan_name: str

class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str

# Plan pricing in cents (USD)
PLAN_PRICES = {
    "basic": 2900,  # $29.00
    "pro": 7900,   # $79.00
    "expert_sessions": 15000  # $150.00 per hour
}

# Plan details
PLAN_DETAILS = {
    "basic": {
        "price": PLAN_PRICES["basic"],
        "name": "Basic Plan",
        "monthly_limit": 100,
        "subscription_level": "Basic"
    },
    "pro": {
        "price": PLAN_PRICES["pro"],
        "name": "Pro Plan", 
        "monthly_limit": -1,  # Unlimited
        "subscription_level": "Pro"
    },
    "expert_sessions": {
        "price": PLAN_PRICES["expert_sessions"],
        "name": "Expert Sessions",
        "monthly_limit": -1,  # Unlimited
        "subscription_level": "Expert"
    }
}

@router.get("/pricing")
async def get_pricing():
    """Get pricing information for all plans"""
    return {
        "plans": {
            "free": {
                "price": 0,
                "name": "Free Plan",
                "features": [
                    "20 AI-assisted queries per month",
                    "Basic analytics insights", 
                    "Community support",
                    "Limited file upload (2MB max)"
                ]
            },
            "basic": {
                "price": PLAN_PRICES["basic"],
                "name": "Basic Plan",
                "features": [
                    "100 AI-assisted queries per month",
                    "Access to personalized investment reports",
                    "Standard support",
                    "File upload up to 10MB"
                ]
            },
            "pro": {
                "price": PLAN_PRICES["pro"],
                "name": "Pro Plan",
                "features": [
                    "Unlimited AI-assisted queries",
                    "Priority access to advanced features",
                    "Priority support",
                    "Unlimited file upload",
                    "Advanced analytics & insights",
                    "All features in Basic"
                ]
            },
            "expert_sessions": {
                "price": PLAN_PRICES["expert_sessions"],
                "name": "Expert Sessions",
                "features": [
                    "One-on-one consultation with industry experts",
                    "Tailored portfolio reviews",
                    "In-depth market strategy guidance",
                    "Requires active subscription"
                ]
            }
        }
    }

@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: CreateCheckoutSessionRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Create a Stripe checkout session for subscription"""
    try:
        plan_name = request.plan_name.lower()
        
        # Validate plan
        if plan_name not in PLAN_PRICES:
            raise HTTPException(status_code=400, detail="Invalid plan selected")
        
        # Handle expert sessions - coming soon
        if plan_name == "expert_sessions":
            raise HTTPException(status_code=400, detail="Expert Sessions coming soon! Please choose Basic or Pro plan.")
        
        # Get plan details
        plan_details = PLAN_DETAILS[plan_name]
        amount = plan_details["price"]
        
        # Create or get Stripe customer
        user_repo = UserRepository(db)
        if not current_user.stripe_customer_id:
            # Create new Stripe customer
            customer = stripe.Customer.create(
                email=current_user.email,
                name=current_user.full_name,
                metadata={
                    "user_id": str(current_user.id),
                    "external_id": current_user.external_id
                }
            )
            current_user.stripe_customer_id = customer.id
            db.commit()
        
        # Create checkout session
        checkout_session = stripe.checkout.Session.create(
            customer=current_user.stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': plan_details["name"],
                        'description': f'{plan_details["name"]} subscription for Analytics Depot'
                    },
                    'unit_amount': amount,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{settings.FRONTEND_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}&plan={plan_name}",
            cancel_url=f"{settings.FRONTEND_URL}/pricing?cancelled=true",
            metadata={
                'plan_name': plan_name,
                'user_id': str(current_user.id),
                'user_email': current_user.email
            }
        )
        
        logger.info(f"Created checkout session for user {current_user.email}: {checkout_session.id} for plan {plan_name}")
        
        return CheckoutSessionResponse(
            checkout_url=checkout_session.url,
            session_id=checkout_session.id
        )
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating checkout session: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Payment error: {str(e)}")
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")

@router.get("/verify-session/{session_id}")
async def verify_checkout_session(
    session_id: str,
    current_user: User = Depends(get_current_user_from_token)
):
    """Verify a checkout session and return its details"""
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        
        # Verify the session belongs to the current user
        if session.metadata.get('user_id') != str(current_user.id):
            raise HTTPException(status_code=403, detail="Unauthorized access to session")
        
        return {
            "session_id": session.id,
            "payment_status": session.payment_status,
            "plan_name": session.metadata.get('plan_name'),
            "amount_total": session.amount_total,
            "customer_email": session.customer_details.email if session.customer_details else None
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error verifying session: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Session verification error: {str(e)}")
    except Exception as e:
        logger.error(f"Error verifying session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to verify session")

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db)
):
    """Handle Stripe webhook events"""
    try:
        payload = await request.body()
        
        # Verify webhook signature
        try:
            event = stripe.Webhook.construct_event(
                payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            logger.error("Invalid payload in webhook")
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError:
            logger.error("Invalid signature in webhook")
            raise HTTPException(status_code=400, detail="Invalid signature")

        logger.info(f"Received Stripe webhook event: {event['type']}")

        # Handle payment success
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            await handle_payment_success(payment_intent, db)
        
        # Handle checkout session completion
        elif event['type'] == 'checkout.session.completed':
            checkout_session = event['data']['object']
            await handle_checkout_session_completed(checkout_session, db)
        
        # Handle payment failure
        elif event['type'] == 'payment_intent.payment_failed':
            payment_intent = event['data']['object']
            await handle_payment_failure(payment_intent, db)
        
        # Handle customer subscription events (for future use)
        elif event['type'] == 'customer.subscription.created':
            subscription = event['data']['object']
            await handle_subscription_created(subscription, db)
        
        elif event['type'] == 'customer.subscription.updated':
            subscription = event['data']['object']
            await handle_subscription_updated(subscription, db)
        
        elif event['type'] == 'customer.subscription.deleted':
            subscription = event['data']['object']
            await handle_subscription_cancelled(subscription, db)
        
        return {"status": "success"}

    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

async def handle_checkout_session_completed(checkout_session: Dict[str, Any], db: Session):
    """Handle completed checkout session"""
    try:
        user_id = checkout_session['metadata'].get('user_id')
        plan_name = checkout_session['metadata'].get('plan_name')
        
        if not user_id or not plan_name:
            logger.error("Missing user_id or plan_name in checkout session metadata")
            return
        
        # Get user from database
        user_repo = UserRepository(db)
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            logger.error(f"User not found for checkout session completion: {user_id}")
            return
        
        # Update user subscription
        plan_details = PLAN_DETAILS[plan_name]
        user.subscription_level = plan_details["subscription_level"]
        user.subscription_status = "active"
        user.monthly_limit = plan_details["monthly_limit"]
        user.subscription_plan = plan_name
        user.usage_count = 0  # Reset usage count
        
        # Set subscription expiry (30 days from now)
        user.subscription_expires_at = datetime.now(timezone.utc).replace(day=28) + \
                                     timedelta(days=32)  # Approximately 1 month
        
        db.commit()
        
        logger.info(f"Updated user {user.email} subscription to {plan_name} via checkout session")
        
    except Exception as e:
        logger.error(f"Error handling checkout session completion: {str(e)}")
        db.rollback()

async def handle_payment_success(payment_intent: Dict[str, Any], db: Session):
    """Handle successful payment"""
    try:
        user_id = payment_intent['metadata'].get('user_id')
        plan_name = payment_intent['metadata'].get('plan_name')
        
        if not user_id or not plan_name:
            logger.error("Missing user_id or plan_name in payment intent metadata")
            return
        
        # Get user from database
        user_repo = UserRepository(db)
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            logger.error(f"User not found for payment success: {user_id}")
            return
        
        # Update user subscription
        plan_details = PLAN_DETAILS[plan_name]
        user.subscription_level = plan_details["subscription_level"]
        user.subscription_status = "active"
        user.monthly_limit = plan_details["monthly_limit"]
        user.subscription_plan = plan_name
        user.usage_count = 0  # Reset usage count
        
        # Set subscription expiry (30 days from now)
        user.subscription_expires_at = datetime.now(timezone.utc).replace(day=28) + \
                                     timedelta(days=32)  # Approximately 1 month
        
        db.commit()
        
        logger.info(f"Updated user {user.email} subscription to {plan_name}")
        
    except Exception as e:
        logger.error(f"Error handling payment success: {str(e)}")
        db.rollback()

async def handle_payment_failure(payment_intent: Dict[str, Any], db: Session):
    """Handle failed payment"""
    try:
        user_id = payment_intent['metadata'].get('user_id')
        
        if not user_id:
            logger.error("Missing user_id in payment intent metadata")
            return
        
        logger.info(f"Payment failed for user {user_id}")
        # You could send email notification here
        
    except Exception as e:
        logger.error(f"Error handling payment failure: {str(e)}")

async def handle_subscription_created(subscription: Dict[str, Any], db: Session):
    """Handle subscription creation (for future recurring subscriptions)"""
    logger.info(f"Subscription created: {subscription['id']}")

async def handle_subscription_updated(subscription: Dict[str, Any], db: Session):
    """Handle subscription updates (for future recurring subscriptions)"""
    logger.info(f"Subscription updated: {subscription['id']}")

async def handle_subscription_cancelled(subscription: Dict[str, Any], db: Session):
    """Handle subscription cancellation (for future recurring subscriptions)"""
    logger.info(f"Subscription cancelled: {subscription['id']}")

@router.get("/plans")
async def get_plans():
    """Get available subscription plans"""
    return {
        "plans": [
            {
                "id": "basic",
                "name": "Basic Plan",
                "price": PLAN_PRICES["basic"],
                "price_display": "$9.99",
                "monthly_limit": 100,
                "features": [
                    "100 queries per month",
                    "Basic analytics",
                    "CSV & JSON file support",
                    "Email support"
                ]
            },
            {
                "id": "pro", 
                "name": "Pro Plan",
                "price": PLAN_PRICES["pro"],
                "price_display": "$29.99",
                "monthly_limit": -1,
                "features": [
                    "Unlimited queries",
                    "Advanced analytics",
                    "All file formats",
                    "Priority support",
                    "Export capabilities"
                ]
            },
            {
                "id": "expert_sessions",
                "name": "Expert Sessions",
                "price": PLAN_PRICES["expert_sessions"],
                "price_display": "$99.99",
                "monthly_limit": -1,
                "coming_soon": True,
                "features": [
                    "1-on-1 expert sessions",
                    "Custom analysis",
                    "Everything in Pro",
                    "Dedicated support"
                ]
            }
        ]
    }
