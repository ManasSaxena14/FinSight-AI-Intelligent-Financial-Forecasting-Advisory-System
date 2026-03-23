"""
FinSight AI -- Phase 2 & 3: Data Preparation + Exploratory Data Analysis
=========================================================================
This script loads the raw financial dataset, cleans it, performs EDA,
generates visualizations, and saves the cleaned output for ML work.

Run:
    cd backend
    python data/data_preparation.py
"""

import os
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")                       # non-interactive backend (no GUI needed)
import matplotlib.pyplot as plt
import seaborn as sns

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
RAW_CSV      = os.path.join(PROJECT_ROOT, "DATASET_FIN_TRACK.csv")
CLEAN_CSV    = os.path.join(SCRIPT_DIR, "cleaned_financial_data.csv")
CHARTS_DIR   = os.path.join(SCRIPT_DIR, "charts")

# Create charts folder if it doesn't exist
os.makedirs(CHARTS_DIR, exist_ok=True)

# ── Styling ──────────────────────────────────────────────────────────────────
sns.set_theme(style="whitegrid", palette="muted")
plt.rcParams.update({"figure.dpi": 120, "savefig.bbox": "tight"})

EXPENSE_COLS = ["Food", "Travel", "Rent", "Shopping", "Bills", "Entertainment"]

# ==========================================================================
# STEP 1 -- Load the Dataset
# ==========================================================================
print("=" * 60)
print("STEP 1: Loading dataset")
print("=" * 60)

df = pd.read_csv(RAW_CSV)
print(f"  Loaded {RAW_CSV}")
print(f"  Shape : {df.shape[0]} rows x {df.shape[1]} columns\n")

# ==========================================================================
# STEP 2 -- Basic Dataset Info
# ==========================================================================
print("=" * 60)
print("STEP 2: Basic dataset info")
print("=" * 60)

print("\n-- Columns --")
for col in df.columns:
    print(f"  {col}")

print("\n-- Data Types --")
print(df.dtypes.to_string())

print(f"\n-- First 5 rows --")
print(df.head().to_string(index=False))

# ==========================================================================
# STEP 3 -- Missing Values & Duplicates
# ==========================================================================
print("\n" + "=" * 60)
print("STEP 3: Missing values & duplicates")
print("=" * 60)

missing = df.isnull().sum()
total_missing = missing.sum()
print(f"\n  Total missing values : {total_missing}")
if total_missing > 0:
    print(missing[missing > 0].to_string())
else:
    print("  No missing values found -- dataset is clean.")

dup_count = df.duplicated().sum()
print(f"  Duplicate rows       : {dup_count}")
if dup_count > 0:
    df.drop_duplicates(inplace=True)
    print(f"  Removed {dup_count} duplicate rows. New shape: {df.shape}")

# ==========================================================================
# STEP 4 -- Summary Statistics
# ==========================================================================
print("\n" + "=" * 60)
print("STEP 4: Summary statistics")
print("=" * 60)

print(df.describe().round(2).to_string())

# ==========================================================================
# STEP 5 -- New Columns: Total_Expense & Savings
# ==========================================================================
print("\n" + "=" * 60)
print("STEP 5: Creating Total_Expense and Savings columns")
print("=" * 60)

df["Total_Expense"] = df[EXPENSE_COLS].sum(axis=1)
df["Savings"]       = df["Income"] - df["Total_Expense"]

print(f"  Total_Expense = sum({', '.join(EXPENSE_COLS)})")
print(f"  Savings       = Income - Total_Expense")
print(f"\n  Sample (first 5 rows):")
print(df[["Income", "Total_Expense", "Savings"]].head().to_string(index=False))

# ==========================================================================
# STEP 6 -- Visualizations
# ==========================================================================
print("\n" + "=" * 60)
print("STEP 6: Generating visualizations")
print("=" * 60)


def save_fig(fig, name):
    """Helper to save a figure and print confirmation."""
    path = os.path.join(CHARTS_DIR, name)
    fig.savefig(path)
    plt.close(fig)
    print(f"  Saved: {path}")


# ---- 6a. Distribution of Income and Total Expense ----
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

axes[0].hist(df["Income"], bins=30, color="#4F46E5", edgecolor="white", alpha=0.85)
axes[0].set_title("Income Distribution", fontsize=13, fontweight="bold")
axes[0].set_xlabel("Income")
axes[0].set_ylabel("Frequency")

axes[1].hist(df["Total_Expense"], bins=30, color="#E11D48", edgecolor="white", alpha=0.85)
axes[1].set_title("Total Expense Distribution", fontsize=13, fontweight="bold")
axes[1].set_xlabel("Total Expense")
axes[1].set_ylabel("Frequency")

fig.suptitle("Distribution of Income and Total Expense", fontsize=15, fontweight="bold", y=1.02)
fig.tight_layout()
save_fig(fig, "01_income_expense_distribution.png")


# ---- 6b. Category-wise Expense Distribution (Box Plot) ----
fig, ax = plt.subplots(figsize=(12, 6))
df[EXPENSE_COLS].boxplot(ax=ax, patch_artist=True,
                         boxprops=dict(facecolor="#818CF8", alpha=0.7),
                         medianprops=dict(color="#1E1B4B", linewidth=2))
ax.set_title("Category-wise Expense Distribution", fontsize=14, fontweight="bold")
ax.set_ylabel("Amount")
ax.set_xlabel("Expense Category")
fig.tight_layout()
save_fig(fig, "02_category_expense_boxplot.png")


# ---- 6c. Average Expense by Category (Bar Chart) ----
avg_expenses = df[EXPENSE_COLS].mean().sort_values(ascending=False)

fig, ax = plt.subplots(figsize=(10, 5))
colors = ["#4F46E5", "#7C3AED", "#A855F7", "#D946EF", "#EC4899", "#F43F5E"]
bars = ax.bar(avg_expenses.index, avg_expenses.values, color=colors, edgecolor="white")
ax.set_title("Average Expense by Category", fontsize=14, fontweight="bold")
ax.set_ylabel("Average Amount")
ax.set_xlabel("Category")

# Add value labels on top of bars
for bar, val in zip(bars, avg_expenses.values):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 100,
            f"{val:,.0f}", ha="center", va="bottom", fontsize=10, fontweight="bold")

fig.tight_layout()
save_fig(fig, "03_avg_expense_by_category.png")


# ---- 6d. Income vs Total Expense (Scatter Plot) ----
fig, ax = plt.subplots(figsize=(10, 6))
scatter = ax.scatter(df["Income"], df["Total_Expense"],
                     c=df["Savings"], cmap="RdYlGn", alpha=0.5, s=15, edgecolors="none")
cbar = fig.colorbar(scatter, ax=ax)
cbar.set_label("Savings", fontsize=11)

ax.set_title("Income vs Total Expense", fontsize=14, fontweight="bold")
ax.set_xlabel("Income")
ax.set_ylabel("Total Expense")

# Reference line: Income = Total_Expense (break-even)
lims = [min(ax.get_xlim()[0], ax.get_ylim()[0]), max(ax.get_xlim()[1], ax.get_ylim()[1])]
ax.plot(lims, lims, "--", color="gray", linewidth=1, label="Break-even line")
ax.legend()

fig.tight_layout()
save_fig(fig, "04_income_vs_total_expense.png")


# ---- 6e. Monthly Spending Trends ----
# Define month order for proper sorting
MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

monthly_avg = df.groupby("Month")[EXPENSE_COLS + ["Income", "Total_Expense"]].mean()
monthly_avg = monthly_avg.reindex(MONTH_ORDER)

fig, ax = plt.subplots(figsize=(12, 6))
ax.plot(monthly_avg.index, monthly_avg["Income"],
        marker="o", linewidth=2, color="#4F46E5", label="Avg Income")
ax.plot(monthly_avg.index, monthly_avg["Total_Expense"],
        marker="s", linewidth=2, color="#E11D48", label="Avg Total Expense")
ax.fill_between(monthly_avg.index, monthly_avg["Income"], monthly_avg["Total_Expense"],
                alpha=0.15, color="#4F46E5")

ax.set_title("Monthly Average: Income vs Total Expense", fontsize=14, fontweight="bold")
ax.set_xlabel("Month")
ax.set_ylabel("Amount")
ax.legend()
ax.grid(True, alpha=0.3)

fig.tight_layout()
save_fig(fig, "05_monthly_income_vs_expense.png")


# ---- 6f. Monthly Category-wise Spending Trends ----
fig, ax = plt.subplots(figsize=(14, 6))
cat_colors = ["#4F46E5", "#7C3AED", "#A855F7", "#D946EF", "#EC4899", "#F43F5E"]

for col, color in zip(EXPENSE_COLS, cat_colors):
    ax.plot(monthly_avg.index, monthly_avg[col],
            marker="o", linewidth=1.5, label=col, color=color)

ax.set_title("Monthly Category-wise Average Spending", fontsize=14, fontweight="bold")
ax.set_xlabel("Month")
ax.set_ylabel("Amount")
ax.legend(loc="upper right")
ax.grid(True, alpha=0.3)

fig.tight_layout()
save_fig(fig, "06_monthly_category_trends.png")


# ---- 6g. Correlation Heatmap ----
numeric_cols = ["Income"] + EXPENSE_COLS + ["Total_Expense", "Savings"]
corr_matrix = df[numeric_cols].corr().round(2)

fig, ax = plt.subplots(figsize=(10, 8))
sns.heatmap(corr_matrix, annot=True, cmap="coolwarm", center=0,
            fmt=".2f", linewidths=0.5, ax=ax, square=True,
            cbar_kws={"shrink": 0.8})
ax.set_title("Correlation Heatmap", fontsize=14, fontweight="bold")

fig.tight_layout()
save_fig(fig, "07_correlation_heatmap.png")


# ==========================================================================
# STEP 7 -- Key Insights
# ==========================================================================
print("\n" + "=" * 60)
print("STEP 7: Key Insights")
print("=" * 60)

avg_income  = df["Income"].mean()
avg_expense = df["Total_Expense"].mean()
avg_savings = df["Savings"].mean()
savings_pct = (avg_savings / avg_income) * 100

print(f"\n  Average Income        : {avg_income:,.2f}")
print(f"  Average Total Expense : {avg_expense:,.2f}")
print(f"  Average Savings       : {avg_savings:,.2f}")
print(f"  Savings Rate          : {savings_pct:.1f}%")

# Highest spending category
highest_cat = avg_expenses.idxmax()
highest_val = avg_expenses.max()
print(f"\n  Highest avg category  : {highest_cat} ({highest_val:,.2f})")

# Lowest spending category
lowest_cat = avg_expenses.idxmin()
lowest_val = avg_expenses.min()
print(f"  Lowest avg category   : {lowest_cat} ({lowest_val:,.2f})")

# Negative savings count
neg_savings = (df["Savings"] < 0).sum()
neg_pct = (neg_savings / len(df)) * 100
print(f"\n  Rows with negative savings (overspending): {neg_savings} ({neg_pct:.1f}%)")

# Income-Expense correlation
corr_ie = df["Income"].corr(df["Total_Expense"])
print(f"  Income-TotalExpense correlation: {corr_ie:.3f}")

# ==========================================================================
# STEP 8 -- Save Cleaned Dataset
# ==========================================================================
print("\n" + "=" * 60)
print("STEP 8: Saving cleaned dataset")
print("=" * 60)

df.to_csv(CLEAN_CSV, index=False)
print(f"  Saved: {CLEAN_CSV}")
print(f"  Final shape: {df.shape[0]} rows x {df.shape[1]} columns")
print(f"  Columns: {list(df.columns)}")

print("\n" + "=" * 60)
print("EDA COMPLETE -- All charts saved to: " + CHARTS_DIR)
print("=" * 60)
