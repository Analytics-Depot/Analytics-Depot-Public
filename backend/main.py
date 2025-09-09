# app/main.py
from fastapi import FastAPI, Request
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.db.database import init_db
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.files import router as files_router
from app.routers.chats import router as chats_router
from app.routers.admin import router as admin_router
from app.routers.stripe import router as payments_router
from app.routers.support import router as support_router
from app.routers.reports import router as reports_router
from app.core.config import settings

# Load environment variables from .env file
load_dotenv()

# Import the centralized logger - this will handle all logging setup
from app.core.logger import logger

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("📡 Initializing database connection...")
    init_db()
    print("🌐 Server is ready to accept connections")
    yield
    # Shutdown - cleanup if needed
    print("🛑 Shutting down Analytics Depot Backend...")

app = FastAPI(
    title="Analytics Depot API",
    description="Backend API for Analytics Depot application",
    version="1.0.0",
    lifespan=lifespan
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration using settings from config
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/auth")
app.include_router(users_router, prefix="/api/users")
app.include_router(files_router, prefix="/api/files")
app.include_router(chats_router, prefix="/api/chats")
app.include_router(admin_router, prefix="/api/admin")
app.include_router(payments_router, prefix="/api/payments")
app.include_router(support_router, prefix="/api/support")
app.include_router(reports_router, prefix="/api/reports")

@app.get("/")
async def root():
    return {
        "message": "Analytics Depot API",
        "status": "running",
        "environment": settings.NODE_ENV
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "message": "Analytics Depot API is running"
    }

if __name__ == "__main__":
    import uvicorn
    reload = settings.NODE_ENV == "development"
    print("Starting server...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=reload)