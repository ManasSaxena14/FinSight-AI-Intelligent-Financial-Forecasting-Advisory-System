"""
FinSight AI -- Pydantic Schemas
===============================
Monthly records are keyed by period ("YYYY-MM"); individual transactions are
the source of truth behind them.
"""

from datetime import date, datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.ml.common import EXPENSE_COLS, MONTH_ORDER, is_valid_period, make_period


# ── Expense Schemas ──────────────────────────────────────────────────────────

class ExpenseCategories(BaseModel):
    Food:          float = Field(0, ge=0, le=1e9)
    Travel:        float = Field(0, ge=0, le=1e9)
    Rent:          float = Field(0, ge=0, le=1e9)
    Shopping:      float = Field(0, ge=0, le=1e9)
    Bills:         float = Field(0, ge=0, le=1e9)
    Entertainment: float = Field(0, ge=0, le=1e9)


class AddExpenseRequest(BaseModel):
    """Monthly-totals form. Send `period` ("YYYY-MM"), or `month` + `year`."""
    period:   Optional[str] = None
    month:    Optional[str] = Field(None, pattern="^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$")
    year:     Optional[int] = Field(None, ge=2000, le=2100)
    income:   float = Field(0, ge=0, le=1e9)
    expenses: ExpenseCategories

    @model_validator(mode="after")
    def resolve_period(self):
        if self.period is None:
            if self.month is None:
                raise ValueError("Provide period (YYYY-MM) or month and year.")
            year = self.year or date.today().year
            self.period = make_period(year, MONTH_ORDER.index(self.month) + 1)
        if not is_valid_period(self.period):
            raise ValueError("period must look like YYYY-MM.")
        today = date.today()
        if self.period > make_period(today.year, today.month):
            raise ValueError("You can't add data for a future month.")
        if self.income <= 0 and sum(self.expenses.model_dump().values()) <= 0:
            raise ValueError("Add income or at least one expense greater than 0.")
        return self


class ExpenseRecordResponse(BaseModel):
    id:            str
    user_id:       str
    period:        str
    year:          int
    month:         str
    income:        float
    expenses:      Dict[str, float]
    total_expense: float
    savings:       float
    tx_count:      int = 0
    created_at:    datetime
    updated_at:    Optional[datetime] = None


# ── Transaction Schemas ──────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    date:     date
    type:     Literal["income", "expense"]
    category: Optional[str] = None
    amount:   float = Field(..., gt=0, le=1e9)
    merchant: Optional[str] = Field(None, max_length=80)
    note:     Optional[str] = Field(None, max_length=200)

    @model_validator(mode="after")
    def validate_category(self):
        if self.type == "expense" and self.category not in EXPENSE_COLS:
            raise ValueError(f"category must be one of {', '.join(EXPENSE_COLS)}.")
        if self.date > date.today():
            raise ValueError("Transaction date can't be in the future.")
        return self


class TransactionBatchCreate(BaseModel):
    transactions: List[TransactionCreate] = Field(..., min_length=1, max_length=500)
    source: Literal["ai-text", "import", "receipt", "advisor", "voice"] = "import"
    skip_duplicates: bool = True


class TransactionResponse(BaseModel):
    id:         str
    date:       str
    period:     str
    type:       str
    category:   str
    amount:     float
    merchant:   Optional[str] = None
    note:       Optional[str] = None
    source:     Optional[str] = None
    created_at: datetime


class TransactionMutationResponse(BaseModel):
    transaction: Optional[TransactionResponse] = None
    month:       Optional[ExpenseRecordResponse] = None
    deleted_id:  Optional[str] = None


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


# ── ML Schemas ───────────────────────────────────────────────────────────────

class PredictionRequest(BaseModel):
    income:            float = Field(0, ge=0)
    expenses:          ExpenseCategories
    previous_expenses: Optional[ExpenseCategories] = None

class HealthScoreResponse(BaseModel):
    score:            int = Field(..., ge=0, le=100)
    status:           str
    savings_rate_pct: float
    feedback:         str


# ── Premium Feature Schemas ──────────────────────────────────────────────────

class GoalCreate(BaseModel):
    name:          str   = Field(..., min_length=1, max_length=100)
    target_amount: float = Field(..., gt=0, le=1e10)
    target_date:   str   # ISO format YYYY-MM-DD

    @field_validator("target_date")
    @classmethod
    def validate_date(cls, value: str) -> str:
        try:
            parsed = date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("target_date must be YYYY-MM-DD") from exc
        if parsed <= date.today():
            raise ValueError("target_date must be in the future.")
        return value

class GoalResponse(GoalCreate):
    id:                        str
    user_id:                   str
    current_savings:           float
    progress_percentage:       float
    available_savings_balance: float = 0.0
    is_on_track:               bool
    days_remaining:            Optional[int]   = None
    required_monthly_saving:   Optional[float] = None
    monthly_savings_capacity:  Optional[float] = None
    track_reason:              Optional[str]   = None

    @field_validator("target_date")
    @classmethod
    def validate_date(cls, value: str) -> str:
        # Stored goals may already be past their date; don't reject them on read.
        return value

class GoalContribution(BaseModel):
    amount: float = Field(..., gt=0, le=1e10)

class GoalDeleteResponse(BaseModel):
    message:    str
    deleted_id: str

class ChatTurn(BaseModel):
    role: str
    text: str = Field("", max_length=4000)

class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    context: Optional[dict] = None  # ignored: context is built server-side from the user's data
    history: Optional[List[ChatTurn]] = None

class ChatResponse(BaseModel):
    reply:  str
    source: str = "llm"  # "llm" | "fallback"

class ScenarioRequest(BaseModel):
    current_income:    float = Field(..., ge=0, le=1e9)
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
    key:              Optional[str] = None
    feedback:         Optional[str] = None  # "up" | "down" | None

class SmartSavingsResponse(BaseModel):
    tips:                     List[SmartSavingsTip]
    monthly_saving_potential: float
    annual_saving_potential:  float
    summary:                  str
    hidden_count:             int = 0

class BudgetLiveResponse(BaseModel):
    total_income:  float
    total_expense: float
    total_savings: float
    savings_rate:  float
    health_score:  int
    health_status: str
    last_updated:  str
    trend:         str  # "up", "down", "stable"
    period:        Optional[str] = None


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
