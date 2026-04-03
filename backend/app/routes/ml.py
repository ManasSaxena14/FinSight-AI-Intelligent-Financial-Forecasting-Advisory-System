from fastapi import APIRouter, HTTPException, Depends  # type: ignore
from app.models.schemas import (  # type: ignore
    PredictionRequest,
    PredictionResponse,
    ForecastRequest,
    ForecastResponse,
    HealthScoreResponse,
    RecommendationsResponse,
    ClassificationResponse
)
from app.ml.advanced_ml import (  # type: ignore
    multi_month_forecasting,
    category_wise_prediction,
    anomaly_detection,
    _load_main_model
)
from app.services.financial_logic import (  # type: ignore
    calculate_health_score,
    generate_alerts,
    generate_recommendations
)
from app.services.auth import get_current_user  # type: ignore
import pandas as pd  # type: ignore

router = APIRouter(prefix="/api/ml", tags=["Machine Learning"])

# ── 1. Predict Total Expense ────────────────────────────────────────────────
@router.post("/predict", response_model=PredictionResponse)
def predict_expense(req: PredictionRequest, current_user: dict = Depends(get_current_user)):
    """
    Predict total expense for a given month using the trained Linear Regression model.
    """
    try:
        model, features = _load_main_model()
        
        # Build feature dict
        expense_dict = req.expenses.dict()
        row = {"Income": req.income, **expense_dict}
        
        X = pd.DataFrame([row])[features]
        predicted = float(model.predict(X)[0])
        savings = req.income - predicted
        
        return PredictionResponse(
            predicted_total_expense=float(f"{predicted:.2f}"),
            projected_savings=float(f"{savings:.2f}")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── 1.b Predict Classification (Logistic Regression) ────────────────────────
import os
import joblib

CLASSIFIER_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ml", "logistic_model.pkl")

def _load_classifier_model():
    if not os.path.exists(CLASSIFIER_PATH):
        raise RuntimeError("Classification model not trained yet.")
    data = joblib.load(CLASSIFIER_PATH)
    return data["model"], data.get("features", [])

@router.post("/predict-classification", response_model=ClassificationResponse)
def predict_behavioral_classification(req: PredictionRequest, current_user: dict = Depends(get_current_user)):
    """
    Predict behavioral financial category using Logistic Regression.
    """
    try:
        model, features = _load_classifier_model()
        
        # Build feature dict
        expense_dict = req.expenses.dict()
        row = {"Income": req.income, **expense_dict}
        
        X = pd.DataFrame([row])[features]
        predicted_class = int(model.predict(X)[0])
        probabilities = model.predict_proba(X)[0]
        confidence = float(max(probabilities))
        
        # Map to insights based on training phase definitions
        insight_map = {
            0: "Overspending / Poor Financial Health",
            1: "Financial Health: Moderate",
            2: "Financial Health: Good"
        }
        
        return ClassificationResponse(
            predicted_class=predicted_class,
            confidence_score=confidence,
            behavioral_insight=insight_map.get(predicted_class, "Unknown State")
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ── 2. Multi-Month Forecast ─────────────────────────────────────────────────
@router.post("/forecast", response_model=ForecastResponse)
def forecast_expenses(req: ForecastRequest, current_user: dict = Depends(get_current_user)):
    """
    Forecast expenses for the next 3-12 months using realistic drift. 
    """
    try:
        result = multi_month_forecasting(
            income=req.income,
            current_expenses=req.expenses.dict(),
            months=req.months
        )
        next_pred = result["forecast"][0]["predicted_expense"]
        current_total = sum(req.expenses.dict().values())
        trend = "increase" if next_pred > current_total else "decrease"

        return ForecastResponse(
            predicted_next_month_expense=next_pred,
            trend_direction=trend
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── 3. Health Score ─────────────────────────────────────────────────────────
@router.post("/health-score", response_model=HealthScoreResponse)
def get_health_score(req: PredictionRequest, current_user: dict = Depends(get_current_user)):
    """
    Calculate a simple Financial Health Score (0-100) based on savings rate.
    Uses centralized business logic.
    """
    total_expense = sum(req.expenses.dict().values())
    result = calculate_health_score(req.income, total_expense, req.expenses.dict())
    
    return HealthScoreResponse(
        score=result["score"],
        status=result["status"],
        savings_rate_pct=result["savings_rate_pct"],
        feedback="Diagnostics completed successfully."
    )

# ── 4. Recommendations & Alerts ─────────────────────────────────────────────
@router.post("/recommendations", response_model=RecommendationsResponse)
def get_recommendations_and_alerts(req: PredictionRequest, current_user: dict = Depends(get_current_user)):
    """
    Provide smart financial recommendations and generate alerts based on 
    business rules (overspending, category spikes) and ML anomaly detection.
    """
    expense_dict = req.expenses.dict()
    prev_expense_dict = req.previous_expenses.dict() if req.previous_expenses else None
    
    # 1. Generate Smart Alerts
    alerts = generate_alerts(req.income, expense_dict, prev_expense_dict)
    
    # 2. Generate Rule-Based + ML Recommendations
    recs = generate_recommendations(req.income, expense_dict)
    
    # Extract anomalies payload separately just for the frontend to render explicitly if needed
    anomaly_data = anomaly_detection(expense_dict, threshold=1.5)
    anomalies = anomaly_data.get("anomalies", [])

    return RecommendationsResponse(
        recommendations=recs,
        alerts=alerts if alerts else None,
        anomalies=anomalies if anomalies else None
    )
