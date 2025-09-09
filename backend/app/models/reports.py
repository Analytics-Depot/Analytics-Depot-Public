from sqlalchemy import Column, String, DateTime, Text, Index, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid
from ..db.database import Base

class ReportDefinition(Base):
    __tablename__ = 'report_definitions'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)  # Supabase user ID
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    source_type = Column(String, nullable=False)  # 'metrics' or 'chat'
    spec = Column(JSON, nullable=False)  # Report configuration
    schedule_cron = Column(String, nullable=True)  # Cron expression for scheduling
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    runs = relationship("ReportRun", back_populates="definition", cascade="all, delete-orphan")

    __table_args__ = (
        Index('idx_report_def_user', 'user_id'),
        Index('idx_report_def_active', 'is_active'),
    )

class ReportRun(Base):
    __tablename__ = 'report_runs'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    definition_id = Column(String, ForeignKey('report_definitions.id', ondelete='SET NULL'), nullable=True)
    user_id = Column(String, nullable=False)  # Supabase user ID
    status = Column(String, nullable=False, default='queued')  # 'queued', 'running', 'success', 'failed'
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    error = Column(Text, nullable=True)
    requested_payload = Column(JSON, nullable=False)  # Original request that triggered the run
    outputs = Column(JSON, nullable=True)  # Generated file references and metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())  # Add missing created_at field

    # Relationships
    definition = relationship("ReportDefinition", back_populates="runs")

    __table_args__ = (
        Index('idx_report_run_user', 'user_id'),
        Index('idx_report_run_status', 'status'),
        Index('idx_report_run_time', 'started_at'),
    )
