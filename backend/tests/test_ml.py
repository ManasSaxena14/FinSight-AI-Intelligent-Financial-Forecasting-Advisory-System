from datetime import date, datetime

import pytest

from app.ml.anomaly import detect_anomalies
from app.ml.common import infer_legacy_period, shift_period
from app.ml.forecasting import forecast_series, forecast_user
from app.ml.insights import build_insights
from app.ml.population import get_population_model
from app.ml.risk import overspend_risk
from tests.conftest import month_history

STEADY = {"Food": 8000, "Travel": 3000, "Rent": 18000, "Shopping": 4000, "Bills": 2500, "Entertainment": 2000}


def steady_history(months=8, income=70000, start="2025-01"):
    return month_history([(shift_period(start, i), income, dict(STEADY)) for i in range(months)])


@pytest.fixture(scope="module")
def population():
    return get_population_model()


# ── Periods ──────────────────────────────────────────────────────────────────

def test_shift_period_crosses_year():
    assert shift_period("2025-11", 3) == "2026-02"
    assert shift_period("2026-01", -1) == "2025-12"


@pytest.mark.parametrize("month,ref,expected", [
    ("Jan", datetime(2026, 3, 5), "2026-01"),
    ("Mar", datetime(2026, 3, 5), "2026-03"),
    ("Dec", datetime(2026, 1, 10), "2025-12"),   # later month than the write date -> previous year
    ("Jul", date(2026, 6, 30), "2025-07"),
])
def test_infer_legacy_period(month, ref, expected):
    assert infer_legacy_period(month, ref) == expected


# ── Forecasting ──────────────────────────────────────────────────────────────

def test_flat_series_forecasts_flat():
    fc = forecast_series([1000] * 8, horizon=3)
    assert fc.method == "damped-holt"
    assert all(abs(m - 1000) < 1 for m in fc.means)


def test_trend_is_followed_but_damped():
    y = [1000 + 100 * i for i in range(10)]
    fc = forecast_series(y, horizon=3)
    assert fc.means[0] > y[-1]                      # keeps rising
    assert fc.means[2] - fc.means[1] < fc.means[1] - y[-1] + 100  # but damped
    assert fc.stds[2] > fc.stds[0]                  # uncertainty widens with horizon


def test_short_history_shrinks_to_prior():
    fc = forecast_series([5000], horizon=1, prior_mean=1000)
    # weight = 1 / (1 + 2): one third own data, two thirds prior
    assert fc.means[0] == pytest.approx(5000 / 3 + 1000 * 2 / 3)
    assert "peer-prior" in fc.method


def test_forecast_user_uses_own_history_and_periods(population):
    history = steady_history(8, start="2025-11")
    result = forecast_user(history, population, months=3)
    periods = [f["period"] for f in result["forecast"]]
    assert periods == ["2026-07", "2026-08", "2026-09"]
    total = sum(STEADY.values())
    first = result["forecast"][0]
    assert first["predicted_expense"] == pytest.approx(total, rel=0.01)
    assert first["lower"] <= first["predicted_expense"] <= first["upper"]
    assert result["trend_direction"] == "stable"
    assert result["backtest"]["mape_pct"] < 10.0  # early folds lean on the peer prior


def test_forecast_reacts_to_user_not_dataset(population):
    low = forecast_user(steady_history(6, income=70000), population)["predicted_next_month_expense"]
    doubled = {k: v * 2 for k, v in STEADY.items()}
    high_history = month_history([(shift_period("2025-01", i), 140000, doubled) for i in range(6)])
    high = forecast_user(high_history, population)["predicted_next_month_expense"]
    assert high == pytest.approx(low * 2, rel=0.02)


# ── Risk ─────────────────────────────────────────────────────────────────────

def test_risk_low_for_comfortable_saver(population):
    history = steady_history(8, income=90000)
    risk = overspend_risk(forecast_user(history, population), history, population)
    assert risk["risk_level"] == "low"
    assert risk["overspend_probability"] < 0.05


def test_risk_high_when_spending_exceeds_income(population):
    history = steady_history(8, income=30000)  # spends 37,500
    risk = overspend_risk(forecast_user(history, population), history, population)
    assert risk["risk_level"] == "high"
    assert risk["overspend_probability"] > 0.9
    assert {d["category"] for d in risk["drivers"]} == set(STEADY)


# ── Anomalies ────────────────────────────────────────────────────────────────

def test_personal_spike_flagged(population):
    history = steady_history(6)
    spiked = dict(STEADY, Shopping=20000)
    history.append({"period": "2025-07", "income": 70000, "expenses": spiked})
    result = detect_anomalies(history, population)
    assert result["baseline"] == "personal"
    flagged = {a["category"]: a for a in result["anomalies"]}
    assert "Shopping" in flagged
    assert flagged["Shopping"]["severity"] in {"high", "critical"}
    assert "Food" not in flagged


def test_raise_is_not_a_spike(population):
    """Spending up in line with income must not be flagged (ratios are income-normalised)."""
    history = steady_history(6, income=70000)
    history.append({"period": "2025-07", "income": 140000, "expenses": {k: v * 2 for k, v in STEADY.items()}})
    assert detect_anomalies(history, population)["anomalies"] == []


def test_cold_start_uses_peers(population):
    history = steady_history(1)
    result = detect_anomalies(history, population)
    assert result["baseline"] == "peer"
    assert all(a.get("method") in {"peer", "peer-mix"} for a in result["anomalies"] + result["normal"])


def test_build_insights_shape():
    insights = build_insights(steady_history(5), months=2)
    for key in ("health", "forecast", "risk", "anomalies", "pattern", "benchmarks", "model_info"):
        assert key in insights
    assert len(insights["forecast"]["forecast"]) == 2


# ── In-progress month ────────────────────────────────────────────────────────

def test_partial_current_month_is_excluded_from_models():
    today = date(2026, 10, 7)
    history = steady_history(6, start="2026-04")  # Apr..Sep complete
    history.append({"period": "2026-10", "income": 70000, "expenses": {"Food": 900, "Rent": 18000}})
    insights = build_insights(history, months=2, today=today)
    assert insights["latest_period"] == "2026-09"
    assert insights["month_to_date"]["period"] == "2026-10"
    assert insights["forecast"]["forecast"][0]["period"] == "2026-10"
    assert insights["forecast"]["predicted_next_month_expense"] == pytest.approx(sum(STEADY.values()), rel=0.02)


def test_full_current_month_is_kept():
    today = date(2026, 10, 7)
    history = steady_history(6, start="2026-04")
    history.append({"period": "2026-10", "income": 70000, "expenses": dict(STEADY)})
    insights = build_insights(history, months=1, today=today)
    assert insights["latest_period"] == "2026-10"
    assert insights["month_to_date"] is None
