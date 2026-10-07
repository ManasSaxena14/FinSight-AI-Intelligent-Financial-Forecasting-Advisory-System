"""
FinSight AI -- LLM response cache
=================================
Keyed by a hash of the exact facts sent to the model, so a cached answer is
reused only while the underlying numbers are unchanged. MongoDB expires
entries through a TTL index on `expires_at` (see ledger.ensure_indexes).
"""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)


def make_key(kind: str, user_id: str, *parts: str) -> str:
    digest = hashlib.sha256("\n".join(parts).encode("utf-8")).hexdigest()[:32]
    return f"{kind}:{user_id}:{digest}"


async def get(db, key: str):
    try:
        doc = await db["ai_cache"].find_one({"_id": key})
    except Exception:
        logger.exception("Cache read failed")
        return None
    if not doc:
        return None
    expires = doc.get("expires_at")
    if expires is not None:
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < datetime.now(timezone.utc):
            return None
    return doc.get("value")


async def put(db, key: str, value, hours: float = 24) -> None:
    try:
        await db["ai_cache"].update_one(
            {"_id": key},
            {"$set": {"value": value, "expires_at": datetime.now(timezone.utc) + timedelta(hours=hours)}},
            upsert=True,
        )
    except Exception:
        logger.exception("Cache write failed")
