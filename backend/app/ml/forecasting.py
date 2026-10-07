"""
FinSight AI -- Per-user expense forecasting
===========================================
Forecasts each spending category (and income) from the user's *own* monthly
history, then sums categories into a total with an 80% prediction interval.

Method, by amount of history (n = months of data):
  n >= 6   damped Holt (level + damped trend), parameters picked by one-step SSE
  2..5     simple exponential smoothing (alpha = 0.5)
  n == 1   the single observed month
While n < 6 the point forecast is shrunk toward the peer prior for the user's
income bracket (weight n / (n + 2)), so a single odd month doesn't dominate.

Uncertainty: one-step residual std when n >= 4, otherwise the peer
coefficient of variation (deliberately wide -- we know little yet). The h-step
std grows with sqrt(h). Categories are treated as independent when summing.

No seasonality term: that needs 24+ months per user, which nobody has yet.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from app.ml.common import EXPENSE_COLS, clean_expenses, period_month_name, period_label, shift_period
from app.ml.population import PopulationModel

Z_80 = 1.2816  # two-sided 80% interval
PRIOR_STRENGTH = 2.0
HOLT_MIN_POINTS = 6
RESIDUAL_MIN_POINTS = 4
INCOME_FALLBACK_CV = 0.05  # salaries are usually stable month to month

_ALPHAS = (0.2, 0.35, 0.5, 0.65, 0.8)
_BETAS = (0.0, 0.1, 0.2)
_PHI = 0.9


@dataclass
class SeriesForecast:
    means: list[float]   # one per horizon step
    stds: list[float]
    method: str


def _ses(y: np.ndarray, alpha: float) -> tuple[float, np.ndarray]:
    level = y[0]
    errors = []
    for value in y[1:]:
        errors.append(value - level)
        level = alpha * value + (1 - alpha) * level
    return level, np.array(errors)


def _holt_damped(y: np.ndarray, alpha: float, beta: float, phi: float) -> tuple[float, float, np.ndarray]:
    level, trend = y[0], y[1] - y[0]
    errors = []
    for value in y[1:]:
        predicted = level + phi * trend
        errors.append(value - predicted)
        new_level = alpha * value + (1 - alpha) * predicted
        trend = beta * (new_level - level) + (1 - beta) * phi * trend
        level = new_level
    return level, trend, np.array(errors)


def forecast_series(
    y: list[float],
    horizon: int,
    prior_mean: float | None = None,
    prior_cv: float = 0.3,
) -> SeriesForecast:
    """Forecast one non-negative monthly series `horizon` steps ahead."""
    arr = np.asarray([max(0.0, float(v)) for v in y], dtype=float)
    n = len(arr)
    if n == 0:
        base = max(0.0, prior_mean or 0.0)
        std = base * prior_cv
        return SeriesForecast([base] * horizon, [std * math.sqrt(h) for h in range(1, horizon + 1)], "peer-prior")

    if n >= HOLT_MIN_POINTS:
        best = None
        for alpha in _ALPHAS:
            for beta in _BETAS:
                level, trend, errors = _holt_damped(arr, alpha, beta, _PHI)
                sse = float(np.sum(errors[1:] ** 2))  # skip the trend-initialisation step
                if best is None or sse < best[0]:
                    best = (sse, level, trend, errors)
        _, level, trend, errors = best
        means = [level + trend * sum(_PHI ** i for i in range(1, h + 1)) for h in range(1, horizon + 1)]
        method = "damped-holt"
    elif n >= 2:
        level, errors = _ses(arr, 0.5)
        means = [level] * horizon
        method = "exp-smoothing"
    else:
        errors = np.array([])
        means = [float(arr[0])] * horizon
        method = "last-value"

    if n < HOLT_MIN_POINTS and prior_mean is not None:
        weight = n / (n + PRIOR_STRENGTH)
        means = [weight * m + (1 - weight) * prior_mean for m in means]
        method += "+peer-prior"

    if n >= RESIDUAL_MIN_POINTS and len(errors) >= 3:
        sigma1 = float(np.std(errors, ddof=1))
    else:
        sigma1 = max(means[0], 0.0) * prior_cv
    stds = [sigma1 * math.sqrt(h) for h in range(1, horizon + 1)]
    return SeriesForecast([max(0.0, m) for m in means], stds, method)


def forecast_user(
    history: list[dict],
    population: PopulationModel,
    months: int = 3,
) -> dict:
    """
    history: chronological list of {"period": "YYYY-MM", "income": float, "expenses": {cat: float}}
    Returns forecast months with category breakdown, 80% intervals and a savings estimate.
    """
    if not history:
        raise ValueError("Forecasting needs at least one month of history.")
    months = max(1, min(int(months), 12))
    n = len(history)
    latest = history[-1]
    latest_income = float(latest.get("income", 0) or 0)
    reference_income = latest_income if latest_income > 0 else float(
        np.mean([h.get("income", 0) or 0 for h in history]) or 0
    )

    cleaned = [clean_expenses(h.get("expenses")) for h in history]
    priors = population.prior_amounts(reference_income) if reference_income > 0 else {c: None for c in EXPENSE_COLS}

    per_category: dict[str, SeriesForecast] = {}
    for col in EXPENSE_COLS:
        per_category[col] = forecast_series(
            [row[col] for row in cleaned],
            months,
            prior_mean=priors[col],
            prior_cv=population.amount_cv(reference_income, col) if reference_income > 0 else 0.3,
        )

    incomes = [float(h.get("income", 0) or 0) for h in history]
    income_fc = forecast_series(incomes, months, prior_mean=None, prior_cv=INCOME_FALLBACK_CV)

    last_period = latest["period"]
    forecast = []
    for step in range(months):
        cat_means = {c: per_category[c].means[step] for c in EXPENSE_COLS}
        total = sum(cat_means.values())
        total_std = math.sqrt(sum(per_category[c].stds[step] ** 2 for c in EXPENSE_COLS))
        income_mean = income_fc.means[step]
        period = shift_period(last_period, step + 1)
        forecast.append({
            "month": step + 1,
            "period": period,
            "month_name": period_month_name(period),
            "label": period_label(period),
            "predicted_expense": round(total, 2),
            "lower": round(max(0.0, total - Z_80 * total_std), 2),
            "upper": round(total + Z_80 * total_std, 2),
            "std": round(total_std, 2),
            "predicted_income": round(income_mean, 2),
            "income_std": round(income_fc.stds[step], 2),
            "savings": round(income_mean - total, 2),
            "categories": {c: round(v, 2) for c, v in cat_means.items()},
            "category_stds": {c: round(per_category[c].stds[step], 2) for c in EXPENSE_COLS},
        })

    last_total = sum(cleaned[-1].values())
    first = forecast[0]["predicted_expense"]
    change_pct = (first - last_total) / last_total * 100 if last_total > 0 else 0.0
    trend = "increase" if change_pct > 3 else "decrease" if change_pct < -3 else "stable"

    methods = sorted({fc.method for fc in per_category.values()})
    return {
        "forecast": forecast,
        "predicted_next_month_expense": forecast[0]["predicted_expense"],
        "average_predicted_expense": round(float(np.mean([f["predicted_expense"] for f in forecast])), 2),
        "average_savings": round(float(np.mean([f["savings"] for f in forecast])), 2),
        "trend_direction": trend,
        "change_vs_last_pct": round(change_pct, 1),
        "history_months": n,
        "method": methods[0] if len(methods) == 1 else ", ".join(methods),
        "interval": "80%",
        "backtest": backtest(history, population),
    }


def backtest(history: list[dict], population: PopulationModel, min_train: int = 3) -> dict | None:
    """
    Rolling-origin one-step backtest on total spending: for every month after the
    first `min_train`, forecast it from the months before and record the error.
    """
    if len(history) < min_train + 1:
        return None
    errors, inside = [], 0
    for t in range(min_train, len(history)):
        result = forecast_user_point(history[:t], population)
        actual = sum(clean_expenses(history[t].get("expenses")).values())
        if actual <= 0:
            continue
        errors.append(abs(result["predicted_expense"] - actual) / actual)
        inside += int(result["lower"] <= actual <= result["upper"])
    if not errors:
        return None
    return {
        "mape_pct": round(float(np.mean(errors)) * 100, 1),
        "interval_coverage_pct": round(inside / len(errors) * 100, 1),
        "evaluated_months": len(errors),
    }


def forecast_user_point(history: list[dict], population: PopulationModel) -> dict:
    """One-step forecast without the (recursive) backtest -- used inside `backtest`."""
    latest_income = float(history[-1].get("income", 0) or 0)
    cleaned = [clean_expenses(h.get("expenses")) for h in history]
    priors = population.prior_amounts(latest_income) if latest_income > 0 else {c: None for c in EXPENSE_COLS}
    total, var = 0.0, 0.0
    for col in EXPENSE_COLS:
        fc = forecast_series(
            [row[col] for row in cleaned], 1, prior_mean=priors[col],
            prior_cv=population.amount_cv(latest_income, col) if latest_income > 0 else 0.3,
        )
        total += fc.means[0]
        var += fc.stds[0] ** 2
    std = math.sqrt(var)
    return {"predicted_expense": total, "lower": max(0.0, total - Z_80 * std), "upper": total + Z_80 * std}
