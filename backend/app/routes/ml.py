"""
FinSight AI -- ML routes
========================
All ML runs on the authenticated user's own stored history (never on numbers
sent by the client), except the stateless health-score helper.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from app.db import get_database
from app.ml.insights import build_insights
from app.models.schemas import HealthScoreResponse, PredictionRequest
from app.services.auth import get_current_user
from app.services.financial_logic import calculate_health_score
from app.services.ledger import get_history

router = APIRouter(prefix="/api/ml", tags=["Machine Learning"])
logger = logging.getLogger(__name__)


@router.get("/insights")
async def get_insights(
    months: int = Query(3, ge=1, le=12, description="Forecast horizon in months"),
    current_user: dict = Depends(get_current_user),
):
    """
    Forecast (with 80% ranges and backtest), overspend risk, anomalies vs. your own
    baseline, alerts, tips, spending pattern and peer benchmarks -- in one call.
    """
    db = await get_database()
    history = await get_history(db, current_user["id"], limit=24)
    if not history:
        raise HTTPException(status_code=404, detail="Add at least one month of data to see insights.")
    try:
        insights = build_insights(history, months=months)
    except Exception:
        logger.exception("Insights failed for user %s", current_user["id"])
        raise HTTPException(status_code=500, detail="Could not compute insights right now.")
    from app.services import feedback as fb

    items = [{"text": r, "key": fb.recommendation_key(r)} for r in insights["recommendations"]]
    ranked, hidden = fb.rank(items, await fb.ratings(db, current_user["id"], "recommendation"))
    insights["recommendation_items"] = ranked
    insights["recommendations_hidden"] = hidden
    return insights


@router.get("/model-info")
async def model_info(current_user: dict = Depends(get_current_user)):
    """Model card: component versions, data/corpus fingerprints, LLMs, live feedback and usage."""
    from app.ml import registry
    from app.services import feedback, llm

    db = await get_database()
    info = dict(registry.card())
    info["answer_feedback"] = await feedback.answer_stats(db)
    info["llm_usage_this_process"] = dict(llm.USAGE)
    return info


@router.post("/health-score", response_model=HealthScoreResponse)
def get_health_score(req: PredictionRequest, current_user: dict = Depends(get_current_user)):
    """Transparent rule-based 0-100 score from savings rate and category concentration."""
    expenses = req.expenses.model_dump()
    result = calculate_health_score(req.income, sum(expenses.values()), expenses)
    return HealthScoreResponse(
        score=result["score"],
        status=result["status"],
        savings_rate_pct=result["savings_rate_pct"],
        feedback="Rule-based score: savings rate plus a penalty for very concentrated spending.",
    )
