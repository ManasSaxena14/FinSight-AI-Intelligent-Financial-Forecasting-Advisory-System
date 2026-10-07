"""
FinSight AI -- Insights orchestrator
====================================
One entry point that turns a user's monthly history into everything the
Analytics page, the AI summary and the chat advisor need. All numbers the LLM
narrates come from here; the LLM never does its own arithmetic.
"""

from __future__ import annotations

import calendar
from datetime import date

import numpy as np

from app.ml.anomaly import detect_anomalies
from app.ml.common import (
    DISCRETIONARY_COLS, ESSENTIAL_COLS, EXPENSE_COLS, clean_expenses, period_label, period_of,
)
from app.ml.forecasting import forecast_user
from app.ml.population import PopulationModel, get_population_model
from app.ml.risk import overspend_risk
from app.services.financial_logic import calculate_health_score, generate_alerts, generate_recommendations


def spending_pattern(income: float, expenses: dict, population: PopulationModel) -> dict:
    """Rule-based archetype plus a peer comparison of essential spending."""
    clean = clean_expenses(expenses)
    total = sum(clean.values()) or 1.0
    essential = sum(clean[c] for c in ESSENTIAL_COLS)
    discretionary = sum(clean[c] for c in DISCRETIONARY_COLS)
    safe_income = income if income > 0 else 1.0
    savings_ratio = (income - sum(clean.values())) / safe_income

    dominant = max(EXPENSE_COLS, key=lambda c: clean[c])
    rent_share_of_income = clean["Rent"] / safe_income * 100
    food_share = clean["Food"] / total * 100
    discretionary_share = discretionary / total * 100

    if savings_ratio < 0:
        archetype = "Overspender"
    elif savings_ratio >= 0.30:
        archetype = "Power Saver"
    elif rent_share_of_income >= 40:
        archetype = "Housing-Heavy"
    elif food_share >= 30:
        archetype = "Foodie"
    elif discretionary_share >= 40:
        archetype = "Lifestyle Spender"
    else:
        archetype = "Balanced"

    if income > 0:
        pct = sum(population.peer_percentile(income, c, clean[c]) for c in ESSENTIAL_COLS) / len(ESSENTIAL_COLS)
        peer_msg = f"Your essential spending (rent, food, bills) is higher than about {pct:.0f}% of people at your income."
    else:
        peer_msg = "Add your income to compare with peers."

    return {
        "archetype": archetype,
        "dominant_category": dominant,
        "dominant_pct": round(clean[dominant] / total * 100, 1),
        "essential_ratio": round(essential / safe_income, 3),
        "discretionary_ratio": round(discretionary / safe_income, 3),
        "savings_ratio": round(savings_ratio, 3),
        "peer_comparison": peer_msg,
        "method": "rules",
    }


def peer_benchmarks(income: float, expenses: dict, population: PopulationModel) -> list[dict]:
    clean = clean_expenses(expenses)
    rows = []
    for col in EXPENSE_COLS:
        rows.append({
            "category": col,
            "actual": round(clean[col], 2),
            "peer_median": round(population.peer_median_amount(income, col), 2) if income > 0 else 0.0,
            "peer_percentile": round(population.peer_percentile(income, col, clean[col]), 1) if income > 0 else 0.0,
        })
    return rows


IN_PROGRESS_SHARE = 0.85  # below this share of a typical month's spend, the current month is still filling up


def split_in_progress(history: list[dict], today: date | None = None) -> tuple[list[dict], dict | None]:
    """
    The current calendar month is usually incomplete (a few days of transactions).
    Treat it as in progress -- excluded from model training, anomalies and scores --
    when it isn't nearly over and its spending so far is clearly below a typical
    completed month. A month entered in full via the monthly form passes through.
    """
    today = today or date.today()
    if len(history) < 2 or history[-1]["period"] != period_of(today):
        return history, None
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    if today.day >= days_in_month - 1:
        return history, None
    complete = history[:-1]
    typical = float(np.median([sum(clean_expenses(h["expenses"]).values()) for h in complete[-6:]]))
    current_total = sum(clean_expenses(history[-1]["expenses"]).values())
    if typical <= 0 or current_total >= IN_PROGRESS_SHARE * typical:
        return history, None
    return complete, history[-1]


def build_insights(history: list[dict], months: int = 3, today: date | None = None) -> dict:
    """history: chronological [{"period", "income", "expenses"}], at least one month."""
    if not history:
        raise ValueError("No history")
    population = get_population_model()
    history, in_progress = split_in_progress(history, today)
    latest = history[-1]
    income = float(latest.get("income", 0) or 0)
    expenses = clean_expenses(latest.get("expenses"))
    total = sum(expenses.values())
    previous = clean_expenses(history[-2]["expenses"]) if len(history) >= 2 else None

    forecast = forecast_user(history, population, months)
    month_to_date = None
    if in_progress:
        projected = forecast["forecast"][0]  # first forecast period is the in-progress month
        spent = sum(clean_expenses(in_progress["expenses"]).values())
        month_to_date = {
            "period": in_progress["period"],
            "label": period_label(in_progress["period"]),
            "income_so_far": round(float(in_progress.get("income", 0) or 0), 2),
            "spent_so_far": round(spent, 2),
            "projected_total": projected["predicted_expense"],
            "spent_share_pct": round(spent / projected["predicted_expense"] * 100, 1) if projected["predicted_expense"] > 0 else 0.0,
            "day_of_month": (today or date.today()).day,
        }
    return {
        "latest_period": latest["period"],
        "latest_label": period_label(latest["period"]),
        "history_months": len(history),
        "month_to_date": month_to_date,
        "income": round(income, 2),
        "total_expense": round(total, 2),
        "expenses": {c: round(v, 2) for c, v in expenses.items()},
        "savings": round(income - total, 2),
        "health": calculate_health_score(income, total, expenses),
        "forecast": forecast,
        "risk": overspend_risk(forecast, history, population),
        "anomalies": detect_anomalies(history, population),
        "alerts": generate_alerts(income, expenses, previous),
        "recommendations": generate_recommendations(income, expenses),
        "pattern": spending_pattern(income, expenses, population),
        "benchmarks": peer_benchmarks(income, expenses, population),
        "model_info": {
            "forecast": forecast["method"],
            "backtest": forecast["backtest"],
            "risk": "probability from forecast distribution",
            "anomalies": "personal median/MAD baseline" if len(history) > 3 else "peer percentile (cold start)",
            "health_score": "transparent rule-based score",
            "reference_data": "synthetic peer dataset, used only for cold-start priors and benchmarks",
        },
    }
