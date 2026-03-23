from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    PredictionRequest,
    PredictionResponse,
    ForecastRequest,
    ForecastResponse,
    HealthScoreResponse,
    RecommendationResponse
)
from app.ml.advanced_ml import (
    multi_month_forecasting,
    category_wise_prediction,
    anomaly_detection,
    _load_main_model
)
import pandas as pd

router = APIRouter(prefix="/api/ml", tags=["Machine Learning"])

# ── 1. Predict Total Expense ────────────────────────────────────────────────
@router.post("/predict", response_model=PredictionResponse)
def predict_expense(req: PredictionRequest):
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
            predicted_total_expense=round(predicted, 2),
            projected_savings=round(savings, 2)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── 2. Multi-Month Forecast ─────────────────────────────────────────────────
@router.post("/forecast", response_model=ForecastResponse)
def forecast_expenses(req: ForecastRequest):
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
def get_health_score(req: PredictionRequest):
    """
    Calculate a simple Financial Health Score (0-100) based on savings rate.
    """
    total_expense = sum(req.expenses.dict().values())
    savings = req.income - total_expense
    savings_rate = (savings / req.income) * 100 if req.income > 0 else 0

    # Score calculation logic
    if savings_rate >= 20:
        score = min(100, int(50 + (savings_rate * 1.5)))
        status = "Excellent"
    elif savings_rate >= 10:
        score = int(50 + savings_rate)
        status = "Good"
    elif savings_rate >= 0:
        score = int(30 + (savings_rate * 2))
        status = "Fair"
    else:
        score = max(0, int(30 + savings_rate)) # negative savings lowers score
        status = "Needs Improvement"

    return HealthScoreResponse(
        score=score,
        status=status,
        savings_rate_pct=round(savings_rate, 1)
    )

# ── 4. Recommendations ──────────────────────────────────────────────────────
@router.post("/recommendations", response_model=RecommendationResponse)
def get_recommendations(req: PredictionRequest):
    """
    Provide smart financial recommendations based on anomaly detection 
    and category-wise analysis.
    """
    expense_dict = req.expenses.dict()
    
    # Run anomaly detection
    anomaly_data = anomaly_detection(expense_dict, threshold=1.5)
    anomalies = anomaly_data["anomalies"]
    
    # Run category comparison
    cat_pred = category_wise_prediction(req.income, expense_dict)
    bracket = cat_pred["income_bracket"]
    
    recs = []
    
    # General recs based on bracket
    if bracket == "low":
        recs.append("Focus on reducing non-essential bills and shopping to build an emergency fund.")
    elif bracket == "middle":
        recs.append("You are in the middle income tier. Consider allocating 20% to savings.")
    else:
        recs.append("Your income allows for aggressive saving. Look into high-yield investments.")
        
    # Anomaly-based recs
    if not anomalies:
        recs.append("Great job! All your expenses are within normal ranges for your profile.")
    else:
        for a in anomalies:
            if a["type"] == "high":
                recs.append(f"Warning: Your {a['category']} spending is unusually high ({a['z_score']} std devs above mean). Try to cut back.")
            else:
                recs.append(f"Notice: Your {a['category']} spending is very low. Make sure you aren't under-reporting.")

    return RecommendationResponse(
        recommendations=recs,
        anomalies=anomalies if anomalies else None
    )
