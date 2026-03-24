"""
FinSight AI -- Phase 8: Financial Business Logic
=================================================
Contains core, rule-based logic for evaluating a user's financial
health, providing actionable recommendations, and generating alerts.
"""

from typing import Dict, List, Optional
from app.ml.advanced_ml import category_wise_prediction, anomaly_detection

def calculate_health_score(income: float, total_expense: float) -> dict:
    """
    Calculate Financial Health Score (0-100) based on the savings ratio.

    Strategy:
    - >= 20% savings = Excellent (80-100 score)
    - >= 10% savings = Good (60-79 score)
    - >= 0% savings  = Fair (40-59 score)
    - < 0% savings   = Needs Improvement (0-39 score)
    """
    savings = income - total_expense
    savings_rate = (savings / income) * 100 if income > 0 else 0

    if savings_rate >= 20:
        score = min(100, int(80 + (savings_rate - 20)))
        status = "Excellent"
    elif savings_rate >= 10:
        score = int(60 + (savings_rate - 10) * 2)
        status = "Good"
    elif savings_rate >= 0:
        score = int(40 + (savings_rate * 2))
        status = "Fair"
    else:
        # Negative savings
        score = max(0, int(39 + savings_rate))
        status = "Needs Improvement"

    return {
        "score": score,
        "status": status,
        "savings_rate_pct": round(savings_rate, 1)
    }

def generate_alerts(income: float, current_expenses: Dict[str, float], previous_expenses: Optional[Dict[str, float]] = None) -> List[str]:
    """
    Detects critical situations that require immediate attention:
    1. Overspending (Total expenses > Income)
    2. Category spikes (e.g. 50% increase compared to last month)
    """
    alerts = []
    total_expense = sum(current_expenses.values())

    # 1. Overspending Alert
    if total_expense > income:
        over = total_expense - income
        alerts.append(f"CRITICAL: You are overspending. Your expenses exceed your income by {over:,.2f}.")

    # 2. Category Spikes Alert
    if previous_expenses:
        for cat, curr_val in current_expenses.items():
            prev_val = previous_expenses.get(cat, 0)
            if prev_val > 0:
                increase_pct = ((curr_val - prev_val) / prev_val) * 100
                if increase_pct >= 50.0 and curr_val > 500: # only flag meaningful nominal amounts > $500
                    alerts.append(f"ALERT: Sudden spike in {cat} spending! It increased by {increase_pct:.1f}% compared to last month.")

    return alerts

def generate_recommendations(income: float, expenses: Dict[str, float]) -> List[str]:
    """
    Rule-based recommendation system integrating ML insights.
    - Suggests reducing the highest spending categories.
    - Suggests savings improvements.
    - Incorporates ML anomaly detection (Z-score).
    """
    recs = []
    
    total_expense = sum(expenses.values())
    savings_rate = ((income - total_expense) / income) * 100 if income > 0 else 0

    # 1. Savings Rule
    if savings_rate < 0:
        recs.append("Your expenses are exceeding your income. It is crucial to immediately halt non-essential spending.")
    elif savings_rate < 10:
        recs.append("Try the 50/30/20 rule: aim to allocate at least 20% of your income towards savings or debt payoff.")
    elif savings_rate >= 20:
        recs.append("Excellent savings rate! Consider moving excess cash into a high-yield savings account or investments.")

    # 2. Highest Category identification
    if expenses:
        highest_category = max(expenses, key=expenses.get)
        highest_amount = expenses[highest_category]
        pct_of_total = (highest_amount / total_expense) * 100 if total_expense > 0 else 0
        
        if pct_of_total > 35:
            recs.append(f"Your highest expense is {highest_category} ({pct_of_total:.1f}% of total). Look for ways to reduce this category to free up budget margins.")

    # 3. ML Anomaly Integration
    anomaly_data = anomaly_detection(expenses, threshold=1.5) # lower threshold here to be more proactive
    for a in anomaly_data.get("anomalies", []):
        if a["type"] == "high":
            recs.append(f"Machine Learning Notice: Your {a['category']} spending is unusually high for your profile. Review recent transactions here.")

    return recs
