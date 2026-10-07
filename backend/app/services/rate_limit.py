"""
FinSight AI -- Rate limiting
============================
Sliding-window limits per user (or per client IP for unauthenticated routes)
to cap LLM cost and stop abuse/brute force. In-memory, so limits are per
process: fine for a single Render instance; use Redis if you scale out.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request

from app.config import settings
from app.services.auth import get_current_user

_hits: dict[tuple[str, str], deque] = defaultdict(deque)

# bucket -> list of (max requests, window seconds)
LIMITS = {
    "chat": [(20, 60), (300, 86_400)],
    "ai": [(30, 60), (600, 86_400)],
    "upload": [(10, 60), (100, 86_400)],
    "voice": [(10, 60), (150, 86_400)],
    "summary": [(30, 60)],
    "login": [(10, 300)],
    "register": [(5, 3_600)],
}


def check(bucket: str, key: str, now: float | None = None) -> None:
    if not settings.RATE_LIMITS_ENABLED:
        return
    now = now or time.monotonic()
    rules = LIMITS[bucket]
    window = max(w for _, w in rules)
    q = _hits[(bucket, key)]
    while q and now - q[0] > window:
        q.popleft()
    for limit, seconds in rules:
        recent = sum(1 for t in q if now - t <= seconds)
        if recent >= limit:
            oldest = next(t for t in q if now - t <= seconds)
            retry = max(1, int(seconds - (now - oldest)))
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests. Try again in {retry} seconds." if retry < 120
                else "You've reached today's limit for this feature. Try again tomorrow.",
                headers={"Retry-After": str(retry)},
            )
    q.append(now)


def limit(bucket: str):
    """Dependency for authenticated routes: limits per user."""
    async def dependency(current_user: dict = Depends(get_current_user)) -> dict:
        check(bucket, current_user["id"])
        return current_user
    return dependency


def limit_by_ip(bucket: str):
    """Dependency for public routes (login/register): limits per client IP."""
    async def dependency(request: Request) -> None:
        forwarded = request.headers.get("x-forwarded-for", "")
        ip = forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")
        check(bucket, ip)
    return dependency


def reset() -> None:
    _hits.clear()
