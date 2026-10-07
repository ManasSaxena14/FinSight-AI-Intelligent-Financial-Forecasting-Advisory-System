"""
FinSight AI -- LLM extraction with rule-based fallbacks
=======================================================
Every function returns validated, clamped data; model output is never trusted
as-is. If the LLM is unavailable or returns junk, the rule-based parsers in
app/ai/parsers.py take over.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta

from app.ai.categorize import canonical_merchant, categorize
from app.ai.parsers import parse_date, parse_free_text
from app.ml.common import EXPENSE_COLS
from app.services import llm
from app.services.guardrails import redact_pii

logger = logging.getLogger(__name__)

TEXT_PROMPT = """Extract every money transaction from the user's message. The user is in India; amounts are rupees.
"k" means thousand, "lakh"/"L" means 100000. The message may be English, Hindi or Hinglish.
Today is {today}. Resolve relative dates ("yesterday", "kal", "last Friday") to YYYY-MM-DD.
Categories for spending: {cats}. Income (salary, refund, freelance, interest) uses category "Income".
Return JSON: {{"transactions": [{{"date": "YYYY-MM-DD", "type": "expense"|"income", "category": "...",
"amount": number, "merchant": string|null, "note": string|null}}]}}
Only include amounts the user actually stated. Message:
{text}"""

RECEIPT_PROMPT = """This is a photo of a receipt or bill from India. Read it and return JSON only:
{"merchant": string|null, "date": "YYYY-MM-DD"|null, "total": number|null,
 "category": one of ["Food","Travel","Rent","Shopping","Bills","Entertainment"]|null,
 "items": [{"name": string, "amount": number}]}
"total" is the final amount paid (after tax/discounts). Use null for anything unreadable."""

WHATIF_PROMPT = """Turn the user's what-if question about their monthly budget into JSON.
Current monthly budget (₹): income {income}; categories {cats}.
Return JSON: {{"income_change": number (rupees per month, can be negative or 0),
"changes": [{{"category": one of {names}, "mode": "set"|"delta"|"percent", "value": number}}],
"summary": short plain-English restatement}}
"set" = new monthly amount, "delta" = rupees added/removed, "percent" = percent change (e.g. -50).
Question: {text}"""


def _clean_tx(raw: dict, today: date, history: dict | None) -> dict | None:
    try:
        amount = round(float(raw.get("amount")), 2)
    except (TypeError, ValueError):
        return None
    if not 0 < amount < 1e9:
        return None
    tx_type = "income" if str(raw.get("type", "")).lower() == "income" else "expense"
    try:
        d = date.fromisoformat(str(raw.get("date")))
    except ValueError:
        d = today
    if d > today or d < today - timedelta(days=730):
        d = today
    merchant = (str(raw.get("merchant") or "").strip() or None)
    merchant = canonical_merchant(merchant[:40]) if merchant else None
    category = raw.get("category")
    if tx_type == "income":
        category = "Income"
    elif category not in EXPENSE_COLS:
        category = categorize(merchant, raw.get("note"), history)["category"] or "Shopping"
    note = (str(raw.get("note") or "").strip() or None)
    return {"date": d.isoformat(), "type": tx_type, "category": category, "amount": amount,
            "merchant": merchant, "note": note[:200] if note else None, "confidence": 0.9, "raw": None}


async def extract_transactions(text: str, history: dict | None = None, today: date | None = None) -> dict:
    today = today or date.today()
    try:
        data = await llm.complete_json([{"role": "user", "content": TEXT_PROMPT.format(
            today=today.isoformat(), cats=", ".join(EXPENSE_COLS), text=redact_pii(text[:2000]))}])
        txs = [t for t in (_clean_tx(r, today, history) for r in (data.get("transactions") or [])[:30]) if t]
        if txs:
            # The user's own merchant history beats the model's guess.
            for tx in txs:
                if tx["type"] == "expense" and tx["merchant"]:
                    mine = categorize(tx["merchant"], None, history)
                    if mine["source"] == "your history":
                        tx["category"] = mine["category"]
            return {"transactions": txs, "method": "ai"}
    except llm.LLMUnavailable:
        pass
    except Exception:
        logger.exception("AI extraction failed; using rules")
    return {"transactions": parse_free_text(text, today, history), "method": "rules"}


async def read_receipt(image_b64: str, mime: str, history: dict | None = None, today: date | None = None) -> dict:
    today = today or date.today()
    data = await llm.vision_json(RECEIPT_PROMPT, image_b64, mime)
    try:
        total = round(float(data.get("total")), 2)
    except (TypeError, ValueError):
        total = None
    merchant = (str(data.get("merchant") or "").strip() or None)
    if merchant and merchant.isupper():
        merchant = merchant.title()  # receipts shout; "CHAI POINT" -> "Chai Point"
    d = parse_date(str(data.get("date") or ""), today) if data.get("date") else None
    try:
        d = date.fromisoformat(str(data.get("date"))) if data.get("date") else d
    except ValueError:
        pass
    if not d or d > today:
        d = today
    category = data.get("category") if data.get("category") in EXPENSE_COLS else None
    category = categorize(merchant, None, history)["category"] if not category else category
    items = []
    for item in (data.get("items") or [])[:25]:
        try:
            items.append({"name": str(item.get("name"))[:60], "amount": round(float(item.get("amount")), 2)})
        except (TypeError, ValueError, AttributeError):
            continue
    proposal = None
    if total and 0 < total < 1e8:
        proposal = {"date": d.isoformat(), "type": "expense", "category": category or "Shopping", "amount": total,
                    "merchant": merchant[:40] if merchant else None,
                    "note": f"Receipt · {len(items)} item(s)" if items else "Receipt",
                    "confidence": 0.8 if category else 0.6, "raw": None}
    return {"transactions": [proposal] if proposal else [], "items": items, "method": "vision"}


def apply_scenario(income: float, expenses: dict, plan: dict) -> tuple[float, dict]:
    new_income = max(0.0, income + float(plan.get("income_change") or 0))
    new = {c: float(expenses.get(c, 0) or 0) for c in EXPENSE_COLS}
    for change in plan.get("changes") or []:
        cat = change.get("category")
        if cat not in new:
            continue
        try:
            value = float(change.get("value"))
        except (TypeError, ValueError):
            continue
        mode = change.get("mode")
        if mode == "set":
            new[cat] = max(0.0, value)
        elif mode == "delta":
            new[cat] = max(0.0, new[cat] + value)
        elif mode == "percent":
            new[cat] = max(0.0, new[cat] * (1 + value / 100))
    return new_income, new


async def parse_what_if(text: str, income: float, expenses: dict) -> dict:
    cats = {c: round(float(expenses.get(c, 0) or 0)) for c in EXPENSE_COLS}
    plan = await llm.complete_json([{"role": "user", "content": WHATIF_PROMPT.format(
        income=round(income), cats=cats, names=EXPENSE_COLS, text=redact_pii(text[:600]))}], max_tokens=800)
    changes = [c for c in (plan.get("changes") or []) if isinstance(c, dict) and c.get("category") in EXPENSE_COLS]
    try:
        income_change = float(plan.get("income_change") or 0)
    except (TypeError, ValueError):
        income_change = 0.0
    return {"income_change": income_change, "changes": changes[:8], "summary": str(plan.get("summary") or "")[:200]}
