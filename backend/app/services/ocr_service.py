import logging
from pathlib import Path
from typing import Optional, Dict

logger = logging.getLogger(__name__)

try:
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions, TesseractCliOcrOptions
    from docling.document_converter import DocumentConverter, PdfFormatOption
    DOCLING_AVAILABLE = True
except ImportError as e:
    logger.error(f"Docling import failed: {e}")
    DOCLING_AVAILABLE = False

def extract_markdown(input_path: str, output_path: str, ocr_options: Optional[Dict] = None) -> bool:
    """
    Extracts markdown from a scanned document using Docling OCR and saves it to output_path.
    Returns True on success, False on failure.
    """
    logger.info(f"Starting OCR extraction: input={input_path}, output={output_path}, ocr_options={ocr_options}")
    if not DOCLING_AVAILABLE:
        logger.error("Docling is not available in the environment.")
        return False
    try:
        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = True
        pipeline_options.do_table_structure = True
        pipeline_options.table_structure_options.do_cell_matching = True
        # Handle OCR options
        ocr_opts = TesseractCliOcrOptions(force_full_page_ocr=True)
        if ocr_options:
            if ocr_options.get('force_full_page_ocr') is not None:
                ocr_opts.force_full_page_ocr = ocr_options['force_full_page_ocr']
            if ocr_options.get('lang'):
                ocr_opts.lang = ocr_options['lang']
        pipeline_options.ocr_options = ocr_opts
        logger.info(f"Pipeline options: {pipeline_options}")
        converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
            }
        )
        logger.info("Running Docling converter...")
        result = converter.convert(str(input_path))
        doc = result.document
        md = doc.export_to_markdown()
        logger.info(f"Extracted markdown length: {len(md)}")
        logger.info(f"Markdown preview: {md[:500]}")
        Path(output_path).write_text(md, encoding="utf-8")
        logger.info(f"Markdown extraction successful: {output_path}")
        return True
    except Exception as e:
        logger.error(f"OCR extraction failed: {e}", exc_info=True)
        return False