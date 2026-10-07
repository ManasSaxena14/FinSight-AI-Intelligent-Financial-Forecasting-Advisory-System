import json
import logging
import uuid
from datetime import date, datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.db import get_database
from app.ml.common import EXPENSE_COLS, clean_expenses, period_label
from app.models.schemas import (
    BudgetLiveResponse,
    ChatMessage,
    ChatResponse,
    GoalContribution,
    GoalCreate,
    GoalDeleteResponse,
    GoalResponse,
    NotificationItem,
    NotificationsResponse,
    ScenarioRequest,
    ScenarioResponse,
    SmartSavingsResponse,
    SmartSavingsTip,
)
from app.services import llm
from app.services.advisor import (
    SUMMARY_PROMPT,
    build_messages,
    build_snapshot,
    fallback_reply,
    rule_based_summary,
    snapshot_to_text,
)
from app.ml.goal_planner import months_left
from app.services.auth import get_current_user
from app.services.rate_limit import limit
from app.services import ai_cache
from app.services.financial_logic import calculate_health_score
from app.services.ledger import get_latest_complete_record, get_monthly_records

router = APIRouter(prefix="/api/premium", tags=["Premium Features"])
logger = logging.getLogger(__name__)

CAPACITY_MONTHS = 3
DAYS_PER_MONTH = 30.44


# ── 1. Financial Goals ──────────────────────────────────────────────────────────

def assess_goal(target_amount: float, current_savings: float, target_date_str: str, capacity_left: float | None) -> dict:
    """
    A goal is on track when the monthly saving it still needs fits inside the
    user's real monthly savings capacity left over after goals with earlier
    deadlines have taken their share.
    """
    remaining = max(0.0, target_amount - current_savings)
    try:
        target_dt = date.fromisoformat(target_date_str)
    except (ValueError, TypeError):
        return {"is_on_track": False, "days_remaining": None, "required_monthly_saving": None,
                "track_reason": "Invalid target date.", "capacity_used": 0.0}

    days = (target_dt - date.today()).days
    if remaining <= 0:
        return {"is_on_track": True, "days_remaining": max(0, days), "required_monthly_saving": 0.0,
                "track_reason": "Goal reached.", "capacity_used": 0.0}
    if days <= 0:
        return {"is_on_track": False, "days_remaining": 0, "required_monthly_saving": round(remaining, 2),
                "track_reason": "The deadline has passed.", "capacity_used": 0.0}

    required = remaining / months_left(days)
    if capacity_left is None:
        return {"is_on_track": False, "days_remaining": days, "required_monthly_saving": round(required, 2),
                "track_reason": "Add monthly income and spending so we can check this goal.", "capacity_used": 0.0}

    on_track = required <= capacity_left + 0.01
    if on_track:
        reason = f"Needs ₹{required:,.0f}/month; you have about ₹{capacity_left:,.0f}/month free after earlier goals."
    elif capacity_left <= 0:
        reason = f"Needs ₹{required:,.0f}/month, but goals due sooner already use your recent savings."
    else:
        reason = f"Needs ₹{required:,.0f}/month, but only about ₹{capacity_left:,.0f}/month is free after earlier goals."
    return {"is_on_track": on_track, "days_remaining": days, "required_monthly_saving": round(required, 2),
            "track_reason": reason, "capacity_used": min(required, max(0.0, capacity_left))}


async def _monthly_capacity(db, user_id: str) -> float | None:
    """Average savings over the last few complete months (floored at 0); None if there's no data."""
    latest = await get_latest_complete_record(db, user_id)
    if not latest:
        return None
    records = [r for r in await get_monthly_records(db, user_id, limit=CAPACITY_MONTHS + 1)
               if r["period"] <= latest["period"]][:CAPACITY_MONTHS]
    return max(0.0, sum(float(r.get("savings", 0)) for r in records) / len(records))


async def _get_available_goal_savings(db, user_id: str, exclude_goal_id: str | None = None) -> float:
    """Lifetime savings minus what is already allocated to goals."""
    pipeline = [
        {"$match": {"user_id": user_id, "period": {"$exists": True}}},
        {"$group": {"_id": None, "total_savings": {"$sum": "$savings"}}},
    ]
    result = await db["expenses"].aggregate(pipeline).to_list(length=1)
    lifetime = float(result[0]["total_savings"]) if result else 0.0

    goal_filter = {"user_id": user_id}
    if exclude_goal_id:
        goal_filter["_id"] = {"$ne": exclude_goal_id}
    allocated = 0.0
    async for g in db["goals"].find(goal_filter):
        allocated += float(g.get("current_savings", 0.0))
    return round(max(0.0, lifetime - allocated), 2)


async def _goal_views(db, user_id: str) -> list[GoalResponse]:
    """All goals with progress and on-track status, newest first."""
    docs = [d async for d in db["goals"].find({"user_id": user_id}).sort("created_at", -1)]
    available = await _get_available_goal_savings(db, user_id)
    capacity = await _monthly_capacity(db, user_id)

    # Allocate capacity to goals in deadline order.
    assessments: dict[str, dict] = {}
    capacity_left = capacity
    for doc in sorted(docs, key=lambda d: d.get("target_date", "9999-12-31")):
        assessment = assess_goal(float(doc.get("target_amount", 0)), float(doc.get("current_savings", 0)),
                                 doc.get("target_date", ""), capacity_left)
        assessments[doc["_id"]] = assessment
        if capacity_left is not None:
            capacity_left = max(0.0, capacity_left - assessment["capacity_used"])

    views = []
    for doc in docs:
        target = float(doc.get("target_amount", 0))
        saved = float(doc.get("current_savings", 0))
        a = assessments[doc["_id"]]
        views.append(GoalResponse(
            id=doc["_id"],
            user_id=user_id,
            name=doc["name"],
            target_amount=target,
            target_date=doc.get("target_date", ""),
            current_savings=saved,
            progress_percentage=min(100.0, round(saved / target * 100, 1)) if target > 0 else 0.0,
            available_savings_balance=available,
            is_on_track=a["is_on_track"],
            days_remaining=a["days_remaining"],
            required_monthly_saving=a["required_monthly_saving"],
            monthly_savings_capacity=round(capacity, 2) if capacity is not None else None,
            track_reason=a["track_reason"],
        ))
    return views


async def _goal_view(db, user_id: str, goal_id: str) -> GoalResponse:
    for view in await _goal_views(db, user_id):
        if view.id == goal_id:
            return view
    raise HTTPException(status_code=404, detail="Goal not found")


@router.post("/goals", response_model=GoalResponse)
async def create_goal(goal: GoalCreate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    goal_id = str(uuid.uuid4())
    await db["goals"].insert_one({
        "_id": goal_id,
        "user_id": current_user["id"],
        "name": goal.name.strip(),
        "target_amount": goal.target_amount,
        "target_date": goal.target_date,
        "current_savings": 0.0,
        "created_at": datetime.now(timezone.utc),
    })
    return await _goal_view(db, current_user["id"], goal_id)


@router.get("/goals", response_model=List[GoalResponse])
async def get_goals(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    return await _goal_views(db, current_user["id"])


@router.put("/goals/{goal_id}/contribute", response_model=GoalResponse)
async def contribute_to_goal(goal_id: str, contribution: GoalContribution, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    goal_doc = await db["goals"].find_one({"_id": goal_id, "user_id": current_user["id"]})
    if not goal_doc:
        raise HTTPException(status_code=404, detail="Goal not found")

    available = await _get_available_goal_savings(db, current_user["id"], exclude_goal_id=goal_id)
    already = float(goal_doc.get("current_savings", 0.0))
    if already + contribution.amount > available:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient available savings. You can allocate up to ₹{max(0.0, available - already):,.2f} right now.",
        )
    new_savings = min(already + contribution.amount, float(goal_doc["target_amount"]))
    await db["goals"].update_one({"_id": goal_id}, {"$set": {"current_savings": new_savings}})
    return await _goal_view(db, current_user["id"], goal_id)


@router.delete("/goals/{goal_id}", response_model=GoalDeleteResponse)
async def delete_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    result = await db["goals"].delete_one({"_id": goal_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found or unauthorized")
    return GoalDeleteResponse(message="Goal deleted successfully", deleted_id=goal_id)


# ── 2. AI Chat ──────────────────────────────────────────────────────────────────

async def _safe_snapshot(db, user_id: str) -> dict | None:
    try:
        return await build_snapshot(db, user_id)
    except Exception:
        logger.exception("Could not build advisor snapshot for %s", user_id)
        return None


@router.post("/chat", response_model=ChatResponse)
async def chat_with_advisor(req: ChatMessage, current_user: dict = Depends(limit("chat"))):
    """Non-streaming chat. Falls back to offline answers if the LLM is unavailable."""
    db = await get_database()
    snapshot = await _safe_snapshot(db, current_user["id"])
    try:
        reply = await llm.complete(build_messages(snapshot, req.message, req.history))
        return ChatResponse(reply=reply, source="llm")
    except llm.LLMUnavailable:
        return ChatResponse(reply=fallback_reply(req.message, snapshot, req.history), source="fallback")


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


@router.post("/chat/stream")
async def chat_stream(req: ChatMessage, current_user: dict = Depends(limit("chat"))):
    """
    Server-sent events: {"type":"token","text":...} chunks, then {"type":"done","source":...}.
    If the LLM can't start, the offline fallback is sent as a single token.
    """
    db = await get_database()
    snapshot = await _safe_snapshot(db, current_user["id"])
    messages = build_messages(snapshot, req.message, req.history)

    async def events():
        sent_any = False
        try:
            async for delta in llm.stream(messages):
                sent_any = True
                yield _sse({"type": "token", "text": delta})
            yield _sse({"type": "done", "source": "llm"})
        except llm.LLMUnavailable:
            yield _sse({"type": "token", "text": fallback_reply(req.message, snapshot, req.history)})
            yield _sse({"type": "done", "source": "fallback"})
        except Exception:
            logger.exception("Chat stream failed mid-response")
            if not sent_any:
                yield _sse({"type": "token", "text": fallback_reply(req.message, snapshot, req.history)})
            yield _sse({"type": "done", "source": "fallback" if not sent_any else "llm-partial"})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── 3. Scenario Analysis ────────────────────────────────────────────────────────

@router.post("/scenario", response_model=ScenarioResponse)
async def analyze_scenario(req: ScenarioRequest, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    proposed = clean_expenses(req.proposed_expenses)
    total = sum(proposed.values())
    projected_savings = req.current_income - total
    savings_rate = (projected_savings / req.current_income) * 100 if req.current_income > 0 else 0
    health = calculate_health_score(req.current_income, total, proposed)

    savings_difference = 0.0
    latest = await get_latest_complete_record(db, current_user["id"])
    if latest:
        savings_difference = round(projected_savings - float(latest.get("savings", 0)), 2)

    advice = []
    if savings_rate < 0:
        advice.append("This plan spends more than you earn. Cut variable costs like shopping and food delivery first.")
    elif savings_rate >= 20:
        advice.append("This plan saves 20% or more of your income, which builds wealth steadily.")
    elif savings_rate >= 10:
        advice.append("A good balance. Pushing savings towards 20% would speed up your goals.")
    else:
        advice.append("Savings stay below 10%. Reducing your largest category by 15–20% would build a safer buffer.")
    if savings_difference > 0:
        advice.append(f"You'd save ₹{savings_difference:,.0f} more per month than your latest month.")
    elif savings_difference < 0:
        advice.append(f"You'd save ₹{abs(savings_difference):,.0f} less per month than your latest month.")
    if total > 0:
        top_cat, top_val = max(proposed.items(), key=lambda kv: kv[1])
        if top_val / total > 0.35:
            advice.append(f"{top_cat} would be {top_val / total * 100:.0f}% of spending — the biggest lever if you need to adjust.")

    return ScenarioResponse(
        projected_savings=round(projected_savings, 2),
        savings_difference=savings_difference,
        projected_health_score=health["score"],
        advice=" ".join(advice),
    )


# ── 4. AI Monthly Summary ──────────────────────────────────────────────────────

@router.post("/summary", response_model=ChatResponse)
async def generate_monthly_summary(req: ChatMessage | None = None, current_user: dict = Depends(limit("summary"))):
    """LLM narration of the ML results, with a rule-based fallback. The request body is ignored."""
    db = await get_database()
    snapshot = await _safe_snapshot(db, current_user["id"])
    if not snapshot:
        return ChatResponse(reply="Add your income and spending to unlock your personalised monthly summary.", source="fallback")
    context = snapshot_to_text(snapshot)
    cache_key = ai_cache.make_key("summary", current_user["id"], context)
    cached = await ai_cache.get(db, cache_key)
    if cached:
        return ChatResponse(reply=cached, source="llm")
    try:
        reply = await llm.complete(
            [{"role": "user", "content": SUMMARY_PROMPT.format(context=context)}],
            temperature=0.5, max_tokens=900,
        )
        await ai_cache.put(db, cache_key, reply, hours=24 * 3)
        return ChatResponse(reply=reply, source="llm")
    except llm.LLMUnavailable:
        return ChatResponse(reply=rule_based_summary(snapshot), source="fallback")


# ── 5. Smart Savings Recommendations ────────────────────────────────────────────

BENCHMARKS = {"Food": 0.12, "Travel": 0.08, "Rent": 0.28, "Shopping": 0.05, "Bills": 0.10, "Entertainment": 0.05}

TIPS_LIBRARY = {
    "Food": "Plan the week's meals and cook in batches on Sunday. Put a monthly cap on food-delivery apps — delivery fees and small orders add up fast.",
    "Travel": "Use a metro or bus pass for regular commutes, share cabs where you can, and plan trips ahead to avoid surge pricing.",
    "Rent": "Negotiate at lease renewal (landlords often prefer a reliable tenant to a vacancy), or consider sharing or a slightly cheaper area. Claim HRA if your salary includes it.",
    "Shopping": "Use a 48-hour rule for non-essential buys and turn off sale notifications. Unsubscribing from shopping-app alerts removes many impulse purchases.",
    "Bills": "Review your UPI autopay mandates and subscriptions every month. Compare mobile and broadband plans each year — annual plans are often cheaper.",
    "Entertainment": "Keep one or two OTT subscriptions at a time and rotate them. Look for free local events and weekday discounts.",
}


@router.get("/smart-savings", response_model=SmartSavingsResponse)
async def get_smart_savings(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    latest = await get_latest_complete_record(db, current_user["id"])
    if not latest:
        return SmartSavingsResponse(
            tips=[SmartSavingsTip(category="General", priority="high", potential_saving=0.0,
                                  tip="Add your monthly income and spending to unlock personalised savings ideas.")],
            monthly_saving_potential=0.0, annual_saving_potential=0.0,
            summary="Add your first month of data to unlock personalised savings analysis.",
        )

    income = float(latest.get("income", 0))
    expenses = clean_expenses(latest.get("expenses"))
    savings = float(latest.get("savings", 0))
    savings_rate = (savings / income * 100) if income > 0 else 0

    tips: list[SmartSavingsTip] = []
    total_potential = 0.0
    for category, share in BENCHMARKS.items():
        amount, benchmark = expenses[category], income * share
        if benchmark > 0 and amount > benchmark * 1.2:
            potential = amount - benchmark
            total_potential += potential
            overage = (amount - benchmark) / benchmark * 100
            tips.append(SmartSavingsTip(
                category=category, tip=TIPS_LIBRARY[category], potential_saving=round(potential, 2),
                priority="high" if overage > 50 else "medium" if overage > 25 else "low",
            ))

    if income > 0 and savings_rate < 20:
        gap = max(0.0, income * 0.20 - savings)
        tips.append(SmartSavingsTip(
            category="Savings Rate", potential_saving=round(gap, 2),
            priority="high" if savings_rate < 10 else "medium",
            tip=f"You're saving {savings_rate:.1f}% of income. Set up an auto-transfer or SIP of ₹{gap:,.0f}/month on salary day to reach 20%.",
        ))
        total_potential += gap

    order = {"high": 0, "medium": 1, "low": 2}
    tips.sort(key=lambda t: order.get(t.priority, 3))
    from app.services import feedback as fb
    items = [dict(t.model_dump(), key=f"tip:{t.category}") for t in tips]
    ranked, hidden = fb.rank(items, await fb.ratings(db, current_user["id"], "tip"))
    tips = [SmartSavingsTip(**i) for i in ranked]
    if not tips and not hidden:
        tips.append(SmartSavingsTip(category="Well done", priority="low", potential_saving=0.0,
                                    tip="Every category is within healthy ranges. Consider raising your SIP or building a bigger emergency fund."))

    if savings_rate >= 20:
        summary = f"In {period_label(latest['period'])} you saved {savings_rate:.1f}% of income. Focus on putting those savings to work."
    else:
        summary = f"In {period_label(latest['period'])} you saved {savings_rate:.1f}% of income. These {len(tips)} changes could free up about ₹{total_potential:,.0f}/month."
    return SmartSavingsResponse(
        tips=tips,
        monthly_saving_potential=round(total_potential, 2),
        annual_saving_potential=round(total_potential * 12, 2),
        summary=summary,
        hidden_count=hidden,
    )


# ── 6. Live Budget Status ──────────────────────────────────────────────────────

@router.get("/budget-live", response_model=BudgetLiveResponse)
async def get_live_budget(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    records = await get_monthly_records(db, current_user["id"], limit=2)
    now = datetime.now(timezone.utc).isoformat()
    if not records:
        return BudgetLiveResponse(total_income=0.0, total_expense=0.0, total_savings=0.0, savings_rate=0.0,
                                  health_score=0, health_status="No Data", last_updated=now, trend="stable")

    latest = records[0]
    income = float(latest.get("income", 0))
    total_expense = float(latest.get("total_expense", 0))
    savings = float(latest.get("savings", 0))
    rate = (savings / income * 100) if income > 0 else 0
    health = calculate_health_score(income, total_expense, latest.get("expenses", {}))

    trend = "stable"
    if len(records) == 2:
        prev = records[1]
        prev_income = float(prev.get("income", 0))
        prev_rate = (float(prev.get("savings", 0)) / prev_income * 100) if prev_income > 0 else 0
        trend = "up" if rate - prev_rate > 2 else "down" if rate - prev_rate < -2 else "stable"

    return BudgetLiveResponse(
        total_income=round(income, 2), total_expense=round(total_expense, 2), total_savings=round(savings, 2),
        savings_rate=round(rate, 1), health_score=health["score"], health_status=health["status"],
        last_updated=now, trend=trend, period=latest["period"],
    )


# ── 7. Notifications ───────────────────────────────────────────────────────────

@router.get("/notifications", response_model=NotificationsResponse)
async def get_notifications(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    latest_complete = await get_latest_complete_record(db, current_user["id"])
    records = []
    if latest_complete:
        records = [latest_complete] + [
            r for r in await get_monthly_records(db, current_user["id"], limit=8) if r["period"] < latest_complete["period"]
        ][:1]
    now = datetime.now(timezone.utc).isoformat()
    notifications: list[NotificationItem] = []

    def add(type_: str, severity: str, title: str, message: str):
        notifications.append(NotificationItem(id=f"notif-{len(notifications) + 1}", type=type_, severity=severity,
                                              title=title, message=message, timestamp=now))

    if not records:
        add("tip", "info", "Get started", "Add your first month of income and spending to unlock forecasts and alerts.")
        return NotificationsResponse(notifications=notifications, unread_count=len(notifications))

    latest = records[0]
    income = float(latest.get("income", 0))
    expenses = clean_expenses(latest.get("expenses"))
    total = sum(expenses.values())
    savings = float(latest.get("savings", 0))
    rate = (savings / income * 100) if income > 0 else 0

    if savings < 0:
        add("alert", "critical", "Overspending", f"You spent ₹{abs(savings):,.0f} more than your income this month.")
    elif rate < 10:
        add("alert", "warning", "Low savings rate", f"Your savings rate is {rate:.1f}%. Aim for 20% with an auto-transfer on payday.")

    if len(records) == 2:
        prev = clean_expenses(records[1].get("expenses"))
        for cat in EXPENSE_COLS:
            prev_val, curr_val = prev[cat], expenses[cat]
            if prev_val > 0:
                change = (curr_val - prev_val) / prev_val * 100
                if change >= 40 and curr_val > 300:
                    add("alert", "warning", f"{cat} spending spike",
                        f"{cat} rose {change:.0f}% vs last month (₹{prev_val:,.0f} → ₹{curr_val:,.0f}).")
                elif change <= -30 and prev_val > 300:
                    add("achievement", "success", f"{cat} spending down",
                        f"You cut {cat} spending by {abs(change):.0f}% compared with last month.")

    if rate >= 25:
        add("achievement", "success", "Strong saver", f"You saved {rate:.1f}% of your income this month.")

    if total > 0:
        top_cat, top_val = max(expenses.items(), key=lambda kv: kv[1])
        if top_val / total > 0.4:
            add("insight", "info", f"High {top_cat} share", f"{top_cat} is {top_val / total * 100:.0f}% of your spending.")

    async for goal in db["goals"].find({"user_id": current_user["id"]}):
        try:
            days_left = (date.fromisoformat(goal.get("target_date", "")) - date.today()).days
            progress = float(goal.get("current_savings", 0)) / float(goal.get("target_amount", 1)) * 100
        except (ValueError, TypeError, ZeroDivisionError):
            continue
        if progress >= 100:
            add("achievement", "success", "Goal achieved", f"You completed your '{goal['name']}' goal.")
        elif 0 < days_left <= 30 and progress < 90:
            add("alert", "warning", "Goal deadline close",
                f"'{goal['name']}' is due in {days_left} days and is {progress:.0f}% complete.")

    try:
        from app.services.ai_insights import nudges
        for n in await nudges(db, current_user["id"]):
            add(n["kind"], n["severity"], n["title"], n["message"])
    except Exception:
        logger.exception("Nudges failed")

    if not notifications:
        add("tip", "info", "Tip", "A small monthly SIP started early grows a lot over time thanks to compounding.")

    return NotificationsResponse(notifications=notifications[:10], unread_count=min(10, len(notifications)))
