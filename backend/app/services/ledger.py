"""
FinSight AI -- Ledger service
=============================
Transactions are the source of truth. Each one has a date, so it belongs to a
period ("YYYY-MM"). The `expenses` collection holds one derived monthly
aggregate per (user_id, period), recomputed whenever that month's transactions
change. All ML reads the aggregates.

Collections
  transactions: {_id, user_id, date "YYYY-MM-DD", period, type "income"|"expense",
                 category, amount, merchant, note, source, created_at}
  expenses:     {_id, user_id, period, year, month, income, expenses{cat: amt},
                 total_expense, savings, tx_count, created_at, updated_at}
"""

from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timezone

from app.ml.common import EXPENSE_COLS, MONTH_ORDER, infer_legacy_period, period_month_name, split_period

logger = logging.getLogger(__name__)

INCOME_CATEGORY = "Income"


def new_transaction(
    user_id: str,
    tx_date: date,
    tx_type: str,
    category: str,
    amount: float,
    merchant: str | None = None,
    note: str | None = None,
    source: str = "manual",
) -> dict:
    return {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "date": tx_date.isoformat(),
        "period": f"{tx_date.year:04d}-{tx_date.month:02d}",
        "type": tx_type,
        "category": INCOME_CATEGORY if tx_type == "income" else category,
        "amount": round(float(amount), 2),
        "merchant": (merchant or "").strip() or None,
        "note": (note or "").strip() or None,
        "source": source,
        "created_at": datetime.now(timezone.utc),
    }


def monthly_bulk_transactions(user_id: str, period: str, income: float, expenses: dict, today: date | None = None) -> list[dict]:
    """Turn the 'monthly totals' form into one income and one expense transaction per category."""
    year, month = split_period(period)
    today = today or date.today()
    tx_date = today if (today.year, today.month) == (year, month) else date(year, month, 1)
    txs = []
    if income > 0:
        txs.append(new_transaction(user_id, tx_date, "income", INCOME_CATEGORY, income, source="monthly-form"))
    for cat in EXPENSE_COLS:
        amount = float(expenses.get(cat, 0) or 0)
        if amount > 0:
            txs.append(new_transaction(user_id, tx_date, "expense", cat, amount, source="monthly-form"))
    return txs


async def recompute_month(db, user_id: str, period: str) -> dict | None:
    """Rebuild the monthly aggregate for one period from its transactions."""
    income = 0.0
    totals = {c: 0.0 for c in EXPENSE_COLS}
    count = 0
    async for tx in db["transactions"].find({"user_id": user_id, "period": period}):
        count += 1
        if tx["type"] == "income":
            income += float(tx["amount"])
        elif tx.get("category") in totals:
            totals[tx["category"]] += float(tx["amount"])

    if count == 0:
        await db["expenses"].delete_one({"user_id": user_id, "period": period})
        return None

    now = datetime.now(timezone.utc)
    total_expense = round(sum(totals.values()), 2)
    year, _ = split_period(period)
    fields = {
        "year": year,
        "month": period_month_name(period),
        "income": round(income, 2),
        "expenses": {c: round(v, 2) for c, v in totals.items()},
        "total_expense": total_expense,
        "savings": round(income - total_expense, 2),
        "tx_count": count,
        "updated_at": now,
    }
    await db["expenses"].update_one(
        {"user_id": user_id, "period": period},
        {"$set": fields, "$setOnInsert": {"_id": str(uuid.uuid4()), "created_at": now}},
        upsert=True,
    )
    return await db["expenses"].find_one({"user_id": user_id, "period": period})


async def get_monthly_records(db, user_id: str, limit: int = 36) -> list[dict]:
    """Monthly aggregates, newest period first."""
    cursor = db["expenses"].find({"user_id": user_id, "period": {"$exists": True}}).sort("period", -1).limit(limit)
    return [doc async for doc in cursor]


async def get_latest_complete_record(db, user_id: str) -> dict | None:
    """
    Latest month that isn't still filling up. Judging a half-logged current month
    (e.g. a week of spending against a full salary) gives misleading advice.
    """
    from app.ml.insights import split_in_progress  # local import: ml imports services

    records = await get_monthly_records(db, user_id, limit=7)
    if not records:
        return None
    history = [{"period": r["period"], "income": float(r.get("income", 0) or 0), "expenses": r.get("expenses", {})}
               for r in reversed(records)]
    complete, _ = split_in_progress(history)
    period = complete[-1]["period"]
    return next(r for r in records if r["period"] == period)


async def get_history(db, user_id: str, limit: int = 24) -> list[dict]:
    """Chronological (oldest first) history in the shape the ML layer expects."""
    records = await get_monthly_records(db, user_id, limit=limit)
    return [
        {"period": r["period"], "income": float(r.get("income", 0) or 0), "expenses": r.get("expenses", {})}
        for r in reversed(records)
    ]


# ── Indexes & legacy migration ─────────────────────────────────────────────

async def ensure_indexes(db) -> None:
    await db["transactions"].create_index([("user_id", 1), ("period", 1)])
    await db["transactions"].create_index([("user_id", 1), ("date", -1)])
    await db["expenses"].create_index(
        [("user_id", 1), ("period", 1)],
        unique=True,
        partialFilterExpression={"period": {"$exists": True}},
    )
    await db["goals"].create_index([("user_id", 1), ("target_date", 1)])
    await db["conversations"].create_index([("user_id", 1), ("updated_at", -1)])
    await db["digests"].create_index([("user_id", 1), ("week", 1)], unique=True)
    await db["feedback"].create_index([("user_id", 1), ("kind", 1), ("key", 1)])
    await db["ai_cache"].create_index("expires_at", expireAfterSeconds=0)  # TTL


async def migrate_legacy_records(db) -> int:
    """
    Legacy monthly records were keyed by month name only ("Jan") and had no
    transactions. For each one: infer the year, create transactions from its
    entries, tag the record with its period and recompute it. Idempotent and
    additive: re-running skips records that already have a period, and
    transactions carry `legacy_record_id` so they are never duplicated.
    """
    migrated = 0
    async for doc in db["expenses"].find({"period": {"$exists": False}}):
        try:
            month = doc.get("month")
            if month not in MONTH_ORDER:
                logger.warning("Skipping legacy record %s with unknown month %r", doc["_id"], month)
                continue
            reference = doc.get("updated_at") or doc.get("created_at")
            period = infer_legacy_period(month, reference)
            user_id = doc["user_id"]
            year, month_index = split_period(period)

            clash = await db["expenses"].find_one({"user_id": user_id, "period": period})
            if clash:
                logger.warning("Legacy record %s maps to existing period %s; leaving it untouched", doc["_id"], period)
                continue

            already = await db["transactions"].count_documents({"legacy_record_id": doc["_id"]})
            if not already:
                entries = doc.get("entries") or [{
                    "income": doc.get("income", 0),
                    "expenses": doc.get("expenses", {}),
                    "added_at": reference,
                }]
                txs = []
                for entry in entries:
                    added = entry.get("added_at")
                    tx_date = date(year, month_index, 1)
                    if isinstance(added, datetime) and (added.year, added.month) == (year, month_index):
                        tx_date = added.date()
                    for tx in monthly_bulk_transactions(
                        user_id, period, float(entry.get("income", 0) or 0), entry.get("expenses") or {},
                        today=date(1970, 1, 1),
                    ):
                        tx["date"] = tx_date.isoformat()
                        tx["source"] = "legacy-migration"
                        tx["legacy_record_id"] = doc["_id"]
                        txs.append(tx)
                if txs:
                    await db["transactions"].insert_many(txs)

            await db["expenses"].update_one(
                {"_id": doc["_id"]},
                {"$set": {"period": period, "year": year}, "$unset": {"entries": ""}},
            )
            await recompute_month(db, user_id, period)
            migrated += 1
        except Exception:
            logger.exception("Failed to migrate legacy record %s", doc.get("_id"))
    if migrated:
        logger.info("Migrated %d legacy monthly record(s) to YYYY-MM periods", migrated)
    return migrated
