# app/services/analysis/core.py
from typing import Dict, List, Any, Optional, Union
import pandas as pd
import numpy as np
from scipy import stats
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from datetime import datetime
import json
import logging

# Configure logging
logger = logging.getLogger(__name__)

class DataAnalysisEngine:
    """Enterprise-level data analysis engine for generating insights"""
    
    def __init__(self):
        self.data = None
        self.analysis_results = {}
        self.metadata = {}
        
    def load_data(self, data: Union[pd.DataFrame, Dict, List, str]) -> None:
        """Load data into the analysis engine"""
        try:
            if isinstance(data, pd.DataFrame):
                self.data = data
            elif isinstance(data, (dict, list)):
                self.data = pd.DataFrame(data)
            elif isinstance(data, str):
                # Attempt to parse JSON
                try:
                    data_dict = json.loads(data)
                    self.data = pd.DataFrame(data_dict)
                except json.JSONDecodeError:
                    # Attempt to read as CSV
                    self.data = pd.read_csv(data)
            else:
                raise ValueError("Unsupported data format")
            
            self._generate_metadata()
        except Exception as e:
            logger.error(f"Error loading data: {str(e)}")
            raise Exception(f"Error loading data: {str(e)}")

    def _generate_metadata(self) -> None:
        """Generate metadata about the dataset"""
        try:
            self.metadata = {
                'timestamp': datetime.now().isoformat(),
                'rows': len(self.data),
                'columns': len(self.data.columns),
                'column_types': {
                    col: str(dtype) for col, dtype in self.data.dtypes.items()
                },
                'memory_usage': int(self.data.memory_usage(deep=True).sum()),  # Convert to int for JSON serialization
                'missing_values': self.data.isnull().sum().to_dict()
            }
        except Exception as e:
            logger.error(f"Error generating metadata: {str(e)}")
            raise Exception(f"Error generating metadata: {str(e)}")

    def analyze(self, analysis_types: List[str] = None) -> Dict[str, Any]:
        """Perform comprehensive data analysis"""
        logger.info("Starting analysis")
        logger.debug(f"Analysis types requested: {analysis_types}")
        
        if self.data is None:
            raise ValueError("No data loaded")

        if analysis_types is None:
            analysis_types = ['statistical', 'distribution']
            
        logger.debug(f"Data shape: {self.data.shape}")
        logger.debug(f"Data columns: {list(self.data.columns)}")
        logger.debug(f"Data types: {self.data.dtypes.to_dict()}")

        try:
            self.analysis_results = {}  # Reset results
            
            for analysis_type in analysis_types:
                logger.info(f"Performing {analysis_type} analysis")
                method_name = f'_analyze_{analysis_type}'
                if hasattr(self, method_name):
                    try:
                        self.analysis_results[analysis_type] = getattr(self, method_name)()
                        logger.info(f"Completed {analysis_type} analysis")
                    except Exception as e:
                        logger.error(f"Error in {analysis_type} analysis: {str(e)}")
                        self.analysis_results[analysis_type] = {"error": str(e)}
                else:
                    logger.warning(f"Analysis type '{analysis_type}' not supported")
                    self.analysis_results[analysis_type] = {"error": "Analysis type not supported"}

            result = {
                'metadata': self.metadata,
                'results': self.analysis_results
            }
            logger.debug(f"Analysis results: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error during analysis: {str(e)}")
            raise Exception(f"Error during analysis: {str(e)}")

    def _analyze_statistical(self) -> Dict[str, Any]:
        """Perform statistical analysis on numerical columns"""
        logger.info("Starting statistical analysis")
        try:
            numerical_data = self.data.select_dtypes(include=[np.number])
            if numerical_data.empty:
                return {"error": "No numerical columns found in the data"}
            
            stats_dict = {}
            for column in numerical_data.columns:
                try:
                    stats_dict[column] = {
                        'mean': float(numerical_data[column].mean()),
                        'median': float(numerical_data[column].median()),
                        'std': float(numerical_data[column].std()),
                        'min': float(numerical_data[column].min()),
                        'max': float(numerical_data[column].max()),
                        'q1': float(numerical_data[column].quantile(0.25)),
                        'q3': float(numerical_data[column].quantile(0.75)),
                        'skewness': float(stats.skew(numerical_data[column].dropna())),
                        'kurtosis': float(stats.kurtosis(numerical_data[column].dropna()))
                    }
                except Exception as e:
                    logger.error(f"Error calculating statistics for column {column}: {str(e)}")
                    stats_dict[column] = {"error": str(e)}
            
            return stats_dict
        except Exception as e:
            logger.error(f"Error in statistical analysis: {str(e)}")
            raise Exception(f"Error in statistical analysis: {str(e)}")

    def _analyze_distribution(self) -> Dict[str, Any]:
        """Analyze data distributions"""
        logger.info("Starting distribution analysis")
        try:
            numerical_data = self.data.select_dtypes(include=[np.number])
            if numerical_data.empty:
                return {"error": "No numerical columns found in the data"}
            
            distributions = {}
            for column in numerical_data.columns:
                try:
                    # Test for normality
                    data = numerical_data[column].dropna()
                    if len(data) > 3:  # Minimum required for normaltest
                        statistic, p_value = stats.normaltest(data)
                        is_normal = p_value > 0.05
                    else:
                        statistic = p_value = float('nan')
                        is_normal = False
                        
                    # Calculate histogram data
                    hist_values, bin_edges = np.histogram(data, bins='auto')
                    
                    distributions[column] = {
                        'normality_test': {
                            'statistic': float(statistic),
                            'p_value': float(p_value),
                            'is_normal': bool(is_normal)
                        },
                        'histogram_data': {
                            'counts': hist_values.tolist(),
                            'bins': bin_edges.tolist()
                        }
                    }
                except Exception as e:
                    logger.error(f"Error analyzing distribution for column {column}: {str(e)}")
                    distributions[column] = {"error": str(e)}
            
            return distributions
        except Exception as e:
            logger.error(f"Error in distribution analysis: {str(e)}")
            raise Exception(f"Error in distribution analysis: {str(e)}")

    def _analyze_correlation(self) -> Dict[str, Any]:
        """Analyze correlations between numerical variables"""
        numerical_data = self.data.select_dtypes(include=[np.number])
        
        if len(numerical_data.columns) < 2:
            return {}

        correlation_matrix = numerical_data.corr()
        
        # Find significant correlations
        significant_correlations = []
        for i in range(len(correlation_matrix.columns)):
            for j in range(i + 1, len(correlation_matrix.columns)):
                corr = correlation_matrix.iloc[i, j]
                if abs(corr) > 0.5:  # Threshold for significant correlation
                    significant_correlations.append({
                        'variable1': correlation_matrix.columns[i],
                        'variable2': correlation_matrix.columns[j],
                        'correlation': float(corr)
                    })

        return {
            'matrix': correlation_matrix.to_dict(),
            'significant_correlations': significant_correlations
        }

    def _analyze_outliers(self) -> Dict[str, Any]:
        """Detect outliers using multiple methods"""
        numerical_data = self.data.select_dtypes(include=[np.number])
        
        outliers = {}
        for column in numerical_data.columns:
            data = numerical_data[column].dropna()
            
            # Z-score method
            z_scores = np.abs(stats.zscore(data))
            z_score_outliers = list(data[z_scores > 3].index)
            
            # IQR method
            Q1 = data.quantile(0.25)
            Q3 = data.quantile(0.75)
            IQR = Q3 - Q1
            iqr_outliers = list(data[(data < (Q1 - 1.5 * IQR)) | (data > (Q3 + 1.5 * IQR))].index)
            
            outliers[column] = {
                'z_score_outliers': z_score_outliers,
                'iqr_outliers': iqr_outliers,
                'total_outliers': len(set(z_score_outliers + iqr_outliers))
            }
        
        return outliers

    def _analyze_patterns(self) -> Dict[str, Any]:
        """Identify patterns and clusters in the data"""
        numerical_data = self.data.select_dtypes(include=[np.number])
        
        if len(numerical_data.columns) < 2:
            return {}

        # Standardize the data
        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(numerical_data)
        
        # Perform PCA
        pca = PCA()
        pca_result = pca.fit_transform(scaled_data)
        
        # Determine optimal number of clusters (elbow method)
        max_clusters = min(10, len(numerical_data) // 2)
        inertias = []
        for k in range(1, max_clusters + 1):
            kmeans = KMeans(n_clusters=k, random_state=42)
            kmeans.fit(scaled_data)
            inertias.append(kmeans.inertia_)
        
        # Find elbow point
        diffs = np.diff(inertias)
        elbow_point = np.argmin(diffs) + 1
        
        # Perform clustering with optimal number of clusters
        kmeans = KMeans(n_clusters=elbow_point, random_state=42)
        clusters = kmeans.fit_predict(scaled_data)
        
        return {
            'pca': {
                'explained_variance_ratio': list(pca.explained_variance_ratio_),
                'cumulative_variance_ratio': list(np.cumsum(pca.explained_variance_ratio_)),
                'components': pca.components_.tolist()
            },
            'clustering': {
                'optimal_clusters': int(elbow_point),
                'cluster_sizes': pd.Series(clusters).value_counts().to_dict(),
                'cluster_centers': kmeans.cluster_centers_.tolist()
            }
        }

    def generate_insights(self) -> List[Dict[str, Any]]:
        """Generate human-readable insights from the analysis"""
        insights = []
        
        # Statistical insights
        if 'statistical' in self.analysis_results:
            for column, stats in self.analysis_results['statistical'].items():
                if stats['std'] > 0:
                    insights.append({
                        'type': 'statistical',
                        'importance': 'medium',
                        'message': f"Column '{column}' has mean {stats['mean']:.2f} with standard deviation {stats['std']:.2f}"
                    })

        # Distribution insights
        if 'distribution' in self.analysis_results:
            for column, dist in self.analysis_results['distribution'].items():
                if dist['normality_test']['is_normal']:
                    insights.append({
                        'type': 'distribution',
                        'importance': 'medium',
                        'message': f"Column '{column}' follows a normal distribution"
                    })

        # Correlation insights
        if 'correlation' in self.analysis_results:
            for corr in self.analysis_results['correlation']['significant_correlations']:
                importance = 'high' if abs(corr['correlation']) > 0.7 else 'medium'
                insights.append({
                    'type': 'correlation',
                    'importance': importance,
                    'message': f"Strong correlation ({corr['correlation']:.2f}) found between {corr['variable1']} and {corr['variable2']}"
                })

        # Outlier insights
        if 'outliers' in self.analysis_results:
            for column, outliers in self.analysis_results['outliers'].items():
                if outliers['total_outliers'] > 0:
                    insights.append({
                        'type': 'outliers',
                        'importance': 'high',
                        'message': f"Found {outliers['total_outliers']} outliers in column '{column}'"
                    })

        # Pattern insights
        if 'patterns' in self.analysis_results:
            patterns = self.analysis_results['patterns']
            if 'clustering' in patterns:
                insights.append({
                    'type': 'patterns',
                    'importance': 'high',
                    'message': f"Data can be optimally grouped into {patterns['clustering']['optimal_clusters']} clusters"
                })

        return sorted(insights, key=lambda x: {'low': 0, 'medium': 1, 'high': 2}[x['importance']], reverse=True)

    def get_visualization_data(self) -> Dict[str, Any]:
        """Generate data for visualizations"""
        viz_data = {}
        
        # Distribution plots
        numerical_data = self.data.select_dtypes(include=[np.number])
        for column in numerical_data.columns:
            viz_data[f'distribution_{column}'] = {
                'type': 'histogram',
                'data': numerical_data[column].tolist(),
                'name': column
            }
        
        # Correlation heatmap
        if len(numerical_data.columns) > 1:
            viz_data['correlation_heatmap'] = {
                'type': 'heatmap',
                'data': numerical_data.corr().values.tolist(),
                'labels': numerical_data.columns.tolist()
            }
        
        # Time series if datetime columns exist
        datetime_cols = self.data.select_dtypes(include=['datetime64']).columns
        for col in datetime_cols:
            viz_data[f'timeseries_{col}'] = {
                'type': 'line',
                'data': self.data.set_index(col).to_dict('list')
            }
        
        return viz_data