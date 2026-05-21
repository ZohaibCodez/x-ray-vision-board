"""Health chatbot endpoints — FYP requirement."""

from __future__ import annotations
from fastapi import APIRouter, Depends
from app.models.schemas import ChatRequest, ChatResponse, ChatSession
from app.services.auth_service import get_current_user_id
from app.services.chatbot_service import chat_with_health_bot
from app.utils.supabase_client import (
    create_chat_session, get_chat_sessions, get_chat_messages, insert_chat_message,
)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def send_message(
    req: ChatRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Send a message to the health chatbot."""
    # Create or use existing session
    session_id = req.session_id
    if not session_id:
        session = create_chat_session(user_id, title=req.message[:50])
        session_id = session["id"]

    # Get conversation history for context
    history = get_chat_messages(session_id)

    # Save user message
    insert_chat_message(session_id, "user", req.message)

    # Get AI response
    result = chat_with_health_bot(
        message=req.message,
        conversation_history=history,
        language=req.language,
    )

    # Save assistant response
    insert_chat_message(session_id, "assistant", result["reply"])

    return ChatResponse(
        session_id=session_id,
        reply=result["reply"],
        doctor_type=result.get("doctor_type"),
        home_remedies=result.get("home_remedies", []),
    )


@router.get("/sessions", response_model=list[ChatSession])
async def list_sessions(user_id: str = Depends(get_current_user_id)):
    """List all chat sessions for the user."""
    sessions = get_chat_sessions(user_id)
    return [
        ChatSession(
            id=s["id"],
            title=s.get("title", "Chat"),
            created_at=s.get("created_at", ""),
        )
        for s in sessions
    ]


@router.get("/sessions/{session_id}/messages")
async def get_messages(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Get all messages in a chat session."""
    messages = get_chat_messages(session_id)
    return messages
