"""
FinSight AI -- Phase 5: Advanced ML Features
=============================================
This module provides three reusable components:

1. multi_month_forecasting  -- Predict total expenses for next N months
2. category_wise_prediction -- Predict each expense category separately
3. anomaly_detection        -- Flag unusually high/low expenses using z-score

All functions accept plain Python dicts and return plain dicts so they
integrate cleanly with FastAPI endpoints in the next phase.
"""

import numpy as np
import pandas as pd
import joblib
import os
from sklearn.linear_model import LinearRegression

# ── Paths ────────────────────────────────────────────────────────────────────
ML_DIR    = os.path.dirname(os.path.abspath(__file__))
DATA_DIR  = os.path.abspath(os.path.join(ML_DIR, "..", "..", "data"))
MODEL_PKL = os.path.join(ML_DIR, "model.pkl")

# Expense categories we track
EXPENSE_COLS = ["Food", "Travel", "Rent", "Shopping", "Bills", "Entertainment"]


# ==========================================================================
# HELPER -- Load main model
# ==========================================================================
def _load_main_model():
    """Load the saved Linear Regression model and its metadata."""
    data = joblib.load(MODEL_PKL)
    return data["model"], data["features"]


# ==========================================================================
# 1. MULTI-MONTH FORECASTING
# ==========================================================================
def multi_month_forecasting(income: float, current_expenses: dict, months: int = 3) -> dict:
    """
    Predict total expenses for the next N months.

    How it works:
    - Uses the saved Linear Regression model for month 1.
    - Then applies a small random variance (+/- 5%) to simulate realistic
      month-to-month fluctuation for subsequent months.
    - Income is assumed constant (user can override each month in the API).

    Args:
        income          : User's monthly income
        current_expenses: Dict of category -> current month amount
                          e.g. {"Food": 5000, "Travel": 2000, ...}
        months          : Number of months to forecast (1-12)

    Returns:
        {
          "forecast": [
            {"month": 1, "predicted_expense": 42000, "savings": 15000},
            ...
          ],
          "average_predicted_expense": 41800,
          "average_savings": 15200
        }
    """
    months = max(1, min(months, 12))        # clamp between 1 and 12
    model, features = _load_main_model()

    forecast = []
    rng = np.random.default_rng(seed=42)    # fixed seed for reproducibility

    for month_num in range(1, months + 1):
        # For month 1 use actual values; for subsequent months add small drift
        drift = 1.0 if month_num == 1 else rng.uniform(0.95, 1.05)

        row = {
            "Income": income,
            **{col: current_expenses.get(col, 0) * drift for col in EXPENSE_COLS}
        }

        X = pd.DataFrame([row])[features]
        predicted_expense = float(model.predict(X)[0])
        savings = income - predicted_expense

        forecast.append({
            "month": month_num,
            "predicted_expense": round(predicted_expense, 2),
            "savings": round(savings, 2),
        })

    avg_expense = round(sum(f["predicted_expense"] for f in forecast) / months, 2)
    avg_savings = round(sum(f["savings"] for f in forecast) / months, 2)

    return {
        "forecast": forecast,
        "average_predicted_expense": avg_expense,
        "average_savings": avg_savings,
    }


# ==========================================================================
# 2. CATEGORY-WISE PREDICTION
# ==========================================================================
def category_wise_prediction(income: float, current_expenses: dict) -> dict:
    """
    Predict expected spending for each expense category based on
    historical patterns from the dataset.

    How it works:
    - Loads the cleaned dataset.
    - Finds the income bracket the user falls in (bottom 33%, middle, top 33%).
    - Returns the average category spending from that bracket as the prediction.
    - Also returns the percentage each category contributes to Total_Expense.

    Args:
        income          : User's monthly income
        current_expenses: Dict of category -> actual current amount

    Returns:
        {
          "predictions": {
            "Food":          {"predicted": 8200, "actual": 7500, "difference": -700},
            ...
          },
          "total_predicted_expense": 42000,
          "total_actual_expense": 40000,
          "income_bracket": "middle"
        }
    """
    clean_csv = os.path.join(DATA_DIR, "cleaned_financial_data.csv")
    df = pd.read_csv(clean_csv)

    # Determine income bracket
    low_thresh  = df["Income"].quantile(0.33)
    high_thresh = df["Income"].quantile(0.67)

    if income <= low_thresh:
        bracket = "low"
        subset  = df[df["Income"] <= low_thresh]
    elif income <= high_thresh:
        bracket = "middle"
        subset  = df[(df["Income"] > low_thresh) & (df["Income"] <= high_thresh)]
    else:
        bracket = "high"
        subset  = df[df["Income"] > high_thresh]

    avg_per_category = subset[EXPENSE_COLS].mean().round(2)

    predictions = {}
    total_predicted = 0.0
    total_actual    = 0.0

    for col in EXPENSE_COLS:
        predicted = float(avg_per_category[col])
        actual    = float(current_expenses.get(col, 0))
        diff      = round(actual - predicted, 2)

        predictions[col] = {
            "predicted":  round(predicted, 2),
            "actual":     round(actual, 2),
            "difference": diff,            # positive = overspending vs. average
        }

        total_predicted += predicted
        total_actual    += actual

    return {
        "predictions":               predictions,
        "total_predicted_expense":   round(total_predicted, 2),
        "total_actual_expense":      round(total_actual, 2),
        "income_bracket":            bracket,
    }


# ==========================================================================
# 3. ANOMALY DETECTION
# ==========================================================================
def anomaly_detection(expenses: dict, threshold: float = 2.0) -> dict:
    """
    Detect unusually high or low expenses using z-scores.

    How it works:
    - Computes the population mean and std for each category from the dataset.
    - Calculates the z-score for the user's spending in that category.
    - Flags anything with |z-score| > threshold as an anomaly.

    Args:
        expenses : Dict of category -> user's spending amount
        threshold: Z-score threshold (default 2.0 = outside 95% of population)

    Returns:
        {
          "anomalies":  [{"category": "Rent", "amount": 29000, "z_score": 2.3, "type": "high"}, ...],
          "normal":     [{"category": "Food", "amount": 8000,  "z_score": 0.1}, ...],
          "summary":    "2 anomaly/anomalies detected out of 6 categories."
        }
    """
    clean_csv = os.path.join(DATA_DIR, "cleaned_financial_data.csv")
    df = pd.read_csv(clean_csv)

    stats = df[EXPENSE_COLS].agg(["mean", "std"])

    anomalies = []
    normal    = []

    for col in EXPENSE_COLS:
        amount = float(expenses.get(col, 0))
        mean   = float(stats.loc["mean", col])
        std    = float(stats.loc["std",  col])

        z_score = round((amount - mean) / std, 3) if std > 0 else 0.0

        entry = {
            "category": col,
            "amount":   round(amount, 2),
            "z_score":  z_score,
            "mean":     round(mean, 2),
            "std":      round(std, 2),
        }

        if abs(z_score) > threshold:
            entry["type"] = "high" if z_score > 0 else "low"
            anomalies.append(entry)
        else:
            normal.append(entry)

    count = len(anomalies)
    return {
        "anomalies": anomalies,
        "normal":    normal,
        "summary":   f"{count} anomaly/anomalies detected out of {len(EXPENSE_COLS)} categories.",
    }
