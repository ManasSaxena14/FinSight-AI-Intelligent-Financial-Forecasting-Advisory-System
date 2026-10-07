"""
FinSight AI -- Advisor routes (agent chat, conversations, voice, suggestions)
"""

import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.agent.runner import run_agent
from app.db import get_database
from app.services import ai_insights, conversations, llm
from app.services.auth import get_current_user
from app.services.rate_limit import limit

router = APIRouter(prefix="/api/advisor", tags=["AI Advisor"])
logger = logging.getLogger(__name__)

MAX_AUDIO_BYTES = 15 * 1024 * 1024


class AgentChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = None


class FeedbackRequest(BaseModel):
    conversation_id: str
    message_id: str
    rating: str = Field(..., pattern="^(up|down)$")
    comment: Optional[str] = Field(None, max_length=500)


class RenameRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=80)


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False, default=str)}\n\n"


@router.get("/conversations")
async def list_conversations(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    return await conversations.list_for(db, current_user["id"])


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    convo = await conversations.get(db, current_user["id"], conversation_id)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"id": convo["_id"], "title": convo["title"], "messages": convo.get("messages", []),
            "updated_at": convo["updated_at"]}


@router.patch("/conversations/{conversation_id}")
async def rename_conversation(conversation_id: str, req: RenameRequest, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    if not await conversations.rename(db, current_user["id"], conversation_id, req.title):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"id": conversation_id, "title": req.title}


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    if not await conversations.delete(db, current_user["id"], conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"deleted_id": conversation_id}


@router.post("/chat")
async def agent_chat(req: AgentChatRequest, current_user: dict = Depends(limit("chat"))):
    """
    Streams the agent's answer as server-sent events and saves the exchange.
    First event: {"type": "meta", "conversation_id", "title"}.
    """
    db = await get_database()
    user_id = current_user["id"]
    convo = await conversations.get(db, user_id, req.conversation_id) if req.conversation_id else None
    if convo is None:
        convo = await conversations.create(db, user_id, req.message)
    history = list(convo.get("messages") or [])
    language = await ai_insights.get_language(db, user_id)

    async def events():
        yield _sse({"type": "meta", "conversation_id": convo["_id"], "title": convo["title"]})
        text, cards, sources, tools, source = [], [], [], [], "agent"
        try:
            async for event in run_agent(db, user_id, convo["_id"], history, req.message, language):
                kind = event["type"]
                if kind == "token":
                    text.append(event["text"])
                elif kind == "card":
                    cards.append(event["card"])
                elif kind == "sources":
                    sources.extend(event["items"])
                elif kind == "tool" and event["status"] != "running":
                    tools.append({"name": event["name"], "label": event["label"], "status": event["status"]})
                elif kind == "done":
                    source = event["source"]
                    continue  # sent after saving
                yield _sse(event)
        finally:
            saved = await conversations.append(
                db, convo,
                {"role": "user", "text": req.message},
                {"role": "assistant", "text": "".join(text), "cards": cards, "sources": sources, "tools": tools,
                 "source": source},
            )
        yield _sse({"type": "saved", "message_id": saved[-1]["id"]})
        yield _sse({"type": "done", "source": source})

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/feedback")
async def answer_feedback(req: FeedbackRequest, current_user: dict = Depends(get_current_user)):
    """Thumbs up/down on an advisor answer (stored on the message and in the feedback log)."""
    from datetime import datetime, timezone

    db = await get_database()
    if not await conversations.set_feedback(db, current_user["id"], req.conversation_id, req.message_id, req.rating, req.comment):
        raise HTTPException(status_code=404, detail="Message not found")
    await db["feedback"].update_one(
        {"user_id": current_user["id"], "kind": "answer", "key": req.message_id},
        {"$set": {"rating": req.rating, "comment": req.comment, "at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"saved": True}


@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...), language: Optional[str] = Form(None),
                     current_user: dict = Depends(limit("voice"))):
    data = await audio.read()
    if not data:
        raise HTTPException(status_code=422, detail="Empty recording")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Recording is too long")
    lang = language if language in ("en", "hi") else None
    try:
        text = await llm.transcribe(data, audio.filename or "voice.webm", lang)
    except llm.LLMUnavailable:
        raise HTTPException(status_code=503, detail="Voice input is unavailable right now.")
    return {"text": text}


@router.get("/suggestions")
async def suggestions(current_user: dict = Depends(get_current_user)) -> List[str]:
    """Question starters tailored to what's notable in the user's data."""
    db = await get_database()
    out: list[str] = []
    try:
        ins = await ai_insights.insights_for(db, current_user["id"])
        for a in ins["anomalies"]["anomalies"][:1]:
            out.append(f"Why is my {a['category']} spending flagged?")
        if ins["risk"]["risk_level"] != "low":
            out.append("How do I bring my overspend risk down?")
        out.append(f"How did I do in {ins['latest_label']}?")
        out.append("Where can I cut ₹5,000 a month?")
        if ins["history_months"] >= 2:
            out.append("Why did my health score change?")
        goals = [g async for g in db["goals"].find({"user_id": current_user["id"]})]
        if goals:
            out.append(f"Will I reach my {goals[0]['name']} goal on time?")
        out.append("What subscriptions am I paying for?")
    except ai_insights.NoData:
        out += ["I spent 450 on Swiggy and 1200 on Uber today", "How should I start an emergency fund?"]
    out += ["Old vs new tax regime — which suits me?", "Suggest a budget for next month"]
    seen, unique = set(), []
    for s in out:
        if s not in seen:
            seen.add(s)
            unique.append(s)
    return unique[:6]
