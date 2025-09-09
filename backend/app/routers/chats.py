# backend/app/routers/chats.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import json
import logging
from datetime import datetime, timedelta
import asyncio
from io import StringIO
import pandas as pd
from uuid import UUID
import re
from slowapi import Limiter
from slowapi.util import get_remote_address
from ..utils.security import get_current_user_from_token
from ..models.user import User

from ..db.database import get_db
from ..repositories.chat import ChatRepository
from ..repositories.user import UserRepository
from ..services.openai_service import OpenAIService
from ..services.tavily_agent_service import TavilyAgentService
from ..services.cache_service import query_cache
import hashlib

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Initialize Tavily agent service
tavily_agent = TavilyAgentService()

# Check if Tavily service is available
if not hasattr(tavily_agent, 'is_available') or not tavily_agent.is_available:
    logging.warning("Tavily agent service is not available. Web search features will be disabled.")


router = APIRouter(tags=["chats"])

# Models
class ChatCreate(BaseModel):
    name: str
    industry: Optional[str] = None

class ChatUpdate(BaseModel):
    name: str

class ChatMessage(BaseModel):
    message: str
    profile: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    id: UUID
    name: str
    industry: Optional[str]
    user_id: UUID
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class MessageResponse(BaseModel):
    message: str
    type: str = "text"
    timestamp: str

# Chat Session Management
ALLOWED_INDUSTRIES = {"real_estate", "legal", "finance", "medical", "insurance"}

@router.post("", response_model=ChatResponse, status_code=201)
@limiter.limit("10/minute")
async def create_chat(
    request: Request,
    chat: ChatCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    logging.info(f"[API] Create Chat: {chat.dict()} by user {current_user.email}")

    # Industry validation
    if chat.industry and chat.industry not in ALLOWED_INDUSTRIES:
        raise HTTPException(status_code=422, detail=f"Invalid industry: {chat.industry}")

    # Use Supabase user ID directly
    supabase_user_id = current_user.external_id
    if not supabase_user_id:
        raise HTTPException(status_code=400, detail="Invalid user session")

    chat_repo = ChatRepository(db)
    new_chat = chat_repo.create_chat(
        user_id=supabase_user_id,
        name=chat.name,
        industry=chat.industry or "general"
    )

    if not new_chat:
        raise HTTPException(status_code=500, detail="Failed to create chat")

    logging.info(f"[API] Chat Created: {new_chat.id} for user {current_user.email}")
    return ChatResponse(
        id=new_chat.id,
        name=new_chat.name,
        industry=new_chat.industry,
        user_id=new_chat.user_id,
        created_at=new_chat.created_at,
        updated_at=new_chat.updated_at,
    )

@router.get("", response_model=List[ChatResponse])
@limiter.limit("60/minute")
async def get_user_chats(
    request: Request,
    skip: int = Query(0, description="Number of chats to skip"),
    limit: int = Query(20, description="Maximum number of chats to return"),
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # Use Supabase user ID (external_id) from the User object
    supabase_user_id = current_user.external_id
    if not supabase_user_id:
        raise HTTPException(status_code=400, detail="Invalid user session")

    chat_repo = ChatRepository(db)
    chats = chat_repo.get_user_chats(supabase_user_id, skip=skip, limit=limit)

    chat_responses = []
    for chat in chats:
        if chat and chat.user_id == supabase_user_id:
            chat_responses.append(ChatResponse(
                id=chat.id,
                name=chat.name,
                industry=chat.industry,
                user_id=chat.user_id,
                created_at=chat.created_at,
                updated_at=chat.updated_at
            ))

    return chat_responses

@router.get("/{chat_id}", response_model=ChatResponse)
@limiter.limit("120/minute")
async def get_chat(
    request: Request,
    chat_id: UUID,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # Use Supabase user ID directly
    supabase_user_id = current_user.external_id
    if not supabase_user_id:
        raise HTTPException(status_code=400, detail="Invalid user session")

    chat_repo = ChatRepository(db)
    chat = chat_repo.get_chat_by_id(chat_id, supabase_user_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    return ChatResponse(
        id=chat.id,
        name=chat.name,
        industry=chat.industry,
        user_id=chat.user_id,
        created_at=chat.created_at,
        updated_at=chat.updated_at
    )

@router.patch("/{chat_id}", response_model=ChatResponse)
@limiter.limit("30/minute")
async def update_chat(
    request: Request,
    chat_id: UUID,
    chat_update: ChatUpdate,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # Use Supabase user ID directly
    supabase_user_id = current_user.external_id
    if not supabase_user_id:
        raise HTTPException(status_code=400, detail="Invalid user session")

    chat_repo = ChatRepository(db)
    updated_chat = chat_repo.update_chat_name(chat_id, supabase_user_id, chat_update.name)
    if not updated_chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    return ChatResponse(
        id=updated_chat.id,
        name=updated_chat.name,
        industry=updated_chat.industry,
        user_id=updated_chat.user_id,
        created_at=updated_chat.created_at,
        updated_at=updated_chat.updated_at
    )

@router.delete("/{chat_id}")
@limiter.limit("10/minute")
async def delete_chat(
    request: Request,
    chat_id: UUID,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # Use Supabase user ID directly
    supabase_user_id = current_user.external_id
    if not supabase_user_id:
        raise HTTPException(status_code=400, detail="Invalid user session")

    chat_repo = ChatRepository(db)
    chat = chat_repo.get_chat_by_id(chat_id, supabase_user_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    success = chat_repo.delete_chat(chat_id, supabase_user_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete chat")

    return {"message": "Chat deleted successfully"}

# Message Management
@router.post("/{chat_id}/messages")
@limiter.limit("10/minute")
async def send_message(
    request: Request,
    chat_id: UUID,
    chat_input: ChatMessage,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Handles user Q&A for a chat session. If the LLM cannot answer from file/document context, the Tavily agentic RAG service is invoked to perform web research and return a synthesized, cited answer. Supports profile-specific Q&A.
    """
    logging.info(f"[API] Q&A: chat_id={chat_id}, profile={chat_input.profile}, message={chat_input.message}")

    # Use Supabase user ID directly
    supabase_user_id = current_user.external_id
    if not supabase_user_id:
        raise HTTPException(status_code=400, detail="Invalid user session")

    # Get the local database user record
    user_repo = UserRepository(db)
    local_user = user_repo.get_or_create_user_from_supabase(
        supabase_id=supabase_user_id,
        email=current_user.email or "",
        full_name=current_user.full_name or "",
        role="user"
    )
    if not local_user:
        raise HTTPException(status_code=400, detail="Failed to get user record")

    chat_repo = ChatRepository(db)
    chat_session = chat_repo.get_chat_by_id(chat_id, supabase_user_id)
    if not chat_session:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Check usage limits and record query usage using local user ID
    if not local_user:
        raise HTTPException(status_code=400, detail="Failed to get user record")

    # Check if user can make request
    if not local_user.can_make_request():
        raise HTTPException(
            status_code=429, 
            detail="Usage limit exceeded. Please upgrade your plan to continue."
        )

    try:
        # --- FAQ/Query Cache Check ---
        query_str = chat_input.message.strip().lower()
        query_hash = hashlib.sha256(query_str.encode("utf-8")).hexdigest()
        cached_response = query_cache.get(str(chat_id), query_hash)
        if cached_response:
            logging.info(f"[CACHE] FAQ/Query cache HIT for chat_id={chat_id}, query_hash={query_hash}")
            # Store user/assistant messages for chat history
            chat_repo.add_message(chat_id=chat_id, role="user", content=chat_input.message)
            chat_repo.add_message(chat_id=chat_id, role="assistant", content=cached_response)
            # Record query usage for cached response too
            local_user.increment_usage()
            db.commit()
            return {"message": cached_response, "timestamp": datetime.utcnow().isoformat(), "cache": True}
        logging.info(f"[CACHE] FAQ/Query cache MISS for chat_id={chat_id}, query_hash={query_hash}")
        # --- End cache check ---

        # Retrieve the latest file data associated with this chat
        file_data = chat_repo.get_latest_file_data(chat_id)
        context_data_str = None

        if file_data:
            logging.info(f"[API] Retrieved file data for chat {chat_id}: {file_data.filename}")
            # Log file content keys and extraction method for debugging
            if isinstance(file_data.content, dict):
                logging.info(f"[API] File content keys: {list(file_data.content.keys())}")
                logging.info(f"[API] Extraction method: {file_data.content.get('extraction_method')}")
                logging.info(f"[API] Content length: {len(str(file_data.content.get('markdown_content', file_data.content.get('text_content', ''))))}")
            # Extract content based on structure
            if isinstance(file_data.content, dict) and 'markdown_content' in file_data.content:
                file_content_str = file_data.content['markdown_content']
                logging.info(f"[API] Using enhanced markdown content for LLM, length: {len(file_content_str)}")
            elif isinstance(file_data.content, dict):
                file_content_str = json.dumps(file_data.content)
                logging.info(f"[API] Using JSON serialized content for LLM, length: {len(file_content_str)}")
            else:
                file_content_str = str(file_data.content)
                logging.info(f"[API] Using string content for LLM, length: {len(file_content_str)}")

            # Summarize or truncate file content for agentic fallback (max 2000 chars)
            max_context_chars = 2000
            truncated = False
            summarized = False
            openai_service = OpenAIService()
            if len(file_content_str) > max_context_chars:
                logging.info(f"[API] File content exceeds {max_context_chars} chars, summarizing with LLM.")
                summary = openai_service.summarize_text(file_content_str[:8000], max_tokens=400)  # Limit input to 8k chars for summarization
                if summary and not summary.startswith('[SUMMARY ERROR'):
                    file_content_str = summary
                    summarized = True
                    logging.info(f"[API] Used LLM summary for context, summary length: {len(summary)}")
                else:
                    file_content_str = file_content_str[:max_context_chars]
                    truncated = True
                    logging.warning(f"[API] LLM summarization failed, falling back to truncation.")
            context_data_str = (
                f"Use the content of the file '{file_data.filename}' to answer the user's question.\n"
                f"--- FILE CONTENT ---\n{file_content_str}\n--- END FILE CONTENT ---"
            )
            if summarized:
                context_data_str += "\n[NOTE: File content summarized for token limit.]"
            elif truncated:
                context_data_str += "\n[NOTE: File content truncated for token limit.]"
            logging.info(f"[API] Context data prepared for LLM, total length: {len(context_data_str)}")
            logging.info(f"[API] Context preview: {context_data_str[:500]}")

        openai_service = OpenAIService()
        # Convert ORM messages to dicts for OpenAI
        messages_orm = chat_repo.get_messages_by_chat_id(chat_id)
        # Limit to last 5 messages for agentic fallback
        max_history = 5
        messages = [
            {"role": m.role, "content": m.content}
            for m in messages_orm[-max_history:]
        ]

        # Check if this query should directly trigger Tavily
        should_use_tavily_directly = openai_service.should_trigger_tavily_directly(chat_input.message)
        logging.info(f"[API] Q&A: chat_id={chat_id}, profile={chat_input.profile}, message={chat_input.message}")
        logging.info(f"[API] Should trigger Tavily directly: {should_use_tavily_directly}")

        if should_use_tavily_directly:
            logging.info("[API] Query requires live data, triggering Tavily directly")
            # Check if Tavily agent is available
            if hasattr(tavily_agent, 'is_available') and tavily_agent.is_available:
                try:
                    response_message = tavily_agent.answer(
                        user_message=chat_input.message,
                        profile=chat_input.profile,
                        file_context=context_data_str
                    )
                    logging.info("[API] Tavily agent successfully provided web search response")
                except Exception as e:
                    logging.error(f"[API] Tavily agent error: {str(e)}")
                    response_message = "I was unable to search the web for additional information. Please try rephrasing your question or ask about a different topic."
            else:
                logging.warning("[API] Tavily agent not available, falling back to OpenAI")
                response_message = openai_service.chat_with_context(
                    user_question=chat_input.message,
                    messages=messages,
                    profile=chat_input.profile or "general",
                    context_data=context_data_str
                )
        else:
            # Use OpenAI first, then fallback to Tavily if needed
            response_message = openai_service.chat_with_context(
                user_question=chat_input.message,
                messages=messages,
                profile=chat_input.profile or "general",
                context_data=context_data_str
            )

            # Use LLM to check if the response is a 'no information' answer
            if openai_service.is_no_info_response_llm(response_message):
                logging.info("[API] LLM indicated no information available (LLM intent), triggering Tavily agentic fallback.")
                
                # Check if Tavily agent is available
                if hasattr(tavily_agent, 'is_available') and tavily_agent.is_available:
                    try:
                        response_message = tavily_agent.answer(
                            user_message=chat_input.message,
                            profile=chat_input.profile,
                            file_context=context_data_str
                        )
                        logging.info("[API] Tavily agent successfully provided web search response")
                    except Exception as e:
                        logging.error(f"[API] Tavily agent error: {str(e)}")
                        response_message = "I was unable to search the web for additional information. Please try rephrasing your question or ask about a different topic."
                else:
                    logging.warning("[API] Tavily agent not available, cannot perform web search")
                    response_message = "I don't have access to current web information to answer your question. Please try asking about the uploaded document content instead."


        chat_repo.add_message(
            chat_id=chat_id, role="user", content=chat_input.message
        )
        chat_repo.add_message(
            chat_id=chat_id, role="assistant", content=response_message
        )
        
        # Record query usage for analytics
        local_user.increment_usage()
        db.commit()
        
        # --- Store in FAQ/Query Cache ---
        query_cache.set(str(chat_id), query_hash, response_message, ttl=600)  # 10 min TTL
        # --- End cache store ---
        logging.info(f"[API] Q&A Response: {response_message}")
        return {"message": response_message, "timestamp": datetime.utcnow().isoformat(), "cache": False}

    except Exception as e:
        logging.error(f"Error in send_message: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process message: {str(e)}")

@router.get("/{chat_id}/messages", response_model=List[Dict[str, Any]])
@limiter.limit("60/minute")
async def get_chat_messages(
    request: Request,
    chat_id: UUID,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # Use Supabase user ID directly
    supabase_user_id = current_user.external_id
    if not supabase_user_id:
        raise HTTPException(status_code=400, detail="Invalid user session")

    logging.info(f"[API] Get Messages Debug - Chat ID: {chat_id}, Supabase user ID: {supabase_user_id}, Email: {current_user.email}")

    chat_repo = ChatRepository(db)
    chat = chat_repo.get_chat_by_id(chat_id, supabase_user_id)
    if not chat:
        logging.error(f"[API] Get Messages Debug - Chat {chat_id} not found for user {supabase_user_id}")
        raise HTTPException(status_code=404, detail="Chat not found")

    logging.info(f"[API] Get Messages Debug - Chat found: {chat.id}, Chat user ID: {chat.user_id}")

    messages = chat_repo.get_messages_by_chat_id(chat_id)

    return [
        {
            "id": str(msg.id),
            "role": msg.role,
            "content": msg.content,
            "type": getattr(msg, 'type', 'text'),
            "created_at": msg.created_at.isoformat() if msg.created_at else None
        }
        for msg in messages
    ]

@router.post("/{chat_id}/files")
@limiter.limit("10/minute")
async def associate_file_with_chat(
    request: Request,
    chat_id: UUID,
    file_data: Dict[str, Any],
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # Use Supabase user ID directly
    supabase_user_id = current_user.external_id
    if not supabase_user_id:
        raise HTTPException(status_code=400, detail="Invalid user session")

    chat_repo = ChatRepository(db)
    chat = chat_repo.get_chat_by_id(chat_id, supabase_user_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Associate file with chat
    success = chat_repo.associate_file_with_chat(chat_id, file_data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to associate file with chat")

    return {"message": "File associated with chat successfully"}

