# app/services/file_analyzer.py
import pandas as pd
import json
import logging
from typing import Dict, List, Any, Union
import numpy as np
from ..services.openai_service import OpenAIService

logger = logging.getLogger(__name__)

class FileAnalyzer:
    """Service for analyzing uploaded CSV and JSON files"""

    def __init__(self):
        self.openai_service = OpenAIService()

    async def analyze(self, file_content: bytes, file_name: str) -> Dict[str, Any]:
        """Alias for analyze_file to maintain compatibility"""
        return await self.analyze_file(file_content, file_name)

    async def analyze_file(self, file_content: bytes, file_name: str, analysis_type: str = 'statistical') -> Dict[str, Any]:
        """Analyze a file based on its type and the requested analysis."""
        try:
            df = self._load_dataframe(file_content, file_name)

            results = {
                "status": "success",
                "preview": df.head(5).to_dict('records'),
                "full_data": df.to_dict('records'),
                "columns": list(df.columns),
                "rows": len(df),
                "analysis": {}
            }

            if analysis_type == 'statistical':
                results["analysis"]["statistical"] = self._generate_statistics(df)
                results["analysis"]["insights"] = await self._generate_insights(df)
            elif analysis_type == 'trend':
                # Assuming the first datetime column and first numeric column for trend
                results["analysis"]["trend_analysis"] = self._perform_trend_analysis(df)
                results["analysis"]["insights"] = await self._generate_insights(df, "Focus on time-based trends and seasonality.")
            # Add other analysis types here in the future
            # elif analysis_type == 'correlation':
            #     results["analysis"]["correlation_analysis"] = self._perform_correlation_analysis(df)

            return results

        except Exception as e:
            logger.error(f"Error analyzing file {file_name}: {str(e)}")
            return {
                "error": str(e),
                "status": "error",
                "message": f"Failed to analyze {file_name}"
            }

    def _load_dataframe(self, file_content: bytes, file_name: str) -> pd.DataFrame:
        """Load file content into a pandas DataFrame."""
        file_extension = file_name.split('.')[-1].lower()
        if file_extension == 'csv':
            return pd.read_csv(pd.io.common.BytesIO(file_content))
        elif file_extension == 'json':
            data = json.loads(file_content.decode('utf-8'))
            if isinstance(data, list):
                return pd.DataFrame(data)
            else:
                # Attempt to normalize a single JSON object
                return pd.json_normalize(data)
        elif file_extension in ['xlsx', 'xls']:
             return pd.read_excel(pd.io.common.BytesIO(file_content))
        else:
            raise ValueError(f"Unsupported file type for DataFrame conversion: {file_extension}")

    def _perform_trend_analysis(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Performs trend analysis on the first suitable date/time and numeric columns."""
        date_col = None
        numeric_col = None

        # Find the first datetime-like column
        for col in df.columns:
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                date_col = col
                break
            try:
                # Try to convert object columns to datetime
                converted_col = pd.to_datetime(df[col], errors='coerce', utc=True)
                if not converted_col.isna().all():
                    df[col] = converted_col
                    date_col = col
                    break
            except Exception:
                continue

        if not date_col:
            return {"error": "No suitable date/time column found for trend analysis."}

        # Find the first numeric column (that isn't the date column)
        for col in df.columns:
            if col != date_col and pd.api.types.is_numeric_dtype(df[col]):
                numeric_col = col
                break

        if not numeric_col:
            return {"error": "No suitable numeric column found for trend analysis."}

        # Basic trend calculation (monthly average)
        df_trend = df.copy()
        df_trend = df_trend.set_index(date_col)
        monthly_avg = df_trend[numeric_col].resample('ME').mean()

        return {
            "date_column": date_col,
            "value_column": numeric_col,
            "monthly_average": monthly_avg.reset_index().to_dict('records'),
            "summary": f"Trend analysis performed on '{numeric_col}' over time ('{date_col}')."
        }

    async def analyze_csv(self, content: bytes) -> Dict[str, Any]:
        """Analyze CSV file content"""
        try:
            # Parse CSV content
            df = pd.read_csv(pd.io.common.BytesIO(content))

            # Get basic statistics
            stats = self._generate_statistics(df)

            # Generate insights
            insights = await self._generate_insights(df)

            return {
                "status": "success",
                "statistical": stats,
                "insights": insights,
                "columns": list(df.columns),
                "rows": len(df),
                "preview": df.head(5).to_dict('records')
            }

        except Exception as e:
            logger.error(f"Error in CSV analysis: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def analyze_json(self, content: bytes) -> Dict[str, Any]:
        """Analyze JSON file content"""
        try:
            # Parse JSON content
            data = json.loads(content.decode('utf-8'))

            # Convert to DataFrame if possible
            if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
                df = pd.DataFrame(data)
                stats = self._generate_statistics(df)
                insights = await self._generate_insights(df)

                return {
                    "status": "success",
                    "structure": "tabular",
                    "statistical": stats,
                    "insights": insights,
                    "columns": list(df.columns),
                    "rows": len(df),
                    "preview": df.head(5).to_dict('records')
                }
            else:
                # For non-tabular JSON data
                structure_analysis = self._analyze_json_structure(data)
                ai_insights = await self._generate_json_insights(data)

                return {
                    "status": "success",
                    "structure": "nested",
                    "structure_analysis": structure_analysis,
                    "insights": ai_insights,
                    "preview": self._get_json_preview(data)
                }

        except Exception as e:
            logger.error(f"Error in JSON analysis: {str(e)}")
            return {"status": "error", "error": str(e)}

    def _generate_statistics(self, df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
        """Generate statistical summary for numeric columns"""
        stats = {}

        for column in df.columns:
            if np.issubdtype(df[column].dtype, np.number):
                stats[column] = {
                    'mean': df[column].mean(),
                    'median': df[column].median(),
                    'std': df[column].std(),
                    'min': df[column].min(),
                    'max': df[column].max()
                }
            elif df[column].dtype == 'object':
                # For string columns, provide different stats
                stats[column] = {
                    'unique_values': df[column].nunique(),
                    'most_common': df[column].value_counts().index[0] if not df[column].value_counts().empty else None,
                    'missing': df[column].isna().sum()
                }

        return stats

    async def _generate_insights(self, df: pd.DataFrame, context: str = "") -> List[Dict[str, str]]:
        """Generate insights from the dataframe using AI"""
        try:
            # Prepare a summary of the dataframe
            column_info = []
            for col in df.columns:
                if np.issubdtype(df[col].dtype, np.number):
                    col_type = "numeric"
                    col_summary = f"range: {df[col].min()}-{df[col].max()}, mean: {df[col].mean():.2f}"
                else:
                    col_type = "categorical/text"
                    unique_count = df[col].nunique()
                    col_summary = f"unique values: {unique_count}"

                column_info.append(f"{col} ({col_type}): {col_summary}")

            df_summary = "\n".join(column_info)
            df_head = df.head(5).to_string()

            # Use OpenAI to generate insights
            prompt = f"""
            I have a dataset with {len(df)} rows and {len(df.columns)} columns:
            {df_summary}

            Here's a preview of the first 5 rows:
            {df_head}

            {context}
            Please provide 3-5 key insights about this data. Format each insight as a JSON object with 'type' (observation/pattern/anomaly) and 'message' fields.
            """

            insights_text = await self.openai_service.generate_response([
                {"role": "system", "content": "You are a data analyst providing insights on datasets. Respond with only a JSON array of insights."},
                {"role": "user", "content": prompt}
            ])

            # Parse insights from the response
            try:
                # Extract JSON from the response if it's wrapped in text or code blocks
                insights_text = insights_text.strip()
                if "```json" in insights_text:
                    insights_text = insights_text.split("```json")[1].split("```")[0].strip()
                elif "```" in insights_text:
                    insights_text = insights_text.split("```")[1].strip()

                insights = json.loads(insights_text)
                return insights
            except json.JSONDecodeError:
                logger.error(f"Failed to parse insights JSON: {insights_text}")
                return [{"type": "error", "message": "Could not generate insights for this dataset"}]

        except Exception as e:
            logger.error(f"Error generating insights: {str(e)}")
            return [{"type": "error", "message": f"Error analyzing data: {str(e)}"}]

    def _analyze_json_structure(self, data: Union[Dict, List]) -> Dict[str, Any]:
        """Analyze the structure of a JSON object"""
        if isinstance(data, dict):
            return {
                "type": "object",
                "keys": list(data.keys()),
                "nested_objects": sum(1 for v in data.values() if isinstance(v, (dict, list)))
            }
        elif isinstance(data, list):
            return {
                "type": "array",
                "length": len(data),
                "sample_types": [type(item).__name__ for item in data[:3]] if data else []
            }
        else:
            return {"type": type(data).__name__}

    async def _generate_json_insights(self, data: Union[Dict, List]) -> List[Dict[str, str]]:
        """Generate insights for nested JSON data"""
        try:
            # Serialize a sample of the data for the prompt
            if isinstance(data, list):
                sample = data[:3] if len(data) > 3 else data
            elif isinstance(data, dict):
                sample = data
            else:
                sample = data

            sample_json = json.dumps(sample, indent=2)[:1000]  # Limit size for the prompt

            prompt = f"""
            I have a JSON dataset with the following structure:
            {sample_json}

            Please provide 3-5 key insights about this data structure. Format each insight as a JSON object with 'type' (structure/content/recommendation) and 'message' fields.
            """

            insights_text = await self.openai_service.generate_response([
                {"role": "system", "content": "You are a data analyst providing insights on JSON data structures. Respond with only a JSON array of insights."},
                {"role": "user", "content": prompt}
            ])

            # Parse insights from the response
            try:
                # Extract JSON from the response if it's wrapped in text or code blocks
                insights_text = insights_text.strip()
                if "```json" in insights_text:
                    insights_text = insights_text.split("```json")[1].split("```")[0].strip()
                elif "```" in insights_text:
                    insights_text = insights_text.split("```")[1].strip()

                insights = json.loads(insights_text)
                return insights
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON insights: {insights_text}")
                return [{"type": "error", "message": "Could not generate insights for this JSON data"}]

        except Exception as e:
            logger.error(f"Error generating JSON insights: {str(e)}")
            return [{"type": "error", "message": f"Error analyzing JSON: {str(e)}"}]

    def _get_json_preview(self, data: Union[Dict, List]) -> Union[Dict, List]:
        """Get a preview of the JSON data"""
        if isinstance(data, list):
            return data[:3] if len(data) > 3 else data
        return data