# app/services/supabase_service.py
import logging
from typing import Optional, Dict, Any
from supabase import create_client, Client
from ..core.config import settings

logger = logging.getLogger(__name__)

class SupabaseService:
    """Service for interacting with Supabase admin functions"""
    
    def __init__(self):
        self.client: Optional[Client] = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Supabase client with service key for admin operations"""
        try:
            if settings.SUPABASE_ENABLED:
                self.client = create_client(
                    settings.SUPABASE_URL, 
                    settings.SUPABASE_SERVICE_KEY
                )
                logger.info("Supabase admin client initialized successfully")
            else:
                logger.warning("Supabase is disabled. Client not initialized.")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {str(e)}")
            self.client = None
    
    
    
    async def update_user_metadata(self, user_id: str, metadata_updates: Dict[str, Any]) -> bool:
        """Update user metadata in Supabase auth"""
        if not self.client:
            logger.warning("Supabase client not available. Skipping metadata update.")
            return False
        
        try:
            # Update user metadata using admin client
            response = self.client.auth.admin.update_user_by_id(
                user_id,
                {
                    "user_metadata": metadata_updates
                }
            )
            
            if response.user:
                logger.info(f"Successfully updated Supabase metadata for user {user_id}")
                return True
            else:
                logger.error(f"Failed to update Supabase metadata for user {user_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error updating Supabase user metadata: {str(e)}")
            return False
    
    async def sync_user_profile(self, user_id: str, full_name: str, email: str) -> bool:
        """Sync complete user profile to Supabase"""
        metadata_updates = {
            "full_name": full_name,
            "name": full_name,  # Some apps use 'name' instead of 'full_name'
        }
        
        return await self.update_user_metadata(user_id, metadata_updates)

# Global instance
supabase_service = SupabaseService()
