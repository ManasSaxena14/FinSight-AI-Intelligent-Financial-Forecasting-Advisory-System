import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.db import get_database
from app.ml.common import is_valid_period
from app.models.schemas import (
    AddExpenseRequest,
    ExpenseRecordResponse,
    TransactionBatchCreate,
    TransactionCreate,
    TransactionMutationResponse,
    TransactionResponse,
)
from app.services.auth import get_current_user
from app.services.ledger import (
    get_monthly_records,
    monthly_bulk_transactions,
    new_transaction,
    recompute_month,
)

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])
tx_router = APIRouter(prefix="/api/transactions", tags=["Transactions"])
logger = logging.getLogger(__name__)


def _record_response(doc: dict) -> ExpenseRecordResponse:
    data = dict(doc)
    data["id"] = str(data.pop("_id"))
    return ExpenseRecordResponse(**data)


def _tx_response(doc: dict) -> TransactionResponse:
    data = dict(doc)
    data["id"] = str(data.pop("_id"))
    return TransactionResponse(**data)


# ── Monthly records ─────────────────────────────────────────────────────────

@router.post("/add", response_model=ExpenseRecordResponse)
async def add_monthly_totals(req: AddExpenseRequest, current_user: dict = Depends(get_current_user)):
    """Add a month's income and category totals. Amounts add to anything already logged for that month."""
    db = await get_database()
    txs = monthly_bulk_transactions(current_user["id"], req.period, req.income, req.expenses.model_dump())
    try:
        await db["transactions"].insert_many(txs)
        record = await recompute_month(db, current_user["id"], req.period)
    except Exception:
        logger.exception("Failed to add monthly totals for user %s", current_user["id"])
        raise HTTPException(status_code=500, detail="Could not save your data right now.")
    return _record_response(record)


@router.get("/get", response_model=List[ExpenseRecordResponse])
async def get_monthly(current_user: dict = Depends(get_current_user)):
    """Monthly records, newest period first."""
    db = await get_database()
    return [_record_response(doc) for doc in await get_monthly_records(db, current_user["id"])]


# ── Transactions ────────────────────────────────────────────────────────────

@tx_router.post("", response_model=TransactionMutationResponse)
async def add_transaction(req: TransactionCreate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    tx = new_transaction(current_user["id"], req.date, req.type, req.category or "", req.amount, req.merchant, req.note)
    await db["transactions"].insert_one(tx)
    record = await recompute_month(db, current_user["id"], tx["period"])
    return TransactionMutationResponse(transaction=_tx_response(tx), month=_record_response(record) if record else None)


@tx_router.post("/batch")
async def add_transactions_batch(req: TransactionBatchCreate, current_user: dict = Depends(get_current_user)):
    """Save confirmed AI/import proposals in one go; recompute every affected month."""
    from app.ai.parsers import dedupe_key

    db = await get_database()
    user_id = current_user["id"]
    existing = set()
    if req.skip_duplicates:
        periods = {t.date.strftime("%Y-%m") for t in req.transactions}
        async for tx in db["transactions"].find({"user_id": user_id}):
            if tx["period"] in periods:
                existing.add(dedupe_key(tx))
    docs, skipped = [], 0
    for item in req.transactions:
        tx = new_transaction(user_id, item.date, item.type, item.category or "", item.amount, item.merchant, item.note,
                             source=req.source)
        key = dedupe_key(tx)
        if req.skip_duplicates and key in existing:
            skipped += 1
            continue
        existing.add(key)
        docs.append(tx)
    if docs:
        await db["transactions"].insert_many(docs)
    for period in sorted({d["period"] for d in docs}):
        await recompute_month(db, user_id, period)
    return {"added": len(docs), "skipped_duplicates": skipped, "periods": sorted({d["period"] for d in docs})}


@tx_router.get("", response_model=List[TransactionResponse])
async def list_transactions(
    period: Optional[str] = Query(None, description="YYYY-MM"),
    limit: int = Query(50, ge=1, le=500),
    current_user: dict = Depends(get_current_user),
):
    if period is not None and not is_valid_period(period):
        raise HTTPException(status_code=422, detail="period must look like YYYY-MM")
    db = await get_database()
    query = {"user_id": current_user["id"]}
    if period:
        query["period"] = period
    cursor = db["transactions"].find(query).sort([("date", -1), ("created_at", -1)]).limit(limit)
    return [_tx_response(doc) async for doc in cursor]


@tx_router.delete("/{tx_id}", response_model=TransactionMutationResponse)
async def delete_transaction(tx_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    tx = await db["transactions"].find_one_and_delete({"_id": tx_id, "user_id": current_user["id"]})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    record = await recompute_month(db, current_user["id"], tx["period"])
    return TransactionMutationResponse(deleted_id=tx_id, month=_record_response(record) if record else None)
