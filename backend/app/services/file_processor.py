# app/services/file_processor.py
import os
import json
import logging
import pandas as pd
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
import hashlib
import mimetypes
from pathlib import Path
import shutil
from sqlalchemy.orm import Session
import asyncio
import time
from ..repositories.chat import ChatRepository
from ..services.openai_service import OpenAIService
from ..services.cache_service import partial_result_cache
import logging
import sys
import traceback
import base64
import re
import gc
import psutil
from dataclasses import dataclass
from fastapi import UploadFile
from docling.document_converter import DocumentConverter
from docling.datamodel.document import DoclingDocument
from docling.datamodel.base_models import InputFormat
import tempfile


DOCLING_AVAILABLE = False
DoclingDocument = DoclingDocument  # Make it available for type hints

# Configure logging first
from app.core.logger import logger

# Enhanced document processing imports
try:
    from docling.document_converter import DocumentConverter
    from docling.datamodel.document import DoclingDocument
    from docling.datamodel.base_models import InputFormat
    DOCLING_AVAILABLE = True
    DoclingDocument = DoclingDocument  # Make it available for type hints
except ImportError as e:
    import traceback
    print('DOCLING IMPORT ERROR:', e)
    traceback.print_exc()
    DOCLING_AVAILABLE = False
    # Create a dummy class for type hints when Docling is not available
    class DoclingDocument:
        def __init__(self):
            pass
        def export_to_markdown(self):
            return ""
    logger.warning("Docling not available - enhanced document processing disabled")

@dataclass
class ProcessingResult:
    """Result of file processing with metadata."""
    success: bool
    content: Optional[Any] = None
    metadata: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    processing_time: float = 0.0
    token_estimate: int = 0
    chunk_count: int = 1
    enhanced_processing: bool = False


class TimeoutError(Exception):
    """Custom timeout exception."""
    pass


class FileProcessor:
    """
    Enhanced file processor with Docling capabilities for intelligent document processing.

    Features:
    - Automatic format detection and routing
    - Resource monitoring and management
    - Intelligent chunking for large documents
    - Error handling and fallback mechanisms
    - Performance optimization
    """

    def __init__(self, max_memory_mb: int = 2048, max_processing_time: int = 300):
        """
        Initialize the file processor.

        Args:
            max_memory_mb: Maximum memory usage in MB before chunking
            max_processing_time: Maximum processing time in seconds
        """
        self.max_memory_mb = max_memory_mb
        self.max_processing_time = max_processing_time
        self.enhanced_processing_enabled = DOCLING_AVAILABLE

        logger.info(f"FileProcessor initialization: DOCLING_AVAILABLE={DOCLING_AVAILABLE}")

        if self.enhanced_processing_enabled:
            # Use default DocumentConverter for basic initialization
            self.docling_converter = DocumentConverter()
            logger.info(f"Enhanced document processing enabled with OCR support (default settings)")
            logger.info(f"Max memory: {max_memory_mb}MB, Max processing time: {max_processing_time}s")
        else:
            logger.info("Enhanced document processing disabled - using basic processing only")

    def _check_system_resources(self) -> bool:
        """
        Check if system has sufficient resources for processing.

        Returns:
            True if resources are sufficient, False otherwise
        """
        try:
            memory = psutil.virtual_memory()
            available_mb = memory.available / (1024 * 1024)

            if available_mb < self.max_memory_mb:
                logger.warning(f"Insufficient memory: {available_mb:.1f}MB available, {self.max_memory_mb}MB required")
                return False

            cpu_percent = psutil.cpu_percent(interval=1)
            if cpu_percent > 90:
                logger.warning(f"High CPU usage: {cpu_percent}%")
                return False

            return True

        except Exception as e:
            logger.error(f"Error checking system resources: {e}")
            return True  # Continue processing if we can't check resources

    def _estimate_tokens(self, text: str) -> int:
        """
        Estimate token count for text content.

        Args:
            text: Text content to estimate tokens for

        Returns:
            Estimated token count
        """
        # Rough estimation: 1 token ≈ 4 characters for English text
        return len(text) // 4

    def _process_with_timeout(self, func, *args, timeout_seconds: int = 60, **kwargs):
        """
        Process function with timeout mechanism.

        Args:
            func: Function to execute
            *args: Function arguments
            timeout_seconds: Timeout in seconds
            **kwargs: Function keyword arguments

        Returns:
            Function result or raises TimeoutError
        """
        result = [None]
        exception = [None]

        def target():
            try:
                result[0] = func(*args, **kwargs)
            except Exception as e:
                exception[0] = e

        thread = threading.Thread(target=target)
        thread.daemon = True
        thread.start()
        thread.join(timeout_seconds)

        if thread.is_alive():
            logger.warning(f"Processing timed out after {timeout_seconds} seconds")
            raise TimeoutError(f"Processing timed out after {timeout_seconds} seconds")

        if exception[0]:
            raise exception[0]

        return result[0]

    async def _fallback_pdf_processing(self, file: UploadFile, content: bytes, start_time: float) -> Dict[str, Any]:
        """
        Fallback PDF processing using PyPDF2 when Docling fails.
        """
        try:
            import PyPDF2
            import io

            logger.info(f"Using PyPDF2 fallback for {file.filename}")

            # Create PDF reader from bytes
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))

            # Extract text from all pages
            text_content = ""
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text_content += page.extract_text() + "\n"

            if not text_content.strip():
                # If no text extracted, likely a scanned PDF
                text_content = "This appears to be a scanned PDF. Enhanced OCR processing is required for text extraction."

            return {
                'success': True,
                'content': {
                    'text_content': text_content,
                    'extraction_method': 'pypdf2_fallback',
                    'note': 'Extracted using basic PDF processing. For scanned documents, OCR processing is recommended.'
                },
                'metadata': {
                    'file_name': file.filename,
                    'file_size': len(content),
                    'format': 'pdf',
                    'processing_method': 'pypdf2_fallback',
                    'pages': len(pdf_reader.pages),
                    'extracted_chars': len(text_content)
                },
                'processing_time': time.time() - start_time,
                'enhanced_processing': False
            }

        except Exception as e:
            logger.error(f"PyPDF2 fallback processing failed: {e}")
            raise

    def _should_use_enhanced_processing(self, file: UploadFile, force_ocr: bool = False) -> bool:
        """
        Determine if enhanced processing (Docling) should be used for the file.
        Enhanced processing is beneficial for:
        - PDFs (especially scanned ones)
        - Images that may contain text
        - Office documents with complex layouts
        - Documents that may contain tables or figures
        - If force_ocr is set, always use enhanced processing
        """
        if not self.enhanced_processing_enabled:
            logger.info(f"Enhanced processing disabled for {file.filename} - Docling not available")
            return False
        if force_ocr:
            logger.info(f"Force OCR enabled for {file.filename}, using enhanced processing")
            return True
        file_ext = file.filename.split('.')[-1].lower() if file.filename else ''
        enhanced_formats = {
            'pdf', 'docx', 'pptx', 'xlsx',
            'png', 'jpg', 'jpeg', 'tiff', 'tif', 'bmp', 'webp',
            'html', 'htm'
        }
        should_use = file_ext in enhanced_formats
        logger.info(f"Enhanced processing check for {file.filename} (ext: {file_ext}): {should_use}")
        return should_use

    async def process_file_enhanced(self, file: UploadFile, force_ocr: bool = False, ocr_language: Optional[list] = None) -> ProcessingResult:
        """
        Enhanced file processing using Docling for intelligent document extraction.

        Args:
            file: Uploaded file to process
            force_ocr: Force OCR even if not auto-detected
            ocr_language: List of language codes for OCR (e.g., ['en'])

        Returns:
            ProcessingResult with enhanced processing results
        """
        start_time = time.time()
        file_id = file.filename  # TODO: Use content hash for uniqueness if needed
        # --- Partial Result Cache Check (OCR) ---
        cached_ocr = partial_result_cache.get(file_id, 'ocr')
        if cached_ocr:
            logger.info(f"[CACHE] Partial result cache HIT for file_id={file_id}, type=ocr")
            return cached_ocr
        logger.info(f"[CACHE] Partial result cache MISS for file_id={file_id}, type=ocr")
        # --- End cache check ---
        if not self.enhanced_processing_enabled:
            logger.error(f"[DOCLING] Docling is not available for enhanced OCR on {file.filename}")
            return ProcessingResult(
                success=False,
                error_message="Docling OCR is not available in this environment.",
                processing_time=time.time() - start_time,
                enhanced_processing=False
            )
        try:
            # Check system resources
            if not self._check_system_resources():
                return ProcessingResult(
                    success=False,
                    error_message="Insufficient system resources for enhanced processing",
                    processing_time=time.time() - start_time,
                    enhanced_processing=True
                )

            # Save file temporarily for Docling processing
            import tempfile
            import os

            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.split('.')[-1]}") as temp_file:
                content = await file.read()
                logging.info(f"[ENHANCED] Before Docling: file={file.filename}, size={len(content)}, file pointer={getattr(file, 'tell', lambda: 'n/a')()}")
                logging.info(f"[ENHANCED] Content preview: {content[:200] if content else 'EMPTY'}")
                temp_file.write(content)
                temp_file_path = temp_file.name

            try:
                # Use official Docling full-page OCR pipeline
                from docling.datamodel.base_models import InputFormat
                from docling.datamodel.pipeline_options import (
                    PdfPipelineOptions,
                    TesseractCliOcrOptions,
                )
                from docling.document_converter import DocumentConverter, PdfFormatOption

                pipeline_options = PdfPipelineOptions()
                pipeline_options.do_ocr = True if force_ocr else True  # Always true for now, but can be toggled
                pipeline_options.do_table_structure = True
                pipeline_options.table_structure_options.do_cell_matching = True
                ocr_options = TesseractCliOcrOptions(force_full_page_ocr=force_ocr)
                if ocr_language:
                    ocr_options.lang = ocr_language
                pipeline_options.ocr_options = ocr_options

                converter = DocumentConverter(
                    format_options={
                        InputFormat.PDF: PdfFormatOption(
                            pipeline_options=pipeline_options,
                        )
                    }
                )

                result = converter.convert(temp_file_path)
                doc = result.document
                # Use the correct argument for export_to_markdown: 'labels' instead of 'main_text_labels'
                markdown_content = doc.export_to_markdown(
                    delim="\n\n",
                    labels={
                        "title", "paragraph", "caption", "table", "text", "section_header", "footnote", "page_footer", "page_header", "document_index", "reference"
                    },
                    strict_text=False,
                    image_placeholder="<!-- image -->"
                )
                logging.info(f"[DOCLING] Extracted markdown preview: {markdown_content[:1000]}")
                token_estimate = self._estimate_tokens(markdown_content)

                logger.info(f"[DOCLING] Extracted {len(markdown_content)} characters from {file.filename}")
                if markdown_content:
                    sample_content = markdown_content[:200].replace('\n', ' ')
                    logger.info(f"[DOCLING] Sample content: {sample_content}...")
                else:
                    logger.warning(f"[DOCLING] No markdown content extracted from {file.filename}")

                # Structure content for API
                content_data = {
                    'markdown_content': markdown_content,
                    'extraction_method': 'docling_ocr',
                    'document_type': getattr(doc, 'type', 'pdf'),
                    'content_length': len(markdown_content)
                }
                result = ProcessingResult(
                    success=True,
                    content=content_data,
                    metadata={
                        'file_name': file.filename,
                        'file_size': len(content),
                        'format': 'enhanced_docling',
                        'token_estimate': token_estimate,
                        'processing_method': 'docling_ocr',
                        'document_type': getattr(doc, 'type', 'pdf'),
                        'ocr_enabled': True,
                        'ocr_language': ocr_language or ['en'],
                        'force_ocr': force_ocr,
                        'extracted_chars': len(markdown_content)
                    },
                    processing_time=time.time() - start_time,
                    token_estimate=token_estimate,
                    enhanced_processing=True
                )
                # --- Store in Partial Result Cache (OCR) ---
                partial_result_cache.set(file_id, 'ocr', result, ttl=3600)  # 1 hour TTL
                # --- End cache store ---
                return result

            finally:
                # Clean up temporary file
                try:
                    os.unlink(temp_file_path)
                except Exception as cleanup_error:
                    logger.warning(f"Failed to clean up temp file {temp_file_path}: {cleanup_error}")

        except TimeoutError as e:
            logger.error(f"Timeout processing file with Docling: {file.filename} (type: {file.filename.split('.')[-1]})")
            return ProcessingResult(
                success=False,
                error_message=f"Enhanced processing timed out: {str(e)}",
                processing_time=time.time() - start_time,
                enhanced_processing=True
            )
        except MemoryError:
            logger.error(f"Memory error processing file with Docling: {file.filename} (type: {file.filename.split('.')[-1]})")
            gc.collect()  # Force garbage collection
            return ProcessingResult(
                success=False,
                error_message="Memory error during enhanced processing",
                processing_time=time.time() - start_time,
                enhanced_processing=True
            )
        except Exception as e:
            logger.error(f"Error in enhanced file processing {file.filename} (type: {file.filename.split('.')[-1]}): {e}", exc_info=True)
            logger.error(traceback.format_exc())
            return ProcessingResult(
                success=False,
                error_message=f"Enhanced processing error: {str(e)}",
                processing_time=time.time() - start_time,
                enhanced_processing=True
            )

    def _structure_docling_content(self, document: DoclingDocument, markdown_content: str) -> Dict[str, Any]:
        """
        Structure Docling document content for API consumption with enhanced chart/graph extraction.

        Args:
            document: Docling document object
            markdown_content: Extracted markdown content

        Returns:
            Structured content dictionary
        """
        try:
            # Extract comprehensive structured data
            structured_data = {}

            # Extract pictures/figures (including charts and graphs)
            if hasattr(document, 'pictures') and document.pictures:
                structured_data['pictures'] = []
                for i, picture in enumerate(document.pictures):
                    try:
                        picture_data = {
                            'picture_id': i,
                            'text': getattr(picture, 'text', ''),
                            'caption': getattr(picture, 'caption', ''),
                            'bbox': getattr(picture, 'bbox', None),
                            'page_no': getattr(picture, 'page_no', None),
                            'image_class': getattr(picture, 'image_class', 'unknown'),
                            'annotations': getattr(picture, 'annotations', {}),
                            'provenance': getattr(picture, 'prov', None)
                        }
                        # Try to extract coordinates if available
                        if hasattr(picture, 'get_location'):
                            picture_data['location'] = picture.get_location()
                        structured_data['pictures'].append(picture_data)
                    except Exception as e:
                        logger.debug(f"Error processing picture {i}: {e}")

            # Extract tables with enhanced metadata
            if hasattr(document, 'tables') and document.tables:
                structured_data['tables'] = []
                for i, table in enumerate(document.tables):
                    try:
                        table_data = {
                            'table_id': i,
                            'text': getattr(table, 'text', ''),
                            'caption': getattr(table, 'caption', ''),
                            'bbox': getattr(table, 'bbox', None),
                            'page_no': getattr(table, 'page_no', None),
                            'structure': getattr(table, 'otsl_seq', ''),
                            'provenance': getattr(table, 'prov', None)
                        }

                        # Extract table data in multiple formats
                        if hasattr(table, 'export_to_dict'):
                            table_data['data'] = table.export_to_dict()
                        elif hasattr(table, 'to_dict'):
                            table_data['data'] = table.to_dict()

                        # Extract table cells with coordinates
                        if hasattr(table, 'get_cells'):
                            table_data['cells'] = table.get_cells()

                        structured_data['tables'].append(table_data)
                    except Exception as e:
                        logger.debug(f"Error processing table {i}: {e}")

            # Extract text items with rich metadata
            if hasattr(document, 'texts') and document.texts:
                structured_data['texts'] = []
                for i, text in enumerate(document.texts):
                    try:
                        text_data = {
                            'text_id': i,
                            'text': getattr(text, 'text', str(text)),
                            'label': getattr(text, 'label', 'text'),
                            'bbox': getattr(text, 'bbox', None),
                            'page_no': getattr(text, 'page_no', None),
                            'level': getattr(text, 'level', 0),
                            'provenance': getattr(text, 'prov', None)
                        }
                        structured_data['texts'].append(text_data)
                    except Exception as e:
                        logger.debug(f"Error processing text {i}: {e}")

            # Extract key-value pairs if available
            if hasattr(document, 'key_value_items') and document.key_value_items:
                structured_data['key_value_items'] = []
                for kv in document.key_value_items:
                    try:
                        kv_data = {
                            'key': getattr(kv, 'key', ''),
                            'value': getattr(kv, 'value', ''),
                            'bbox': getattr(kv, 'bbox', None),
                            'page_no': getattr(kv, 'page_no', None)
                        }
                        structured_data['key_value_items'].append(kv_data)
                    except Exception as e:
                        logger.debug(f"Error processing key-value item: {e}")

            # Extract page information
            page_count = len(getattr(document, 'pages', {}))
            pages_info = []
            if hasattr(document, 'pages'):
                for page_no, page in document.pages.items():
                    page_info = {
                        'page_no': page_no,
                        'size': getattr(page, 'size', {}),
                        'has_image': hasattr(page, 'image') and page.image is not None
                    }
                    pages_info.append(page_info)

            # Enhanced content analysis for charts/graphs
            chart_keywords = ['chart', 'graph', 'figure', 'rating', 'satisfaction', 'bar chart', 'pie chart',
                            'line graph', 'diagram', 'plot', '2002', '2003', '2004']
            found_keywords = []
            for keyword in chart_keywords:
                if keyword.lower() in markdown_content.lower():
                    found_keywords.append(keyword)

            # Analyze extracted content for numerical data
            numerical_indicators = []
            numbers = re.findall(r'\b\d+\.?\d*\b', markdown_content)
            if len(numbers) > 10:  # Likely contains numerical data
                numerical_indicators.append('contains_numerical_data')

            years = re.findall(r'\b(19|20)\d{2}\b', markdown_content)
            if years:
                numerical_indicators.append(f'contains_years: {list(set(years))}')

            return {
                'markdown_content': markdown_content,
                'structured_data': structured_data,
                'document_type': getattr(document, 'type', 'unknown'),
                'extraction_method': 'docling_enhanced',
                'page_count': page_count,
                'pages_info': pages_info,
                'contains_charts': len(structured_data.get('pictures', [])) > 0,
                'contains_tables': len(structured_data.get('tables', [])) > 0,
                'found_keywords': found_keywords,
                'numerical_indicators': numerical_indicators,
                'content_length': len(markdown_content),
                'extraction_summary': {
                    'pictures': len(structured_data.get('pictures', [])),
                    'tables': len(structured_data.get('tables', [])),
                    'texts': len(structured_data.get('texts', [])),
                    'key_value_items': len(structured_data.get('key_value_items', []))
                }
            }

        except Exception as e:
            logger.warning(f"Error structuring Docling content: {e}")
            return {
                'markdown_content': markdown_content,
                'structured_data': {},
                'document_type': 'unknown',
                'extraction_method': 'docling_fallback',
                'error': str(e)
            }

    async def process_file(self, file: UploadFile, force_ocr: bool = False, ocr_language: Optional[list] = None) -> Dict[str, Any]:
        print('[TEST] Entered process_file')
        logging.info('[TEST] Entered process_file')
        """
        Process uploaded file and return its content (backward compatibility method).

        Optionally accepts OCR options.
        """
        start_time = time.time()

        try:
            # Log file pointer and size before reading
            logging.info(f"[PROCESS_FILE] Before read: file={file.filename}, file pointer={getattr(file, 'tell', lambda: 'n/a')()}")
            # Read file content first
            content = await file.read()
            file_ext = file.filename.split('.')[-1].lower() if file.filename else ''

            # Force OCR for PDFs
            if file_ext == 'pdf':
                force_ocr = True
                logging.info(f"[DEBUG] Forcing force_ocr=True for PDF: {file.filename}")

            should_enhanced = self._should_use_enhanced_processing(file, force_ocr=force_ocr)
            logging.info(f"[DEBUG] should_use_enhanced_processing={should_enhanced} for {file.filename}")
            docling_error = None
            if should_enhanced:
                logging.info(f"Using enhanced processing for: {file.filename} (type: {file_ext})")
                await file.seek(0)
                logging.info(f"[PROCESS_FILE] After seek(0): file pointer={getattr(file, 'tell', lambda: 'n/a')()}")
                # --- Docling OCR fail-proof: try once, retry if fails ---
                enhanced_result = await self.process_file_enhanced(file, force_ocr=force_ocr, ocr_language=ocr_language)
                if not enhanced_result.success:
                    docling_error = enhanced_result.error_message
                    logging.error(f"[DOCLING] Enhanced OCR failed for {file.filename}: {docling_error}")
                    logging.warning(f"[DOCLING] First attempt failed for {file.filename}: {docling_error}. Retrying...")
                    await file.seek(0)
                    enhanced_result = await self.process_file_enhanced(file, force_ocr=True, ocr_language=ocr_language or ['en'])
                if enhanced_result.success:
                    logging.info(f"Enhanced processing succeeded for {file.filename}")
                    return {
                        'success': True,
                        'content': enhanced_result.content,
                        'metadata': enhanced_result.metadata,
                        'processing_time': enhanced_result.processing_time,
                        'enhanced_processing': True
                    }
                else:
                    logging.warning(f"Enhanced processing failed for {file.filename} after retry: {enhanced_result.error_message}")
                    # Fall back to basic processing for PDFs using PyPDF2
                    if file_ext == 'pdf':
                        try:
                            logging.info(f"[DEBUG] Falling back to _fallback_pdf_processing for {file.filename}")
                            fallback_result = await self._fallback_pdf_processing(file, content, start_time)
                            # --- If fallback detects scanned PDF, re-attempt Docling OCR with alternate settings ---
                            fallback_text = fallback_result.get('content', {}).get('text_content', '')
                            if fallback_text.strip().startswith('This appears to be a scanned PDF') and self.enhanced_processing_enabled:
                                logging.warning(f"[DOCLING] PyPDF2 fallback detected scanned PDF for {file.filename}. Re-attempting Docling OCR with alternate settings...")
                                await file.seek(0)
                                # Try Docling again with force_ocr and default to English
                                enhanced_result2 = await self.process_file_enhanced(file, force_ocr=True, ocr_language=['eng'])
                                if enhanced_result2.success:
                                    logging.info(f"[DOCLING] Second-chance Docling OCR succeeded for {file.filename}")
                                    return {
                                        'success': True,
                                        'content': enhanced_result2.content,
                                        'metadata': enhanced_result2.metadata,
                                        'processing_time': enhanced_result2.processing_time,
                                        'enhanced_processing': True
                                    }
                                else:
                                    logging.error(f"[DOCLING] Second-chance Docling OCR failed for {file.filename}: {enhanced_result2.error_message}")
                                    fallback_result['docling_error'] = enhanced_result2.error_message
                            return fallback_result
                        except Exception as fallback_error:
                            logging.error(f"Fallback PDF processing also failed: {fallback_error}")
                    logging.info(f"Falling back to basic processing for {file.filename}")
            else:
                logging.info(f"[DEBUG] Not using enhanced processing for {file.filename}, using basic/fallback.")

            # Basic processing (original logic)
            logger.info(f"Using basic processing for: {file.filename} (type: {file_ext})")

            if file_ext == 'json':
                try:
                    return {
                        'success': True,
                        'content': json.loads(content),
                        'metadata': {
                            'file_name': file.filename,
                            'file_size': len(content),
                            'format': 'json',
                            'processing_method': 'basic'
                        },
                        'processing_time': time.time() - start_time,
                        'enhanced_processing': False
                    }
                except json.JSONDecodeError as e:
                    logger.error(f"Error decoding JSON: {str(e)}")
                    raise ValueError("Invalid JSON file")

            elif file_ext == 'csv':
                try:
                    # Read CSV content into pandas DataFrame
                    df = pd.read_csv(pd.io.common.BytesIO(content))
                    # Convert DataFrame to dict/list format
                    return {
                        'success': True,
                        'content': df.to_dict(orient='records'),
                        'metadata': {
                            'file_name': file.filename,
                            'file_size': len(content),
                            'format': 'csv',
                            'processing_method': 'basic',
                            'rows': len(df),
                            'columns': list(df.columns)
                        },
                        'processing_time': time.time() - start_time,
                        'enhanced_processing': False
                    }
                except Exception as e:
                    logger.error(f"Error processing CSV: {str(e)}")
                    raise ValueError("Invalid CSV file")

            elif file_ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp']:
                try:
                    # Enhanced processing for images: use Docling OCR if available
                    if self.enhanced_processing_enabled:
                        logger.info(f"Using Docling OCR for image: {file.filename}")
                        await file.seek(0)
                        enhanced_result = await self.process_file_enhanced(file, force_ocr=True)
                        if enhanced_result.success:
                            logger.info(f"Docling OCR succeeded for {file.filename}")
                            return {
                                'success': True,
                                'content': enhanced_result.content,
                                'metadata': enhanced_result.metadata,
                                'processing_time': enhanced_result.processing_time,
                                'enhanced_processing': True
                            }
                        else:
                            logger.warning(f"Docling OCR failed for {file.filename}: {enhanced_result.error_message}")
                            # Fallback to basic image processing
                    # Fallback: store as base64 and note OCR is not available
                    image_base64 = base64.b64encode(content).decode('utf-8')
                    return {
                        'success': True,
                        'content': {
                            'image_data': image_base64,
                            'image_type': file_ext,
                            'file_size': len(content),
                            'note': 'Image file uploaded. OCR processing unavailable or failed.'
                        },
                        'metadata': {
                            'file_name': file.filename,
                            'file_size': len(content),
                            'format': 'image',
                            'image_type': file_ext,
                            'processing_method': 'basic',
                            'ocr_available': False
                        },
                        'processing_time': time.time() - start_time,
                        'enhanced_processing': False
                    }
                except Exception as e:
                    logger.error(f"Error processing image: {str(e)}")
                    raise ValueError(f"Invalid image file: {str(e)}")

            elif file_ext in ['xlsx', 'xls']:
                try:
                    # Read Excel content into pandas DataFrame
                    df = pd.read_excel(pd.io.common.BytesIO(content))
                    # Convert DataFrame to dict/list format
                    return {
                        'success': True,
                        'content': df.to_dict(orient='records'),
                        'metadata': {
                            'file_name': file.filename,
                            'file_size': len(content),
                            'format': 'excel',
                            'processing_method': 'basic',
                            'rows': len(df),
                            'columns': list(df.columns)
                        },
                        'processing_time': time.time() - start_time,
                        'enhanced_processing': False
                    }
                except Exception as e:
                    logger.error(f"Error processing Excel: {str(e)}")
                    raise ValueError("Invalid Excel file")

            elif file_ext in ['txt', 'md', 'rtf', 'html', 'xml', 'yaml', 'yml']:
                try:
                    # For text-based files, decode and return content
                    text_content = content.decode('utf-8')

                    return {
                        'success': True,
                        'content': {
                            'text_content': text_content,
                            'file_type': file_ext,
                            'file_size': len(content),
                            'character_count': len(text_content),
                            'line_count': len(text_content.split('\n'))
                        },
                        'metadata': {
                            'file_name': file.filename,
                            'file_size': len(content),
                            'format': 'text',
                            'processing_method': 'basic',
                            'character_count': len(text_content),
                            'line_count': len(text_content.split('\n'))
                        },
                        'processing_time': time.time() - start_time,
                        'enhanced_processing': False
                    }
                except Exception as e:
                    logger.error(f"Error processing text file: {str(e)}")
                    raise ValueError(f"Invalid text file: {str(e)}")

            elif file_ext in ['pdf', 'docx', 'doc', 'odt']:
                try:
                    # For document files, we'll store metadata and note that enhanced processing is recommended
                    # Encode document as base64 for storage
                    doc_base64 = base64.b64encode(content).decode('utf-8')

                    return {
                        'success': True,
                        'content': {
                            'document_data': doc_base64,
                            'document_type': file_ext,
                            'file_size': len(content),
                            'note': f'{file_ext.upper()} document uploaded. Enhanced processing (Docling) is recommended for better text extraction.'
                        },
                        'metadata': {
                            'file_name': file.filename,
                            'file_size': len(content),
                            'format': 'document',
                            'document_type': file_ext,
                            'processing_method': 'basic',
                            'enhanced_processing_recommended': True
                        },
                        'processing_time': time.time() - start_time,
                        'enhanced_processing': False
                    }
                except Exception as e:
                    logger.error(f"Error processing document: {str(e)}")
                    raise ValueError(f"Invalid document file: {str(e)}")

            else:
                raise ValueError(f"Unsupported file type: {file_ext}")

        except Exception as e:
            logger.error(f"Error processing file: {str(e)}")
            raise

async def process_file_content(data: Union[Dict[str, Any], List[Dict[str, Any]]], user_id: int, db: Session) -> int:
    """
    Process the content of an uploaded file and create a new chat with the data.

    Args:
        data: The parsed content of the file (either JSON or CSV converted to dict/list)
        user_id: The ID of the user who uploaded the file
        db: SQLAlchemy database session

    Returns:
        The ID of the created chat
    """
    try:
        # Create a new chat for this file upload
        chat_repo = ChatRepository(db)

        # Prepare chat name based on content
        if isinstance(data, list):
            chat_name = f"File Upload ({len(data)} records)"
            industry = "Data Analysis"
        else:
            chat_name = "File Upload Analysis"
            industry = "General"

        # Create new chat
        chat = chat_repo.create_chat(
            user_id=user_id,
            name=chat_name,
            industry=industry
        )

        if not chat:
            raise Exception("Failed to create chat for file upload")

        chat_id = chat.id

        # Convert data to string for storing in chat message
        if isinstance(data, list):
            content = f"Uploaded file with {len(data)} records"
            # Store first few items as a preview
            preview_items = min(5, len(data))
            data_preview = data[:preview_items]
        else:
            content = "Uploaded file data"
            data_preview = data

        # Create initial system message
        chat_repo.add_message(
            chat_id=chat_id,
            role="system",
            content=f"File upload processed. {content}."
        )

        # Create user message with file data
        chat_repo.add_message(
            chat_id=chat_id,
            role="user",
            content=f"I've uploaded a file with the following data: {str(data_preview)}"
        )

        # Return the chat ID for redirecting the user
        return chat_id

    except Exception as e:
        logger.error(f"Error processing file content: {str(e)}")
        raise