# app/integrations/processors/document_processor.py
import pandas as pd
import json
from typing import Any, Dict, Union
import PyPDF2
from io import BytesIO
import docx
from bs4 import BeautifulSoup
import requests

class DocumentProcessor:
    """Handles processing of various document types"""

    @staticmethod
    async def process_csv(content: bytes) -> pd.DataFrame:
        try:
            return pd.read_csv(BytesIO(content))
        except Exception as e:
            print(f"Error processing CSV: {e}")
            return pd.DataFrame()

    @staticmethod
    async def process_excel(content: bytes) -> pd.DataFrame:
        try:
            return pd.read_excel(BytesIO(content))
        except Exception as e:
            print(f"Error processing Excel: {e}")
            return pd.DataFrame()

    @staticmethod
    async def process_pdf(content: bytes) -> Dict[str, Any]:
        try:
            pdf_reader = PyPDF2.PdfReader(BytesIO(content))
            text_content = ""
            for page in pdf_reader.pages:
                text_content += page.extract_text()
            return {"text": text_content}
        except Exception as e:
            print(f"Error processing PDF: {e}")
            return {"text": ""}

    @staticmethod
    async def process_docx(content: bytes) -> Dict[str, Any]:
        try:
            doc = docx.Document(BytesIO(content))
            text_content = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return {"text": text_content}
        except Exception as e:
            print(f"Error processing DOCX: {e}")
            return {"text": ""}

    @staticmethod
    async def process_json(content: bytes) -> Dict[str, Any]:
        try:
            return json.loads(content)
        except Exception as e:
            print(f"Error processing JSON: {e}")
            return {}

    @staticmethod
    async def process_url(url: str) -> Dict[str, Any]:
        try:
            response = requests.get(url)
            soup = BeautifulSoup(response.content, 'html.parser')
            return {
                "title": soup.title.string if soup.title else "",
                "text": soup.get_text(),
                "links": [link.get('href') for link in soup.find_all('a')]
            }
        except Exception as e:
            print(f"Error processing URL: {e}")
            return {}