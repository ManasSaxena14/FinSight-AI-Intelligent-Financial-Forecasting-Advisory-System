"""
FinSight AI -- Pydantic Schemas
================================
Defines request and response validation models for the FastAPI routes.
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime


# ── Expense Schemas ──────────────────────────────────────────────────────────

class ExpenseCategories(BaseModel):
    Food: float = Field(0, ge=0)
    Travel: float = Field(0, ge=0)
    Rent: float = Field(0, ge=0)
    Shopping: float = Field(0, ge=0)
    Bills: float = Field(0, ge=0)
    Entertainment: float = Field(0, ge=0)

class AddExpenseRequest(BaseModel):
    user_id: str = "default_user"
    month: str
    income: float = Field(..., gt=0)
    expenses: ExpenseCategories

class ExpenseRecordResponse(AddExpenseRequest):
    id: str
    total_expense: float
    savings: float
    created_at: datetime


# ── ML Prediction & Forecasting Schemas ──────────────────────────────────────

class PredictionRequest(BaseModel):
    income: float = Field(..., gt=0)
    expenses: ExpenseCategories

class PredictionResponse(BaseModel):
    predicted_total_expense: float
    projected_savings: float

class ForecastRequest(PredictionRequest):
    months: int = Field(3, ge=1, le=12)

class ForecastMonth(BaseModel):
    month: int
    predicted_expense: float
    savings: float

class ForecastResponse(BaseModel):
    forecast: List[ForecastMonth]
    average_predicted_expense: float
    average_savings: float


# ── Health & Recommendations Schemas ─────────────────────────────────────────

class HealthScoreResponse(BaseModel):
    score: int = Field(..., ge=0, le=100)
    status: str
    savings_rate_pct: float

class RecommendationResponse(BaseModel):
    recommendations: List[str]
    anomalies: Optional[List[dict]] = None
