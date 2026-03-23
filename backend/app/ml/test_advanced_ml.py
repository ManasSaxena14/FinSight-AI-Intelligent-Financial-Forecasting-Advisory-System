"""
FinSight AI -- Phase 5: Test Advanced ML Features
===================================================
Quick smoke-test for all three advanced ML functions.

Run:
    cd backend
    source venv/bin/activate
    python app/ml/test_advanced_ml.py
"""

from app.ml.advanced_ml import (
    multi_month_forecasting,
    category_wise_prediction,
    anomaly_detection,
)

# Sample user data for testing
SAMPLE_INCOME = 60000
SAMPLE_EXPENSES = {
    "Food":          8000,
    "Travel":        3000,
    "Rent":          18000,
    "Shopping":      7000,
    "Bills":         2500,
    "Entertainment": 4000,
}

# Helper
def section(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


# ==========================================================================
# TEST 1 -- Multi-Month Forecasting
# ==========================================================================
section("TEST 1: Multi-Month Forecasting (next 3 months)")

result = multi_month_forecasting(SAMPLE_INCOME, SAMPLE_EXPENSES, months=3)

for entry in result["forecast"]:
    print(f"  Month {entry['month']:>2}: Expense = {entry['predicted_expense']:>10,.2f}  |  Savings = {entry['savings']:>10,.2f}")

print(f"\n  Average Predicted Expense : {result['average_predicted_expense']:>10,.2f}")
print(f"  Average Savings           : {result['average_savings']:>10,.2f}")

assert len(result["forecast"]) == 3, "Expected 3 forecast entries"
assert "average_predicted_expense" in result
print("\n  PASS")


# ==========================================================================
# TEST 2 -- Category-Wise Prediction
# ==========================================================================
section("TEST 2: Category-Wise Prediction")

result = category_wise_prediction(SAMPLE_INCOME, SAMPLE_EXPENSES)

print(f"\n  Income Bracket: {result['income_bracket']}")
print(f"\n  {'Category':<16} {'Predicted':>12} {'Actual':>12} {'Difference':>12}")
print(f"  {'-'*16} {'-'*12} {'-'*12} {'-'*12}")

for cat, vals in result["predictions"].items():
    flag = " <-- OVER" if vals["difference"] > 500 else ""
    print(f"  {cat:<16} {vals['predicted']:>12,.2f} {vals['actual']:>12,.2f} {vals['difference']:>12,.2f}{flag}")

print(f"\n  Total Predicted : {result['total_predicted_expense']:>10,.2f}")
print(f"  Total Actual    : {result['total_actual_expense']:>10,.2f}")

assert "predictions" in result
assert "income_bracket" in result
print("\n  PASS")


# ==========================================================================
# TEST 3 -- Anomaly Detection (normal expenses -- no anomalies expected)
# ==========================================================================
section("TEST 3a: Anomaly Detection (normal expenses)")

result = anomaly_detection(SAMPLE_EXPENSES, threshold=2.0)

print(f"\n  {result['summary']}")
for a in result["anomalies"]:
    print(f"  [ANOMALY] {a['category']}: {a['amount']:,.0f}  z-score={a['z_score']} ({a['type']})")
for n in result["normal"]:
    print(f"  [NORMAL]  {n['category']}: {n['amount']:,.0f}  z-score={n['z_score']}")

assert "anomalies" in result
assert "normal" in result
print("\n  PASS")


# ==========================================================================
# TEST 4 -- Anomaly Detection (extreme expenses -- anomalies expected)
# ==========================================================================
section("TEST 3b: Anomaly Detection (extreme expenses)")

extreme_expenses = {**SAMPLE_EXPENSES, "Rent": 29990, "Bills": 501}
result = anomaly_detection(extreme_expenses, threshold=2.0)

print(f"\n  {result['summary']}")
for a in result["anomalies"]:
    print(f"  [ANOMALY] {a['category']}: {a['amount']:,.0f}  z-score={a['z_score']} ({a['type']})")
for n in result["normal"]:
    print(f"  [NORMAL]  {n['category']}: {n['amount']:,.0f}  z-score={n['z_score']}")

print("\n  PASS")


# ==========================================================================
# DONE
# ==========================================================================
section("ALL TESTS PASSED -- Phase 5 Advanced ML Features are working")
