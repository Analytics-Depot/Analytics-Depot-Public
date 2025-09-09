# app/core/config.py
import os
import logging
from typing import Any, List, Optional
from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from openai import OpenAI

# Load environment variables from .env file in the backend directory
import pathlib
# Get the backend directory (where .env is located)
backend_dir = pathlib.Path(__file__).parent.parent.parent  # Goes from app/core/config.py to backend/
env_path = backend_dir / ".env"
load_dotenv(env_path)

# Setup logger after loading environment
logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    """Application settings class that loads values from environment variables"""

    # Core application settings
    PROJECT_NAME: str = Field(default="Analytics Depot", description="The name of the project")
    API_V1_STR: str = Field(default="/api", description="API version 1 prefix")

    # Node environment (for compatibility)
    NODE_ENV: Optional[str] = Field(default="development", description="Node environment")

    # Security settings
    SECRET_KEY: str = Field(default="your-secret-key-change-this", description="Secret key for JWT encoding")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, description="Access token expiration time in minutes")

    # Database settings
    DATABASE_URL: str = Field(default=os.getenv("DATABASE_URL", ""), description="Database connection URL")

    # CORS settings
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "https://analyticsdepot.com"],
        description="Allowed CORS origins"
    )

    # Base URL for the application
    BASE_URL: str = Field(
        default=os.getenv("BASE_URL", "https://analyticsdepot.com"),
        description="Base URL for the application"
    )
    
    # Frontend URL for redirects
    FRONTEND_URL: str = Field(
        default=os.getenv("FRONTEND_URL", "http://localhost:3000"),
        description="Frontend URL for Stripe redirects"
    )

    # OpenAI settings - Load from environment variables
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API key")
    OPENAI_ORGANIZATION: str = Field(default="", description="OpenAI organization ID")
    OPENAI_MODEL: str = Field(default="gpt-3.5-turbo", description="OpenAI model name")
    OPENAI_ENABLED: bool = Field(default=True, description="Whether OpenAI is enabled")

    # Tavily settings
    TAVILY_API_KEY: str = Field(default="", description="Tavily API key for web search")
    TAVILY_ENABLED: bool = Field(default=True, description="Whether Tavily web search is enabled")

    # Supabase settings
    SUPABASE_URL: str = Field(default="", description="Supabase project URL")
    SUPABASE_SERVICE_KEY: str = Field(default="", description="Supabase service role key")
    SUPABASE_ANON_KEY: str = Field(default="", description="Supabase anon key")
    SUPABASE_JWT_SECRET: str = Field(default="", description="Supabase JWT secret")
    SUPABASE_ENABLED: bool = Field(default=True, description="Whether Supabase is enabled")

    # Stripe settings
    STRIPE_SECRET_KEY: str = Field(default="", description="Stripe secret key")
    STRIPE_WEBHOOK_SECRET: str = Field(default="", description="Stripe webhook endpoint secret")
    STRIPE_ENABLED: bool = Field(default=True, description="Whether Stripe is enabled")

    # File upload settings
    MAX_FILE_SIZE: int = Field(default=10 * 1024 * 1024, description="Maximum file size in bytes")
    ALLOWED_FILE_TYPES: List[str] = Field(default=[".csv", ".json"], description="Allowed file types")

    # Logging settings
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Allow extra fields to be ignored instead of forbidden

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        # Load OpenAI API key from environment
        self.OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
        self.OPENAI_MODEL = os.environ.get("OPENAI_MODEL", self.OPENAI_MODEL)
        if not self.OPENAI_API_KEY:
            logger.warning("OPENAI_API_KEY environment variable not set. OpenAI-related features will be disabled.")
            self.OPENAI_ENABLED = False
        else:
            logger.info(f"OpenAI API key loaded successfully")
            self.OPENAI_ENABLED = True

        if not self.OPENAI_ORGANIZATION:
            self.OPENAI_ORGANIZATION = os.getenv("OPENAI_ORG_ID", os.getenv("OPENAI_ORGANIZATION", ""))

        # Load Tavily API key from environment
        self.TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")
        if not self.TAVILY_API_KEY:
            logger.warning("TAVILY_API_KEY environment variable not set. Tavily web search features will be disabled.")
            self.TAVILY_ENABLED = False
        else:
            logger.info(f"Tavily API key loaded successfully")
            self.TAVILY_ENABLED = True

        # Load Supabase configuration from environment
        self.SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
        self.SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
        self.SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
        self.SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
        if not self.SUPABASE_URL or not self.SUPABASE_SERVICE_KEY or not self.SUPABASE_ANON_KEY or not self.SUPABASE_JWT_SECRET:
            logger.warning("SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY, or SUPABASE_JWT_SECRET environment variable not set. Supabase features will be disabled.")
            self.SUPABASE_ENABLED = False
        else:
            logger.info("Supabase configuration loaded successfully")
            self.SUPABASE_ENABLED = True

        # Load Stripe configuration from environment
        self.STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
        self.STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
        if not self.STRIPE_SECRET_KEY:
            logger.warning("STRIPE_SECRET_KEY environment variable not set. Stripe features will be disabled.")
            self.STRIPE_ENABLED = False
        else:
            logger.info("Stripe configuration loaded successfully")
            self.STRIPE_ENABLED = True

        # Process CORS origins from environment variable if present
        cors_origins_env = os.getenv("CORS_ORIGINS", "")
        if cors_origins_env:
            self.CORS_ORIGINS = cors_origins_env.split(",")

        # Make sure CORS_ORIGINS always includes localhost and our domain
        if "http://localhost:3000" not in self.CORS_ORIGINS:
            self.CORS_ORIGINS.append("http://localhost:3000")
        if "https://analyticsdepot.com" not in self.CORS_ORIGINS:
            self.CORS_ORIGINS.append("https://analyticsdepot.com")

        # Ensure BASE_URL is set
        if not self.BASE_URL:
            self.BASE_URL = "https://analyticsdepot.com"

    def get_openai_client(self):
        if not self.OPENAI_ENABLED:
            return None
        try:
            return OpenAI(api_key=self.OPENAI_API_KEY)
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
            return None

# Create and export the settings instance
settings = Settings()