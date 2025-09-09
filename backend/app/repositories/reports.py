from typing import Dict, List, Any, Optional, Union
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from uuid import UUID, uuid4
from datetime import datetime
import logging

from ..models.reports import ReportDefinition, ReportRun

logger = logging.getLogger(__name__)

class ReportRepository:
    """Repository for report definitions and report runs"""

    def __init__(self, db: Session):
        self.db = db

    def _ensure_string_id(self, id_value: Union[str, UUID]) -> str:
        """Convert UUID to string if needed"""
        if isinstance(id_value, UUID):
            return str(id_value)
        return str(id_value)

    # Report Definition operations
    def create_definition(self, user_id: Union[str, UUID], name: str, config: Dict[str, Any],
                         description: Optional[str] = None, schedule_cron: Optional[str] = None) -> Optional[ReportDefinition]:
        """Create a new report definition"""
        try:
            user_id_str = self._ensure_string_id(user_id)
            
            definition = ReportDefinition(
                user_id=user_id_str,
                name=name,
                description=description,
                config=config,
                schedule_cron=schedule_cron
            )
            self.db.add(definition)
            self.db.commit()
            self.db.refresh(definition)
            logger.info(f"Created report definition {definition.id} for user {user_id_str}")
            return definition
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating report definition for user {user_id}: {e}")
            return None

    def get_definition_by_id(self, definition_id: Union[str, UUID], user_id: Union[str, UUID]) -> Optional[ReportDefinition]:
        """Get a report definition by ID, ensuring user ownership"""
        try:
            definition_id_str = self._ensure_string_id(definition_id)
            user_id_str = self._ensure_string_id(user_id)
            return self.db.query(ReportDefinition)\
                .filter(ReportDefinition.id == definition_id_str)\
                .filter(ReportDefinition.user_id == user_id_str)\
                .first()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching report definition {definition_id}: {e}")
            return None

    def get_user_definitions(self, user_id: Union[str, UUID], skip: int = 0, limit: int = 20,
                           is_active: Optional[bool] = None) -> List[ReportDefinition]:
        """Get report definitions for a user with pagination"""
        try:
            user_id_str = self._ensure_string_id(user_id)
            query = self.db.query(ReportDefinition)\
                .filter(ReportDefinition.user_id == user_id_str)
            
            if is_active is not None:
                query = query.filter(ReportDefinition.is_active == is_active)
            
            return query.order_by(ReportDefinition.created_at.desc())\
                .offset(skip)\
                .limit(limit)\
                .all()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching report definitions for user {user_id}: {e}")
            return []

    def update_definition(self, definition_id: Union[str, UUID], user_id: Union[str, UUID],
                         updates: Dict[str, Any]) -> Optional[ReportDefinition]:
        """Update a report definition"""
        try:
            definition_id_str = self._ensure_string_id(definition_id)
            user_id_str = self._ensure_string_id(user_id)
            
            definition = self.db.query(ReportDefinition)\
                .filter(ReportDefinition.id == definition_id_str)\
                .filter(ReportDefinition.user_id == user_id_str)\
                .first()
                
            if not definition:
                return None

            for key, value in updates.items():
                if hasattr(definition, key):
                    setattr(definition, key, value)

            definition.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(definition)
            logger.info(f"Updated report definition {definition_id}")
            return definition
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating report definition {definition_id}: {e}")
            return None

    def delete_definition(self, definition_id: Union[str, UUID], user_id: Union[str, UUID]) -> bool:
        """Delete a report definition"""
        try:
            definition_id_str = self._ensure_string_id(definition_id)
            user_id_str = self._ensure_string_id(user_id)
            
            definition = self.db.query(ReportDefinition)\
                .filter(ReportDefinition.id == definition_id_str)\
                .filter(ReportDefinition.user_id == user_id_str)\
                .first()
                
            if not definition:
                return False

            self.db.delete(definition)
            self.db.commit()
            logger.info(f"Deleted report definition {definition_id}")
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting report definition {definition_id}: {e}")
            return False

    def get_active_scheduled_definitions(self) -> List[ReportDefinition]:
        """Get all active scheduled report definitions"""
        try:
            return self.db.query(ReportDefinition)\
                .filter(ReportDefinition.is_active == True)\
                .filter(ReportDefinition.schedule_cron.isnot(None))\
                .all()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching active scheduled definitions: {e}")
            return []

    # Report Run operations
    def create_run(self, user_id: Union[str, UUID], requested_payload: Dict[str, Any],
                   definition_id: Optional[Union[str, UUID]] = None) -> Optional[ReportRun]:
        """Create a new report run"""
        try:
            user_id_str = self._ensure_string_id(user_id)
            definition_id_str = self._ensure_string_id(definition_id) if definition_id else None

            run = ReportRun(
                user_id=user_id_str,
                definition_id=definition_id_str,
                requested_payload=requested_payload,
                status='queued'
            )
            self.db.add(run)
            self.db.commit()
            self.db.refresh(run)
            logger.info(f"Created report run {run.id} for user {user_id_str}")
            return run
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating report run for user {user_id}: {e}")
            return None

    def update_run_status(self, run_id: Union[str, UUID], status: str,
                         error: Optional[str] = None, outputs: Optional[Dict[str, Any]] = None) -> Optional[ReportRun]:
        """Update a report run status and metadata"""
        try:
            run_id_str = self._ensure_string_id(run_id)
            run = self.db.query(ReportRun).filter(ReportRun.id == run_id_str).first()
            if not run:
                return None

            run.status = status
            if status == 'running':
                run.started_at = datetime.utcnow()
            elif status in ['success', 'failed']:
                run.finished_at = datetime.utcnow()

            if error:
                run.error = error
            if outputs:
                run.outputs = outputs

            self.db.commit()
            self.db.refresh(run)
            logger.info(f"Updated report run {run_id} status to {status}")
            return run
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating report run {run_id}: {e}")
            return None

    def get_run_by_id(self, run_id: Union[str, UUID], user_id: Union[str, UUID]) -> Optional[ReportRun]:
        """Get a report run by ID, ensuring user ownership"""
        try:
            run_id_str = self._ensure_string_id(run_id)
            user_id_str = self._ensure_string_id(user_id)
            return self.db.query(ReportRun)\
                .filter(ReportRun.id == run_id_str)\
                .filter(ReportRun.user_id == user_id_str)\
                .first()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching report run {run_id}: {e}")
            return None

    def get_user_runs(self, user_id: Union[str, UUID], skip: int = 0, limit: int = 20) -> List[ReportRun]:
        """Get report runs for a user with pagination"""
        try:
            user_id_str = self._ensure_string_id(user_id)
            return self.db.query(ReportRun)\
                .filter(ReportRun.user_id == user_id_str)\
                .order_by(ReportRun.created_at.desc())\
                .offset(skip)\
                .limit(limit)\
                .all()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching report runs for user {user_id}: {e}")
            return []

    def get_pending_runs(self, limit: int = 10) -> List[ReportRun]:
        """Get pending report runs for processing"""
        try:
            return self.db.query(ReportRun)\
                .filter(ReportRun.status == 'queued')\
                .order_by(ReportRun.created_at.asc())\
                .limit(limit)\
                .all()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching pending runs: {e}")
            return []

    def get_runs_by_definition(self, definition_id: Union[str, UUID], 
                              skip: int = 0, limit: int = 20) -> List[ReportRun]:
        """Get report runs for a specific definition"""
        try:
            definition_id_str = self._ensure_string_id(definition_id)
            return self.db.query(ReportRun)\
                .filter(ReportRun.definition_id == definition_id_str)\
                .order_by(ReportRun.created_at.desc())\
                .offset(skip)\
                .limit(limit)\
                .all()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching runs for definition {definition_id}: {e}")
            return []
