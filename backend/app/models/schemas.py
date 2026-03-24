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
    month: str
    income: float = Field(..., gt=0)
    expenses: ExpenseCategories

class ExpenseRecordResponse(AddExpenseRequest):
    id: str
    user_id: str
    total_expense: float
    savings: float
    created_at: datetime


# ── Auth Schemas ─────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime



# ── ML Prediction & Forecasting Schemas ──────────────────────────────────────

class PredictionRequest(BaseModel):
    income: float = Field(..., gt=0)
    expenses: ExpenseCategories
    previous_expenses: Optional[ExpenseCategories] = None

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
    predicted_next_month_expense: float
    trend_direction: str


# ── Health & Recommendations Schemas ─────────────────────────────────────────

class HealthScoreResponse(BaseModel):
    score: int = Field(..., ge=0, le=100)
    status: str
    savings_rate_pct: float
    feedback: str

class RecommendationsResponse(BaseModel):
    recommendations: List[str]
    alerts: List[str]


# ── Premium Feature Schemas ──────────────────────────────────────────────────

class GoalCreate(BaseModel):
    name: str = Field(..., max_length=100)
    target_amount: float = Field(..., gt=0)
    target_date: str # ISO format YYYY-MM-DD

class GoalResponse(GoalCreate):
    id: str
    user_id: str
    current_savings: float
    progress_percentage: float
    is_on_track: bool

class ChatMessage(BaseModel):
    message: str
    context: dict | None = None # optional financial context passed from UI

class ChatResponse(BaseModel):
    reply: str

class ScenarioRequest(BaseModel):
    current_income: float
    proposed_expenses: Dict[str, float]

class ScenarioResponse(BaseModel):
    projected_savings: float
    savings_difference: float
    projected_health_score: int
    advice: str
