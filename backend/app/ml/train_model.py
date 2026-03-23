"""
FinSight AI -- Phase 4: Machine Learning Model Development
============================================================
Trains Linear Regression and Random Forest models to predict
Total_Expense from Income + individual expense categories.

Run:
    cd backend
    source venv/bin/activate
    python app/ml/train_model.py
"""

import os
import pandas as pd
import numpy as np
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR  = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
DATA_DIR     = os.path.join(BACKEND_DIR, "data")
CLEAN_CSV    = os.path.join(DATA_DIR, "cleaned_financial_data.csv")
MODEL_PATH   = os.path.join(SCRIPT_DIR, "model.pkl")
CHARTS_DIR   = os.path.join(DATA_DIR, "charts")

os.makedirs(CHARTS_DIR, exist_ok=True)


# ==========================================================================
# STEP 1 -- Load the Cleaned Dataset
# ==========================================================================
print("=" * 60)
print("STEP 1: Loading cleaned dataset")
print("=" * 60)

df = pd.read_csv(CLEAN_CSV)
print(f"  Shape: {df.shape[0]} rows x {df.shape[1]} columns")
print(f"  Columns: {list(df.columns)}\n")


# ==========================================================================
# STEP 2 -- Define Features (X) and Target (y)
# ==========================================================================
print("=" * 60)
print("STEP 2: Defining features and target")
print("=" * 60)

# Features: Income + all individual expense categories
FEATURE_COLS = ["Income", "Food", "Travel", "Rent", "Shopping", "Bills", "Entertainment"]
TARGET_COL   = "Total_Expense"

X = df[FEATURE_COLS]
y = df[TARGET_COL]

print(f"  Features (X): {FEATURE_COLS}")
print(f"  Target   (y): {TARGET_COL}")
print(f"  X shape: {X.shape}")
print(f"  y shape: {y.shape}\n")


# ==========================================================================
# STEP 3 -- Train/Test Split (80/20)
# ==========================================================================
print("=" * 60)
print("STEP 3: Splitting data into train/test sets (80/20)")
print("=" * 60)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print(f"  Training set: {X_train.shape[0]} samples")
print(f"  Testing set : {X_test.shape[0]} samples\n")


# ==========================================================================
# STEP 4 -- Train Models
# ==========================================================================
print("=" * 60)
print("STEP 4: Training models")
print("=" * 60)

# --- 4a. Linear Regression ---
print("\n  [1/2] Training Linear Regression...")
lr_model = LinearRegression()
lr_model.fit(X_train, y_train)
lr_pred = lr_model.predict(X_test)
print("        Done.")

# --- 4b. Random Forest ---
print("  [2/2] Training Random Forest (100 trees)...")
rf_model = RandomForestRegressor(
    n_estimators=100,
    random_state=42,
    n_jobs=-1           # use all CPU cores
)
rf_model.fit(X_train, y_train)
rf_pred = rf_model.predict(X_test)
print("        Done.\n")


# ==========================================================================
# STEP 5 -- Evaluate Models
# ==========================================================================
print("=" * 60)
print("STEP 5: Evaluating models")
print("=" * 60)


def evaluate(name, y_true, y_pred):
    """Calculate and print MAE, MSE, RMSE, and R2 for a model."""
    mae  = mean_absolute_error(y_true, y_pred)
    mse  = mean_squared_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    r2   = r2_score(y_true, y_pred)

    print(f"\n  {name}:")
    print(f"    MAE  : {mae:,.2f}")
    print(f"    MSE  : {mse:,.2f}")
    print(f"    RMSE : {rmse:,.2f}")
    print(f"    R2   : {r2:.6f}")

    return {"name": name, "mae": mae, "mse": mse, "rmse": rmse, "r2": r2}


lr_metrics = evaluate("Linear Regression", y_test, lr_pred)
rf_metrics = evaluate("Random Forest", y_test, rf_pred)


# ==========================================================================
# STEP 6 -- Compare Models & Select Best
# ==========================================================================
print("\n" + "=" * 60)
print("STEP 6: Model comparison")
print("=" * 60)

# Print comparison table
print(f"\n  {'Metric':<10} {'Linear Regression':>20} {'Random Forest':>20}")
print(f"  {'-'*10} {'-'*20} {'-'*20}")
print(f"  {'MAE':<10} {lr_metrics['mae']:>20,.2f} {rf_metrics['mae']:>20,.2f}")
print(f"  {'MSE':<10} {lr_metrics['mse']:>20,.2f} {rf_metrics['mse']:>20,.2f}")
print(f"  {'RMSE':<10} {lr_metrics['rmse']:>20,.2f} {rf_metrics['rmse']:>20,.2f}")
print(f"  {'R2':<10} {lr_metrics['r2']:>20.6f} {rf_metrics['r2']:>20.6f}")

# Select the model with better R2 score
if lr_metrics["r2"] >= rf_metrics["r2"]:
    best_model = lr_model
    best_name  = "Linear Regression"
    best_metrics = lr_metrics
else:
    best_model = rf_model
    best_name  = "Random Forest"
    best_metrics = rf_metrics

print(f"\n  Best model: {best_name} (R2 = {best_metrics['r2']:.6f})")


# ==========================================================================
# STEP 7 -- Feature Importance (Random Forest)
# ==========================================================================
print("\n" + "=" * 60)
print("STEP 7: Feature importance (Random Forest)")
print("=" * 60)

importances = rf_model.feature_importances_
feat_imp = pd.Series(importances, index=FEATURE_COLS).sort_values(ascending=True)

print("\n  Feature Importances:")
for feat, imp in feat_imp.items():
    bar = "#" * int(imp * 50)
    print(f"    {feat:<15} {imp:.4f}  {bar}")

# Save feature importance chart
fig, ax = plt.subplots(figsize=(10, 6))
colors = ["#4F46E5", "#7C3AED", "#A855F7", "#D946EF", "#EC4899", "#F43F5E", "#F97316"]
feat_imp.plot(kind="barh", ax=ax, color=colors[:len(feat_imp)], edgecolor="white")
ax.set_title("Random Forest -- Feature Importance", fontsize=14, fontweight="bold")
ax.set_xlabel("Importance Score")
ax.set_ylabel("Feature")

# Add value labels
for i, (val, name) in enumerate(zip(feat_imp.values, feat_imp.index)):
    ax.text(val + 0.005, i, f"{val:.4f}", va="center", fontsize=10)

fig.tight_layout()
chart_path = os.path.join(CHARTS_DIR, "08_feature_importance.png")
fig.savefig(chart_path)
plt.close(fig)
print(f"\n  Chart saved: {chart_path}")


# ==========================================================================
# STEP 8 -- Actual vs Predicted Chart
# ==========================================================================
print("\n" + "=" * 60)
print("STEP 8: Actual vs Predicted visualization")
print("=" * 60)

fig, axes = plt.subplots(1, 2, figsize=(14, 6))

# Linear Regression
axes[0].scatter(y_test, lr_pred, alpha=0.3, s=10, color="#4F46E5")
axes[0].plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()],
             "--", color="#E11D48", linewidth=2, label="Perfect prediction")
axes[0].set_title(f"Linear Regression (R2={lr_metrics['r2']:.4f})", fontsize=12, fontweight="bold")
axes[0].set_xlabel("Actual Total Expense")
axes[0].set_ylabel("Predicted Total Expense")
axes[0].legend()

# Random Forest
axes[1].scatter(y_test, rf_pred, alpha=0.3, s=10, color="#7C3AED")
axes[1].plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()],
             "--", color="#E11D48", linewidth=2, label="Perfect prediction")
axes[1].set_title(f"Random Forest (R2={rf_metrics['r2']:.4f})", fontsize=12, fontweight="bold")
axes[1].set_xlabel("Actual Total Expense")
axes[1].set_ylabel("Predicted Total Expense")
axes[1].legend()

fig.suptitle("Actual vs Predicted -- Model Comparison", fontsize=14, fontweight="bold", y=1.02)
fig.tight_layout()
chart_path = os.path.join(CHARTS_DIR, "09_actual_vs_predicted.png")
fig.savefig(chart_path)
plt.close(fig)
print(f"  Chart saved: {chart_path}")


# ==========================================================================
# STEP 9 -- Save the Best Model
# ==========================================================================
print("\n" + "=" * 60)
print("STEP 9: Saving the best model")
print("=" * 60)

# Save model + metadata together for easy loading later
model_data = {
    "model": best_model,
    "model_name": best_name,
    "features": FEATURE_COLS,
    "target": TARGET_COL,
    "metrics": best_metrics,
}

joblib.dump(model_data, MODEL_PATH)
print(f"  Model saved: {MODEL_PATH}")
print(f"  Model type : {best_name}")
print(f"  Features   : {FEATURE_COLS}")
print(f"  R2 Score   : {best_metrics['r2']:.6f}")

print("\n" + "=" * 60)
print("ML MODEL TRAINING COMPLETE")
print("=" * 60)
