import os
import requests
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import time
from ..core.config import settings

logger = logging.getLogger(__name__)

class TavilyAgentService:
    def __init__(self):
        # Check if Tavily is enabled and API key is available
        if not settings.TAVILY_ENABLED or not settings.TAVILY_API_KEY:
            logger.error("Tavily service is not properly configured. API key missing or service disabled.")
            self.is_available = False
            return

        try:
            # Set the Tavily API key as environment variable
            os.environ["TAVILY_API_KEY"] = settings.TAVILY_API_KEY

            # Test the API with a simple request
            self._test_api_connection()
            
            self.is_available = True
            logger.info("Tavily agent service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Tavily agent service: {str(e)}")
            self.is_available = False

    def _test_api_connection(self):
        """Test Tavily API connection with a simple query"""
        try:
            test_response = self._search_tavily("test connection")
            if test_response and "results" in test_response:
                logger.info("Tavily API connection test successful")
            else:
                raise Exception("Invalid response from Tavily API")
        except Exception as e:
            logger.warning(f"Tavily API connection test failed: {str(e)}")
            # Don't fail initialization for connection test failure
            pass

    def _search_tavily(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        """Perform a web search using Tavily API"""
        try:
            url = "https://api.tavily.com/search"
            payload = {
                "api_key": settings.TAVILY_API_KEY,
                "query": query,
                "search_depth": "basic",
                "include_answer": True,
                "include_images": False,
                "include_raw_content": False,
                "max_results": max_results,
                "include_domains": [],
                "exclude_domains": []
            }
            
            response = requests.post(url, json=payload, timeout=30)
            response.raise_for_status()
            
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Tavily API request failed: {str(e)}")
            return {}
        except Exception as e:
            logger.error(f"Unexpected error in Tavily search: {str(e)}")
            return {}

    def _format_search_results(self, search_response: Dict[str, Any], query: str) -> str:
        """Format Tavily search results into a readable response"""
        try:
            if not search_response or "results" not in search_response:
                return "I wasn't able to find relevant information from web sources for your query."

            results = search_response.get("results", [])
            answer = search_response.get("answer", "")
            
            if not results and not answer:
                return "I wasn't able to find relevant information from web sources for your query."

            # Start with the direct answer if available
            response_parts = []
            
            if answer:
                response_parts.append(f"Based on current web information: {answer}")
            
            # Add key findings from search results
            if results:
                response_parts.append("\n\n**Sources and Additional Details:**")
                for i, result in enumerate(results[:3], 1):  # Limit to top 3 results
                    title = result.get("title", "")
                    content = result.get("content", "")
                    url = result.get("url", "")
                    
                    if title and content:
                        # Truncate content if too long
                        truncated_content = content[:200] + "..." if len(content) > 200 else content
                        source_text = f"\n{i}. **{title}**\n   {truncated_content}"
                        if url:
                            source_text += f"\n   Source: {url}"
                        response_parts.append(source_text)
            
            return "\n".join(response_parts)
            
        except Exception as e:
            logger.error(f"Error formatting Tavily search results: {str(e)}")
            return "I found some information but encountered an error while formatting the response."

    def answer(self, user_message: str, profile: str = None, file_context: str = None) -> str:
        """
        Generate an answer using Tavily web search
        
        Args:
            user_message: The user's question
            profile: Optional profile context (e.g., "real_estate", "legal")
            file_context: Optional context from uploaded files
        
        Returns:
            A formatted response with web search results
        """
        # Check if service is available
        if not hasattr(self, 'is_available') or not self.is_available:
            logger.error("Tavily agent service is not available. Cannot perform web search.")
            return "I apologize, but I'm unable to perform web searches at the moment due to a configuration issue. Please try again later or contact support if the problem persists."

        try:
            logger.info(f"Tavily agent processing query: {user_message[:100]}...")

            # Enhance the query with profile context if available
            enhanced_query = user_message
            if profile and profile != "general":
                enhanced_query = f"{profile} {user_message}"

            # Perform web search
            search_response = self._search_tavily(enhanced_query)
            
            # Format and return the response
            formatted_response = self._format_search_results(search_response, user_message)
            
            # Add context note if file context was provided
            if file_context:
                formatted_response += "\n\n*Note: This response is based on current web information. If you have specific documents uploaded, please also consider that context.*"
            
            logger.info(f"Tavily agent successfully generated response for query")
            return formatted_response

        except Exception as e:
            logger.error(f"Error in Tavily agent answer method: {str(e)}")
            return f"I encountered an error while searching for current information: {str(e)}. Please try again later."

    def is_service_available(self) -> bool:
        """Check if the Tavily service is available"""
        return hasattr(self, 'is_available') and self.is_available