"""
FinSight AI -- Advisor agent tools
==================================
Each tool returns a ToolResult:
  data    -> compact JSON the model reads (every number it quotes comes from here)
  card    -> optional structured payload the UI renders inline (chart, plan, action)
  sources -> optional knowledge-base citations
Write actions are only ever *proposed* (propose_*): the UI shows a card and the
user confirms. The agent can never change data on its own.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import date

from app.ai.categorize import build_history_map, categorize
from app.ml.common import EXPENSE_COLS, clean_expenses, period_label
from app.rag.knowledge_base import get_knowledge_base
from app.rag.search import BM25
from app.services import ai_insights, conversations
from app.services.guardrails import neutralise
from app.services.ledger import get_history

logger = logging.getLogger(__name__)


@dataclass
class ToolResult:
    data: dict
    card: dict | None = None
    sources: list[dict] = field(default_factory=list)


@dataclass
class ToolContext:
    db: object
    user_id: str
    conversation_id: str | None
    source_counter: list[int] = field(default_factory=lambda: [0])


def _fn(name: str, description: str, properties: dict | None = None, required: list[str] | None = None) -> dict:
    return {"type": "function", "function": {
        "name": name, "description": description,
        "parameters": {"type": "object", "properties": properties or {}, "required": required or []}}}


CATEGORY_ENUM = {"type": "string", "enum": EXPENSE_COLS}

TOOLS = [
    _fn("get_financial_snapshot",
        "Latest complete month, health score, next-month forecast with range, overspend risk, anomalies, "
        "spending style and month-to-date progress. Call this first for any question about the user's money."),
    _fn("get_monthly_history", "Income, spending by category and savings for recent months.",
        {"months": {"type": "integer", "minimum": 1, "maximum": 24}}),
    _fn("get_forecast", "Per-month spending forecast with 80% ranges and category breakdown.",
        {"months": {"type": "integer", "minimum": 1, "maximum": 12}}),
    _fn("search_transactions", "Find the user's individual transactions by merchant/note text, category or month.",
        {"query": {"type": "string"}, "category": CATEGORY_ENUM,
         "period": {"type": "string", "description": "YYYY-MM"}, "limit": {"type": "integer", "maximum": 25}}),
    _fn("search_knowledge",
        "Search FinSight's curated Indian personal-finance knowledge base (tax regimes, 80C/80D, PPF/EPF/NPS, SIPs, "
        "FDs, emergency funds, debt, CIBIL, insurance, UPI autopay, what FinSight's numbers mean). Use for any "
        "factual or rules question. Write the query in English.",
        {"query": {"type": "string"}}, ["query"]),
    _fn("search_past_conversations", "Search what the user and advisor discussed in earlier conversations.",
        {"query": {"type": "string"}}, ["query"]),
    _fn("run_what_if",
        "Simulate a change to the user's monthly budget (based on their latest complete month) and return savings "
        "and health score before/after.",
        {"income_change": {"type": "number", "description": "Rupees per month, may be negative"},
         "changes": {"type": "array", "items": {"type": "object", "properties": {
             "category": CATEGORY_ENUM, "mode": {"type": "string", "enum": ["set", "delta", "percent"]},
             "value": {"type": "number"}}, "required": ["category", "mode", "value"]}}}),
    _fn("list_goals", "The user's savings goals with progress and whether each is on track."),
    _fn("plan_goal",
        "Monte Carlo plan for one goal: probability of reaching it on time, and the monthly amount needed for an "
        "80% chance. Identify the goal by (part of) its name.",
        {"goal_name": {"type": "string"}, "monthly_contribution": {"type": "number"}}, ["goal_name"]),
    _fn("explain_last_change", "Explain what changed between the last two complete months and why the health score moved."),
    _fn("get_recurring_charges", "Detected recurring payments and subscriptions with monthly cost."),
    _fn("suggest_budget", "Suggested per-category budgets for next month to reach a savings-rate target.",
        {"target_savings_rate": {"type": "number", "minimum": 0.05, "maximum": 0.6}}),
    _fn("propose_transactions",
        "Propose transactions to add (the user must confirm in the app; nothing is saved by you). Use when the user "
        "tells you about spending or income they want logged.",
        {"transactions": {"type": "array", "items": {"type": "object", "properties": {
            "date": {"type": "string", "description": "YYYY-MM-DD"},
            "type": {"type": "string", "enum": ["expense", "income"]},
            "category": {"type": "string", "enum": [*EXPENSE_COLS, "Income"]},
            "amount": {"type": "number"}, "merchant": {"type": "string"}, "note": {"type": "string"}},
            "required": ["type", "amount"]}}}, ["transactions"]),
    _fn("propose_goal", "Propose a new savings goal (the user must confirm in the app).",
        {"name": {"type": "string"}, "target_amount": {"type": "number"},
         "target_date": {"type": "string", "description": "YYYY-MM-DD, in the future"}},
        ["name", "target_amount", "target_date"]),
]

LABELS = {
    "get_financial_snapshot": "Reading your numbers",
    "get_monthly_history": "Looking at your history",
    "get_forecast": "Checking the forecast",
    "search_transactions": "Searching your transactions",
    "search_knowledge": "Searching the knowledge base",
    "search_past_conversations": "Recalling past chats",
    "run_what_if": "Running a what-if",
    "list_goals": "Checking your goals",
    "plan_goal": "Simulating your goal",
    "explain_last_change": "Comparing your months",
    "get_recurring_charges": "Finding recurring charges",
    "suggest_budget": "Drafting a budget",
    "propose_transactions": "Preparing entries",
    "propose_goal": "Preparing a goal",
}


# ── Implementations ────────────────────────────────────────────────────────

async def _snapshot(ctx: ToolContext, args: dict) -> ToolResult:
    ins = await ai_insights.insights_for(ctx.db, ctx.user_id)
    nxt = ins["forecast"]["forecast"][0]
    data = {
        "latest_month": ins["latest_label"], "months_of_history": ins["history_months"],
        "income": ins["income"], "spending": ins["total_expense"], "savings": ins["savings"],
        "spending_by_category": ins["expenses"],
        "health_score": ins["health"], "spending_style": ins["pattern"]["archetype"],
        "next_month_forecast": {"month": nxt["label"], "spending": nxt["predicted_expense"],
                                "range_80pct": [nxt["lower"], nxt["upper"]], "income": nxt["predicted_income"]},
        "overspend_probability": ins["risk"]["overspend_probability"],
        "low_savings_probability": ins["risk"]["low_savings_probability"],
        "unusual_spending": [a.get("message", a["category"]) for a in ins["anomalies"]["anomalies"]],
        "month_to_date": ins["month_to_date"],
    }
    card = {"type": "snapshot", "data": {"label": ins["latest_label"], "income": ins["income"],
                                          "spending": ins["total_expense"], "savings": ins["savings"],
                                          "score": ins["health"]["score"], "status": ins["health"]["status"],
                                          "risk": ins["risk"]["overspend_probability"]}}
    return ToolResult(data, card)


async def _history(ctx: ToolContext, args: dict) -> ToolResult:
    months = int(args.get("months") or 6)
    history = await get_history(ctx.db, ctx.user_id, limit=min(24, months))
    rows = [{"month": period_label(h["period"]), "income": h["income"], "spending": round(sum(clean_expenses(h["expenses"]).values()), 2),
             "by_category": clean_expenses(h["expenses"])} for h in history]
    card = {"type": "history", "data": [{"label": r["month"], "income": r["income"], "spending": r["spending"]} for r in rows]}
    return ToolResult({"months": rows}, card if len(rows) > 1 else None)


async def _forecast(ctx: ToolContext, args: dict) -> ToolResult:
    ins = await ai_insights.insights_for(ctx.db, ctx.user_id, months=int(args.get("months") or 3))
    fc = ins["forecast"]
    rows = [{"month": f["label"], "spending": f["predicted_expense"], "range_80pct": [f["lower"], f["upper"]],
             "savings": f["savings"], "by_category": f["categories"]} for f in fc["forecast"]]
    card = {"type": "forecast", "data": [{"label": f["label"], "mid": f["predicted_expense"], "lower": f["lower"],
                                          "upper": f["upper"]} for f in fc["forecast"]]}
    return ToolResult({"forecast": rows, "method": fc["method"], "backtest": fc["backtest"],
                       "trend": fc["trend_direction"]}, card)


async def _search_transactions(ctx: ToolContext, args: dict) -> ToolResult:
    txs = await ai_insights.recent_transactions(ctx.db, ctx.user_id, days=730)
    if args.get("category"):
        txs = [t for t in txs if t["category"] == args["category"]]
    if args.get("period"):
        txs = [t for t in txs if t["period"] == args["period"]]
    limit = min(int(args.get("limit") or 10), 25)
    query = (args.get("query") or "").strip()
    if query and txs:
        index = BM25([f"{t.get('merchant') or ''} {t.get('note') or ''} {t['category']}" for t in txs])
        txs = [txs[i] for i, _ in index.top(query, k=limit)]
    txs = txs[:limit]
    rows = [{"date": t["date"], "type": t["type"], "category": t["category"], "amount": t["amount"],
             "merchant": neutralise(t.get("merchant"), 60), "note": neutralise(t.get("note"), 120)} for t in txs]
    return ToolResult({"count": len(rows), "total": round(sum(t["amount"] for t in txs if t["type"] == "expense"), 2),
                       "transactions": rows})


async def _search_knowledge(ctx: ToolContext, args: dict) -> ToolResult:
    chunks = get_knowledge_base().search(args.get("query", ""), k=4)
    sources, passages = [], []
    for chunk in chunks:
        ctx.source_counter[0] += 1
        ref = ctx.source_counter[0]
        sources.append({"ref": ref, **chunk.citation()})
        passages.append({"ref": ref, "title": chunk.title, "section": chunk.section, "as_of": chunk.as_of,
                         "text": chunk.text})
    return ToolResult({"passages": passages, "instruction": "Cite passages inline as [ref]. If none answer the "
                                                            "question, say the knowledge base doesn't cover it."},
                      None, sources)


async def _search_past(ctx: ToolContext, args: dict) -> ToolResult:
    hits = await conversations.search_past(ctx.db, ctx.user_id, args.get("query", ""), exclude_id=ctx.conversation_id)
    for h in hits:
        h["text"] = neutralise(h["text"])
        h["conversation"] = neutralise(h["conversation"], 80)
    return ToolResult({"matches": hits})


async def _what_if(ctx: ToolContext, args: dict) -> ToolResult:
    from app.ai.extract import apply_scenario

    complete = await ai_insights.complete_history(ctx.db, ctx.user_id)
    if not complete:
        raise ai_insights.NoData("No complete month yet.")
    latest = complete[-1]
    income, expenses = float(latest["income"]), clean_expenses(latest["expenses"])
    plan = {"income_change": args.get("income_change") or 0, "changes": args.get("changes") or []}
    new_income, new_expenses = apply_scenario(income, expenses, plan)
    result = ai_insights.evaluate_scenario(income, expenses, new_income, new_expenses)
    result["based_on"] = period_label(latest["period"])
    return ToolResult(result, {"type": "scenario", "data": {**result, "changes": plan["changes"],
                                                             "income_change": plan["income_change"]}})


async def _goals(ctx: ToolContext, args: dict) -> ToolResult:
    from app.routes.premium import _goal_views

    goals = await _goal_views(ctx.db, ctx.user_id)
    return ToolResult({"goals": [{"name": neutralise(g.name, 80), "target": g.target_amount, "saved": g.current_savings,
                                  "target_date": g.target_date, "progress_pct": g.progress_percentage,
                                  "on_track": g.is_on_track, "required_monthly": g.required_monthly_saving,
                                  "why": g.track_reason} for g in goals]})


async def _plan_goal(ctx: ToolContext, args: dict) -> ToolResult:
    name = (args.get("goal_name") or "").lower()
    match = None
    async for g in ctx.db["goals"].find({"user_id": ctx.user_id}):
        if name and (name in g["name"].lower() or g["name"].lower() in name):
            match = g
            break
    if not match:
        return ToolResult({"error": f"No goal matching '{args.get('goal_name')}'. Ask the user which goal, or use list_goals."})
    plan = await ai_insights.goal_plan(ctx.db, ctx.user_id, match["_id"], args.get("monthly_contribution"))
    compact = {k: v for k, v in plan.items() if k != "fan"}
    return ToolResult(compact, {"type": "goal_plan", "data": plan})


async def _explain(ctx: ToolContext, args: dict) -> ToolResult:
    result = await ai_insights.change_explanation(ctx.db, ctx.user_id)
    return ToolResult(result, {"type": "explain", "data": result})


async def _recurring(ctx: ToolContext, args: dict) -> ToolResult:
    result = await ai_insights.recurring(ctx.db, ctx.user_id)
    return ToolResult(result, {"type": "recurring", "data": result} if result["items"] else None)


async def _budget(ctx: ToolContext, args: dict) -> ToolResult:
    target = float(args.get("target_savings_rate") or 0.2)
    result = await ai_insights.budget_suggestion(ctx.db, ctx.user_id, max(0.05, min(0.6, target)))
    return ToolResult(result, {"type": "budget", "data": result})


async def _propose_transactions(ctx: ToolContext, args: dict) -> ToolResult:
    history = build_history_map(await ai_insights.recent_transactions(ctx.db, ctx.user_id))
    today = date.today()
    clean = []
    for raw in (args.get("transactions") or [])[:20]:
        try:
            amount = round(float(raw.get("amount")), 2)
        except (TypeError, ValueError):
            continue
        if not 0 < amount < 1e9:
            continue
        tx_type = "income" if raw.get("type") == "income" else "expense"
        try:
            d = date.fromisoformat(raw.get("date") or today.isoformat())
        except ValueError:
            d = today
        d = min(d, today)
        merchant = (raw.get("merchant") or "").strip()[:40] or None
        category = raw.get("category")
        if tx_type == "income":
            category = "Income"
        elif category not in EXPENSE_COLS:
            category = categorize(merchant, raw.get("note"), history)["category"] or "Shopping"
        clean.append({"date": d.isoformat(), "type": tx_type, "category": category, "amount": amount,
                      "merchant": merchant, "note": (raw.get("note") or "")[:200] or None})
    if not clean:
        return ToolResult({"error": "No valid transactions to propose."})
    return ToolResult({"proposed": clean, "status": "awaiting user confirmation in the app — not saved yet"},
                      {"type": "action", "action": "add_transactions", "data": {"transactions": clean}})


async def _propose_goal(ctx: ToolContext, args: dict) -> ToolResult:
    try:
        target = float(args.get("target_amount"))
        when = date.fromisoformat(args.get("target_date"))
    except (TypeError, ValueError):
        return ToolResult({"error": "Need a numeric target_amount and a YYYY-MM-DD target_date."})
    if target <= 0 or when <= date.today():
        return ToolResult({"error": "Target must be positive and the date in the future."})
    goal = {"name": (args.get("name") or "New goal")[:100], "target_amount": round(target, 2), "target_date": when.isoformat()}
    return ToolResult({"proposed_goal": goal, "status": "awaiting user confirmation in the app — not saved yet"},
                      {"type": "action", "action": "create_goal", "data": goal})


HANDLERS = {
    "get_financial_snapshot": _snapshot,
    "get_monthly_history": _history,
    "get_forecast": _forecast,
    "search_transactions": _search_transactions,
    "search_knowledge": _search_knowledge,
    "search_past_conversations": _search_past,
    "run_what_if": _what_if,
    "list_goals": _goals,
    "plan_goal": _plan_goal,
    "explain_last_change": _explain,
    "get_recurring_charges": _recurring,
    "suggest_budget": _budget,
    "propose_transactions": _propose_transactions,
    "propose_goal": _propose_goal,
}


async def execute(ctx: ToolContext, name: str, raw_arguments: str) -> ToolResult:
    handler = HANDLERS.get(name)
    if handler is None:
        return ToolResult({"error": f"Unknown tool {name}"})
    try:
        args = json.loads(raw_arguments or "{}") if isinstance(raw_arguments, str) else (raw_arguments or {})
        if not isinstance(args, dict):
            args = {}
    except json.JSONDecodeError:
        args = {}
    try:
        return await handler(ctx, args)
    except ai_insights.NoData as exc:
        return ToolResult({"error": str(exc)})
    except Exception:
        logger.exception("Tool %s failed", name)
        return ToolResult({"error": f"{name} failed; answer without it and say so briefly."})
