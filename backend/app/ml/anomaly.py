"""
FinSight AI -- Spending anomaly detection
=========================================
Compares the latest month against the user's *own* normal, on income-normalised
ratios (category / income), so a raise doesn't look like a spending spike.

  >= 3 earlier months   personal baseline: robust z-score using median & MAD
  fewer                 peer baseline: percentile among same-income-bracket peers

A population IsolationForest (fitted once, in population.py) additionally scores
how unusual the overall spending mix is.
"""

from __future__ import annotations

import numpy as np

from app.ml.common import EXPENSE_COLS, clean_expenses
from app.ml.population import PopulationModel

PERSONAL_MIN_MONTHS = 3
ROBUST_Z_HIGH = 3.0
ROBUST_Z_CRITICAL = 5.0
PEER_PCT_HIGH = 97.0
PEER_PCT_CRITICAL = 99.5
MIX_PCT_FLAG = 97.0
MIN_IMPACT_SHARE = 0.01  # ignore deviations smaller than 1% of income


def _ratio(expenses: dict, income: float, col: str) -> float:
    return expenses[col] / income if income > 0 else 0.0


def detect_anomalies(history: list[dict], population: PopulationModel) -> dict:
    latest = history[-1]
    income = float(latest.get("income", 0) or 0)
    expenses = clean_expenses(latest.get("expenses"))
    earlier = [h for h in history[:-1] if float(h.get("income", 0) or 0) > 0]
    use_personal = len(earlier) >= PERSONAL_MIN_MONTHS and income > 0

    anomalies, normal = [], []
    for col in EXPENSE_COLS:
        amount = expenses[col]
        entry = {"category": col, "amount": round(amount, 2)}

        if use_personal:
            past = np.array([_ratio(clean_expenses(h["expenses"]), float(h["income"]), col) for h in earlier])
            median = float(np.median(past))
            mad = float(np.median(np.abs(past - median)))
            # Floor the scale so a perfectly flat history doesn't flag tiny wiggles.
            scale = max(1.4826 * mad, 0.1 * median, 0.01)
            current = _ratio(expenses, income, col)
            z = (current - median) / scale
            baseline = median * income
            impact = amount - baseline
            entry.update({
                "method": "personal",
                "baseline": round(baseline, 2),
                "z_score": round(z, 2),
                "anomaly_score": int(min(100, max(0, abs(z) / ROBUST_Z_CRITICAL * 100))),
            })
            flagged = z >= ROBUST_Z_HIGH and impact >= MIN_IMPACT_SHARE * income
            if flagged:
                entry["severity"] = "critical" if z >= ROBUST_Z_CRITICAL else "high"
                entry["type"] = "high"
                entry["message"] = (
                    f"{col} is ₹{impact:,.0f} above your usual level "
                    f"(about ₹{baseline:,.0f} for this income, based on {len(earlier)} earlier months)."
                )
        else:
            pct = population.peer_percentile(income, col, amount) if income > 0 else 0.0
            peer_median = population.peer_median_amount(income, col) if income > 0 else 0.0
            entry.update({
                "method": "peer",
                "baseline": round(peer_median, 2),
                "peer_percentile": round(pct, 1),
                "z_score": 0.0,
                "anomaly_score": int(round(pct)),
            })
            flagged = pct >= PEER_PCT_HIGH and amount - peer_median >= MIN_IMPACT_SHARE * income
            if flagged:
                entry["severity"] = "critical" if pct >= PEER_PCT_CRITICAL else "high"
                entry["type"] = "high"
                entry["message"] = (
                    f"{col} is higher than {pct:.0f}% of people in your income bracket. "
                    f"Add a few more months so we can compare against your own normal."
                )

        if flagged:
            anomalies.append(entry)
        else:
            entry["severity"] = "normal"
            normal.append(entry)

    mix_score = population.mix_unusualness(income, expenses) if income > 0 else 0.0
    if mix_score >= MIX_PCT_FLAG and not anomalies:
        anomalies.append({
            "category": "Overall Spending Pattern",
            "amount": round(sum(expenses.values()), 2),
            "method": "peer-mix",
            "z_score": 0.0,
            "anomaly_score": int(round(mix_score)),
            "severity": "medium",
            "type": "pattern",
            "message": "Your overall mix of spending is unusual compared with people at a similar income.",
        })

    return {
        "anomalies": anomalies,
        "normal": normal,
        "overall_anomaly_score": int(round(mix_score)),
        "baseline": "personal" if use_personal else "peer",
        "baseline_months": len(earlier),
        "summary": f"{len(anomalies)} unusual item(s) across {len(EXPENSE_COLS)} categories.",
    }
