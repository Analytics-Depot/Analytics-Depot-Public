from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
from datetime import datetime

class VisualizationService:
    """Service for generating visualization data from analyzed datasets"""
    
    @staticmethod
    def generate_time_series_data(df: pd.DataFrame, date_column: str, value_column: str, group_by: Optional[str] = None) -> Dict[str, Any]:
        """Generate time series visualization data"""
        df[date_column] = pd.to_datetime(df[date_column])
        
        if group_by:
            series_data = []
            for name, group in df.groupby(group_by):
                series_data.append({
                    'name': str(name),
                    'data': group.sort_values(date_column)[[date_column, value_column]].values.tolist()
                })
            return {
                'type': 'time_series',
                'series': series_data,
                'xAxis': 'datetime',
                'yAxis': value_column
            }
        else:
            data = df.sort_values(date_column)[[date_column, value_column]].values.tolist()
            return {
                'type': 'time_series',
                'series': [{
                    'name': value_column,
                    'data': data
                }],
                'xAxis': 'datetime',
                'yAxis': value_column
            }

    @staticmethod
    def generate_bar_chart_data(df: pd.DataFrame, category_column: str, value_column: str) -> Dict[str, Any]:
        """Generate bar chart visualization data"""
        data = df.groupby(category_column)[value_column].sum().reset_index()
        return {
            'type': 'bar',
            'categories': data[category_column].tolist(),
            'series': [{
                'name': value_column,
                'data': data[value_column].tolist()
            }],
            'xAxis': category_column,
            'yAxis': value_column
        }

    @staticmethod
    def generate_pie_chart_data(df: pd.DataFrame, category_column: str, value_column: str) -> Dict[str, Any]:
        """Generate pie chart visualization data"""
        data = df.groupby(category_column)[value_column].sum()
        return {
            'type': 'pie',
            'data': [
                {'name': str(name), 'value': float(value)}
                for name, value in data.items()
            ]
        }

    @staticmethod
    def generate_scatter_plot_data(df: pd.DataFrame, x_column: str, y_column: str, category_column: Optional[str] = None) -> Dict[str, Any]:
        """Generate scatter plot visualization data"""
        if category_column:
            series_data = []
            for name, group in df.groupby(category_column):
                series_data.append({
                    'name': str(name),
                    'data': group[[x_column, y_column]].values.tolist()
                })
            return {
                'type': 'scatter',
                'series': series_data,
                'xAxis': x_column,
                'yAxis': y_column
            }
        else:
            return {
                'type': 'scatter',
                'series': [{
                    'name': f'{x_column} vs {y_column}',
                    'data': df[[x_column, y_column]].values.tolist()
                }],
                'xAxis': x_column,
                'yAxis': y_column
            }

    @staticmethod
    def generate_heatmap_data(df: pd.DataFrame, numeric_columns: List[str]) -> Dict[str, Any]:
        """Generate correlation heatmap visualization data"""
        corr_matrix = df[numeric_columns].corr()
        data = []
        for i in range(len(numeric_columns)):
            for j in range(len(numeric_columns)):
                data.append([i, j, float(corr_matrix.iloc[i, j])])
        
        return {
            'type': 'heatmap',
            'categories': numeric_columns,
            'data': data
        }

    @staticmethod
    def generate_box_plot_data(df: pd.DataFrame, numeric_column: str, category_column: Optional[str] = None) -> Dict[str, Any]:
        """Generate box plot visualization data"""
        if category_column:
            series_data = []
            for name, group in df.groupby(category_column):
                stats = group[numeric_column].describe()
                series_data.append({
                    'name': str(name),
                    'min': float(stats['min']),
                    'q1': float(stats['25%']),
                    'median': float(stats['50%']),
                    'q3': float(stats['75%']),
                    'max': float(stats['max']),
                    'outliers': group[numeric_column][
                        (group[numeric_column] < stats['25%'] - 1.5 * (stats['75%'] - stats['25%'])) |
                        (group[numeric_column] > stats['75%'] + 1.5 * (stats['75%'] - stats['25%']))
                    ].tolist()
                })
            return {
                'type': 'boxplot',
                'series': series_data,
                'xAxis': category_column,
                'yAxis': numeric_column
            }
        else:
            stats = df[numeric_column].describe()
            return {
                'type': 'boxplot',
                'series': [{
                    'name': numeric_column,
                    'min': float(stats['min']),
                    'q1': float(stats['25%']),
                    'median': float(stats['50%']),
                    'q3': float(stats['75%']),
                    'max': float(stats['max']),
                    'outliers': df[numeric_column][
                        (df[numeric_column] < stats['25%'] - 1.5 * (stats['75%'] - stats['25%'])) |
                        (df[numeric_column] > stats['75%'] + 1.5 * (stats['75%'] - stats['25%']))
                    ].tolist()
                }],
                'yAxis': numeric_column
            } 