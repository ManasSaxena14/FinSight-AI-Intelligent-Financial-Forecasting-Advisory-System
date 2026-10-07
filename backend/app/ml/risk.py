"""
FinSight AI -- Next-month overspend risk
========================================
Replaces the old Health_Category classifier, which learned a label that was
defined by a formula over its own input features (target leakage).

There is no per-user panel data to train a supervised "will overspend" model,
so the risk is derived directly from the forecast distribution:

    P(overspend) = P(expense > income)
                 = Phi((mu_E - mu_I) / sqrt(sigma_E^2 + sigma_I^2))

Drivers are exact and additive: each category's forecast, its change vs. the
last month, how far it sits above the peer median, and its share of forecast
uncertainty.
"""

from __future__ import annotations

import math

from app.ml.common import EXPENSE_COLS, clean_expenses, normal_cdf
from app.ml.population import PopulationModel


def overspend_risk(forecast_result: dict, history: list[dict], population: PopulationModel) -> dict:
    next_month = forecast_result["forecast"][0]
    mu_e, sd_e = next_month["predicted_expense"], next_month["std"]
    mu_i, sd_i = next_month["predicted_income"], next_month["income_std"]

    combined = math.sqrt(sd_e ** 2 + sd_i ** 2)
    if combined > 0:
        p_overspend = normal_cdf((mu_e - mu_i) / combined)
        # P(savings rate < 10%)  <=>  P(E > 0.9 I)
        p_low_savings = normal_cdf((mu_e - 0.9 * mu_i) / math.sqrt(sd_e ** 2 + (0.9 * sd_i) ** 2))
    else:
        p_overspend = 1.0 if mu_e > mu_i else 0.0
        p_low_savings = 1.0 if mu_e > 0.9 * mu_i else 0.0

    if p_overspend >= 0.5:
        level = "high"
    elif p_overspend >= 0.2 or p_low_savings >= 0.5:
        level = "medium"
    else:
        level = "low"

    last = clean_expenses(history[-1].get("expenses"))
    income = mu_i if mu_i > 0 else float(history[-1].get("income", 0) or 0)
    total_var = sum(s ** 2 for s in next_month["category_stds"].values()) or 1.0

    drivers = []
    for col in EXPENSE_COLS:
        forecast_value = next_month["categories"][col]
        peer_median = population.peer_median_amount(income, col) if income > 0 else 0.0
        drivers.append({
            "category": col,
            "forecast": round(forecast_value, 2),
            "change_vs_last": round(forecast_value - last[col], 2),
            "above_peer_median": round(forecast_value - peer_median, 2),
            "uncertainty_share_pct": round(next_month["category_stds"][col] ** 2 / total_var * 100, 1),
        })
    drivers.sort(key=lambda d: d["above_peer_median"], reverse=True)

    return {
        "risk_level": level,
        "overspend_probability": round(p_overspend, 3),
        "low_savings_probability": round(p_low_savings, 3),
        "risk_score": int(round(p_overspend * 100)),
        "expected_margin": round(mu_i - mu_e, 2),
        "period": next_month["period"],
        "drivers": drivers,
        "method": "forecast-distribution",
    }
