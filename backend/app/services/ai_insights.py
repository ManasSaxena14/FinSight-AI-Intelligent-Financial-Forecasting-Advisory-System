"""
FinSight AI -- Phase 3 insight services
=======================================
Database-aware wrappers around the pure ML modules. Used by both the REST
routes (app/routes/ai.py) and the advisor agent's tools, so the numbers a
user sees on screen and the numbers the agent quotes are always the same.
"""

from __future__ import annotations

import calendar
import logging
import math
from datetime import date, datetime, timedelta, timezone
from statistics import median

from app.ml.budgets import budget_status, suggest_budget
from app.ml.common import EXPENSE_COLS, clean_expenses, current_period, period_label
from app.ml.explain import explain_change
from app.ml.goal_planner import months_left, plan_goal
from app.ml.insights import build_insights, split_in_progress
from app.ml.recurring import detect_recurring
from app.services import llm
from app.services.financial_logic import calculate_health_score
from app.services.ledger import get_history

logger = logging.getLogger(__name__)

LANGUAGES = {"auto", "en", "hi", "hinglish"}


class NoData(Exception):
    """The user hasn't logged enough data for this insight."""


# ── Data access ────────────────────────────────────────────────────────────

async def recent_transactions(db, user_id: str, days: int = 400, limit: int = 2000) -> list[dict]:
    since = (date.today() - timedelta(days=days)).isoformat()
    cursor = db["transactions"].find({"user_id": user_id}).sort("date", -1).limit(limit)
    return [tx async for tx in cursor if tx.get("date", "") >= since]


async def insights_for(db, user_id: str, months: int = 3) -> dict:
    history = await get_history(db, user_id, limit=24)
    if not history:
        raise NoData("Add at least one month of data first.")
    return build_insights(history, months=months)


async def complete_history(db, user_id: str) -> list[dict]:
    history = await get_history(db, user_id, limit=24)
    complete, _ = split_in_progress(history)
    return complete


# ── Recurring ──────────────────────────────────────────────────────────────

async def recurring(db, user_id: str) -> dict:
    return detect_recurring(await recent_transactions(db, user_id))


# ── Budgets ────────────────────────────────────────────────────────────────

async def budget_suggestion(db, user_id: str, target_rate: float = 0.20) -> dict:
    insights = await insights_for(db, user_id)
    next_month = insights["forecast"]["forecast"][0]
    income = next_month["predicted_income"] or insights["income"]
    complete = (await complete_history(db, user_id))[-6:]
    typical = {c: median(clean_expenses(h["expenses"])[c] for h in complete) for c in EXPENSE_COLS} if len(complete) >= 3 else None
    result = suggest_budget(next_month["categories"], income, target_rate, typical)
    result["period"] = next_month["period"]
    return result


async def get_budgets(db, user_id: str) -> dict | None:
    return await db["budgets"].find_one({"_id": user_id})


async def save_budgets(db, user_id: str, categories: dict, target_rate: float) -> dict:
    clean = {c: round(max(0.0, float(categories.get(c, 0) or 0)), 2) for c in EXPENSE_COLS}
    doc = {"categories": clean, "target_rate": target_rate, "updated_at": datetime.now(timezone.utc)}
    await db["budgets"].update_one({"_id": user_id}, {"$set": doc, "$setOnInsert": {"user_id": user_id}}, upsert=True)
    return {"_id": user_id, **doc}


async def budget_progress(db, user_id: str) -> dict | None:
    budgets = await get_budgets(db, user_id)
    if not budgets:
        return None
    today = date.today()
    period = current_period()
    spent = {c: 0.0 for c in EXPENSE_COLS}
    async for tx in db["transactions"].find({"user_id": user_id, "period": period, "type": "expense"}):
        if tx.get("category") in spent:
            spent[tx["category"]] += float(tx["amount"])
    rows = budget_status(budgets["categories"], spent, today.day, calendar.monthrange(today.year, today.month)[1])
    return {"period": period, "label": period_label(period), "day": today.day, "rows": rows,
            "total_budget": round(sum(budgets["categories"].values()), 2), "total_spent": round(sum(spent.values()), 2)}


# ── Why did it change ─────────────────────────────────────────────────────

async def change_explanation(db, user_id: str) -> dict:
    complete = await complete_history(db, user_id)
    if len(complete) < 2:
        raise NoData("Explanations need two complete months.")
    return explain_change(complete[-2], complete[-1])


# ── Goal planner ───────────────────────────────────────────────────────────

async def goal_plan(db, user_id: str, goal_id: str, planned: float | None = None) -> dict:
    goal = await db["goals"].find_one({"_id": goal_id, "user_id": user_id})
    if not goal:
        raise NoData("Goal not found.")
    insights = await insights_for(db, user_id, months=12)
    forecast = insights["forecast"]["forecast"]
    # Month-by-month expected savings over the forecast; one-step uncertainty as month-to-month noise.
    monthly_means = [f["savings"] for f in forecast]
    std = math.sqrt(forecast[0]["std"] ** 2 + forecast[0]["income_std"] ** 2)

    # Goals due sooner get first claim on monthly savings.
    earlier = 0.0
    async for other in db["goals"].find({"user_id": user_id}):
        if other["_id"] == goal_id or other.get("target_date", "") >= goal.get("target_date", ""):
            continue
        remaining = max(0.0, float(other["target_amount"]) - float(other.get("current_savings", 0)))
        try:
            days = (date.fromisoformat(other["target_date"]) - date.today()).days
        except ValueError:
            continue
        if days > 0 and remaining > 0:
            earlier += remaining / months_left(days)

    plan = plan_goal(float(goal["target_amount"]), float(goal.get("current_savings", 0)), goal["target_date"],
                     [m - earlier for m in monthly_means], std, planned)
    plan.update({"goal_id": goal_id, "name": goal["name"], "target_amount": float(goal["target_amount"]),
                 "current_savings": float(goal.get("current_savings", 0)), "target_date": goal["target_date"],
                 "reserved_for_earlier_goals": round(earlier, 2)})
    return plan


# ── What-if ────────────────────────────────────────────────────────────────

def evaluate_scenario(income: float, expenses: dict, new_income: float, new_expenses: dict) -> dict:
    before = calculate_health_score(income, sum(expenses.values()), expenses)
    after = calculate_health_score(new_income, sum(new_expenses.values()), new_expenses)
    savings_before = income - sum(expenses.values())
    savings_after = new_income - sum(new_expenses.values())
    return {
        "income": round(new_income, 2),
        "expenses": {c: round(v, 2) for c, v in new_expenses.items()},
        "savings_before": round(savings_before, 2),
        "savings_after": round(savings_after, 2),
        "monthly_difference": round(savings_after - savings_before, 2),
        "yearly_difference": round((savings_after - savings_before) * 12, 2),
        "score_before": before["score"],
        "score_after": after["score"],
        "savings_rate_after": after["savings_rate_pct"],
    }


async def what_if(db, user_id: str, text: str) -> dict:
    from app.ai.extract import apply_scenario, parse_what_if

    complete = await complete_history(db, user_id)
    if not complete:
        raise NoData("Add a month of data first.")
    latest = complete[-1]
    income, expenses = float(latest["income"]), clean_expenses(latest["expenses"])
    plan = await parse_what_if(text, income, expenses)
    new_income, new_expenses = apply_scenario(income, expenses, plan)
    result = evaluate_scenario(income, expenses, new_income, new_expenses)
    result.update({"plan": plan, "based_on": period_label(latest["period"])})
    return result


# ── Preferences ────────────────────────────────────────────────────────────

async def get_language(db, user_id: str) -> str:
    user = await db["users"].find_one({"_id": user_id})
    lang = (user or {}).get("language", "auto")
    return lang if lang in LANGUAGES else "auto"


_HINGLISH_WORDS = {
    "hai", "hain", "kya", "kaise", "kitna", "kitne", "mera", "meri", "mere", "maine", "mujhe", "aaj", "kal", "pe",
    "par", "ko", "ka", "ki", "ke", "nahi", "nahin", "kar", "karo", "kiya", "kiye", "diye", "kharch", "kharcha",
    "paisa", "paise", "bachat", "batao", "chahiye", "hoga", "tha", "thi", "aur", "bhi", "sakta", "sakti", "do",
}


def detect_language(text: str) -> str:
    """Best guess of the user's language for 'auto' mode: hi (Devanagari), hinglish, or en."""
    if any("\u0900" <= ch <= "\u097f" for ch in text):
        return "hi"
    words = [w.strip(".,!?;:'\"()").lower() for w in text.split()]
    hits = sum(1 for w in words if w in _HINGLISH_WORDS)
    return "hinglish" if hits >= 2 and hits / max(len(words), 1) >= 0.15 else "en"


def language_instruction(lang: str) -> str:
    return {
        "en": "Always reply in English.",
        "hi": "Always reply in Hindi (Devanagari script). Keep ₹ amounts as digits.",
        "hinglish": "Always reply in Hinglish (Hindi written in Latin script, mixed with English).",
    }.get(lang, "Reply in the same language and script the user writes in (English, Hindi or Hinglish).")


# ── Weekly digest & nudges ─────────────────────────────────────────────────

def iso_week(d: date) -> str:
    y, w, _ = d.isocalendar()
    return f"{y}-W{w:02d}"


async def nudges(db, user_id: str) -> list[dict]:
    out = []
    progress = await budget_progress(db, user_id)
    for row in (progress or {}).get("rows", []):
        if row["state"] == "over":
            out.append({"kind": "budget", "severity": "warning", "title": f"{row['category']} budget exceeded",
                        "message": f"You've spent ₹{row['spent']:,.0f} of your ₹{row['budget']:,.0f} {row['category']} budget."})
        elif row["state"] == "at-risk":
            out.append({"kind": "budget", "severity": "info", "title": f"{row['category']} is running hot",
                        "message": f"At this pace you'll pass your ₹{row['budget']:,.0f} {row['category']} budget before month end."})
    rec = await recurring(db, user_id)
    soon = date.today() + timedelta(days=3)
    for item in rec["items"]:
        if item["status"] == "active" and date.today() <= date.fromisoformat(item["next_expected"]) <= soon:
            out.append({"kind": "recurring", "severity": "info", "title": f"{item['merchant']} charge due",
                        "message": f"About ₹{item['typical_amount']:,.0f} is expected around {item['next_expected']}."})
    return out


async def weekly_digest(db, user_id: str, refresh: bool = False) -> dict:
    week = iso_week(date.today())
    if not refresh:
        cached = await db["digests"].find_one({"user_id": user_id, "week": week})
        if cached:
            cached.pop("_id", None)
            return cached

    today = date.today()
    start = today - timedelta(days=6)
    txs = await recent_transactions(db, user_id, days=200)
    week_all = [t for t in txs if t["type"] == "expense" and t["date"] >= start.isoformat()]
    # Rent is a fixed monthly cost; comparing it with a "typical week" would distort the picture.
    week_tx = [t for t in week_all if t["category"] != "Rent"]
    fixed_paid = sum(float(t["amount"]) for t in week_all if t["category"] == "Rent")
    spent_week = sum(float(t["amount"]) for t in week_tx)
    by_cat: dict[str, float] = {}
    by_merchant: dict[str, float] = {}
    for t in week_tx:
        by_cat[t["category"]] = by_cat.get(t["category"], 0) + float(t["amount"])
        if t.get("merchant"):
            by_merchant[t["merchant"]] = by_merchant.get(t["merchant"], 0) + float(t["amount"])

    complete = await complete_history(db, user_id)
    typical_week = (median(sum(v for c, v in clean_expenses(h["expenses"]).items() if c != "Rent")
                           for h in complete[-6:]) / 4.33) if complete else None
    digest = {
        "user_id": user_id,
        "week": week,
        "from": start.isoformat(),
        "to": today.isoformat(),
        "spent": round(spent_week, 2),
        "fixed_paid": round(fixed_paid, 2),
        "typical_week": round(typical_week, 2) if typical_week else None,
        "transactions": len(week_tx),
        "top_categories": sorted(({"category": c, "amount": round(a, 2)} for c, a in by_cat.items()),
                                 key=lambda x: x["amount"], reverse=True)[:3],
        "top_merchants": sorted(({"merchant": m, "amount": round(a, 2)} for m, a in by_merchant.items()),
                                key=lambda x: x["amount"], reverse=True)[:3],
        "nudges": await nudges(db, user_id),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    facts = (
        f"Week {digest['from']} to {digest['to']}: variable spending (excluding rent) ₹{spent_week:,.0f} across {len(week_tx)} transactions"
        + (f"; a typical week's variable spending is about ₹{typical_week:,.0f}" if typical_week else "")
        + (f"; rent of ₹{fixed_paid:,.0f} was also paid (a normal monthly cost, not overspending)" if fixed_paid else "")
        + ". Top categories: " + (", ".join(f"{c['category']} ₹{c['amount']:,.0f}" for c in digest["top_categories"]) or "none")
        + ". Top merchants: " + (", ".join(f"{m['merchant']} ₹{m['amount']:,.0f}" for m in digest["top_merchants"]) or "none")
        + ". Nudges: " + (" ".join(n["message"] for n in digest["nudges"]) or "none") + "."
    )
    lang = await get_language(db, user_id)
    try:
        digest["summary"] = await llm.complete([{"role": "user", "content": (
            "Write a friendly 3-sentence weekly money digest for this user in India from these facts only. "
            "Compare the week with a typical week, call out the biggest spend, and end with one specific suggestion. "
            f"{language_instruction(lang if lang != 'auto' else 'en')}\nFACTS: {facts}")}], temperature=0.5, max_tokens=700)
        digest["source"] = "llm"
    except llm.LLMUnavailable:
        if typical_week:
            pace = "more than" if spent_week > typical_week * 1.1 else "less than" if spent_week < typical_week * 0.9 else "about"
            digest["summary"] = (f"You spent ₹{spent_week:,.0f} this week — {pace} a typical week (₹{typical_week:,.0f}). "
                                 + (f"Your biggest category was {digest['top_categories'][0]['category']}. " if digest["top_categories"] else "")
                                 + "Check your budgets before the weekend.")
        else:
            digest["summary"] = f"You spent ₹{spent_week:,.0f} across {len(week_tx)} transactions this week."
        digest["source"] = "rules"

    await db["digests"].update_one({"user_id": user_id, "week": week}, {"$set": digest}, upsert=True)
    return digest
