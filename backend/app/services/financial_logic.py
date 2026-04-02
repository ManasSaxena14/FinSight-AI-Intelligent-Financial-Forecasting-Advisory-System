"""
FinSight AI -- Phase 8: Financial Business Logic
=================================================
Contains core, rule-based logic for evaluating a user's financial
health, providing actionable recommendations, and generating alerts.
"""

from typing import Dict, List, Optional
from app.ml.advanced_ml import category_wise_prediction, anomaly_detection

def calculate_health_score(income: float, total_expense: float, expenses: Dict[str, float] = None) -> dict:
    """
    Calculate Financial Health Score (0-100) using a non-linear, nuanced model.

    Strategy:
    - Base score built progressively from savings rate.
    - Category-level penalties applied if high dependency exists (e.g., housing burden).
    """
    savings = income - total_expense
    savings_rate = (savings / income) * 100 if income > 0 else 0

    # Base Score from Savings Rate (Non-linear)
    if savings_rate < 0:
        base_score = max(0, 30 + savings_rate)
    elif savings_rate < 10:
        base_score = 40 + savings_rate * 2  # 40 to 60
    elif savings_rate < 20:
        base_score = 60 + (savings_rate - 10) * 1.5  # 60 to 75
    elif savings_rate < 30:
        base_score = 75 + (savings_rate - 20) * 1  # 75 to 85
    elif savings_rate < 50:
        base_score = 85 + (savings_rate - 30) * 0.5  # 85 to 95
    else:
        base_score = min(100, 95 + (savings_rate - 50) * 0.2)

    # Category Penalty Factor
    penalty = 0
    if expenses and total_expense > 0:
        highest_expense = max(expenses.values())
        highest_ratio = (highest_expense / income) * 100 if income > 0 else 0
        
        # Penalize if single category exceeds 40% of income
        if highest_ratio > 40:
            penalty += 10
        elif highest_ratio > 30:
            penalty += 5
            
        # Diversity check: if single category dominates expenses
        if highest_expense / total_expense > 0.7:
            penalty += 5

    final_score = int(round(max(0, min(100, base_score - penalty))))

    # Dynamic status
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
        "score": final_score,
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
                if increase_pct >= 50.0 and curr_val > 500: # only flag meaningful nominal amounts > ₹500
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
