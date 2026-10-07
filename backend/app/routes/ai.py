"""
FinSight AI -- Smart input & insight routes
"""

import base64
import io
import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

from app.ai import extract
from app.ai.categorize import build_history_map, categorize
from app.ai.parsers import dedupe_key, parse_csv_statement, parse_pdf_text, parse_sms
from app.config import settings
from app.db import get_database
from app.ml.common import EXPENSE_COLS
from app.services import ai_insights, llm
from app.services.auth import get_current_user
from app.services.rate_limit import limit
from app.services import ai_cache

router = APIRouter(prefix="/api/ai", tags=["AI features"])
logger = logging.getLogger(__name__)

MAX_UPLOAD = 8 * 1024 * 1024
IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}


class TextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000)


class BudgetsRequest(BaseModel):
    categories: dict[str, float]
    target_rate: float = Field(0.2, ge=0, le=0.9)


class ItemFeedbackRequest(BaseModel):
    kind: str = Field(..., pattern="^(tip|recommendation)$")
    key: str = Field(..., min_length=1, max_length=120)
    rating: str = Field(..., pattern="^(up|down|clear)$")


class PreferencesRequest(BaseModel):
    language: str


def _no_data(exc: ai_insights.NoData):
    raise HTTPException(status_code=404, detail=str(exc))


async def _history_map(db, user_id: str) -> dict:
    return build_history_map(await ai_insights.recent_transactions(db, user_id))


async def _mark_duplicates(db, user_id: str, proposals: list[dict]) -> list[dict]:
    existing = {dedupe_key(t) for t in await ai_insights.recent_transactions(db, user_id, days=800)}
    seen = set()
    for p in proposals:
        key = dedupe_key(p)
        p["duplicate"] = key in existing or key in seen
        seen.add(key)
    return proposals


# ── Smart input ────────────────────────────────────────────────────────────

@router.post("/parse")
async def parse_text(req: TextRequest, current_user: dict = Depends(limit("ai"))):
    """'450 on Swiggy and 1.2k Uber yesterday' -> proposed transactions (not saved)."""
    db = await get_database()
    history = await _history_map(db, current_user["id"])
    result = await extract.extract_transactions(req.text, history)
    result["transactions"] = await _mark_duplicates(db, current_user["id"], result["transactions"])
    return result


@router.get("/categorize")
async def categorize_merchant(merchant: str = Query(..., max_length=80), note: Optional[str] = None,
                              current_user: dict = Depends(get_current_user)):
    db = await get_database()
    return categorize(merchant, note, await _history_map(db, current_user["id"]))


@router.post("/import")
async def import_statement(file: Optional[UploadFile] = File(None), sms: Optional[str] = Form(None),
                           current_user: dict = Depends(limit("upload"))):
    """CSV/PDF bank statement or pasted bank/UPI SMS -> proposed transactions (not saved)."""
    db = await get_database()
    history = await _history_map(db, current_user["id"])
    if sms and sms.strip():
        proposals, kind = parse_sms(sms[:50000], history=history), "sms"
    elif file is not None:
        data = await file.read()
        if len(data) > MAX_UPLOAD:
            raise HTTPException(status_code=413, detail="File is larger than 8 MB")
        name = (file.filename or "").lower()
        if name.endswith(".pdf") or file.content_type == "application/pdf":
            try:
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(data))
                if reader.is_encrypted:
                    raise HTTPException(status_code=422, detail="This PDF is password-protected. Export an unlocked copy or a CSV.")
                text = "\n".join((page.extract_text() or "") for page in reader.pages[:40])
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=422, detail="Couldn't read that PDF. Try the CSV export from your bank.")
            proposals, kind = parse_pdf_text(text, history), "pdf"
        else:
            text = data.decode("utf-8-sig", errors="ignore")
            proposals, kind = parse_csv_statement(text, history), "csv"
    else:
        raise HTTPException(status_code=422, detail="Upload a CSV/PDF statement or paste SMS text.")
    if not proposals:
        raise HTTPException(status_code=422, detail="No transactions found. Check the file format or paste the SMS text.")
    proposals = await _mark_duplicates(db, current_user["id"], proposals[:500])
    return {"transactions": proposals, "method": kind, "count": len(proposals)}


@router.post("/receipt")
async def scan_receipt(image: UploadFile = File(...), current_user: dict = Depends(limit("upload"))):
    data = await image.read()
    if len(data) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="Image is larger than 8 MB")
    mime = image.content_type if image.content_type in IMAGE_TYPES else "image/jpeg"
    db = await get_database()
    try:
        result = await extract.read_receipt(base64.b64encode(data).decode(), mime, await _history_map(db, current_user["id"]))
    except llm.LLMUnavailable:
        raise HTTPException(status_code=503, detail="Receipt scanning is unavailable right now. Try again, or add it manually.")
    if not result["transactions"]:
        raise HTTPException(status_code=422, detail="Couldn't find a total on that receipt. Try a clearer photo.")
    result["transactions"] = await _mark_duplicates(db, current_user["id"], result["transactions"])
    return result


# ── Insights ───────────────────────────────────────────────────────────────

@router.post("/what-if")
async def what_if(req: TextRequest, current_user: dict = Depends(limit("ai"))):
    db = await get_database()
    try:
        return await ai_insights.what_if(db, current_user["id"], req.text[:600])
    except ai_insights.NoData as exc:
        _no_data(exc)
    except llm.LLMUnavailable:
        raise HTTPException(status_code=503, detail="The AI couldn't read that scenario. Use the sliders instead.")


@router.get("/explain-change")
async def explain(current_user: dict = Depends(limit("summary")), narrate: bool = True):
    db = await get_database()
    try:
        result = await ai_insights.change_explanation(db, current_user["id"])
    except ai_insights.NoData as exc:
        _no_data(exc)
    result["narrative"] = None
    if narrate:
        facts = "; ".join(
            f"{d['factor']} {d['previous']:.0f}→{d['current']:.0f} (score impact {d['score_impact']:+d})" for d in result["drivers"])
        lang = await ai_insights.get_language(db, current_user["id"])
        cache_key = ai_cache.make_key("explain", current_user["id"], facts, lang, str(result["score_from"]), str(result["score_to"]))
        cached = await ai_cache.get(db, cache_key)
        if cached:
            result["narrative"] = cached
            return result
        try:
            result["narrative"] = await llm.complete([{"role": "user", "content": (
                f"In 2 short sentences, explain to the user why their FinSight health score moved from {result['score_from']} "
                f"to {result['score_to']} between {result['from_label']} and {result['to_label']}. Use only these facts "
                f"(₹ amounts): {facts}. Savings change ₹{result['savings_change']:.0f}. "
                f"{ai_insights.language_instruction(lang if lang != 'auto' else 'en')}")}], temperature=0.3, max_tokens=500)
            await ai_cache.put(db, cache_key, result["narrative"], hours=24 * 7)
        except llm.LLMUnavailable:
            pass
    return result


@router.get("/recurring")
async def recurring(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    return await ai_insights.recurring(db, current_user["id"])


@router.get("/budgets/suggest")
async def suggest_budgets(target: float = Query(0.2, ge=0.05, le=0.6), current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        return await ai_insights.budget_suggestion(db, current_user["id"], target)
    except ai_insights.NoData as exc:
        _no_data(exc)


@router.get("/budgets")
async def get_budgets(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    budgets = await ai_insights.get_budgets(db, current_user["id"])
    return {"budgets": budgets["categories"] if budgets else None,
            "target_rate": budgets.get("target_rate") if budgets else None,
            "progress": await ai_insights.budget_progress(db, current_user["id"])}


@router.put("/budgets")
async def put_budgets(req: BudgetsRequest, current_user: dict = Depends(get_current_user)):
    unknown = set(req.categories) - set(EXPENSE_COLS)
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown categories: {', '.join(sorted(unknown))}")
    db = await get_database()
    await ai_insights.save_budgets(db, current_user["id"], req.categories, req.target_rate)
    return {"saved": True, "progress": await ai_insights.budget_progress(db, current_user["id"])}


@router.get("/goals/{goal_id}/plan")
async def goal_plan(goal_id: str, monthly: Optional[float] = Query(None, gt=0, le=1e9),
                    current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        return await ai_insights.goal_plan(db, current_user["id"], goal_id, monthly)
    except ai_insights.NoData as exc:
        _no_data(exc)


@router.get("/digest")
async def digest(refresh: bool = False, current_user: dict = Depends(limit("summary"))):
    db = await get_database()
    return await ai_insights.weekly_digest(db, current_user["id"], refresh=refresh)


@router.post("/digests/run")
async def run_digests(x_cron_secret: Optional[str] = Header(None)):
    """For an external scheduler (Render cron, GitHub Actions): pre-builds this week's digests."""
    if not settings.DIGEST_CRON_SECRET or x_cron_secret != settings.DIGEST_CRON_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")
    db = await get_database()
    built = 0
    async for user in db["users"].find({}):
        if await db["expenses"].count_documents({"user_id": user["_id"]}):
            try:
                await ai_insights.weekly_digest(db, user["_id"], refresh=True)
                built += 1
            except Exception:
                logger.exception("Digest failed for %s", user["_id"])
    return {"built": built}


@router.post("/feedback")
async def item_feedback(req: ItemFeedbackRequest, current_user: dict = Depends(get_current_user)):
    """👍/👎 on a tip or recommendation; re-ranks what this user sees next time."""
    from app.services import feedback as fb

    db = await get_database()
    await fb.rate(db, current_user["id"], req.kind, req.key, req.rating)
    return {"saved": True}


@router.post("/feedback/reset")
async def reset_feedback(kind: str = Query(..., pattern="^(tip|recommendation)$"), current_user: dict = Depends(get_current_user)):
    """Show hidden tips again."""
    db = await get_database()
    keys = [doc["key"] async for doc in db["feedback"].find({"user_id": current_user["id"], "kind": kind, "rating": "down"})]
    for key in keys:
        await db["feedback"].delete_one({"user_id": current_user["id"], "kind": kind, "key": key})
    return {"reset": True}


@router.get("/preferences")
async def get_preferences(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    return {"language": await ai_insights.get_language(db, current_user["id"])}


@router.put("/preferences")
async def put_preferences(req: PreferencesRequest, current_user: dict = Depends(get_current_user)):
    if req.language not in ai_insights.LANGUAGES:
        raise HTTPException(status_code=422, detail="language must be auto, en, hi or hinglish")
    db = await get_database()
    await db["users"].update_one({"_id": current_user["id"]}, {"$set": {"language": req.language}})
    return {"language": req.language}
