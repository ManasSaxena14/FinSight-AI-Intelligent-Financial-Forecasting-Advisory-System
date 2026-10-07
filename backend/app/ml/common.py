"""
FinSight AI -- Shared ML constants and period helpers
=====================================================
A "period" is a calendar month written as "YYYY-MM". Every monthly record and
transaction carries one, so January 2026 and January 2027 never collide.
"""

from __future__ import annotations

import math
import re
from datetime import date, datetime

EXPENSE_COLS = ["Food", "Travel", "Rent", "Shopping", "Bills", "Entertainment"]
ESSENTIAL_COLS = ["Rent", "Food", "Bills"]
DISCRETIONARY_COLS = ["Shopping", "Entertainment", "Travel"]
MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

PERIOD_RE = re.compile(r"^(\d{4})-(0[1-9]|1[0-2])$")


def is_valid_period(period: str) -> bool:
    return bool(period and PERIOD_RE.match(period))


def make_period(year: int, month_index: int) -> str:
    """month_index is 1-12."""
    return f"{year:04d}-{month_index:02d}"


def split_period(period: str) -> tuple[int, int]:
    match = PERIOD_RE.match(period or "")
    if not match:
        raise ValueError(f"Invalid period '{period}', expected YYYY-MM")
    return int(match.group(1)), int(match.group(2))


def period_month_name(period: str) -> str:
    return MONTH_ORDER[split_period(period)[1] - 1]


def period_label(period: str) -> str:
    year, month = split_period(period)
    return f"{MONTH_ORDER[month - 1]} {year}"


def shift_period(period: str, months: int) -> str:
    year, month = split_period(period)
    index = year * 12 + (month - 1) + months
    return make_period(index // 12, index % 12 + 1)


def period_of(d: date | datetime) -> str:
    return make_period(d.year, d.month)


def current_period() -> str:
    return period_of(date.today())


def infer_legacy_period(month_name: str, reference: datetime | date | None) -> str:
    """
    Legacy records only stored a month name ("Jan"). Recover the year from the
    record's last-write timestamp: a month later in the year than the timestamp
    must belong to the previous year (nobody logs next month's spending).
    """
    if month_name not in MONTH_ORDER:
        raise ValueError(f"Unknown month name '{month_name}'")
    ref = reference or date.today()
    month_index = MONTH_ORDER.index(month_name) + 1
    year = ref.year if month_index <= ref.month else ref.year - 1
    return make_period(year, month_index)


def clean_expenses(expenses: dict | None) -> dict[str, float]:
    """Coerce a category dict to the six known categories with finite, non-negative floats."""
    out: dict[str, float] = {}
    for col in EXPENSE_COLS:
        try:
            value = float((expenses or {}).get(col, 0) or 0)
        except (TypeError, ValueError):
            value = 0.0
        out[col] = value if math.isfinite(value) and value > 0 else 0.0
    return out


def normal_cdf(z: float) -> float:
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))
