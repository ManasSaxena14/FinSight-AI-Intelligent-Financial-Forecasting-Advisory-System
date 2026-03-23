from fastapi import APIRouter, HTTPException
from typing import List
from app.models.schemas import AddExpenseRequest, ExpenseRecordResponse
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])

# In-memory store for Phase 7 (Can be easily swapped to MongoDB later)
EXPENSE_DB = []

@router.post("/add", response_model=ExpenseRecordResponse)
def add_expense(req: AddExpenseRequest):
    """
    Store new expense data (in-memory for now).
    """
    total = sum(req.expenses.dict().values())
    savings = req.income - total
    
    record = ExpenseRecordResponse(
        id=str(uuid.uuid4()),
        user_id=req.user_id,
        month=req.month,
        income=req.income,
        expenses=req.expenses,
        total_expense=round(total, 2),
        savings=round(savings, 2),
        created_at=datetime.utcnow()
    )
    
    EXPENSE_DB.append(record)
    return record


@router.get("/get", response_model=List[ExpenseRecordResponse])
def get_expenses(user_id: str = "default_user"):
    """
    Retrieve stored expenses for a specific user.
    """
    user_records = [r for r in EXPENSE_DB if r.user_id == user_id]
    return user_records
