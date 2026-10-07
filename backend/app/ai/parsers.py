"""
FinSight AI -- Rule-based parsers for smart input
=================================================
Turn free text, bank/UPI SMS, and CSV/PDF statements into proposed
transactions. These run without any LLM; the LLM path (app/ai/extract.py)
is tried first for free text and falls back to these.

Every proposal is a dict: {date, type, category, amount, merchant, note,
confidence, raw}. Nothing is saved until the user confirms.
"""

from __future__ import annotations

import csv
import io
import re
from datetime import date, datetime, timedelta

from app.ai.categorize import categorize, looks_like_income

MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}

AMOUNT_RE = re.compile(
    r"(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)\s*(k|lakh|lac|l)?\b|\b([\d,]+(?:\.\d{1,2})?)\s*(k|lakh|lac|rupees|rs)?\b",
    re.I,
)


def _to_amount(number: str, unit: str | None) -> float | None:
    try:
        value = float(number.replace(",", ""))
    except ValueError:
        return None
    unit = (unit or "").lower()
    if unit == "k":
        value *= 1_000
    elif unit in ("lakh", "lac", "l"):
        value *= 100_000
    return value if 0 < value < 1e9 else None


def parse_date(text: str, today: date | None = None) -> date | None:
    today = today or date.today()
    t = (text or "").lower()
    if "day before yesterday" in t:
        return today - timedelta(days=2)
    if "yesterday" in t or "kal" in t.split():
        return today - timedelta(days=1)
    if "today" in t or "aaj" in t.split():
        return today
    for pattern in (r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b",):
        m = re.search(pattern, t)
        if m:
            try:
                return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            except ValueError:
                pass
    m = re.search(r"\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b", t)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        y = y + 2000 if y < 100 else y
        try:
            return date(y, mo, d)
        except ValueError:
            pass
    # "5 Oct", "5th October 2026", "Oct 5"
    m = re.search(r"\b(\d{1,2})(?:st|nd|rd|th)?[\s\-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:[\s\-,]*(\d{4}|\d{2}))?\b", t)
    if m:
        day, month, year_txt = int(m.group(1)), MONTHS[m.group(2)], m.group(3)
    else:
        m = re.search(r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?\b", t)
        if not m:
            return None
        day, month, year_txt = int(m.group(2)), MONTHS[m.group(1)], None
    year = int(year_txt) if year_txt else today.year
    year = year + 2000 if year < 100 else year
    try:
        parsed = date(year, month, day)
    except ValueError:
        return None
    # No year given and the date is in the future -> it was last year.
    if not year_txt and parsed > today:
        parsed = parsed.replace(year=year - 1)
    return parsed


def _merchant_from_phrase(phrase: str) -> str | None:
    m = re.search(r"\b(?:on|at|to|for|from|in|via|par|pe)\s+([a-z][\w&' .\-]{1,40})", phrase, re.I)
    candidate = m.group(1) if m else re.sub(AMOUNT_RE, " ", phrase)
    candidate = re.sub(r"\b(today|yesterday|spent|paid|bought|got|for|on|at|the|a|an|rs|inr|rupees|kharcha|kiya|diye|"
                       r"me|mein|pe|par|ko|and|aur|received|salary|credited|of|with|using|via|upi)\b", " ", candidate, flags=re.I)
    candidate = re.sub(r"\b(\d{1,2}(st|nd|rd|th)?|jan\w*|feb\w*|mar\w*|apr\w*|may|jun\w*|jul\w*|aug\w*|sep\w*|oct\w*|nov\w*|dec\w*)\b",
                       " ", candidate, flags=re.I)
    candidate = " ".join(candidate.split()).strip(" .,-")
    return candidate.title()[:40] or None


def parse_free_text(text: str, today: date | None = None, history: dict | None = None) -> list[dict]:
    """'450 on Swiggy and 1.2k Uber yesterday, got salary 72000' -> proposals."""
    today = today or date.today()
    shared_date = parse_date(text, today) or today
    parts = re.split(r",|;|\n|\band\b|\baur\b|\bplus\b|&", text, flags=re.I)
    proposals = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        m = AMOUNT_RE.search(part)
        if not m:
            continue
        amount = _to_amount(m.group(1) or m.group(3), m.group(2) or m.group(4))
        if amount is None:
            continue
        merchant = _merchant_from_phrase(part)
        income = looks_like_income(part)
        cat = categorize(merchant, part, history)
        proposals.append({
            "date": (parse_date(part, today) or shared_date).isoformat(),
            "type": "income" if income else "expense",
            "category": "Income" if income else (cat["category"] or "Shopping"),
            "amount": round(amount, 2),
            "merchant": merchant,
            "note": None,
            "confidence": 0.75 if income else max(0.4, cat["confidence"] - 0.1),
            "raw": part,
        })
    return proposals


# ── SMS ────────────────────────────────────────────────────────────────────

SMS_DEBIT = re.compile(r"\b(debited|spent|paid|sent|withdrawn|purchase|dr\.?)\b", re.I)
SMS_CREDIT = re.compile(r"\b(credited|received|deposited|cr\.?|refund)\b", re.I)
SMS_MERCHANT = re.compile(
    r"(?:\bto\b|\bat\b|\bVPA\b|\binfo:?|\bby\b|\bfrom\b|;)\s*([A-Za-z0-9@._\- &]{3,40}?)(?=\s+(?:on|via|ref|upi|avl|bal|\.|\(|$)|[.;]|$)",
    re.I,
)


def parse_sms(text: str, today: date | None = None, history: dict | None = None) -> list[dict]:
    """One proposal per SMS (messages separated by blank lines or one per line)."""
    today = today or date.today()
    messages = [m.strip() for m in re.split(r"\n\s*\n|\n(?=\S)", text) if m.strip()]
    out = []
    for msg in messages:
        if re.search(r"\b(otp|one time password)\b", msg, re.I):
            continue
        amt = re.search(r"(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)", msg, re.I)
        if not amt:
            continue
        amount = _to_amount(amt.group(1), None)
        if amount is None:
            continue
        is_credit = bool(SMS_CREDIT.search(msg)) and not SMS_DEBIT.search(msg.split("credited")[0] if "credited" in msg.lower() else "")
        if SMS_DEBIT.search(msg) and not re.search(r"\bcredited to (?:your|a/c)", msg, re.I):
            is_credit = False if re.search(r"\bdebited\b", msg, re.I) else is_credit
        merchant = None
        for m in SMS_MERCHANT.finditer(msg):
            cand = m.group(1).strip()
            if re.search(r"a/c|acct|account|xx\d|\*\d|card", cand, re.I):
                continue
            merchant = cand.split("@")[0].replace(".", " ").strip().title()[:40] or None
            if merchant:
                break
        cat = categorize(merchant, msg, history)
        out.append({
            "date": (parse_date(msg, today) or today).isoformat(),
            "type": "income" if is_credit else "expense",
            "category": "Income" if is_credit else (cat["category"] or "Shopping"),
            "amount": round(amount, 2),
            "merchant": merchant,
            "note": None,
            "confidence": 0.7 if cat["category"] or is_credit else 0.4,
            "raw": msg[:200],
        })
    return out


# ── CSV / PDF statements ───────────────────────────────────────────────────

def _find(headers: list[str], *names: str) -> int | None:
    for i, h in enumerate(headers):
        if any(n in h for n in names):
            return i
    return None


def _parse_any_date(value: str) -> date | None:
    value = (value or "").strip()
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%d-%m-%y", "%d %b %Y", "%d-%b-%Y", "%d-%b-%y",
                "%d %b %y", "%b %d, %Y", "%d.%m.%Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return parse_date(value)


def _money(value: str) -> float:
    cleaned = re.sub(r"[^\d.\-]", "", value or "")
    try:
        return abs(float(cleaned)) if cleaned not in ("", "-", ".") else 0.0
    except ValueError:
        return 0.0


def parse_csv_statement(content: str, history: dict | None = None) -> list[dict]:
    rows = list(csv.reader(io.StringIO(content)))
    header_idx = next((i for i, r in enumerate(rows[:30])
                       if any("date" in c.lower() for c in r) and len(r) >= 3), None)
    if header_idx is None:
        return []
    headers = [h.strip().lower() for h in rows[header_idx]]
    i_date = _find(headers, "txn date", "transaction date", "value date", "date")
    i_desc = _find(headers, "narration", "description", "particulars", "remarks", "details", "merchant")
    i_debit = _find(headers, "withdrawal", "debit", "dr")
    i_credit = _find(headers, "deposit", "credit", "cr")
    i_amount = _find(headers, "amount")
    i_type = _find(headers, "type", "dr/cr", "cr/dr")
    out = []
    for row in rows[header_idx + 1:]:
        if i_date is None or len(row) <= i_date:
            continue
        d = _parse_any_date(row[i_date])
        if not d:
            continue
        desc = row[i_desc].strip() if i_desc is not None and i_desc < len(row) else ""
        debit = _money(row[i_debit]) if i_debit is not None and i_debit < len(row) else 0.0
        credit = _money(row[i_credit]) if i_credit is not None and i_credit < len(row) and i_credit != i_debit else 0.0
        if not debit and not credit and i_amount is not None and i_amount < len(row):
            amount = _money(row[i_amount])
            kind = (row[i_type] if i_type is not None and i_type < len(row) else "").lower()
            if "cr" in kind or "credit" in kind or row[i_amount].strip().startswith("+"):
                credit = amount
            else:
                debit = amount
        if not debit and not credit:
            continue
        merchant = _clean_narration(desc)
        is_credit = credit > 0 and not debit
        cat = categorize(merchant, desc, history)
        out.append({
            "date": d.isoformat(),
            "type": "income" if is_credit else "expense",
            "category": "Income" if is_credit else (cat["category"] or "Shopping"),
            "amount": round(credit if is_credit else debit, 2),
            "merchant": merchant,
            "note": None,
            "confidence": 0.85 if cat["category"] or is_credit else 0.45,
            "raw": desc[:200],
        })
    return out


def _clean_narration(desc: str) -> str | None:
    text = re.sub(r"^(upi|neft|imps|rtgs|pos|ach|nach|ecs|atm)[/\- ]+", "", desc.strip(), flags=re.I)
    parts = [p for p in re.split(r"[/|]", text) if p.strip() and not re.fullmatch(r"(?=.*\d)[\dA-Z]{6,}|\d+", p.strip())]
    name = parts[0] if parts else text
    name = name.split("@")[0]
    name = re.sub(r"\b\d{4,}\b", " ", name)
    name = " ".join(name.split()).strip(" -.")
    return name.title()[:40] or None


STATEMENT_LINE = re.compile(
    r"^(?P<date>\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{1,2}[\s\-][A-Za-z]{3}[\s\-]\d{2,4})\s+(?P<desc>.+?)\s+"
    r"(?P<amount>[\d,]+\.\d{2})\s*(?P<kind>cr|dr)?\b",
    re.I,
)


def parse_pdf_text(text: str, history: dict | None = None) -> list[dict]:
    out = []
    for line in text.splitlines():
        m = STATEMENT_LINE.search(line.strip())
        if not m:
            continue
        d = _parse_any_date(m.group("date"))
        amount = _money(m.group("amount"))
        if not d or not amount:
            continue
        desc = m.group("desc")
        kind = (m.group("kind") or "").lower()
        is_credit = kind == "cr" or (not kind and looks_like_income(desc))
        merchant = _clean_narration(desc)
        cat = categorize(merchant, desc, history)
        out.append({
            "date": d.isoformat(), "type": "income" if is_credit else "expense",
            "category": "Income" if is_credit else (cat["category"] or "Shopping"),
            "amount": round(amount, 2), "merchant": merchant, "note": None,
            "confidence": 0.6 if cat["category"] or is_credit else 0.35, "raw": line.strip()[:200],
        })
    return out


def dedupe_key(tx: dict) -> str:
    merchant = re.sub(r"[^a-z]", "", (tx.get("merchant") or "").lower())[:12]
    return f"{tx['date']}|{tx['type']}|{round(float(tx['amount']))}|{merchant}"
