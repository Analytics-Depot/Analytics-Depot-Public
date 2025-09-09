# app/integrations/query_engine.py
from typing import Any, Dict, List, Optional
import pandas as pd
import os
from sqlalchemy import create_engine
from ...core.config import settings
from .base import DataConnector
from fastapi import UploadFile
from app.integrations.connectors.processors.document_processor import DocumentProcessor

class QueryEngine:
    def __init__(self):
        db_url = settings.DATABASE_URL or os.getenv("DATABASE_URL")
        if db_url:
            self.cache_engine = create_engine(db_url)
        else:
            # Fallback: use a local SQLite file ONLY if no DATABASE_URL is set
            self.cache_engine = create_engine('sqlite:///cache.db')
        self.connectors: Dict[str, DataConnector] = {}

    async def register_connector(self, name: str, connector: DataConnector):
        """Register a new data connector"""
        await connector.connect()
        self.connectors[name] = connector

    async def execute_query(
        self,
        source: str,
        query: str,
        params: Optional[Dict] = None
    ) -> pd.DataFrame:
        """Execute a query against a specific data source"""
        if source not in self.connectors:
            raise ValueError(f"Unknown data source: {source}")

        return await self.connectors[source].query(query, params)

    async def execute_cross_source_query(
        self,
        query_spec: Dict[str, Any]
    ) -> pd.DataFrame:
        """Execute a query across multiple data sources"""
        results = {}

        # Fetch data from each source
        for source, query in query_spec['sources'].items():
            df = await self.execute_query(source, query['query'], query.get('params'))
            results[source] = df

        # Cache results for faster subsequent queries
        for source, df in results.items():
            df.to_sql(f"cache_{source}", self.cache_engine, if_exists='replace')

        # Execute the combining query
        final_result = pd.read_sql(query_spec['combine_query'], self.cache_engine)
        return final_result

# app/api/endpoints/data_query.py
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from .query_engine import QueryEngine

router = APIRouter()

@router.post("/query/single")
async def execute_single_query(
    source: str,
    query: str,
    params: Optional[Dict] = None,
    query_engine: QueryEngine = Depends()
):
    try:
        result = await query_engine.execute_query(source, query, params)
        return {
            "success": True,
            "data": result.to_dict(orient='records')
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/query/cross-source")
async def execute_cross_source_query(
    query_spec: Dict[str, Any],
    query_engine: QueryEngine = Depends()
):
    try:
        result = await query_engine.execute_cross_source_query(query_spec)
        return {
            "success": True,
            "data": result.to_dict(orient='records')
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/query/upload")
async def process_uploaded_file(
    file: UploadFile,
    processor: DocumentProcessor = Depends()
):
    content = await file.read()
    file_type = file.filename.split('.')[-1].lower()

    processor_map = {
        'csv': processor.process_csv,
        'xlsx': processor.process_excel,
        'pdf': processor.process_pdf,
        'docx': processor.process_docx,
        'json': processor.process_json
    }

    if file_type not in processor_map:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    try:
        result = await processor_map[file_type](content)
        return {
            "success": True,
            "data": result if isinstance(result, dict) else result.to_dict(orient='records')
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))