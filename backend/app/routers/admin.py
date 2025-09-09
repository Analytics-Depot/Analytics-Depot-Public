
from ..models.user import User
from ..models.support import SupportMessage
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel

from ..db.database import get_db
from ..services.auth import get_current_user

router = APIRouter()

# Response models
class UserStats(BaseModel):
    total_users: int
    free_users: int
    basic_users: int
    pro_users: int
    admin_users: int
    expert_users: int

class UserInfo(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    role: str
    subscription_plan: str
    is_active: bool
    created_at: str

class SupportMessageInfo(BaseModel):
    id: str
    name: str
    email: str
    subject: Optional[str]
    message: str
    priority: str
    status: str
    created_at: str
    user_subscription: Optional[str]

class AdminDashboardResponse(BaseModel):
    stats: UserStats
    recent_users: List[UserInfo]
    support_messages: List[SupportMessageInfo]

def require_admin(current_user: User = Depends(get_current_user)):
    """Dependency to ensure user is admin"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return current_user

# Get admin dashboard data
@router.get("/dashboard", response_model=AdminDashboardResponse)
async def get_admin_dashboard(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        # Get user statistics
        total_users = db.query(User).count()
        free_users = db.query(User).filter(User.subscription_plan == "free").count()
        basic_users = db.query(User).filter(User.subscription_plan == "basic").count()
        pro_users = db.query(User).filter(User.subscription_plan == "pro").count()
        admin_users = db.query(User).filter(User.role == "admin").count()
        expert_users = db.query(User).filter(User.role == "expert").count()

        stats = UserStats(
            total_users=total_users,
            free_users=free_users,
            basic_users=basic_users,
            pro_users=pro_users,
            admin_users=admin_users,
            expert_users=expert_users
        )

        # Get recent users (last 10)
        recent_users_query = db.query(User).order_by(desc(User.created_at)).limit(10)
        recent_users = []
        for user in recent_users_query:
            try:
                recent_users.append(UserInfo(
                    id=str(user.id),
                    email=user.email,
                    full_name=user.full_name,
                    role=user.role,
                    subscription_plan=user.subscription_plan or "free",
                    is_active=user.is_active(),
                    created_at=user.created_at.isoformat() if user.created_at else ""
                ))
            except Exception as e:
                # Skip problematic users
                print(f"Error processing user {user.id}: {e}")
                continue

        # Get recent support messages (last 20)
        support_messages_query = db.query(SupportMessage).order_by(desc(SupportMessage.created_at)).limit(20)
        support_messages = []
        for msg in support_messages_query:
            try:
                support_messages.append(SupportMessageInfo(
                    id=str(msg.id),
                    name=msg.name,
                    email=msg.email,
                    subject=msg.subject,
                    message=msg.message,
                    priority=msg.priority,
                    status=msg.status,
                    created_at=msg.created_at.isoformat() if msg.created_at else "",
                    user_subscription=msg.user.subscription_plan if msg.user else None
                ))
            except Exception as e:
                # Skip problematic support messages
                print(f"Error processing support message {msg.id}: {e}")
                continue

        return AdminDashboardResponse(
            stats=stats,
            recent_users=recent_users,
            support_messages=support_messages
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard data: {str(e)}")

# Get all users with pagination
@router.get("/users")
async def get_all_users(
    page: int = 1,
    limit: int = 50,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        offset = (page - 1) * limit
        users_query = db.query(User).order_by(desc(User.created_at)).offset(offset).limit(limit)
        total_users = db.query(User).count()
        
        users = [
            {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "subscription_plan": user.subscription_plan,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else "",
                "updated_at": user.updated_at.isoformat() if user.updated_at else ""
            }
            for user in users_query
        ]

        return {
            "users": users,
            "total": total_users,
            "page": page,
            "limit": limit,
            "total_pages": (total_users + limit - 1) // limit
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")

# Get all support messages with pagination
@router.get("/support-messages")
async def get_support_messages(
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        offset = (page - 1) * limit
        query = db.query(SupportMessage)
        
        if status:
            query = query.filter(SupportMessage.status == status)
            
        messages_query = query.order_by(desc(SupportMessage.created_at)).offset(offset).limit(limit)
        total_messages = query.count()
        
        messages = [
            {
                "id": msg.id,
                "user_id": msg.user_id,
                "name": msg.name,
                "email": msg.email,
                "subject": msg.subject,
                "message": msg.message,
                "priority": msg.priority,
                "status": msg.status,
                "admin_response": msg.admin_response,
                "created_at": msg.created_at.isoformat() if msg.created_at else "",
                "user_info": {
                    "subscription_plan": msg.user.subscription_plan if msg.user else None,
                    "role": msg.user.role if msg.user else None
                }
            }
            for msg in messages_query
        ]

        return {
            "messages": messages,
            "total": total_messages,
            "page": page,
            "limit": limit,
            "total_pages": (total_messages + limit - 1) // limit
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch support messages: {str(e)}")

# Update support message status
@router.put("/support-messages/{message_id}/status")
async def update_support_message_status(
    message_id: str,
    status: str,
    admin_response: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        message = db.query(SupportMessage).filter(SupportMessage.id == message_id).first()
        if not message:
            raise HTTPException(status_code=404, detail="Support message not found")
        
        message.status = status
        if admin_response:
            message.admin_response = admin_response
            message.responded_by = admin_user.id
            from datetime import datetime
            message.responded_at = datetime.utcnow()
        
        db.commit()
        
        return {"message": "Support message updated successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update support message: {str(e)}")

