"""
FinSight AI -- Monte Carlo goal planner
=======================================
Simulates thousands of possible futures for a goal. Each month, the user's
savings are drawn from the forecast distribution (income minus spending, with
its uncertainty). The user pays the planned contribution plus any shortfall
from earlier months ("catch-up"), but never more than that month's savings. The result is the probability of reaching the goal on time,
a fan of outcomes, and the monthly contribution needed for an 80% chance.
"""

from __future__ import annotations

from datetime import date

import numpy as np

DAYS_PER_MONTH = 30.44
SIMULATIONS = 4000


def months_left(days: int) -> int:
    """Whole months of saving before a deadline. Shared with the on-track check so both agree."""
    return max(1, round(days / DAYS_PER_MONTH))


def _months_until(target: date, today: date) -> int:
    return months_left((target - today).days)


def _monthly_means(mean: float | list[float], months: int) -> np.ndarray:
    """Per-month expected savings; a list is used month by month (last value repeats)."""
    if isinstance(mean, (list, tuple, np.ndarray)) and len(mean):
        values = list(mean)[:months]
        values += [values[-1]] * (months - len(values))
        return np.array(values, dtype=float)
    return np.full(months, float(mean))


def _simulate(remaining: float, months: int, mean, std: float, contribution: float, rng: np.random.Generator):
    savings = rng.normal(_monthly_means(mean, months), max(std, 1.0), size=(SIMULATIONS, months))
    paths = np.empty_like(savings)
    total = np.zeros(SIMULATIONS)
    for m in range(months):
        due = contribution * (m + 1) - total            # this month's plan plus any shortfall so far
        paid = np.clip(np.minimum(savings[:, m], due), 0, None)
        total = total + paid
        paths[:, m] = total
    return paths


def plan_goal(
    target_amount: float,
    current_savings: float,
    target_date: str,
    monthly_savings_mean: float | list[float],
    monthly_savings_std: float,
    planned_contribution: float | None = None,
    today: date | None = None,
    seed: int = 7,
) -> dict:
    today = today or date.today()
    remaining = max(0.0, target_amount - current_savings)
    if remaining <= 0:
        return {"probability": 1.0, "months": 0, "remaining": 0.0, "status": "reached"}
    deadline = date.fromisoformat(target_date)
    months = _months_until(deadline, today)
    required = remaining / months
    planned = planned_contribution if planned_contribution and planned_contribution > 0 else required
    rng = np.random.default_rng(seed)

    paths = _simulate(remaining, months, monthly_savings_mean, monthly_savings_std, planned, rng)
    probability = float(np.mean(paths[:, -1] >= remaining))

    # Smallest contribution (on a grid) that gives an 80% chance.
    needed_for_80 = None
    for multiple in np.linspace(0.5, 4.0, 36):
        candidate = required * multiple
        p = float(np.mean(_simulate(remaining, months, monthly_savings_mean, monthly_savings_std, candidate,
                                    np.random.default_rng(seed))[:, -1] >= remaining))
        if p >= 0.8:
            needed_for_80 = round(candidate, -1)
            break

    reached_month = np.argmax(paths >= remaining, axis=1).astype(float)
    reached_month[paths[:, -1] < remaining] = np.nan
    median_month = None if np.all(np.isnan(reached_month)) else int(np.nanmedian(reached_month)) + 1

    fan = [
        {
            "month": m + 1,
            "p10": round(float(current_savings + np.percentile(paths[:, m], 10)), 2),
            "p50": round(float(current_savings + np.percentile(paths[:, m], 50)), 2),
            "p90": round(float(current_savings + np.percentile(paths[:, m], 90)), 2),
        }
        for m in range(months)
    ]
    status = "likely" if probability >= 0.8 else "possible" if probability >= 0.5 else "unlikely"
    expected = _monthly_means(monthly_savings_mean, months)
    if needed_for_80 is None:
        note = ("No monthly amount reaches an 80% chance by this date, because it would need more than you are "
                "forecast to save. Extending the date or lowering the target would help.")
    else:
        note = f"Setting aside about ₹{needed_for_80:,.0f} a month gives roughly an 80% chance."
    return {
        "probability": round(probability, 3),
        "status": status,
        "months": months,
        "remaining": round(remaining, 2),
        "required_monthly": round(required, 2),
        "planned_monthly": round(planned, 2),
        "needed_for_80pct": needed_for_80,
        "median_months_to_reach": median_month,
        "monthly_savings_mean": round(float(expected.mean()), 2),
        "note": note,
        "monthly_savings_std": round(monthly_savings_std, 2),
        "fan": fan,
        "simulations": SIMULATIONS,
    }
