from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import json
import logging
from datetime import datetime
import os
import shutil
from pathlib import Path
import pandas as pd
import numpy as np
from io import StringIO
import hashlib
import mimetypes

from ..db.database import get_db
from ..repositories.user import UserRepository
from ..repositories.chat import ChatRepository
from ..models.user import User
from ..utils.security import get_current_user_from_token

# Initialize logger
logger = logging.getLogger(__name__)
from ..services.file_processor import FileProcessor
from ..services.cache_service import query_cache, partial_result_cache

router = APIRouter(
    tags=["files"]
)

# Supported file types for upload
SUPPORTED_FILE_TYPES = [
    # Data files
    'csv', 'json', 'xlsx', 'xls',
    # Document files
    'pdf', 'docx', 'doc', 'txt', 'md', 'rtf', 'odt',
    # Image files
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp',
    # Other common formats
    'html', 'xml', 'yaml', 'yml'
]

def convert_numpy(obj):
    if isinstance(obj, dict):
        return {k: convert_numpy(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy(v) for v in obj]
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    else:
        return obj

@router.post("/upload")
async def upload_file(
    file: UploadFile,
    analysis_type: Optional[str] = Form(None),
    force_ocr: Optional[bool] = Form(False),
    ocr_language: Optional[str] = Form(None),
    chat_id: Optional[str] = Form(None),  # NEW: accept chat_id as form field
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Handles file uploads, performs specified analysis, and associates the file
    with a new or existing chat session.
    Accepts optional OCR options: force_ocr (bool), ocr_language (comma-separated string)
    """
    try:
        # Read file into memory once
        file_bytes = await file.read()
        file_size = len(file_bytes)
        max_size = 50 * 1024 * 1024
        if file_size > max_size:
            raise HTTPException(status_code=413, detail=f"File size exceeds 50MB")
        file_ext = file.filename.split('.')[-1].lower()
        if file_ext not in SUPPORTED_FILE_TYPES:
            raise HTTPException(status_code=415, detail=f"Unsupported file type: .{file_ext}")
        # Create a new UploadFile-like object from bytes for processing
        from fastapi import UploadFile
        from io import BytesIO
        import tempfile
        temp_file = tempfile.SpooledTemporaryFile(max_size=max_size)
        temp_file.write(file_bytes)
        temp_file.seek(0)
        upload_file_for_processing = UploadFile(filename=file.filename, file=temp_file)
        logger.info(f"[API] Created new UploadFile for processing: {upload_file_for_processing.filename}, size: {file_size}")
        chat_repo = ChatRepository(db)

        # Use Supabase user ID from the User object
        supabase_user_id = current_user.external_id
        if not supabase_user_id:
            raise HTTPException(status_code=400, detail="Invalid user session")

        # Now log the file upload details after user is guaranteed to exist
        logger.info(f"[API] File Upload: filename={file.filename}, analysis_type={analysis_type}, user={current_user.email}, force_ocr={force_ocr}, ocr_language={ocr_language}, chat_id={chat_id}")

        logger.info(f"[API] File Upload Debug - Supabase user ID: {supabase_user_id}, Email: {current_user.email}")

        # NEW: Use existing chat if chat_id is provided and valid
        chat = None
        if chat_id:
            logger.info(f"[API] File Upload Debug - Looking for existing chat: {chat_id} with user ID: {supabase_user_id}")
            chat = chat_repo.get_chat_by_id(chat_id, supabase_user_id)
            if chat:
                logger.info(f"[API] Attaching file to existing chat {chat_id}")
            else:
                logger.warning(f"[API] File Upload Debug - Chat {chat_id} not found for user {supabase_user_id}")
        if not chat:
            logger.info(f"[API] File Upload Debug - Creating new chat for user ID: {supabase_user_id}")
            chat = chat_repo.create_chat(user_id=supabase_user_id, name=f"File Analysis: {file.filename}")
            if not chat:
                raise HTTPException(status_code=500, detail="Failed to create chat session")
            logger.info(f"[API] Created new chat {chat.id} for file upload")
        target_chat_id = chat.id
        analysis_results = {}
        content_for_db = None
        preview = None
        processing_metadata = {}
        # Parse ocr_language as list if provided, sanitize for invalid values
        if ocr_language and ocr_language.lower() != 'string':
            ocr_language_list = [lang.strip() for lang in ocr_language.split(',') if lang.strip()]
            # If the list is empty or contains only invalid values, default to ['eng']
            if not ocr_language_list or any(l.lower() == 'string' for l in ocr_language_list):
                ocr_language_list = ['eng']
        else:
            ocr_language_list = ['eng']
        logger.info(f"[API] Using OCR language(s): {ocr_language_list}")
        if analysis_type and file_ext in ['csv', 'json', 'xlsx', 'xls']:
            logger.info(f"Performing '{analysis_type}' analysis on {file.filename}")
            # Basic analysis for now - can be enhanced later
            analysis_results = {"type": analysis_type, "status": "basic_analysis"}
            content_for_db = []
            preview = []
        else:
            logger.info(f"Performing enhanced extraction on {file.filename}")
            file_processor = FileProcessor(max_memory_mb=512)
            processing_result = await file_processor.process_file(upload_file_for_processing, force_ocr=force_ocr, ocr_language=ocr_language_list)
            if not processing_result.get('success'):
                raise Exception(processing_result.get('error_message', 'Unknown error processing file'))
            content_for_db = processing_result.get('content')
            processing_metadata = processing_result.get('metadata', {})
            analysis_results = {"insights": processing_result.get('analysis', {}).get('insights', [])}
            if isinstance(content_for_db, dict):
                 structured = content_for_db.get('structured_data', {})
                 if 'tables' in structured and structured['tables']:
                     preview = structured['tables'][0].get('rows', [])[:5]
                 else:
                     preview = (content_for_db.get('markdown_content', '') or '')[:500]
        if content_for_db is not None:
            logger.info(f"[API] Storing file data for chat {target_chat_id}: filename={file.filename}, type={file_ext}, content_keys={list(content_for_db.keys()) if isinstance(content_for_db, dict) else type(content_for_db)}")
            if isinstance(content_for_db, dict) and 'markdown_content' in content_for_db:
                logger.info(f"[API] markdown_content length: {len(content_for_db['markdown_content'])}")
            chat_repo.add_file_data(
                chat_id=target_chat_id,
                filename=file.filename,
                file_type=file_ext,
                content=content_for_db,
                summary=f"Analyzed with type: {analysis_type or 'enhanced extraction'}"
            )
            chat_repo.add_message(
                chat_id=target_chat_id,
                role="system",
                content=f"File '{file.filename}' has been uploaded and analyzed. The data is now available for discussion."
            )
            # --- Cache Invalidation ---
            # Invalidate all FAQ/query cache for this chat (brute-force: all keys with chat_id)
            for key in list(query_cache.cache.keys()):
                if f"faq:{target_chat_id}:" in key:
                    query_cache.cache.invalidate(key)
                    logger.info(f"[CACHE] Invalidated FAQ/query cache: {key}")
            # Invalidate all partial result cache for this file (brute-force: all keys with file.filename)
            for key in list(partial_result_cache.cache.keys()):
                if f"partial:{file.filename}:" in key:
                    partial_result_cache.cache.invalidate(key)
                    logger.info(f"[CACHE] Invalidated partial result cache: {key}")
            # --- End cache invalidation ---
        final_response = {
            "success": True,
            "chat_id": str(target_chat_id),
            "filename": file.filename,
            "file_type": file.content_type,
            "analysis": analysis_results.get("analysis", {
                "statistical": analysis_results.get("statistical", {}),
                "insights": analysis_results.get("insights", []),
                "type": analysis_type or "general",
            }),
            "preview": preview,
            "content": content_for_db,
            "processing_metadata": processing_metadata if 'processing_metadata' in locals() else {},
        }
        return convert_numpy(final_response)
    except HTTPException as http_exc:
        logger.error(f"[API] HTTP Error: {http_exc.detail}")
        raise http_exc
    except Exception as e:
        logger.error(f"[API] Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
    finally:
        await file.close()