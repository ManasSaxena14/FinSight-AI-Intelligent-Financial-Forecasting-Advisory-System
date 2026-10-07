"""
FinSight AI -- User feedback on tips and recommendations
========================================================
One rating per (user, kind, key); the latest wins. Ratings re-rank what the
user sees: liked items move up, disliked ones are hidden (and counted, so the
UI can offer to show them again).
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

KINDS = {"tip", "recommendation"}


def recommendation_key(text: str) -> str:
    """Stable key for a rule-based recommendation: its first words, without numbers."""
    words = re.sub(r"[^a-z ]", " ", text.lower()).split()
    return "-".join(words[:6])


async def ratings(db, user_id: str, kind: str) -> dict[str, str]:
    out = {}
    async for doc in db["feedback"].find({"user_id": user_id, "kind": kind}):
        out[doc["key"]] = doc["rating"]
    return out


async def rate(db, user_id: str, kind: str, key: str, rating: str) -> None:
    if rating == "clear":
        await db["feedback"].delete_one({"user_id": user_id, "kind": kind, "key": key})
        return
    await db["feedback"].update_one(
        {"user_id": user_id, "kind": kind, "key": key},
        {"$set": {"rating": rating, "at": datetime.now(timezone.utc)}},
        upsert=True,
    )


def rank(items: list[dict], user_ratings: dict[str, str], key_field: str = "key") -> tuple[list[dict], int]:
    """Attach each item's rating, drop disliked ones, put liked ones first (stable otherwise)."""
    kept, hidden = [], 0
    for item in items:
        rating = user_ratings.get(item[key_field])
        item["feedback"] = rating
        if rating == "down":
            hidden += 1
        else:
            kept.append(item)
    kept.sort(key=lambda i: 0 if i["feedback"] == "up" else 1)
    return kept, hidden


async def answer_stats(db) -> dict:
    """Share of rated advisor answers marked helpful (all users) -- shown on the model card."""
    up = await db["feedback"].count_documents({"kind": "answer", "rating": "up"})
    down = await db["feedback"].count_documents({"kind": "answer", "rating": "down"})
    total = up + down
    return {"rated_answers": total, "helpful_pct": round(up / total * 100, 1) if total else None}
