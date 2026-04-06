"""
FinSight AI -- Enhanced Financial Business Logic
=================================================
CHANGES vs original:
1. calculate_health_score() — unchanged (already solid).
2. generate_alerts()        — now includes Rent burden alert and
                              bills overload alert in addition to overspend & category spikes.
3. generate_recommendations() — richer, context-aware suggestions:
   - Tips are more specific (percentage targets, not just generic rules).
   - Uses dual-layer anomaly_detection (IsolationForest + Z-score).
   - Adds positive reinforcement when health is good.
   - Avoids duplicate messages by deduplicating.
"""

from typing import Dict, List, Optional
from app.ml.advanced_ml import category_wise_prediction, anomaly_detection


def calculate_health_score(
    income: float, total_expense: float, expenses: Dict[str, float] = None
) -> dict:
    """
    Calculate Financial Health Score (0-100) using a non-linear, nuanced model.

    Strategy:
    - Base score built progressively from savings rate.
    - Category-level penalties applied for housing burden or single-category dominance.
    """
    savings      = income - total_expense
    savings_rate = (savings / income) * 100 if income > 0 else 0

    # Base Score from Savings Rate (non-linear)
    if savings_rate < 0:
        base_score = max(0, 30 + savings_rate)
    elif savings_rate < 10:
        base_score = 40 + savings_rate * 2         # 40 → 60
    elif savings_rate < 20:
        base_score = 60 + (savings_rate - 10) * 1.5  # 60 → 75
    elif savings_rate < 30:
        base_score = 75 + (savings_rate - 20) * 1.0  # 75 → 85
    elif savings_rate < 50:
        base_score = 85 + (savings_rate - 30) * 0.5  # 85 → 95
    else:
        base_score = min(100, 95 + (savings_rate - 50) * 0.2)

    # Category Penalty Factor
    penalty = 0
    if expenses and total_expense > 0:
        highest_expense = max(expenses.values())
        highest_ratio   = (highest_expense / income) * 100 if income > 0 else 0

        if highest_ratio > 40:
            penalty += 10
        elif highest_ratio > 30:
            penalty += 5

        if highest_expense / total_expense > 0.7:
            penalty += 5

    final_score = int(round(max(0, min(100, base_score - penalty))))

    if final_score < 40:
        status = "Requires Attention"
    elif final_score < 60:
        status = "Fair"
    elif final_score < 75:
        status = "Good"
    elif final_score < 85:
        status = "Very Good"
    elif final_score < 95:
        status = "Excellent"
    else:
        status = "Elite"

    return {
        "score":            final_score,
        "status":           status,
        "savings_rate_pct": round(savings_rate, 1),
    }


def generate_alerts(
    income: float,
    current_expenses: Dict[str, float],
    previous_expenses: Optional[Dict[str, float]] = None,
) -> List[str]:
    """
    Detect critical situations requiring immediate attention.

    Alert types:
    1. Overspending (total > income)
    2. Category spikes vs last month (≥50% increase)
    3. Rent/housing burden (>40% of income)   — NEW
    4. Bills overload (>15% of income)        — NEW
    """
    alerts = []
    total_expense = sum(current_expenses.values())

    # 1. Overspending
    if total_expense > income:
        over = total_expense - income
        alerts.append(
            f"CRITICAL: You are overspending. Expenses exceed income by ₹{over:,.0f}. "
            "Immediate action required."
        )

    # 2. Category spikes vs last month
    if previous_expenses:
        for cat, curr_val in current_expenses.items():
            prev_val = previous_expenses.get(cat, 0)
            if prev_val > 0:
                increase_pct = ((curr_val - prev_val) / prev_val) * 100
                if increase_pct >= 50.0 and curr_val > 500:
                    alerts.append(
                        f"ALERT: Sudden spike in {cat} spending — "
                        f"increased by {increase_pct:.1f}% vs last month."
                    )

    # 3. Rent/Housing burden
    rent = current_expenses.get("Rent", 0)
    if income > 0 and (rent / income) >= 0.40:
        alerts.append(
            f"WARNING: Your Rent is {rent/income*100:.1f}% of income "
            "(recommended max: 30%). Consider reviewing your housing cost."
        )

    # 4. Bills overload
    bills = current_expenses.get("Bills", 0)
    if income > 0 and (bills / income) >= 0.15:
        alerts.append(
            f"WARNING: Bills are consuming {bills/income*100:.1f}% of income. "
            "Review subscriptions and utility plans for savings opportunities."
        )

    return alerts


def generate_recommendations(
    income: float, expenses: Dict[str, float]
) -> List[str]:
    """
    Rule-based + ML-enhanced recommendation engine.

    IMPROVEMENTS vs original:
    - More specific percentage targets (e.g., 'reduce by 10–15%').
    - Avoids duplication via a seen-set.
    - Uses dual-layer anomaly detection (IsolationForest + Z-score).
    - Adds positive reinforcement for savers.
    - Identifies top-2 overspending categories instead of just top-1.
    """
    recs = []
    seen = set()

    def add(msg: str):
        if msg not in seen:
            seen.add(msg)
            recs.append(msg)

    total_expense = sum(expenses.values())
    savings_rate  = ((income - total_expense) / income) * 100 if income > 0 else 0

    # 1. Savings Rate Rule
    if savings_rate < 0:
        add(
            "Your expenses exceed your income. Stop all non-essential spending immediately "
            "and review recurring bills for immediate cuts."
        )
    elif savings_rate < 10:
        add(
            "Your savings rate is below 10%. Apply the 50/30/20 rule: "
            "allocate at least 20% of income to savings. Even a 5% improvement "
            "adds up to ₹{:,.0f}/year.".format(income * 0.05 * 12)
        )
    elif savings_rate < 20:
        add(
            f"You are saving {savings_rate:.1f}% of income — good, but there is room to grow. "
            "Target 20% to build an emergency fund in under 6 months."
        )
    elif savings_rate >= 30:
        add(
            f"Outstanding! You are saving {savings_rate:.1f}% of income. "
            "Consider moving surplus into a high-yield savings account or index fund "
            "to maximise long-term wealth."
        )
    else:
        add(
            f"Solid savings rate of {savings_rate:.1f}%. Keep going — "
            "pushing above 25% significantly accelerates financial independence."
        )

    # 2. Top-2 Overspending Categories
    if expenses and total_expense > 0:
        sorted_cats = sorted(expenses.items(), key=lambda x: x[1], reverse=True)
        for cat, amount in sorted_cats[:2]:
            pct = (amount / total_expense) * 100
            if pct > 35:
                add(
                    f"{cat} is {pct:.1f}% of total expenses — above the 35% threshold. "
                    f"Reducing it by 10–15% would free up ₹{amount * 0.12:,.0f}/month."
                )

    # 3. Rent Optimisation
    rent = expenses.get("Rent", 0)
    if income > 0 and (rent / income) > 0.30:
        add(
            f"Housing costs are {rent/income*100:.1f}% of income (ideal: ≤30%). "
            "Explore negotiating at lease renewal, adding a flatmate, or relocating."
        )

    # 4. Discretionary Spending
    disc = expenses.get("Shopping", 0) + expenses.get("Entertainment", 0) + expenses.get("Travel", 0)
    disc_pct = (disc / income) * 100 if income > 0 else 0
    if disc_pct > 25:
        add(
            f"Discretionary spending (Shopping + Entertainment + Travel) is "
            f"{disc_pct:.1f}% of income. Try a monthly 'discretionary cap' "
            "to limit impulse purchases."
        )

    # 5. ML Anomaly Integration (dual-layer)
    anomaly_data = anomaly_detection(expenses, threshold=1.5)
    for a in anomaly_data.get("anomalies", []):
        if a.get("type") == "high":
            cat = a["category"]
            severity = a.get("severity", "")
            prefix = "⚠️ Critical ML Alert" if severity == "critical" else "ML Notice"
            add(
                f"{prefix}: {cat} spending is unusually high for your income profile "
                f"(z-score: {a.get('z_score', 0):+.1f}). "
                "Review recent transactions in this category."
            )
        elif a.get("type") == "pattern":
            add(a.get("message", "Your overall spending pattern is unusual."))

    # 6. Emergency Fund Tip (if not overspending)
    if savings_rate >= 10:
        monthly_savings = income * (savings_rate / 100)
        add(
            f"At your current savings rate, you could build a 3-month emergency fund "
            f"(₹{income * 3:,.0f}) in {max(1, int(income * 3 / monthly_savings))} months."
        )

    return recs