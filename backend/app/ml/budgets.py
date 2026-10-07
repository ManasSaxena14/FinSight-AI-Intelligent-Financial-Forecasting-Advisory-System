"""
FinSight AI -- Suggested category budgets
=========================================
Starts from next month's forecast per category and, if that leaves less than
the target savings rate, trims categories in a sensible order: discretionary
first, then food, then bills. Rent is treated as fixed in the short term.
Each cut is capped so the plan stays realistic, and never goes below a
healthy benchmark share of income.
"""

from __future__ import annotations

import math

from app.ml.common import EXPENSE_COLS

# Healthy share of income per category (used as the floor for cuts).
BENCHMARKS = {"Food": 0.12, "Travel": 0.08, "Rent": 0.28, "Shopping": 0.05, "Bills": 0.10, "Entertainment": 0.05}
# Order to cut, and the most we'd cut each one in a single month.
# Paid in one go each month, so "pace" through the month is meaningless for them.
LUMP_SUM = {"Rent", "Bills"}
CUT_ORDER = (("Shopping", 0.35), ("Entertainment", 0.35), ("Travel", 0.25), ("Food", 0.20), ("Bills", 0.10))


def _round_up(value: float, step: int = 100) -> float:
    return float(math.ceil(max(0.0, value) / step) * step)


def suggest_budget(forecast_categories: dict, income: float, target_rate: float = 0.20,
                   typical: dict | None = None) -> dict:
    """typical: the user's usual (median) monthly spend per category; caps one-off spikes in the forecast."""
    base = {c: float(forecast_categories.get(c, 0) or 0) for c in EXPENSE_COLS}
    income = float(income)
    capped = set()
    for c in EXPENSE_COLS:
        usual = float((typical or {}).get(c, 0) or 0)
        if usual > 0 and base[c] > usual * 1.05:
            base[c] = usual * 1.05
            capped.add(c)
    total = sum(base.values())
    target_spend = income * (1 - target_rate)
    excess = max(0.0, total - target_spend)

    cuts = {c: 0.0 for c in EXPENSE_COLS}
    reasons = {c: "Kept at your forecast" for c in EXPENSE_COLS}
    reasons["Rent"] = "Treated as fixed in the short term"
    for c in capped:
        reasons[c] = "Back to your usual level (forecast includes a recent spike)"
    remaining = excess
    for category, max_share in CUT_ORDER:
        if remaining <= 0:
            break
        floor = BENCHMARKS[category] * income
        room = max(0.0, min(base[category] * max_share, base[category] - floor))
        cut = min(room, remaining)
        if cut > 0:
            cuts[category] = cut
            remaining -= cut
            reasons[category] = (f"Trimmed {cut / base[category] * 100:.0f}% to reach your savings target"
                                 + (" (from your usual level)" if category in capped else ""))

    suggested = {c: _round_up(base[c] - cuts[c]) for c in EXPENSE_COLS}
    planned_spend = sum(suggested.values())
    projected_savings = income - planned_spend
    return {
        "target_savings_rate": target_rate,
        "income": round(income, 2),
        "forecast_total": round(total, 2),
        "planned_total": round(planned_spend, 2),
        "projected_savings": round(projected_savings, 2),
        "projected_savings_rate": round(projected_savings / income * 100, 1) if income > 0 else 0.0,
        "achievable": bool(remaining <= 1.0),
        "shortfall": round(max(0.0, remaining), 2),
        "categories": [
            {"category": c, "forecast": round(base[c], 2), "suggested": suggested[c],
             "cut": round(cuts[c], 2), "reason": reasons[c]}
            for c in EXPENSE_COLS
        ],
    }


def budget_status(budgets: dict, spent: dict, day_of_month: int, days_in_month: int) -> list[dict]:
    """Month-to-date pace for each budgeted category."""
    elapsed = max(day_of_month, 1) / days_in_month
    rows = []
    for c in EXPENSE_COLS:
        limit = float(budgets.get(c, 0) or 0)
        used = float(spent.get(c, 0) or 0)
        if limit <= 0:
            continue
        pace = used / (limit * elapsed) if elapsed > 0 else 0.0
        if used > limit:
            state = "over"
        elif c not in LUMP_SUM and pace > 1.15 and elapsed < 0.95:
            state = "at-risk"
        else:
            state = "on-track"
        rows.append({"category": c, "budget": round(limit, 2), "spent": round(used, 2),
                     "used_pct": round(used / limit * 100, 1), "pace": round(pace, 2), "state": state})
    return rows
