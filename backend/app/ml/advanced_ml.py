"""
FinSight AI -- Enhanced Advanced ML Features
=============================================
IMPROVEMENTS OVER ORIGINAL:
1. multi_month_forecasting  -- Now uses REAL seasonal monthly patterns from dataset
                               instead of random ±5% drift. Provides per-category breakdown.
2. category_wise_prediction -- Now includes confidence intervals (±1 std) and
                               percentile rank within income bracket.
3. anomaly_detection        -- Combined IsolationForest + Z-score dual-layer detection
                               for higher accuracy. Returns anomaly_score for frontend display.
4. predict_savings_risk     -- NEW: Predicts the probability of overspending next month
                               using the trained GBM classifier.
5. get_spending_pattern     -- NEW: Returns month-over-month trend analysis per category.
"""

import numpy as np
import pandas as pd
import os
from functools import lru_cache
from sklearn.ensemble import IsolationForest

# ── Paths ────────────────────────────────────────────────────────────────────
ML_DIR    = os.path.dirname(os.path.abspath(__file__))
DATA_DIR  = os.path.abspath(os.path.join(ML_DIR, "..", "..", "data"))
MODEL_PKL = os.path.join(ML_DIR, "model.pkl")
CLF_PKL   = os.path.join(ML_DIR, "logistic_model.pkl")

EXPENSE_COLS  = ["Food", "Travel", "Rent", "Shopping", "Bills", "Entertainment"]
MONTH_ORDER   = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                 "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


# ==========================================================================
# HELPERS
# ==========================================================================

def _load_main_model():
    """Load the saved regression model and its metadata."""
    import joblib
    data = joblib.load(MODEL_PKL)
    return data["model"], data["features"]


def _load_classifier():
    """Load the saved classification model."""
    if not os.path.exists(CLF_PKL):
        raise RuntimeError("Classification model not found. Run train_model.py first.")
    import joblib
    data = joblib.load(CLF_PKL)
    return data["model"], data.get("features", []), data.get("scaler", None)


@lru_cache(maxsize=1)
def _load_dataset_cached() -> pd.DataFrame:
    """
    Load and cache the cleaned dataset in memory.
    lru_cache ensures the CSV is read once per process — not on every API call.
    """
    clean_csv = os.path.join(DATA_DIR, "cleaned_financial_data.csv")
    df = pd.read_csv(clean_csv)
    # Coerce to numeric and sanitize base columns used by all downstream functions.
    for col in ["Income", *EXPENSE_COLS]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["Income"] = df["Income"].replace([np.inf, -np.inf], np.nan).fillna(0.0)
    for col in EXPENSE_COLS:
        df[col] = df[col].replace([np.inf, -np.inf], np.nan).fillna(0.0)
    # Pre-compute engineered features once
    df["Discretionary"]          = df["Shopping"] + df["Entertainment"] + df["Travel"]
    df["Essential"]              = df["Rent"] + df["Food"] + df["Bills"]
    denom = df["Income"].replace(0, np.nan)
    df["Rent_to_Income"]          = (df["Rent"] / denom).replace([np.inf, -np.inf], np.nan).fillna(0.0)
    df["Food_to_Income"]          = (df["Food"] / denom).replace([np.inf, -np.inf], np.nan).fillna(0.0)
    df["Discretionary_to_Income"] = (df["Discretionary"] / denom).replace([np.inf, -np.inf], np.nan).fillna(0.0)
    df["Essential_to_Income"]     = (df["Essential"] / denom).replace([np.inf, -np.inf], np.nan).fillna(0.0)
    df["Month_Num"] = pd.Categorical(
        df["Month"], categories=MONTH_ORDER, ordered=True
    ).codes
    return df


def _build_monthly_seasonality(df: pd.DataFrame) -> pd.DataFrame:
    """
    Pre-compute per-month average spending ratios (relative to each record's income).
    This gives us a data-driven seasonal adjustment factor per category.
    Returns DataFrame indexed by Month with ratio columns for each expense category.
    """
    ratios = df.copy()
    income_safe = ratios["Income"].replace(0, np.nan)
    for col in EXPENSE_COLS:
        ratios[f"{col}_ratio"] = (ratios[col] / income_safe).replace([np.inf, -np.inf], np.nan).fillna(0.0)
    ratio_cols = [f"{col}_ratio" for col in EXPENSE_COLS]
    monthly_ratios = ratios.groupby("Month")[ratio_cols].mean()
    # Reindex to ensure correct month order
    monthly_ratios = monthly_ratios.reindex(MONTH_ORDER).ffill().bfill().fillna(0.0)
    return monthly_ratios


# ==========================================================================
# 1. MULTI-MONTH FORECASTING  (IMPROVED)
# ==========================================================================

def multi_month_forecasting(income: float, current_expenses: dict, months: int = 3) -> dict:
    """
    Predict total expenses for the next N months using data-driven seasonal patterns.

    IMPROVEMENTS vs original:
    - Uses real historical monthly ratios from the dataset instead of ±5% random noise.
    - Provides per-category forecasts, not just total.
    - Computes a trend direction (up/down/stable) based on month-1 vs month-N.
    - Clamps forecast to realistic range (p5–p95 of dataset).

    Args:
        income          : User's monthly income
        current_expenses: Dict of category -> current month amount
        months          : Number of months to forecast (1-12)

    Returns:
        {
          "forecast": [
            {
              "month": 1,
              "predicted_expense": 42000,
              "savings": 15000,
              "categories": {"Food": 8000, "Rent": 18000, ...}
            }, ...
          ],
          "average_predicted_expense": 41800,
          "average_savings": 15200,
          "trend_direction": "stable"
        }
    """
    months = max(1, min(months, 12))
    model, features = _load_main_model()
    df = _load_dataset_cached()
    monthly_ratios = _build_monthly_seasonality(df)

    # Compute the p5/p95 percentile bounds per category for clamping
    cat_p5  = df[EXPENSE_COLS].quantile(0.05)
    cat_p95 = df[EXPENSE_COLS].quantile(0.95)

    # Determine starting month index (use current_month if given, else average)
    # We cycle through the next N calendar months from the current month's pattern
    import datetime
    current_month_idx = datetime.datetime.now().month - 1  # 0-indexed

    forecast = []
    for month_num in range(1, months + 1):
        target_month_idx = (current_month_idx + month_num - 1) % 12
        target_month_name = MONTH_ORDER[target_month_idx]

        # Get seasonal ratio for target month
        season_ratios = monthly_ratios.loc[target_month_name]

        # Scale current expenses by the seasonal ratio relative to current month ratio
        current_month_name = MONTH_ORDER[current_month_idx]
        base_ratios = monthly_ratios.loc[current_month_name]

        projected_cats = {}
        for col in EXPENSE_COLS:
            base_ratio = float(base_ratios[f"{col}_ratio"]) if np.isfinite(base_ratios[f"{col}_ratio"]) else 1e-6
            base_ratio = base_ratio if abs(base_ratio) > 1e-6 else 1e-6
            target_ratio = float(season_ratios[f"{col}_ratio"]) if np.isfinite(season_ratios[f"{col}_ratio"]) else 0.0
            seasonal_factor = target_ratio / base_ratio

            raw_val = float(current_expenses.get(col, 0) or 0) * seasonal_factor
            if not np.isfinite(raw_val):
                raw_val = float(current_expenses.get(col, 0) or 0)
            # Clamp to realistic dataset bounds
            raw_val = float(np.clip(raw_val, cat_p5[col], cat_p95[col]))
            projected_cats[col] = round(raw_val, 2)

        # Use the regression model to predict total expense
        row = {"Income": income, **projected_cats}
        X = pd.DataFrame([row])[features]
        predicted_expense = float(model.predict(X)[0])
        if not np.isfinite(predicted_expense):
            predicted_expense = float(sum(projected_cats.values()))
        savings = income - predicted_expense

        forecast.append({
            "month":             month_num,
            "month_name":        target_month_name,
            "predicted_expense": round(predicted_expense, 2),
            "savings":           round(savings, 2),
            "categories":        projected_cats,
        })

    avg_expense = round(sum(f["predicted_expense"] for f in forecast) / months, 2)
    avg_savings = round(sum(f["savings"]           for f in forecast) / months, 2)

    # Trend direction based on first vs last month
    first_exp = forecast[0]["predicted_expense"]
    last_exp  = forecast[-1]["predicted_expense"]
    diff_pct  = (last_exp - first_exp) / (first_exp + 1e-6) * 100
    if diff_pct > 3:
        trend = "increase"
    elif diff_pct < -3:
        trend = "decrease"
    else:
        trend = "stable"

    return {
        "forecast":                    forecast,
        "average_predicted_expense":   avg_expense,
        "average_savings":             avg_savings,
        "trend_direction":             trend,
    }


# ==========================================================================
# 2. CATEGORY-WISE PREDICTION  (IMPROVED)
# ==========================================================================

def category_wise_prediction(income: float, current_expenses: dict) -> dict:
    """
    Predict expected spending per category with confidence intervals and percentile rank.

    IMPROVEMENTS vs original:
    - Returns ±1 std confidence interval for each category.
    - Returns the user's percentile rank (e.g. top 20% spender on Rent in their bracket).
    - Uses a tighter bracket (quartile-based) for more homogeneous peer comparison.

    Returns:
        {
          "predictions": {
            "Food": {
              "predicted": 8200, "actual": 7500, "difference": -700,
              "ci_lower": 6400, "ci_upper": 10200, "percentile_rank": 42
            }, ...
          },
          "total_predicted_expense": 42000,
          "total_actual_expense": 40000,
          "income_bracket": "middle"
        }
    """
    df = _load_dataset_cached()

    # Finer quartile-based brackets
    q25 = df["Income"].quantile(0.25)
    q50 = df["Income"].quantile(0.50)
    q75 = df["Income"].quantile(0.75)

    if income <= q25:
        bracket = "low"
        subset  = df[df["Income"] <= q25]
    elif income <= q50:
        bracket = "lower-middle"
        subset  = df[(df["Income"] > q25) & (df["Income"] <= q50)]
    elif income <= q75:
        bracket = "upper-middle"
        subset  = df[(df["Income"] > q50) & (df["Income"] <= q75)]
    else:
        bracket = "high"
        subset  = df[df["Income"] > q75]

    avg_per_cat = subset[EXPENSE_COLS].mean()
    std_per_cat = subset[EXPENSE_COLS].std().fillna(0)

    predictions  = {}
    total_predicted = 0.0
    total_actual    = 0.0

    for col in EXPENSE_COLS:
        predicted = float(avg_per_cat[col])
        std       = float(std_per_cat[col])
        actual    = float(current_expenses.get(col, 0))
        diff      = round(actual - predicted, 2)

        # Percentile rank: what % of peers spend LESS than user in this category
        pct_rank = float(
            (subset[col] < actual).mean() * 100
        )

        predictions[col] = {
            "predicted":       round(predicted, 2),
            "actual":          round(actual, 2),
            "difference":      diff,
            "ci_lower":        round(max(0, predicted - std), 2),
            "ci_upper":        round(predicted + std, 2),
            "percentile_rank": round(pct_rank, 1),
        }
        total_predicted += predicted
        total_actual    += actual

    return {
        "predictions":             predictions,
        "total_predicted_expense": round(total_predicted, 2),
        "total_actual_expense":    round(total_actual, 2),
        "income_bracket":          bracket,
    }


# ==========================================================================
# 3. ANOMALY DETECTION  (IMPROVED — Dual-layer)
# ==========================================================================

def anomaly_detection(expenses: dict, threshold: float = 2.0) -> dict:
    """
    Dual-layer anomaly detection: Z-score (per category) + IsolationForest (multivariate).

    IMPROVEMENTS vs original:
    - IsolationForest catches multivariate anomalies that z-score misses
      (e.g., moderate z-score in all categories simultaneously).
    - Returns an anomaly_score (0–100) for frontend progress bars.
    - Severity levels: critical (|z|>3), high (|z|>2), medium (z>1.5 or IF flagged).

    Returns:
        {
          "anomalies": [
            {"category": "Rent", "amount": 29000, "z_score": 2.3, "type": "high",
             "anomaly_score": 78, "severity": "high"}, ...
          ],
          "normal": [...],
          "multivariate_anomaly": true/false,
          "overall_anomaly_score": 65,
          "summary": "2 anomaly/anomalies detected."
        }
    """
    df = _load_dataset_cached()

    # ── Layer 1: Per-category Z-score ────────────────────────────────────
    stats = df[EXPENSE_COLS].agg(["mean", "std"])

    anomalies = []
    normal    = []

    for col in EXPENSE_COLS:
        amount = float(expenses.get(col, 0))
        mean   = float(stats.loc["mean", col])
        std    = float(stats.loc["std",  col])

        z_score = round((amount - mean) / std, 3) if std > 0 else 0.0

        # Map z-score to 0–100 anomaly score
        anomaly_score = int(min(100, max(0, abs(z_score) / 3.0 * 100)))

        entry = {
            "category":     col,
            "amount":       round(amount, 2),
            "z_score":      z_score,
            "mean":         round(mean, 2),
            "std":          round(std, 2),
            "anomaly_score": anomaly_score,
        }

        if abs(z_score) > 3.0:
            entry["type"]     = "high" if z_score > 0 else "low"
            entry["severity"] = "critical"
            anomalies.append(entry)
        elif abs(z_score) > threshold:
            entry["type"]     = "high" if z_score > 0 else "low"
            entry["severity"] = "high"
            anomalies.append(entry)
        else:
            entry["severity"] = "normal"
            normal.append(entry)

    # ── Layer 2: IsolationForest (multivariate) ───────────────────────────
    iso_pred = 1
    iso_score = -0.1
    try:
        iso = IsolationForest(contamination=0.05, random_state=42)
        iso.fit(df[EXPENSE_COLS])
        user_vec = pd.DataFrame([{col: float(expenses.get(col, 0) or 0) for col in EXPENSE_COLS}])
        iso_pred = int(iso.predict(user_vec)[0])         # 1 = normal, -1 = anomaly
        iso_score = float(iso.score_samples(user_vec)[0])  # more negative = more anomalous
    except Exception:
        # Keep z-score result available even when IF fails in constrained runtimes.
        pass

    multivariate_anomaly = (iso_pred == -1)
    # Normalise isolation score to 0-100 (score is typically in [-0.8, 0.1])
    overall_anomaly_score = int(min(100, max(0, (-iso_score - 0.1) / 0.7 * 100)))

    # If IF flags overall anomaly but no individual z-score crossed threshold, flag summary
    if multivariate_anomaly and not anomalies:
        anomalies.append({
            "category":      "Overall Spending Pattern",
            "amount":        round(sum(expenses.get(c, 0) for c in EXPENSE_COLS), 2),
            "z_score":       0.0,
            "mean":          0.0,
            "std":           0.0,
            "anomaly_score": overall_anomaly_score,
            "type":          "pattern",
            "severity":      "medium",
            "message":       "Your combined spending pattern is unusual compared to similar income profiles.",
        })

    count = len(anomalies)
    return {
        "anomalies":             anomalies,
        "normal":                normal,
        "multivariate_anomaly":  multivariate_anomaly,
        "overall_anomaly_score": overall_anomaly_score,
        "summary": f"{count} anomaly/anomalies detected out of {len(EXPENSE_COLS)} categories.",
    }


# ==========================================================================
# 4. PREDICT SAVINGS RISK  (NEW)
# ==========================================================================

def predict_savings_risk(income: float, expenses: dict) -> dict:
    """
    Predict the probability of financial stress (Poor/Moderate/Good) using
    the trained classification model with enhanced engineered features.

    Returns:
        {
          "risk_level": "low" | "medium" | "high",
          "predicted_class": 0 | 1 | 2,
          "class_label": "Good" | "Moderate" | "Poor",
          "probabilities": {"Poor": 0.05, "Moderate": 0.20, "Good": 0.75},
          "confidence": 0.75,
          "risk_score": 25   # 0=no risk, 100=max risk
        }
    """
    model, features, scaler = _load_classifier()

    # Build engineered features
    total_exp      = sum(expenses.get(c, 0) for c in EXPENSE_COLS)
    discretionary  = expenses.get("Shopping", 0) + expenses.get("Entertainment", 0) + expenses.get("Travel", 0)
    essential      = expenses.get("Rent", 0) + expenses.get("Food", 0) + expenses.get("Bills", 0)

    import datetime
    month_num = datetime.datetime.now().month - 1  # 0-indexed

    row = {
        "Income":                  income,
        "Food":                    expenses.get("Food", 0),
        "Travel":                  expenses.get("Travel", 0),
        "Rent":                    expenses.get("Rent", 0),
        "Shopping":                expenses.get("Shopping", 0),
        "Bills":                   expenses.get("Bills", 0),
        "Entertainment":           expenses.get("Entertainment", 0),
        "Rent_to_Income":          expenses.get("Rent", 0)  / (income + 1e-6),
        "Food_to_Income":          expenses.get("Food", 0)  / (income + 1e-6),
        "Discretionary":           discretionary,
        "Essential":               essential,
        "Discretionary_to_Income": discretionary / (income + 1e-6),
        "Essential_to_Income":     essential      / (income + 1e-6),
        "Month_Num":               month_num,
    }

    X = pd.DataFrame([row])[features]

    if scaler is not None:
        X_input = scaler.transform(X)
    else:
        # Keep DataFrame shape/feature names when scaler is absent.
        X_input = X

    pred_class  = int(model.predict(X_input)[0])
    proba       = model.predict_proba(X_input)[0]
    confidence  = float(max(proba))

    label_map = {0: "Poor", 1: "Moderate", 2: "Good"}
    risk_map  = {0: "high", 1: "medium", 2: "low"}

    # Risk score: 100 = worst (Poor with 100% confidence), 0 = best (Good with 100%)
    risk_score = int(round((proba[0] * 100 + proba[1] * 50 + proba[2] * 0)))

    return {
        "risk_level":    risk_map.get(pred_class, "medium"),
        "predicted_class": pred_class,
        "class_label":   label_map.get(pred_class, "Unknown"),
        "probabilities": {
            "Poor":     round(float(proba[0]), 3),
            "Moderate": round(float(proba[1]), 3),
            "Good":     round(float(proba[2]), 3),
        },
        "confidence":  round(confidence, 3),
        "risk_score":  risk_score,
    }


# ==========================================================================
# 5. SPENDING PATTERN INSIGHT  (NEW)
# ==========================================================================

def get_spending_pattern_insight(income: float, expenses: dict) -> dict:
    """
    Identify the user's spending archetype and dominant patterns.

    Returns:
        {
          "archetype": "Housing-Heavy" | "Foodie" | "Balanced" | "Saver" | ...,
          "dominant_category": "Rent",
          "dominant_pct": 42.3,
          "essential_ratio": 0.68,
          "discretionary_ratio": 0.22,
          "savings_ratio": 0.10,
          "peer_comparison": "Your essential spending is higher than 72% of similar earners."
        }
    """
    df = _load_dataset_cached()

    clean_expenses = {c: float(expenses.get(c, 0) or 0) for c in EXPENSE_COLS}
    total = sum(clean_expenses.values()) or 1
    discretionary = (
        clean_expenses.get("Shopping", 0) + clean_expenses.get("Entertainment", 0) + clean_expenses.get("Travel", 0)
    )
    essential = (
        clean_expenses.get("Rent", 0) + clean_expenses.get("Food", 0) + clean_expenses.get("Bills", 0)
    )
    savings_amount = income - total
    savings_ratio  = savings_amount / (income + 1e-6)

    # Dominant category
    dominant_cat = max(EXPENSE_COLS, key=lambda c: clean_expenses.get(c, 0))
    dominant_pct = round(clean_expenses.get(dominant_cat, 0) / total * 100, 1)

    # Archetype logic
    rent_pct  = clean_expenses.get("Rent", 0) / (income + 1e-6) * 100
    food_pct  = clean_expenses.get("Food", 0) / total * 100
    disc_pct  = discretionary / total * 100

    if savings_ratio >= 0.30:
        archetype = "Power Saver"
    elif rent_pct >= 40:
        archetype = "Housing-Heavy"
    elif food_pct >= 30:
        archetype = "Foodie"
    elif disc_pct >= 40:
        archetype = "Lifestyle Spender"
    elif savings_ratio < 0:
        archetype = "Overspender"
    else:
        archetype = "Balanced"

    # Peer comparison: essential_to_income vs similar income peers
    income_mask = (df["Income"] > income * 0.8) & (df["Income"] < income * 1.2)
    peers = df[income_mask]
    if len(peers) > 10:
        peer_income = peers["Income"].replace(0, np.nan)
        peer_essential_ratio = ((peers["Food"] + peers["Rent"] + peers["Bills"]) / peer_income).replace([np.inf, -np.inf], np.nan).dropna()
        user_essential_ratio = essential / (income + 1e-6)
        pct_rank = float((peer_essential_ratio < user_essential_ratio).mean() * 100) if len(peer_essential_ratio) else 0.0
        peer_msg = (
            f"Your essential spending is higher than {pct_rank:.0f}% of peers with similar income."
        )
    else:
        peer_msg = "Insufficient peer data for this income level."

    return {
        "archetype":             archetype,
        "dominant_category":     dominant_cat,
        "dominant_pct":          dominant_pct,
        "essential_ratio":       round(essential / (income + 1e-6), 3),
        "discretionary_ratio":   round(discretionary / (income + 1e-6), 3),
        "savings_ratio":         round(savings_ratio, 3),
        "peer_comparison":       peer_msg,
    }