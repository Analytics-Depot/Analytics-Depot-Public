
from backend.app.models.user import User
from fastapi import APIRouter, HTTPException, Depends, Request, Response

from ..db.database import get_db


    
router = APIRouter()


# admin dashboard data router
@router.post("/dashboard")
async def getSomethingRelatedToExpert(request: Request, response: Response, db: Session = Depends(get_db)):
    try:
        # Fetch necessary data for the admin dashboard
        users = db.query(User).all()
        return {"users": users}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

