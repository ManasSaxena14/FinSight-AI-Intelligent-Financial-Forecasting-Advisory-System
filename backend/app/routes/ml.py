"""
FinSight AI -- ML Routes (Enhanced)
=====================================
CHANGES vs original:
1. /predict          — unchanged (backward compat)
2. /predict-classification — unchanged
3. /forecast         — now returns full multi-month forecast list +
                        average_predicted_expense, average_savings.
4. /health-score     — unchanged
5. /recommendations  — now also returns overall_anomaly_score from IsolationForest.
6. /savings-risk     — NEW endpoint using upgraded GBM classifier.
7. /spending-pattern — NEW endpoint returning user archetype + peer comparison.
"""

from fastapi import APIRouter, HTTPException, Depends
import os
import joblib
import pandas as pd

from app.models.schemas import (
    PredictionRequest,
    PredictionResponse,
    ForecastRequest,
    ForecastResponse,
    ForecastMonth,
    HealthScoreResponse,
    RecommendationsResponse,
    ClassificationResponse,
    SavingsRiskRequest,
    SavingsRiskResponse,
    SpendingPatternResponse,
)
from app.ml.advanced_ml import (
    multi_month_forecasting,
    category_wise_prediction,
    anomaly_detection,
    predict_savings_risk,
    get_spending_pattern_insight,
    _load_main_model,
)
from app.services.financial_logic import (
    calculate_health_score,
    generate_alerts,
    generate_recommendations,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/ml", tags=["Machine Learning"])

# ── Classifier loader (kept local for backward compat) ──────────────────────
CLASSIFIER_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "ml", "logistic_model.pkl"
)

def _load_classifier_model():
    if not os.path.exists(CLASSIFIER_PATH):
        raise RuntimeError("Classification model not trained yet.")
    data = joblib.load(CLASSIFIER_PATH)
    return data["model"], data.get("features", []), data.get("scaler", None)


# ── 1. Predict Total Expense ─────────────────────────────────────────────────
@router.post("/predict", response_model=PredictionResponse)
def predict_expense(
    req: PredictionRequest,
    current_user: dict = Depends(get_current_user),
):
    """Predict total expense for a given month using the trained regression model."""
    try:
        model, features = _load_main_model()
        row = {"Income": req.income, **req.expenses.dict()}
        X   = pd.DataFrame([row])[features]
        predicted = float(model.predict(X)[0])
        return PredictionResponse(
            predicted_total_expense=round(predicted, 2),
            projected_savings=round(req.income - predicted, 2),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 2. Classification (Financial Health) ─────────────────────────────────────
@router.post("/predict-classification", response_model=ClassificationResponse)
def predict_behavioral_classification(
    req: PredictionRequest,
    current_user: dict = Depends(get_current_user),
):
    """Predict behavioral financial category using the trained classifier."""
    try:
        model, features, scaler = _load_classifier_model()
        row = {"Income": req.income, **req.expenses.dict()}
        X   = pd.DataFrame([row])[features]
        X_input = scaler.transform(X) if scaler is not None else X.values

        pred_class   = int(model.predict(X_input)[0])
        probabilities = model.predict_proba(X_input)[0]
        confidence   = float(max(probabilities))

        insight_map = {
            0: "Overspending / Poor Financial Health",
            1: "Financial Health: Moderate",
            2: "Financial Health: Good",
        }
        return ClassificationResponse(
            predicted_class=pred_class,
            confidence_score=round(confidence, 3),
            behavioral_insight=insight_map.get(pred_class, "Unknown State"),
        )
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── 3. Multi-Month Forecast (ENHANCED) ──────────────────────────────────────
@router.post("/forecast", response_model=ForecastResponse)
def forecast_expenses(
    req: ForecastRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Forecast expenses for the next 1–12 months using data-driven seasonal patterns.
    Response now includes full per-month breakdown with category projections.
    """
    try:
        result = multi_month_forecasting(
            income=req.income,
            current_expenses=req.expenses.dict(),
            months=req.months,
        )

        # Build typed ForecastMonth list
        forecast_list = [
            ForecastMonth(
                month=f["month"],
                month_name=f.get("month_name"),
                predicted_expense=f["predicted_expense"],
                savings=f["savings"],
                categories=f.get("categories"),
            )
            for f in result["forecast"]
        ]

        next_pred    = result["forecast"][0]["predicted_expense"]
        current_total = sum(req.expenses.dict().values())
        trend = "increase" if next_pred > current_total else (
                "decrease" if next_pred < current_total else "stable")

        return ForecastResponse(
            predicted_next_month_expense=next_pred,
            trend_direction=result.get("trend_direction", trend),
            forecast=forecast_list,
            average_predicted_expense=result.get("average_predicted_expense"),
            average_savings=result.get("average_savings"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 4. Health Score ───────────────────────────────────────────────────────────
@router.post("/health-score", response_model=HealthScoreResponse)
def get_health_score(
    req: PredictionRequest,
    current_user: dict = Depends(get_current_user),
):
    """Calculate Financial Health Score (0-100) based on savings rate + category mix."""
    total_expense = sum(req.expenses.dict().values())
    result = calculate_health_score(req.income, total_expense, req.expenses.dict())
    return HealthScoreResponse(
        score=result["score"],
        status=result["status"],
        savings_rate_pct=result["savings_rate_pct"],
        feedback="Diagnostics completed successfully.",
    )


# ── 5. Recommendations & Alerts (ENHANCED) ───────────────────────────────────
@router.post("/recommendations", response_model=RecommendationsResponse)
def get_recommendations_and_alerts(
    req: PredictionRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Provide smart financial recommendations + alerts.
    Now also returns overall_anomaly_score from dual-layer anomaly detection.
    """
    expense_dict      = req.expenses.dict()
    prev_expense_dict = req.previous_expenses.dict() if req.previous_expenses else None

    alerts      = generate_alerts(req.income, expense_dict, prev_expense_dict)
    recs        = generate_recommendations(req.income, expense_dict)
    anomaly_data = anomaly_detection(expense_dict, threshold=1.5)

    anomalies = anomaly_data.get("anomalies", [])
    overall_score = anomaly_data.get("overall_anomaly_score", 0)

    return RecommendationsResponse(
        recommendations=recs,
        alerts=alerts or None,
        anomalies=anomalies or None,
        overall_anomaly_score=overall_score,
    )


# ── 6. Savings Risk (NEW) ─────────────────────────────────────────────────────
@router.post("/savings-risk", response_model=SavingsRiskResponse)
def get_savings_risk(
    req: SavingsRiskRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Predict the probability of financial stress using the upgraded GBM classifier.
    Returns risk_level (low/medium/high), class probabilities, and a 0-100 risk score.
    """
    try:
        result = predict_savings_risk(req.income, req.expenses.dict())
        return SavingsRiskResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 7. Spending Pattern (NEW) ─────────────────────────────────────────────────
@router.post("/spending-pattern", response_model=SpendingPatternResponse)
def get_spending_pattern(
    req: SavingsRiskRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Identify the user's spending archetype and how they compare to income-bracket peers.
    Returns archetype label, dominant category, and essential/discretionary ratios.
    """
    try:
        result = get_spending_pattern_insight(req.income, req.expenses.dict())
        return SpendingPatternResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))