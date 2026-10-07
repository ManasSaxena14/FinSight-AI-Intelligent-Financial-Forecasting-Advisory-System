"""
FinSight AI -- Advisor conversation storage
===========================================
conversations: {_id, user_id, title, created_at, updated_at,
                messages: [{id, role, text, cards, sources, tools, created_at}]}
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.rag.search import BM25

MAX_MESSAGES = 400


def _now():
    return datetime.now(timezone.utc)


def make_title(message: str) -> str:
    text = " ".join(message.split())
    return text if len(text) <= 60 else text[:57].rsplit(" ", 1)[0] + "…"


async def create(db, user_id: str, first_message: str) -> dict:
    doc = {"_id": str(uuid.uuid4()), "user_id": user_id, "title": make_title(first_message),
           "created_at": _now(), "updated_at": _now(), "messages": []}
    await db["conversations"].insert_one(doc)
    return doc


async def get(db, user_id: str, conversation_id: str) -> dict | None:
    return await db["conversations"].find_one({"_id": conversation_id, "user_id": user_id})


async def list_for(db, user_id: str, limit: int = 50) -> list[dict]:
    cursor = db["conversations"].find({"user_id": user_id}).sort("updated_at", -1).limit(limit)
    out = []
    async for c in cursor:
        last = (c.get("messages") or [{}])[-1]
        out.append({"id": c["_id"], "title": c["title"], "updated_at": c["updated_at"],
                    "messages": len(c.get("messages") or []), "preview": (last.get("text") or "")[:90]})
    return out


async def append(db, conversation: dict, *messages: dict) -> list[dict]:
    stamped = [{"id": str(uuid.uuid4()), "created_at": _now(), **m} for m in messages]
    updated = (conversation.get("messages") or []) + stamped
    conversation["messages"] = updated[-MAX_MESSAGES:]
    await db["conversations"].update_one(
        {"_id": conversation["_id"]}, {"$set": {"messages": conversation["messages"], "updated_at": _now()}})
    return stamped


async def set_feedback(db, user_id: str, conversation_id: str, message_id: str, rating: str, comment: str | None) -> bool:
    convo = await get(db, user_id, conversation_id)
    if not convo:
        return False
    found = False
    for m in convo.get("messages") or []:
        if m.get("id") == message_id and m.get("role") == "assistant":
            m["feedback"] = {"rating": rating, "comment": comment, "at": _now()}
            found = True
    if found:
        await db["conversations"].update_one({"_id": conversation_id}, {"$set": {"messages": convo["messages"]}})
    return found


async def rename(db, user_id: str, conversation_id: str, title: str) -> bool:
    found = await get(db, user_id, conversation_id)
    if not found:
        return False
    await db["conversations"].update_one({"_id": conversation_id}, {"$set": {"title": title[:80]}})
    return True


async def delete(db, user_id: str, conversation_id: str) -> bool:
    result = await db["conversations"].delete_one({"_id": conversation_id, "user_id": user_id})
    return result.deleted_count > 0


async def search_past(db, user_id: str, query: str, exclude_id: str | None = None, k: int = 4) -> list[dict]:
    """BM25 over the user's earlier advisor messages (their own text only)."""
    items = []
    async for c in db["conversations"].find({"user_id": user_id}):
        if c["_id"] == exclude_id:
            continue
        for m in c.get("messages") or []:
            if m.get("text"):
                items.append({"conversation": c["title"], "role": m["role"], "text": m["text"],
                              "date": m["created_at"].date().isoformat() if hasattr(m.get("created_at"), "date") else None})
    if not items:
        return []
    index = BM25([i["text"] for i in items])
    return [dict(items[i], text=items[i]["text"][:400]) for i, _ in index.top(query, k=k)]
