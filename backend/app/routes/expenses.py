from fastapi import APIRouter, HTTPException
from typing import List
from app.models.schemas import AddExpenseRequest, ExpenseRecordResponse
from app.db import get_expenses_collection
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])

@router.post("/add", response_model=ExpenseRecordResponse)
async def add_expense(req: AddExpenseRequest):
    """
    Store new expense data in MongoDB.
    """
    total = sum(req.expenses.dict().values())
    savings = req.income - total
    
    # Generate unique ID and timestamp
    record_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    
    # Construct DB document
    document = {
        "_id": record_id,
        "user_id": req.user_id,
        "month": req.month,
        "income": req.income,
        "expenses": req.expenses.dict(),
        "total_expense": round(total, 2),
        "savings": round(savings, 2),
        "created_at": created_at
    }
    
    try:
        collection = get_expenses_collection()
        await collection.insert_one(document)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {e}")
    
    # Return response object (map _id to id)
    response_data = document.copy()
    response_data["id"] = response_data.pop("_id")
    
    return ExpenseRecordResponse(**response_data)


@router.get("/get", response_model=List[ExpenseRecordResponse])
async def get_expenses(user_id: str = "default_user"):
    """
    Retrieve stored expenses for a specific user from MongoDB.
    """
    try:
        collection = get_expenses_collection()
        cursor = collection.find({"user_id": user_id}).sort("created_at", -1)
        
        user_records = []
        async for doc in cursor:
            doc["id"] = doc.pop("_id")
            user_records.append(ExpenseRecordResponse(**doc))
            
        return user_records
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {e}")
