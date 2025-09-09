from typing import Dict, List, Any, Optional, Union
import pandas as pd
import io
import logging
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class ExportService:
    """Service for exporting data to various formats"""

    def __init__(self):
        pass

    def to_csv(self, df: pd.DataFrame, filename: Optional[str] = None) -> bytes:
        """Export DataFrame to CSV bytes"""
        try:
            if df.empty:
                # Return empty CSV with headers
                output = io.StringIO()
                df.to_csv(output, index=False)
                return output.getvalue().encode('utf-8')

            # Convert any problematic data types
            df_clean = self._clean_dataframe_for_export(df)

            output = io.StringIO()
            df_clean.to_csv(output, index=False)
            csv_content = output.getvalue()

            logger.info(f"Successfully exported {len(df_clean)} rows to CSV")
            return csv_content.encode('utf-8')

        except Exception as e:
            logger.error(f"Error exporting to CSV: {str(e)}")
            raise

    def _clean_dataframe_for_export(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean DataFrame to ensure it can be exported properly"""
        try:
            df_clean = df.copy()

            # Handle datetime columns
            for col in df_clean.select_dtypes(include=['datetime64']).columns:
                df_clean[col] = df_clean[col].dt.strftime('%Y-%m-%d %H:%M:%S')

            # Handle numpy types
            for col in df_clean.columns:
                if df_clean[col].dtype.kind in 'iuf':  # integer, unsigned integer, float
                    df_clean[col] = df_clean[col].astype(float)
                elif df_clean[col].dtype.kind == 'b':  # boolean
                    df_clean[col] = df_clean[col].astype(str)
                elif df_clean[col].dtype.kind == 'O':  # object (string)
                    # Convert any non-string objects to strings
                    df_clean[col] = df_clean[col].astype(str)

            # Replace NaN values with empty strings for CSV
            df_clean = df_clean.fillna('')

            return df_clean

        except Exception as e:
            logger.error(f"Error cleaning DataFrame: {str(e)}")
            return df

    def generate_filename(self, base_name: str, format_type: str, timestamp: Optional[datetime] = None) -> str:
        """Generate a filename for exported files"""
        if timestamp is None:
            timestamp = datetime.utcnow()

        timestamp_str = timestamp.strftime('%Y%m%d_%H%M%S')
        return f"{base_name}_{timestamp_str}.{format_type.lower()}"

    def get_export_metadata(self, df: pd.DataFrame, export_format: str,
                           source_type: str, source_details: Dict[str, Any]) -> Dict[str, Any]:
        """Generate metadata for exported files"""
        try:
            metadata = {
                "export_format": export_format,
                "exported_at": datetime.utcnow().isoformat(),
                "source_type": source_type,
                "source_details": source_details,
                "data_summary": {
                    "row_count": len(df),
                    "column_count": len(df.columns),
                    "columns": list(df.columns),
                    "data_types": {col: str(dtype) for col, dtype in df.dtypes.to_dict().items()}
                }
            }

            # Add basic statistics for numeric columns
            numeric_cols = df.select_dtypes(include=['number']).columns
            if len(numeric_cols) > 0:
                metadata["data_summary"]["numeric_statistics"] = {}
                for col in numeric_cols:
                    metadata["data_summary"]["numeric_statistics"][col] = {
                        "min": float(df[col].min()) if not df[col].empty else None,
                        "max": float(df[col].max()) if not df[col].empty else None,
                        "mean": float(df[col].mean()) if not df[col].empty else None,
                        "std": float(df[col].std()) if not df[col].empty else None
                    }

            return metadata

        except Exception as e:
            logger.error(f"Error generating export metadata: {str(e)}")
            return {
                "export_format": export_format,
                "exported_at": datetime.utcnow().isoformat(),
                "error": f"Failed to generate metadata: {str(e)}"
            }

    def validate_export_request(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Validate export request specification"""
        errors = []
        warnings = []

        # Check required fields
        if 'source_type' not in spec:
            errors.append("Missing required field: source_type")

        if 'export' not in spec:
            errors.append("Missing required field: export")
        else:
            export_spec = spec['export']
            if 'formats' not in export_spec:
                errors.append("Missing required field: export.formats")
            elif not isinstance(export_spec['formats'], list):
                errors.append("export.formats must be a list")
            elif len(export_spec['formats']) == 0:
                errors.append("export.formats cannot be empty")
            else:
                # Validate format types
                valid_formats = ['csv', 'pdf', 'png']
                for fmt in export_spec['formats']:
                    if fmt not in valid_formats:
                        errors.append(f"Unsupported export format: {fmt}")

        # Check source-specific requirements
        source_type = spec.get('source_type')
        if source_type == 'metrics':
            metrics_source = spec.get('metrics_source', {})
            required_fields = ['server_id', 'metric_names', 'start_time', 'end_time']
            for field in required_fields:
                if field not in metrics_source:
                    errors.append(f"Missing required field: metrics_source.{field}")

            # Validate metric_names is a list
            if 'metric_names' in metrics_source and not isinstance(metrics_source['metric_names'], list):
                errors.append("metrics_source.metric_names must be a list")

        elif source_type == 'chat':
            chat_source = spec.get('chat_source', {})
            if 'chat_id' not in chat_source:
                errors.append("Missing required field: chat_source.chat_id")

        # Check visualization requirements if charts are requested
        export_spec = spec.get('export', {})
        if export_spec.get('include_charts', False):
            if 'visualization' not in spec:
                errors.append("visualization is required when include_charts is true")
            else:
                viz_spec = spec['visualization']
                if 'type' not in viz_spec:
                    errors.append("Missing required field: visualization.type")
                elif viz_spec['type'] not in ['time_series', 'bar', 'pie', 'scatter']:
                    errors.append(f"Unsupported visualization type: {viz_spec['type']}")

        # Check for warnings
        if source_type == 'metrics':
            metrics_source = spec.get('metrics_source', {})
            if 'interval' not in metrics_source:
                warnings.append("No interval specified for metrics, using default: 1 hour")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
