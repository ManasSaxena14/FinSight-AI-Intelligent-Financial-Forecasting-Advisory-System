"""
FinSight AI -- Population (peer) model
======================================
Built once per process from the reference dataset (data/cleaned_financial_data.csv).

The reference dataset is synthetic and cross-sectional: it has no users and no
timeline, so it cannot train a forecaster. It is used for exactly two things:
  1. Cold-start priors -- what a typical person in the same income bracket spends,
     blended into forecasts while a user has little history.
  2. Peer benchmarks -- where a user's income-normalised spending sits among peers,
     plus an IsolationForest (fitted once, here) that scores how unusual the overall
     spending *mix* is.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from app.ml.common import EXPENSE_COLS, clean_expenses

logger = logging.getLogger(__name__)

DATA_CSV = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "cleaned_financial_data.csv")
)

BRACKETS = ("low", "lower-middle", "upper-middle", "high")


@dataclass(frozen=True)
class BracketStats:
    name: str
    size: int
    ratio_mean: dict[str, float]       # category / income
    ratio_quantiles: dict[str, np.ndarray]  # sorted ratios, for percentile lookups
    amount_cv: dict[str, float]        # std / mean of amounts within the bracket


class PopulationModel:
    def __init__(self, df: pd.DataFrame):
        df = df.copy()
        for col in ["Income", *EXPENSE_COLS]:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        df = df.replace([np.inf, -np.inf], np.nan).dropna(subset=["Income", *EXPENSE_COLS])
        df = df[df["Income"] > 0]
        if len(df) < 100:
            raise RuntimeError("Reference dataset is too small to build the population model.")

        self.size = len(df)
        self.income_cuts = tuple(float(q) for q in df["Income"].quantile([0.25, 0.5, 0.75]))

        ratios = df[EXPENSE_COLS].div(df["Income"], axis=0)
        bracket_labels = df["Income"].apply(self._bracket_for_income)

        self.brackets: dict[str, BracketStats] = {}
        for name in BRACKETS:
            mask = bracket_labels == name
            sub_ratios = ratios[mask]
            sub_amounts = df.loc[mask, EXPENSE_COLS]
            self.brackets[name] = BracketStats(
                name=name,
                size=int(mask.sum()),
                ratio_mean={c: float(sub_ratios[c].mean()) for c in EXPENSE_COLS},
                ratio_quantiles={c: np.sort(sub_ratios[c].to_numpy()) for c in EXPENSE_COLS},
                amount_cv={
                    c: float(sub_amounts[c].std() / max(sub_amounts[c].mean(), 1.0))
                    for c in EXPENSE_COLS
                },
            )

        # Multivariate "unusual mix" detector on income-normalised ratios. Fitted once.
        self._iso = IsolationForest(n_estimators=200, contamination="auto", random_state=42)
        ratio_matrix = ratios.to_numpy()
        self._iso.fit(ratio_matrix)
        # Sorted training scores let us express a user's score as a population percentile.
        self._iso_train_scores = np.sort(-self._iso.score_samples(ratio_matrix))

    # ── Brackets ────────────────────────────────────────────────────────────
    def _bracket_for_income(self, income: float) -> str:
        q25, q50, q75 = self.income_cuts
        if income <= q25:
            return "low"
        if income <= q50:
            return "lower-middle"
        if income <= q75:
            return "upper-middle"
        return "high"

    def bracket(self, income: float) -> BracketStats:
        return self.brackets[self._bracket_for_income(float(income))]

    # ── Priors & benchmarks ─────────────────────────────────────────────────
    def prior_amounts(self, income: float) -> dict[str, float]:
        """Typical spend per category for someone with this income."""
        stats = self.bracket(income)
        return {c: stats.ratio_mean[c] * float(income) for c in EXPENSE_COLS}

    def amount_cv(self, income: float, category: str) -> float:
        return self.bracket(income).amount_cv[category]

    def peer_percentile(self, income: float, category: str, amount: float) -> float:
        """Share (0-100) of peers whose income-normalised spend is below the user's."""
        if income <= 0:
            return 0.0
        sorted_ratios = self.bracket(income).ratio_quantiles[category]
        ratio = float(amount) / float(income)
        return float(np.searchsorted(sorted_ratios, ratio, side="left") / len(sorted_ratios) * 100.0)

    def peer_median_amount(self, income: float, category: str) -> float:
        sorted_ratios = self.bracket(income).ratio_quantiles[category]
        return float(np.median(sorted_ratios) * float(income))

    def mix_unusualness(self, income: float, expenses: dict) -> float:
        """0-100 percentile of how unusual the overall spending mix is vs. the population."""
        if income <= 0:
            return 0.0
        clean = clean_expenses(expenses)
        vector = np.array([[clean[c] / float(income) for c in EXPENSE_COLS]])
        score = float(-self._iso.score_samples(vector)[0])
        rank = np.searchsorted(self._iso_train_scores, score, side="left")
        return float(rank / len(self._iso_train_scores) * 100.0)


# ── Process-wide singleton ─────────────────────────────────────────────────
_population: PopulationModel | None = None


def load_population_model(csv_path: str = DATA_CSV) -> PopulationModel:
    """Build the population model once; later calls return the cached instance."""
    global _population
    if _population is None:
        logger.info("Building population model from %s", csv_path)
        _population = PopulationModel(pd.read_csv(csv_path))
        logger.info("Population model ready (%d reference rows)", _population.size)
    return _population


def get_population_model() -> PopulationModel:
    return load_population_model()
