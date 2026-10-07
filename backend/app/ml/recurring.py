"""
FinSight AI -- Recurring charge & subscription detection
========================================================
Groups expense transactions by normalised merchant and keeps the ones that
charge a similar amount on a regular cadence (weekly, monthly, quarterly,
yearly). Flags likely subscriptions and ones that seem to have stopped.
"""

from __future__ import annotations

import re
from calendar import monthrange
from collections import defaultdict
from datetime import date, timedelta
from statistics import median

SUBSCRIPTION_HINTS = (
    "netflix", "prime", "hotstar", "spotify", "youtube", "apple", "google", "icloud", "sonyliv", "zee5", "gaana",
    "jiosaavn", "audible", "kindle", "linkedin", "chatgpt", "openai", "notion", "adobe", "microsoft", "cult", "gym",
    "swiggy one", "zomato gold", "times prime", "broadband", "fiber", "fibre", "airtel", "jio", "vi ", "act ",
)

CADENCES = (  # name, min gap days, max gap days, months per charge
    ("weekly", 5, 9, 12 / 52),
    ("monthly", 25, 35, 1.0),
    ("quarterly", 80, 100, 3.0),
    ("yearly", 340, 390, 12.0),
)

_NOISE = re.compile(r"(@[a-z0-9.\-_]+|\b(pvt|ltd|private|limited|india|technologies|payments?|upi|online|www|com|in)\b|[^a-z ])")


def normalize_merchant(name: str | None) -> str:
    if not name:
        return ""
    cleaned = _NOISE.sub(" ", name.lower())
    return " ".join(cleaned.split())[:40]


def detect_recurring(transactions: list[dict], today: date | None = None) -> dict:
    """transactions: dicts with date (YYYY-MM-DD), type, category, amount, merchant."""
    today = today or date.today()
    groups: dict[str, list[dict]] = defaultdict(list)
    display: dict[str, str] = {}
    for tx in transactions:
        if tx.get("type") != "expense":
            continue
        key = normalize_merchant(tx.get("merchant"))
        if not key or tx.get("source") == "monthly-form":
            continue
        groups[key].append(tx)
        display.setdefault(key, tx.get("merchant") or key)

    items = []
    for key, txs in groups.items():
        txs.sort(key=lambda t: t["date"])
        if len(txs) < 2:
            continue
        dates = [date.fromisoformat(t["date"]) for t in txs]
        gaps = [(b - a).days for a, b in zip(dates, dates[1:]) if (b - a).days > 0]
        if not gaps:
            continue
        gap = median(gaps)
        cadence = next((c for c in CADENCES if c[1] <= gap <= c[2]), None)
        if cadence is None:
            continue
        amounts = [float(t["amount"]) for t in txs]
        typical = median(amounts)
        consistent = sum(1 for a in amounts if abs(a - typical) <= max(0.15 * typical, 20)) / len(amounts)
        if consistent < 0.7:
            continue
        name, _, max_gap, months_per_charge = cadence
        last = dates[-1]
        if name == "monthly":  # same day next month reads better than "+31 days"
            year, month = (last.year + 1, 1) if last.month == 12 else (last.year, last.month + 1)
            next_expected = last.replace(year=year, month=month, day=min(last.day, monthrange(year, month)[1]))
        else:
            next_expected = last + timedelta(days=round(gap))
        overdue_days = (today - last).days
        status = "active" if overdue_days <= max_gap * 1.5 else "possibly stopped"
        category = max({t["category"] for t in txs}, key=lambda c: sum(1 for t in txs if t["category"] == c))
        is_sub = category in ("Entertainment", "Bills") or any(h in f" {key} " for h in SUBSCRIPTION_HINTS)
        items.append({
            "merchant": display[key],
            "category": category,
            "cadence": name,
            "typical_amount": round(typical, 2),
            "monthly_cost": round(typical / months_per_charge, 2),
            "charges_seen": len(txs),
            "last_date": last.isoformat(),
            "next_expected": next_expected.isoformat(),
            "status": status,
            "is_subscription": is_sub,
        })

    items.sort(key=lambda i: i["monthly_cost"], reverse=True)
    active = [i for i in items if i["status"] == "active"]
    return {
        "items": items,
        "total_monthly": round(sum(i["monthly_cost"] for i in active), 2),
        "subscriptions_monthly": round(sum(i["monthly_cost"] for i in active if i["is_subscription"]), 2),
        "count_active": len(active),
    }
