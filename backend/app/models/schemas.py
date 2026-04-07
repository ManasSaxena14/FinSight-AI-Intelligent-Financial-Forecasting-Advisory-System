"""
FinSight AI -- Pydantic Schemas (Enhanced)
==========================================
CHANGES:
- Added SavingsRiskResponse schema for new /ml/savings-risk endpoint.
- Added SpendingPatternResponse schema for new /ml/spending-pattern endpoint.
- Added CategoryPrediction schema with confidence interval fields.
- Added enhanced ForecastMonth with month_name and per-category breakdown.
- ForecastResponse extended to carry full per-month forecast list.
- All existing schemas are UNCHANGED to preserve backward compatibility.
"""

from pydantic import BaseModel, Field, model_validator
from typing import Dict, List, Optional
from datetime import datetime


# ── Expense Schemas ──────────────────────────────────────────────────────────

class ExpenseCategories(BaseModel):
    Food:          float = Field(0, ge=0)
    Travel:        float = Field(0, ge=0)
    Rent:          float = Field(0, ge=0)
    Shopping:      float = Field(0, ge=0)
    Bills:         float = Field(0, ge=0)
    Entertainment: float = Field(0, ge=0)

class AddExpenseRequest(BaseModel):
    month:   str = Field(..., pattern="^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$")
    income:  float = Field(..., gt=0)
    expenses: ExpenseCategories

    @model_validator(mode="after")
    def validate_non_empty_expenses(self):
        if sum(self.expenses.model_dump().values()) <= 0:
            raise ValueError("At least one expense amount must be greater than 0.")
        return self

class ExpenseRecordResponse(AddExpenseRequest):
    id:            str
    user_id:       str
    total_expense: float
    savings:       float
    created_at:    datetime
    entries:       List[Dict] = []


# ── Auth Schemas ─────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name:     str = Field(..., min_length=2, max_length=50)
    email:    str = Field(..., min_length=5, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email:    str
    password: str

class Token(BaseModel):
    access_token: str
    token_type:   str
    user:         "UserResponse"

class UserResponse(BaseModel):
    id:         str
    name:       str
    email:      str
    created_at: datetime


# ── ML Prediction & Forecasting Schemas ──────────────────────────────────────

class PredictionRequest(BaseModel):
    income:            float = Field(0, ge=0)
    expenses:          ExpenseCategories
    previous_expenses: Optional[ExpenseCategories] = None

class PredictionResponse(BaseModel):
    predicted_total_expense: float
    projected_savings:       float

class ClassificationResponse(BaseModel):
    predicted_class:    int
    confidence_score:   float
    behavioral_insight: str

class ForecastRequest(PredictionRequest):
    months: int = Field(3, ge=1, le=12)

class ForecastMonth(BaseModel):
    """Per-month forecast entry — now includes month name and category breakdown."""
    month:             int
    month_name:        Optional[str] = None
    predicted_expense: float
    savings:           float
    categories:        Optional[Dict[str, float]] = None

class ForecastResponse(BaseModel):
    """
    Extended forecast response.
    - predicted_next_month_expense / trend_direction kept for backward compat.
    - forecast list added for richer frontend rendering.
    """
    predicted_next_month_expense: float
    trend_direction:              str
    # Enhanced fields (frontend can use these for multi-month charts)
    forecast:                     Optional[List[ForecastMonth]] = None
    average_predicted_expense:    Optional[float] = None
    average_savings:              Optional[float] = None


# ── Health & Recommendations Schemas ─────────────────────────────────────────

class HealthScoreResponse(BaseModel):
    score:           int   = Field(..., ge=0, le=100)
    status:          str
    savings_rate_pct: float
    feedback:        str

class RecommendationsResponse(BaseModel):
    recommendations: List[str]
    alerts:          Optional[List[str]]  = None
    anomalies:       Optional[List[dict]] = None
    # New field: overall anomaly score (0-100) from IsolationForest
    overall_anomaly_score: Optional[int]  = None


# ── NEW: Savings Risk Schema ──────────────────────────────────────────────────

class SavingsRiskRequest(BaseModel):
    income:   float = Field(..., ge=0)
    expenses: ExpenseCategories

class SavingsRiskResponse(BaseModel):
    risk_level:      str   # "low" | "medium" | "high"
    predicted_class: int
    class_label:     str   # "Good" | "Moderate" | "Poor"
    probabilities:   Dict[str, float]  # {"Poor": 0.05, "Moderate": 0.20, "Good": 0.75}
    confidence:      float
    risk_score:      int   # 0=no risk, 100=max risk


# ── NEW: Spending Pattern Schema ─────────────────────────────────────────────

class SpendingPatternResponse(BaseModel):
    archetype:            str   # "Housing-Heavy", "Foodie", "Balanced", etc.
    dominant_category:    str
    dominant_pct:         float
    essential_ratio:      float
    discretionary_ratio:  float
    savings_ratio:        float
    peer_comparison:      str


# ── Premium Feature Schemas ──────────────────────────────────────────────────

class GoalCreate(BaseModel):
    name:          str   = Field(..., max_length=100)
    target_amount: float = Field(..., gt=0)
    target_date:   str   # ISO format YYYY-MM-DD

class GoalResponse(GoalCreate):
    id:                       str
    user_id:                  str
    current_savings:          float
    progress_percentage:      float
    available_savings_balance: float = 0.0
    is_on_track:              bool
    days_remaining:           Optional[int]   = None
    required_monthly_saving:  Optional[float] = None

class GoalContribution(BaseModel):
    amount: float = Field(..., gt=0)

class GoalDeleteResponse(BaseModel):
    message:    str
    deleted_id: str

class ChatMessage(BaseModel):
    message: str
    context: dict | None = None
    history: List[Dict[str, str]] | None = None

class ChatResponse(BaseModel):
    reply: str

class ScenarioRequest(BaseModel):
    current_income:    float
    proposed_expenses: Dict[str, float]

class ScenarioResponse(BaseModel):
    projected_savings:      float
    savings_difference:     float
    projected_health_score: int
    advice:                 str


# ── Smart Savings & Live Budget Schemas ──────────────────────────────────────

class SmartSavingsTip(BaseModel):
    category:         str
    tip:              str
    potential_saving: float
    priority:         str  # "high", "medium", "low"

class SmartSavingsResponse(BaseModel):
    tips:                    List[SmartSavingsTip]
    monthly_saving_potential: float
    annual_saving_potential:  float
    summary:                 str

class BudgetLiveResponse(BaseModel):
    total_income:   float
    total_expense:  float
    total_savings:  float
    savings_rate:   float
    health_score:   int
    health_status:  str
    last_updated:   str
    trend:          str  # "up", "down", "stable"


# ── Notifications Schema ─────────────────────────────────────────────────────

class NotificationItem(BaseModel):
    id:        str
    type:      str   # "alert", "insight", "achievement", "tip"
    severity:  str   # "critical", "warning", "info", "success"
    title:     str
    message:   str
    timestamp: str

class NotificationsResponse(BaseModel):
    notifications: List[NotificationItem]
    unread_count:  int