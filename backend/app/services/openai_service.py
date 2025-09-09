from openai import OpenAI
import logging
import json
import asyncio
from typing import Dict, Any, List, Optional
import re
from datetime import datetime
import time
from ..core.config import settings

# Profile-specific prompt templates
PROFILE_PROMPT_TEMPLATES = {
    "real_estate": '''You are a real estate data analysis expert. Use the following property or market document context to answer the user's question.

## Document Context:
{document_context}

## User Question:
{question}

## Instructions:
1. Answer ONLY using the information in the document context.
2. If the answer is not present, state so clearly.
3. Reference specific sections, data points, or tables when possible.
4. Be concise, use real estate terminology, and provide actionable insights.

## Answer:''',
    "legal": '''You are a legal document analysis expert. Use the following legal document context to answer the user's question.

## Document Context:
{document_context}

## User Question:
{question}

## Instructions:
1. Answer ONLY using the information in the document context.
2. If the answer is not present, state so clearly.
3. Reference specific sections, clauses, or case law when possible.
4. Be precise, concise, and use legal terminology appropriately.

## Answer:''',
    "finance": '''You are a finance and investment analysis expert. Use the following financial document context to answer the user's question.

## Document Context:
{document_context}

## User Question:
{question}

## Instructions:
1. Answer ONLY using the information in the document context.
2. If the answer is not present, state so clearly.
3. Reference specific data, tables, or figures when possible.
4. Be concise, use financial terminology, and provide clear analysis.

## Answer:''',
    "medical": '''You are a medical and healthcare data analysis expert. Use the following medical document context to answer the user's question.

## Document Context:
{document_context}

## User Question:
{question}

## Instructions:
1. Answer ONLY using the information in the document context.
2. If the answer is not present, state so clearly.
3. Reference specific sections, studies, or data when possible.
4. Be precise, use medical terminology, and provide evidence-based insights.

## Answer:''',
    "insurance": '''You are an insurance and risk analysis expert. Use the following insurance document context to answer the user's question.

## Document Context:
{document_context}

## User Question:
{question}

## Instructions:
1. Answer ONLY using the information in the document context.
2. If the answer is not present, state so clearly.
3. Reference specific policies, claims, or data when possible.
4. Be concise, use insurance terminology, and provide actionable insights.

## Answer:''',
    "management": '''You are a business management and operations analysis expert. Use the following management document context to answer the user's question.

## Document Context:
{document_context}

## User Question:
{question}

## Instructions:
1. Answer ONLY using the information in the document context.
2. If the answer is not present, state so clearly.
3. Reference specific metrics, strategies, or data when possible.
4. Be concise, use management terminology, and provide strategic insights.

## Answer:''',
    "default": '''You are a helpful AI assistant specializing in document analysis. Use the following document context to answer the user's question.

## Document Context:
{document_context}

## User Question:
{question}

## Instructions:
1. Answer ONLY using the information in the document context.
2. If the answer is not present, state so clearly.
3. Reference specific sections or data when possible.
4. Be concise and provide clear, actionable insights.

## Answer:''',
}

class OpenAIService:
    """Service for interacting with OpenAI APIs"""

    def __init__(self):
        self.client = settings.get_openai_client()
        self.current_profile = None

    def chat_completion(self, messages, model=None, max_tokens=1000):
        """Generate a chat completion response from OpenAI"""
        if model is None:
            model = settings.OPENAI_MODEL
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.7
            )

            if response.choices and response.choices[0].message:
                return response.choices[0].message.content
            return "I apologize, but I'm having trouble generating a response right now."

        except Exception as e:
            # Check if it's a quota exceeded error
            if "insufficient_quota" in str(e) or "429" in str(e):
                return self._generate_fallback_response(messages)
            return f"I apologize, but I'm experiencing technical difficulties: {str(e)}"

    def _generate_fallback_response(self, messages):
        """Generate a fallback response when OpenAI quota is exceeded"""
        try:
            # Extract the user's question from the messages
            user_message = None
            for msg in reversed(messages):
                if msg.get("role") == "user":
                    user_message = msg.get("content", "")
                    break

            if not user_message:
                return "I apologize, but I'm currently experiencing technical difficulties with my AI service. Please try again later."

            # Check if the question is about file content
            if any(keyword in user_message.lower() for keyword in ["author", "content", "document", "file", "article"]):
                return "I can see that you've uploaded a document and are asking about its content. However, I'm currently experiencing technical difficulties with my AI analysis service. The file has been successfully uploaded and processed, but I cannot provide detailed analysis at the moment. Please try again later or contact support if this issue persists."

            return "I apologize, but I'm currently experiencing technical difficulties with my AI service. Your question has been received, but I cannot provide a detailed response at the moment. Please try again later."

        except Exception:
            return "I apologize, but I'm experiencing technical difficulties. Please try again later."

    async def generate_response(self, messages, model=None, max_tokens=1000):
        """Generate a chat completion response from OpenAI (async version)"""
        if model is None:
            model = settings.OPENAI_MODEL
        return self.chat_completion(messages, model, max_tokens)

    def analyze_data(self, data, analysis_prompt, model=None):
        """Analyze data using OpenAI"""
        if model is None:
            model = settings.OPENAI_MODEL
        try:
            system_message = {
                "role": "system",
                "content": "You are a data analysis expert. Analyze the following data and provide clear, actionable insights. Focus on patterns, trends, and key findings."
            }

            user_message = {
                "role": "user",
                "content": f"{analysis_prompt}\n\nDATA TO ANALYZE:\n{data}"
            }

            messages = [system_message, user_message]

            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=2000,
                temperature=0.3
            )

            if response.choices and response.choices[0].message:
                return response.choices[0].message.content
            return "I encountered an issue while analyzing your data. Please try again."

        except Exception as e:
            return f"I apologize, but I encountered an error while analyzing your data: {str(e)}"

    def set_profile(self, profile: str):
        """Set the system profile/persona for the chatbot"""
        self.current_profile = profile

    def get_prompt_template_for_profile(self, profile: str) -> str:
        """Get the appropriate prompt template for a given profile"""
        return PROFILE_PROMPT_TEMPLATES.get(profile, PROFILE_PROMPT_TEMPLATES["default"])

    def chat_with_context(self, messages, context_data=None, profile=None, user_question=None, model=None, max_tokens=1500):
        """Generate a chat response with additional context and profile using rich prompt templates"""
        if model is None:
            model = settings.OPENAI_MODEL
        try:
            # Defensive: ensure all messages are dicts, not ORM objects
            def to_dict(m):
                if isinstance(m, dict):
                    return m
                return {"role": getattr(m, "role", None), "content": getattr(m, "content", None)}
            if messages:
                messages = [to_dict(m) for m in messages]

            print(f"[DEBUG] chat_with_context called with profile={profile}, user_question={user_question}")
            print(f"[DEBUG] Context data type: {type(context_data)}")
            print(f"[DEBUG] Context data length: {len(str(context_data)) if context_data else 0}")

            # Always build a system message with profile and file context (if any)
            if profile:
                system_content = self.get_system_message_for_profile(profile)
            else:
                system_content = "You are a helpful AI assistant specializing in data analysis and providing insights."
            if context_data:
                system_content += f"\n\nYou have access to the following file data:\n{str(context_data)[:5000]}"
            system_message = {"role": "system", "content": system_content}

            # Build full message list: system + chat history + new user message
            full_messages = [system_message]
            if messages:
                full_messages.extend(messages)
            if user_question:
                full_messages.append({"role": "user", "content": user_question})

            print(f"[DEBUG] Using unified prompt logic (system + history + user)")
            print(f"[DEBUG] Calling OpenAI API with {len(full_messages)} messages")
            if full_messages and 'content' in full_messages[0]:
                print(f"[DEBUG] LLM prompt (first 500 chars): {full_messages[0]['content'][:500]}")
            response = self.client.chat.completions.create(
                model=model,
                messages=full_messages,
                max_tokens=max_tokens,
                temperature=0.7
            )

            if response.choices and response.choices[0].message:
                result = response.choices[0].message.content
                print(f"[DEBUG] OpenAI API call successful, response length: {len(result)}")
                return result
            print(f"[DEBUG] OpenAI API call returned no choices")
            return "I apologize, but I'm having trouble generating a response right now."

        except Exception as e:
            print(f"[DEBUG] Exception in chat_with_context: {type(e).__name__}: {str(e)}")
            # Check if it's a quota exceeded error
            if "insufficient_quota" in str(e) or "429" in str(e):
                print(f"[DEBUG] Detected quota error, using fallback response")
                return self._generate_fallback_response(messages)
            print(f"[DEBUG] Not a quota error, returning generic error message")
            return f"I apologize, but I'm experiencing technical difficulties: {str(e)}"

    def get_system_message_for_profile(self, profile: str) -> str:
        """Get the appropriate system message for a given profile (legacy)"""
        profiles = {
            "real_estate": "You are a real estate expert specializing in property data analysis, market trends, and investment insights.",
            "legal": "You are a legal expert specializing in legal document analysis, case law research, and legal data interpretation.",
            "finance": "You are a finance expert specializing in financial analysis, market data interpretation, and investment research.",
            "medical": "You are a medical data expert specializing in healthcare analytics, medical research data, and clinical insights.",
            "insurance": "You are an insurance expert specializing in risk analysis, claims data, and insurance market trends.",
            "management": "You are a business management expert specializing in performance metrics, operational data analysis, and strategic insights."
        }
        return profiles.get(profile, "You are a helpful AI assistant specializing in data analysis and providing insights.")

    def is_no_info_response_llm(self, response: str) -> bool:
        """
        Use the LLM to determine if a response indicates lack of information to answer the user's question.
        Returns True if the LLM says the response is a 'no information' answer.
        """
        # First, check for common patterns that indicate no information
        no_info_patterns = [
            "i'm unable to provide",
            "i don't have access to",
            "i cannot provide",
            "i'm unable to access",
            "i don't have information",
            "i cannot access",
            "i'm not able to provide",
            "i don't have real-time",
            "i cannot provide real-time",
            "i'm unable to provide real-time",
            "i don't have current",
            "i cannot provide current",
            "i'm unable to provide current",
            "i don't have live",
            "i cannot provide live",
            "i'm unable to provide live",
            "i don't have access to the internet",
            "i cannot access the internet",
            "i'm unable to access the internet",
            "i don't have web access",
            "i cannot access web",
            "i'm unable to access web",
            "i don't have internet access",
            "i cannot access internet",
            "i'm unable to access internet"
        ]

        response_lower = response.lower()
        for pattern in no_info_patterns:
            if pattern in response_lower:
                return True

        # If no patterns match, use LLM to check
        try:
            prompt = (
                "Does the following response indicate that you do not have enough information to answer the user's question? "
                "Look for phrases like 'unable to provide', 'don't have access', 'cannot provide', etc. "
                "Respond with 'yes' or 'no'.\n\n"
                f"Response:\n{response}"
            )
            result = self.chat_completion([{"role": "user", "content": prompt}], max_tokens=3)
            return result.strip().lower().startswith("y")
        except Exception as e:
            # If LLM check fails, default to False to avoid unnecessary Tavily calls
            return False

    def summarize_text(self, text: str, max_tokens: int = 400) -> str:
        """Summarize a long text using the LLM for context-passing."""
        prompt = (
            "Summarize the following document content in a concise, factual way, preserving key details, data, and structure. "
            "Focus on the most important points, and keep the summary under 400 words.\n\nCONTENT:\n" + text
        )
        messages = [
            {"role": "system", "content": "You are an expert document summarizer."},
            {"role": "user", "content": prompt}
        ]
        try:
            return self.chat_completion(messages, max_tokens=max_tokens)
        except Exception as e:
            return f"[SUMMARY ERROR: {str(e)}]"

    def should_trigger_tavily_directly(self, user_question: str) -> bool:
        """
        Check if a user question should directly trigger Tavily web search.
        Returns True for queries about current events, stock prices, weather, etc.
        """
        if not user_question:
            return False

        question_lower = user_question.lower()

        # Keywords that indicate need for current/live data
        tavily_keywords = [
            "current stock",
            "stock price",
            "stock performance",
            "current price",
            "market price",
            "ticker",
            "current weather",
            "weather in",
            "current news",
            "latest news",
            "breaking news",
            "current state",
            "current status",
            "live data",
            "real-time",
            "current market",
            "market performance",
            "current events",
            "today's",
            "this week",
            "this month",
            "recent",
            "latest",
            "current",
            "now",
            "today",
            "yesterday",
            "tomorrow"
        ]

        # Check for stock ticker patterns (like GOOG, AAPL, etc.)
        import re
        ticker_pattern = r'\b[A-Z]{2,5}\b'
        tickers = re.findall(ticker_pattern, user_question.upper())

        # Common stock tickers
        common_tickers = ['GOOG', 'AAPL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'GOOGL', 'BRK.A', 'BRK.B']

        # Check if any common tickers are mentioned
        has_ticker = any(ticker in common_tickers for ticker in tickers)

        # Check for tavily keywords
        has_tavily_keyword = any(keyword in question_lower for keyword in tavily_keywords)

        return has_ticker or has_tavily_keyword