from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, BackgroundTasks
from fastapi.responses import StreamingResponse, Response, RedirectResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import json
import logging
from datetime import datetime, timedelta
import pandas as pd
from io import StringIO
import os
from uuid import UUID
import asyncio
import base64

from ..db.database import get_db
from ..repositories.reports import ReportRepository
from ..services.export_service import ExportService
from ..utils.security import get_current_user_from_token

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/reports",
    tags=["reports"]
)

# Pydantic models
class ReportRunRequest(BaseModel):
    source_type: str  # 'metrics' or 'chat'
    metrics_source: Optional[Dict[str, Any]] = None
    chat_source: Optional[Dict[str, Any]] = None
    visualization: Optional[Dict[str, Any]] = None
    export: Dict[str, Any]  # formats, include_charts, etc.

class ReportRunResponse(BaseModel):
    run_id: str
    status: str
    message: str
    created_at: datetime

class ReportRunDetail(BaseModel):
    id: str
    status: str
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    error: Optional[str]
    outputs: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True

# Background task for report generation
def generate_report_background(
    run_id: str,
    user_id: str,
    spec: Dict[str, Any],
    db: Session
):
    """Background task to generate report"""
    try:
        logger.info(f"Starting background report generation for run {run_id}")
        logger.info(f"DEBUG: Background task received spec: {spec}")
        logger.info(f"DEBUG: Background task source_type: {spec.get('source_type')}")

        # Create repositories and services
        reports_repo = ReportRepository(db)
        export_service = ExportService()

        # Update status to running
        reports_repo.update_run_status(run_id, "running")

        # Build dataset based on source type
        df = pd.DataFrame()
        source_type = spec.get('source_type', '').lower()

        if source_type == 'chat':
            # For now, create sample chat data since we're focusing on the infrastructure
            # This will be enhanced with actual chat data integration
            sample_data = {
                'timestamp': [datetime.now() - timedelta(hours=i) for i in range(10)],
                'message_type': ['user', 'assistant'] * 5,
                'content': [f'Sample message {i}' for i in range(10)],
                'chat_id': [spec.get('chat_source', {}).get('chat_id', 'sample')] * 10
            }
            df = pd.DataFrame(sample_data)
        elif source_type == 'metrics':
            # Sample metrics data
            sample_data = {
                'timestamp': [datetime.now() - timedelta(minutes=i*5) for i in range(20)],
                'metric_name': ['cpu_usage', 'memory_usage'] * 10,
                'value': [50 + i for i in range(20)]
            }
            df = pd.DataFrame(sample_data)

        if df.empty:
            reports_repo.update_run_status(
                run_id, "failed",
                error="No data available for the specified criteria"
            )
            return

        # Generate exports
        outputs = {}
        export_formats = spec.get('export', {}).get('formats', [])

        for export_format in export_formats:
            try:
                if export_format == 'csv':
                    # Generate CSV
                    csv_content = export_service.to_csv(df)
                    filename = export_service.generate_filename(
                        f"report_{run_id[:8]}", "csv"
                    )

                    # Store CSV data as base64 for now
                    csv_base64 = base64.b64encode(csv_content).decode('utf-8')
                    outputs['csv'] = {
                        'filename': filename,
                        'size_bytes': len(csv_content),
                        'content_type': 'text/csv',
                        'storage_type': 'base64',
                        'data': csv_base64
                    }
                    logger.info(f"Generated CSV export for run {run_id}")

                # TODO: Add PDF and PNG export in future phases
                elif export_format in ['pdf', 'png']:
                    outputs[export_format] = {
                        'error': f'{export_format.upper()} export not yet implemented'
                    }

            except Exception as e:
                logger.error(f"Error generating {export_format} export: {str(e)}")
                outputs[export_format] = {
                    'error': f'Failed to generate {export_format}: {str(e)}'
                }

        # Add metadata
        if 'csv' in outputs:
            metadata = export_service.get_export_metadata(
                df, 'csv', spec['source_type'],
                spec.get('metrics_source') or spec.get('chat_source') or {}
            )
            outputs['metadata'] = metadata

        # Update status to success
        reports_repo.update_run_status(
            run_id, "success", outputs=outputs
        )

        logger.info(f"Successfully completed report generation for run {run_id}")

    except Exception as e:
        logger.error(f"Error in background report generation for run {run_id}: {str(e)}")
        try:
            reports_repo = ReportRepository(db)
            reports_repo.update_run_status(
                run_id, "failed", error=str(e)
            )
        except Exception as update_error:
            logger.error(f"Failed to update run status for {run_id}: {str(update_error)}")

@router.post("/run", response_model=ReportRunResponse)
async def run_report(
    request: ReportRunRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Run an on-demand report"""
    try:
        # Validate request
        export_service = ExportService()
        validation = export_service.validate_export_request(request.dict())

        if not validation['valid']:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid request: {'; '.join(validation['errors'])}"
            )

        if validation['warnings']:
            logger.warning(f"Report request warnings: {'; '.join(validation['warnings'])}")

        # Get user ID
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid user session")

        # Create report run
        reports_repo = ReportRepository(db)
        run = reports_repo.create_run(user_id, request.dict())
        
        if not run:
            raise HTTPException(status_code=500, detail="Failed to create report run")

        # Start background task
        background_tasks.add_task(
            generate_report_background,
            str(run.id),
            user_id,
            request.dict(),
            db
        )

        logger.info(f"Started report generation for user {user_id}, run_id: {run.id}")

        return ReportRunResponse(
            run_id=str(run.id),
            status="queued",
            message="Report generation started",
            created_at=run.created_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting report generation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start report generation: {str(e)}"
        )

@router.get("/runs", response_model=List[ReportRunDetail])
async def get_user_runs(
    skip: int = 0,
    limit: int = 20,
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Get report runs for the current user"""
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid user session")

        reports_repo = ReportRepository(db)
        runs = reports_repo.get_user_runs(user_id, skip=skip, limit=limit)

        return [
            ReportRunDetail(
                id=run.id,
                status=run.status,
                started_at=run.started_at,
                finished_at=run.finished_at,
                error=run.error,
                outputs=run.outputs,
                created_at=run.created_at
            )
            for run in runs
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user runs: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch report runs: {str(e)}"
        )

@router.get("/runs/{run_id}", response_model=ReportRunDetail)
async def get_run_detail(
    run_id: UUID,
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Get details of a specific report run"""
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid user session")

        reports_repo = ReportRepository(db)
        run = reports_repo.get_run_by_id(run_id, user_id)

        if not run:
            raise HTTPException(status_code=404, detail="Report run not found")

        return ReportRunDetail(
            id=run.id,
            status=run.status,
            started_at=run.started_at,
            finished_at=run.finished_at,
            error=run.error,
            outputs=run.outputs,
            created_at=run.created_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching run detail: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch run detail: {str(e)}"
        )

@router.get("/download/{run_id}/{format}")
async def download_report_file(
    run_id: str,
    format: str,
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Download a report file in the specified format"""
    try:
        # Get the report run
        reports_repo = ReportRepository(db)
        run = reports_repo.get_run_by_id(run_id, current_user.get("id"))

        if not run:
            raise HTTPException(status_code=404, detail="Report run not found")

        # Check if user owns this report
        if run.user_id != current_user.get("id"):
            raise HTTPException(status_code=403, detail="Access denied")

        # Get the outputs
        outputs = run.outputs or {}

        if format not in outputs:
            raise HTTPException(status_code=404, detail=f"Format {format} not found for this report")

        file_info = outputs[format]

        if file_info.get('storage_type') == 'base64':
            # Decode base64 data
            try:
                file_data = base64.b64decode(file_info['data'])
                filename = file_info['filename']

                return Response(
                    content=file_data,
                    media_type=file_info.get('content_type', 'application/octet-stream'),
                    headers={
                        "Content-Disposition": f"attachment; filename={filename}",
                        "Content-Length": str(len(file_data))
                    }
                )
            except Exception as decode_error:
                logger.error(f"Failed to decode base64 data for {run_id}: {str(decode_error)}")
                raise HTTPException(status_code=500, detail="Failed to decode file data")

        elif file_info.get('url'):
            # Redirect to the storage URL
            return RedirectResponse(url=file_info['url'])

        else:
            raise HTTPException(status_code=404, detail="File not available for download")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading report file: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
