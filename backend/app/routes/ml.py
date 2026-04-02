from fastapi import APIRouter, HTTPException, Depends  # type: ignore
from app.models.schemas import (  # type: ignore
    PredictionRequest,
    PredictionResponse,
    ForecastRequest,
    ForecastResponse,
    HealthScoreResponse,
    RecommendationsResponse
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
        return ForecastResponse(**result)
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
    result = calculate_health_score(req.income, total_expense)
    
    return HealthScoreResponse(
        score=result["score"],
        status=result["status"],
        savings_rate_pct=result["savings_rate_pct"]
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

    return RecommendationResponse(
        recommendations=recs,
        alerts=alerts if alerts else None,
        anomalies=anomalies if anomalies else None
    )
