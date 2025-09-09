from sqlalchemy import create_engine, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from ..core.config import settings

DATABASE_URL = settings.DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize the database with tables."""
    try:
        print("🔄 Connecting to database...")
        
        # Import all models to ensure they are known to SQLAlchemy
        from ..models.user import User
        from ..models.chat import Chat, ChatMessage,ChatFileData,SpecialistProfile
        from ..models.support import SupportMessage


        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("🎉 Connected successfully to the database!")
        print(f"📊 Database URL: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'Local Database'}")


    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        raise

if __name__ == "__main__":
    init_db()