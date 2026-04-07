from fastapi import APIRouter, HTTPException, Depends
from typing import List
import logging
from app.models.schemas import AddExpenseRequest, ExpenseRecordResponse
from app.db import get_expenses_collection
from app.services.auth import get_current_user
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])
logger = logging.getLogger(__name__)

@router.post("/add", response_model=ExpenseRecordResponse)
async def add_expense(req: AddExpenseRequest, current_user: dict = Depends(get_current_user)):
    """
    Store new expense data in MongoDB. Protect with JWT.
    """
    try:
        collection = await get_expenses_collection()
        existing = await collection.find_one({"user_id": current_user["id"], "month": req.month})
        
        # Use timezone-aware UTC datetime
        now = datetime.now(timezone.utc)
        
        if existing:
            # Add new income to existing income for a cumulative total
            new_income = existing.get("income", 0) + float(req.income)
            
            existing_expenses = existing.get("expenses", {})
            new_expenses = req.expenses.dict()
            merged_expenses = {}
            
            # Combine all keys from both dicts (adds the expenses together)
            all_keys = set(existing_expenses.keys()).union(new_expenses.keys())
            for cat in all_keys:
                merged_expenses[cat] = existing_expenses.get(cat, 0) + new_expenses.get(cat, 0)
                
            entry_data = {
                "income": float(req.income),
                "expenses": req.expenses.dict(),
                "added_at": now
            }
            existing_entries = existing.get("entries", [])
            existing_entries.append(entry_data)
                
            total = sum(merged_expenses.values())
            savings = new_income - total
            
            updated_fields = {
                "income": float(new_income),
                "expenses": merged_expenses,
                "total_expense": round(float(total), 2),
                "savings": round(float(savings), 2),
                "created_at": now,
                "updated_at": now,
                "entries": existing_entries
            }
            
            await collection.update_one({"_id": existing["_id"]}, {"$set": updated_fields})
            document = {**existing, **updated_fields}
        else:
            # Create a completely new record
            total = sum(req.expenses.dict().values())
            savings = req.income - total
            
            record_id = str(uuid.uuid4())
            
            entry_data = {
                "income": float(req.income),
                "expenses": req.expenses.dict(),
                "added_at": now
            }
            
            document = {
                "_id": record_id,
                "user_id": current_user["id"],
                "month": req.month,
                "income": float(req.income),
                "expenses": req.expenses.dict(),
                "total_expense": round(float(total), 2),
                "savings": round(float(savings), 2),
                "created_at": now,
                "entries": [entry_data]
            }
            
            await collection.insert_one(document)

        # Return response object (map _id to id)
        response_data = document.copy()
        response_data["id"] = str(response_data.pop("_id"))
        
        return ExpenseRecordResponse(**response_data)
        
    except Exception:
        logger.exception("Failed to add expense for user %s", current_user.get("id"))
        raise HTTPException(status_code=500, detail="Could not save expense data right now.")


@router.get("/get", response_model=List[ExpenseRecordResponse])
async def get_expenses(current_user: dict = Depends(get_current_user)):
    """
    Retrieve stored expenses for the authenticated user from MongoDB.
    """
    try:
        collection = await get_expenses_collection()
        cursor = collection.find({"user_id": current_user["id"]}).sort("created_at", -1)
        
        user_records = []
        async for doc in cursor:
            doc["id"] = doc.pop("_id")
            user_records.append(ExpenseRecordResponse(**doc))
            
        return user_records
    except Exception:
        logger.exception("Failed to fetch expenses for user %s", current_user.get("id"))
        raise HTTPException(status_code=500, detail="Could not fetch expense data right now.")
