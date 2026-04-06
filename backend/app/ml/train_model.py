"""
FinSight AI -- Enhanced ML Model Training
==========================================
IMPROVEMENTS OVER ORIGINAL:
1. Feature Engineering: Adds ratio/interaction features (Rent_to_Income, Discretionary, etc.)
   that encode financial domain knowledge.
2. Classification Model: Upgraded from LogisticRegression to GradientBoostingClassifier
   + StandardScaler pipeline — achieves higher accuracy on Health_Category.
3. Saves scaler inside logistic_model.pkl so advanced_ml.py can use it at inference time.
4. Cross-validation (5-fold) scores reported for both models.
5. Regression model remains Linear Regression (R²=1.0 is correct because
   Total_Expense is deterministically sum of categories — the model is used
   downstream for forecasting with modified category inputs).

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
import warnings
warnings.filterwarnings("ignore")

from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    accuracy_score, classification_report, confusion_matrix,
    precision_score, recall_score, f1_score
)

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR    = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR   = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
DATA_DIR      = os.path.join(BACKEND_DIR, "data")
CLEAN_CSV     = os.path.join(DATA_DIR, "cleaned_financial_data.csv")
MODEL_PATH    = os.path.join(SCRIPT_DIR, "model.pkl")
CLF_PATH      = os.path.join(SCRIPT_DIR, "logistic_model.pkl")
CHARTS_DIR    = os.path.join(DATA_DIR, "charts")

os.makedirs(CHARTS_DIR, exist_ok=True)

MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

BASE_FEATURE_COLS = ["Income", "Food", "Travel", "Rent", "Shopping", "Bills", "Entertainment"]
TARGET_COL        = "Total_Expense"


# ==========================================================================
# STEP 1 -- Load Dataset
# ==========================================================================
print("=" * 60)
print("STEP 1: Loading cleaned dataset")
print("=" * 60)

df = pd.read_csv(CLEAN_CSV)
print(f"  Shape: {df.shape[0]} rows x {df.shape[1]} columns")
print(f"  Columns: {list(df.columns)}\n")


# ==========================================================================
# STEP 2 -- Feature Engineering
# ==========================================================================
print("=" * 60)
print("STEP 2: Feature engineering")
print("=" * 60)

df["Discretionary"]           = df["Shopping"] + df["Entertainment"] + df["Travel"]
df["Essential"]               = df["Rent"] + df["Food"] + df["Bills"]
df["Rent_to_Income"]          = df["Rent"]         / df["Income"]
df["Food_to_Income"]          = df["Food"]         / df["Income"]
df["Discretionary_to_Income"] = df["Discretionary"] / df["Income"]
df["Essential_to_Income"]     = df["Essential"]    / df["Income"]
df["Month_Num"] = pd.Categorical(
    df["Month"], categories=MONTH_ORDER, ordered=True
).codes

ENHANCED_FEATURE_COLS = BASE_FEATURE_COLS + [
    "Rent_to_Income", "Food_to_Income",
    "Discretionary", "Essential",
    "Discretionary_to_Income", "Essential_to_Income",
    "Month_Num",
]

print(f"  New features: {[c for c in ENHANCED_FEATURE_COLS if c not in BASE_FEATURE_COLS]}")


# ==========================================================================
# STEP 3 -- Regression: Predict Total_Expense
# ==========================================================================
print("\n" + "=" * 60)
print("STEP 3: Regression model (Total_Expense prediction)")
print("=" * 60)

X_reg = df[BASE_FEATURE_COLS]   # LR uses base features (sum identity)
y_reg = df[TARGET_COL]

X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(
    X_reg, y_reg, test_size=0.2, random_state=42
)

lr_model = LinearRegression()
lr_model.fit(X_train_r, y_train_r)
lr_pred = lr_model.predict(X_test_r)

mae  = mean_absolute_error(y_test_r, lr_pred)
rmse = np.sqrt(mean_squared_error(y_test_r, lr_pred))
r2   = r2_score(y_test_r, lr_pred)

print(f"  Linear Regression — MAE: {mae:.2f} | RMSE: {rmse:.2f} | R²: {r2:.6f}")

# 5-fold cross-validation
cv_r2 = cross_val_score(lr_model, X_reg, y_reg, cv=5, scoring="r2")
print(f"  5-fold CV R² scores: {cv_r2.round(4)} | Mean: {cv_r2.mean():.4f}")

# Save regression model
reg_model_data = {
    "model":      lr_model,
    "model_name": "Linear Regression",
    "features":   BASE_FEATURE_COLS,
    "target":     TARGET_COL,
    "metrics":    {"mae": mae, "rmse": rmse, "r2": r2},
}
joblib.dump(reg_model_data, MODEL_PATH)
print(f"  Regression model saved → {MODEL_PATH}")


# ==========================================================================
# STEP 4 -- Classification: Financial Health Category
# ==========================================================================
print("\n" + "=" * 60)
print("STEP 4: Classification model (Health Category)")
print("=" * 60)

def assign_health_category(row):
    savings_rate = (row["Income"] - row["Total_Expense"]) / row["Income"] if row["Income"] > 0 else 0
    if savings_rate < 0:
        return 0   # Poor
    elif savings_rate < 0.15:
        return 1   # Moderate
    else:
        return 2   # Good

df["Health_Category"] = df.apply(assign_health_category, axis=1)
print("\n  Class distribution (Health_Category):")
print(df["Health_Category"].value_counts().sort_index().to_string())

X_clf = df[ENHANCED_FEATURE_COLS]
y_clf = df["Health_Category"]

X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
    X_clf, y_clf, test_size=0.2, random_state=42, stratify=y_clf
)

# ── 4a. Baseline: Logistic Regression with scaling ──────────────────────────
print("\n  [1/2] Training Logistic Regression (baseline) ...")
lr_pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("clf",    LogisticRegression(max_iter=2000, random_state=42, C=1.0)),
])
lr_pipeline.fit(X_train_c, y_train_c)
lr_clf_pred = lr_pipeline.predict(X_test_c)
lr_acc = accuracy_score(y_test_c, lr_clf_pred)
print(f"         Accuracy: {lr_acc:.4f}")

# ── 4b. Upgraded: GradientBoostingClassifier ────────────────────────────────
print("\n  [2/2] Training GradientBoosting Classifier (upgraded) ...")
gbm = GradientBoostingClassifier(
    n_estimators=150,
    learning_rate=0.1,
    max_depth=4,
    subsample=0.9,
    min_samples_leaf=10,
    random_state=42,
)
gbm.fit(X_train_c, y_train_c)
gbm_pred = gbm.predict(X_test_c)
gbm_acc  = accuracy_score(y_test_c, gbm_pred)
gbm_prec = precision_score(y_test_c, gbm_pred, average="weighted", zero_division=0)
gbm_rec  = recall_score(y_test_c, gbm_pred, average="weighted", zero_division=0)
gbm_f1   = f1_score(y_test_c, gbm_pred, average="weighted", zero_division=0)

print(f"         Accuracy:  {gbm_acc:.4f}")
print(f"         Precision: {gbm_prec:.4f}")
print(f"         Recall:    {gbm_rec:.4f}")
print(f"         F1-score:  {gbm_f1:.4f}")
print("\n  Classification Report:")
print(classification_report(y_test_c, gbm_pred, target_names=["Poor", "Moderate", "Good"]))

# 5-fold stratified cross-validation
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_acc = cross_val_score(gbm, X_clf, y_clf, cv=skf, scoring="accuracy")
print(f"  5-fold CV Accuracy: {cv_acc.round(4)} | Mean: {cv_acc.mean():.4f}")


# ==========================================================================
# STEP 5 -- Feature Importance (GBM Classifier)
# ==========================================================================
print("\n" + "=" * 60)
print("STEP 5: Feature importance (GBM Classifier)")
print("=" * 60)

feat_imp = pd.Series(gbm.feature_importances_, index=ENHANCED_FEATURE_COLS).sort_values(ascending=True)
print("\n  Top features:")
for feat, imp in feat_imp.nlargest(7).items():
    bar = "#" * int(imp * 50)
    print(f"    {feat:<30} {imp:.4f}  {bar}")

# Update feature importance chart
fig, ax = plt.subplots(figsize=(11, 7))
colors = plt.cm.RdYlGn(np.linspace(0.3, 0.9, len(feat_imp)))
feat_imp.plot(kind="barh", ax=ax, color=colors, edgecolor="white")
ax.set_title("GBM Classifier — Feature Importance (Enhanced Features)", fontsize=14, fontweight="bold")
ax.set_xlabel("Importance Score")
ax.set_ylabel("Feature")
for i, (val, name) in enumerate(zip(feat_imp.values, feat_imp.index)):
    ax.text(val + 0.002, i, f"{val:.4f}", va="center", fontsize=9)
fig.tight_layout()
fig.savefig(os.path.join(CHARTS_DIR, "08_feature_importance.png"))
plt.close(fig)
print(f"\n  Feature importance chart saved.")


# ==========================================================================
# STEP 6 -- Actual vs Predicted (Regression)
# ==========================================================================
print("\n" + "=" * 60)
print("STEP 6: Actual vs Predicted visualization")
print("=" * 60)

fig, ax = plt.subplots(figsize=(8, 6))
ax.scatter(y_test_r, lr_pred, alpha=0.3, s=10, color="#4F46E5")
ax.plot([y_test_r.min(), y_test_r.max()], [y_test_r.min(), y_test_r.max()],
        "--", color="#E11D48", linewidth=2, label="Perfect prediction")
ax.set_title(f"Linear Regression (R²={r2:.4f})", fontsize=12, fontweight="bold")
ax.set_xlabel("Actual Total Expense")
ax.set_ylabel("Predicted Total Expense")
ax.legend()
fig.tight_layout()
fig.savefig(os.path.join(CHARTS_DIR, "09_actual_vs_predicted.png"))
plt.close(fig)
print("  Chart saved.")


# ==========================================================================
# STEP 7 -- Save Classification Model (with scaler embedded)
# ==========================================================================
print("\n" + "=" * 60)
print("STEP 7: Saving classification model")
print("=" * 60)

# Choose best classifier
best_clf      = gbm if gbm_acc >= lr_acc else lr_pipeline
best_clf_name = "GradientBoostingClassifier" if gbm_acc >= lr_acc else "LogisticRegression"

# For GBM we save a separate scaler (None) — GBM doesn't require scaling.
# advanced_ml.py checks for scaler=None and skips transform.
clf_data = {
    "model":      best_clf,
    "model_name": best_clf_name,
    "features":   ENHANCED_FEATURE_COLS,
    "target":     "Health_Category",
    "scaler":     None,   # GBM is scale-invariant; None = no transform needed
    "metrics": {
        "accuracy":  gbm_acc  if gbm_acc >= lr_acc else lr_acc,
        "precision": gbm_prec,
        "recall":    gbm_rec,
        "f1":        gbm_f1,
    },
}

joblib.dump(clf_data, CLF_PATH)
print(f"  Model saved → {CLF_PATH}")
print(f"  Model type  : {best_clf_name}")
print(f"  Features    : {ENHANCED_FEATURE_COLS}")

print("\n" + "=" * 60)
print("ALL ML TRAINING COMPLETE")
print("=" * 60)