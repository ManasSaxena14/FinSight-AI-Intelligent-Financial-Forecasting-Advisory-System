"""
FinSight AI -- "Why did this change?"
=====================================
Compares two complete months and attributes the change in health score to
each input: income and every category. Attribution is exact for the inputs
it tests: each driver's score impact is the score change you'd see if only
that input had moved, holding everything else at the newer month's values.
"""

from __future__ import annotations

from app.ml.common import EXPENSE_COLS, clean_expenses, period_label
from app.services.financial_logic import calculate_health_score


def _score(income: float, expenses: dict) -> int:
    return calculate_health_score(income, sum(expenses.values()), expenses)["score"]


def explain_change(previous: dict, current: dict) -> dict:
    prev_e, cur_e = clean_expenses(previous["expenses"]), clean_expenses(current["expenses"])
    prev_i, cur_i = float(previous.get("income", 0) or 0), float(current.get("income", 0) or 0)
    prev_score, cur_score = _score(prev_i, prev_e), _score(cur_i, cur_e)

    drivers = []
    for col in EXPENSE_COLS:
        delta = cur_e[col] - prev_e[col]
        reverted = dict(cur_e, **{col: prev_e[col]})
        impact = cur_score - _score(cur_i, reverted)
        drivers.append({
            "factor": col,
            "kind": "spending",
            "previous": round(prev_e[col], 2),
            "current": round(cur_e[col], 2),
            "change": round(delta, 2),
            "change_pct": round(delta / prev_e[col] * 100, 1) if prev_e[col] > 0 else None,
            "score_impact": impact,
        })
    income_impact = cur_score - _score(prev_i, cur_e)
    drivers.append({
        "factor": "Income", "kind": "income", "previous": round(prev_i, 2), "current": round(cur_i, 2),
        "change": round(cur_i - prev_i, 2),
        "change_pct": round((cur_i - prev_i) / prev_i * 100, 1) if prev_i > 0 else None,
        "score_impact": income_impact,
    })
    drivers.sort(key=lambda d: (abs(d["score_impact"]), abs(d["change"])), reverse=True)

    prev_total, cur_total = sum(prev_e.values()), sum(cur_e.values())
    return {
        "from_period": previous["period"],
        "to_period": current["period"],
        "from_label": period_label(previous["period"]),
        "to_label": period_label(current["period"]),
        "score_from": prev_score,
        "score_to": cur_score,
        "score_change": cur_score - prev_score,
        "income_change": round(cur_i - prev_i, 2),
        "spending_change": round(cur_total - prev_total, 2),
        "savings_change": round((cur_i - cur_total) - (prev_i - prev_total), 2),
        "drivers": [d for d in drivers if d["change"] != 0][:6],
    }
