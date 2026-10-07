"""
FinSight AI -- Advisor service
==============================
Builds the financial context the LLM sees (server-side, from the user's own
data -- never trusted from the client), the system prompt, the offline
fallback replies, and the rule-based monthly summary.
"""

from __future__ import annotations

from app.ml.common import period_label
from app.ml.insights import build_insights
from app.services.guardrails import neutralise, redact_pii
from app.services.ledger import get_history

DISCLAIMER = "This is general education, not personalised investment, tax or legal advice."

SYSTEM_PROMPT = """You are FinSight AI's financial assistant for users in India.

Rules:
- Use only the numbers in USER DATA below. Never invent figures; if something isn't there, say so.
- All amounts are Indian Rupees (₹). Use Indian products and rules where relevant (EPF, PPF, NPS, ELSS, SIPs, FDs, 80C/80D, UPI, CIBIL).
- You are educational, not a licensed advisor: never recommend specific stocks, funds or crypto, and say so briefly if asked.
- Be concise: 2–5 short sentences or up to 5 bullets, under ~130 words, unless the user asks for detail.
- When you explain a number, say what it measures (e.g. the health score is a 0–100 rule-based score from savings rate and category concentration).
- End with at most one practical next step.
- Write Indian amounts with lakh/crore (1 lakh = ₹1,00,000; 1 crore = ₹1,00,00,000). Never say "million".

REFERENCE FACTS (use these; if a question needs other current tax figures, say rules change each Budget and suggest checking incometax.gov.in)
- Section 80C deduction limit: ₹1.5 lakh per financial year (old tax regime only).
- Section 80D covers health-insurance premiums (old regime); the limit is higher for senior citizens.
- The new tax regime is the default; it has lower slab rates but drops most deductions such as 80C and 80D.
- PPF: 15-year lock-in, government-backed. ELSS: equity funds with a 3-year lock-in that qualify for 80C.
- A common guideline is an emergency fund of 3–6 months of essential expenses.

USER DATA
{context}
"""


def _fmt(amount: float) -> str:
    return f"₹{amount:,.0f}"


async def build_snapshot(db, user_id: str) -> dict | None:
    history = await get_history(db, user_id, limit=24)
    if not history:
        return None
    insights = build_insights(history, months=3)
    goals = [g async for g in db["goals"].find({"user_id": user_id})]
    insights["goals"] = [
        {
            "name": g.get("name"),
            "target": float(g.get("target_amount", 0)),
            "saved": float(g.get("current_savings", 0)),
            "target_date": g.get("target_date"),
        }
        for g in goals
    ]
    insights["recent"] = history[-6:]
    return insights


def snapshot_to_text(snapshot: dict | None) -> str:
    if not snapshot:
        return "The user has not added any income or expense data yet."
    lines = [
        f"Latest month: {snapshot['latest_label']} ({snapshot['history_months']} month(s) of history).",
        f"Income {_fmt(snapshot['income'])}, spending {_fmt(snapshot['total_expense'])}, "
        f"savings {_fmt(snapshot['savings'])} (savings rate {snapshot['health']['savings_rate_pct']}%).",
        f"Health score {snapshot['health']['score']}/100 ({snapshot['health']['status']}).",
    ]
    lines.append("Spending by category that month: " + ", ".join(
        f"{c} {_fmt(v)}" for c, v in snapshot["expenses"].items() if v))
    mtd = snapshot.get("month_to_date")
    if mtd:
        lines.append(
            f"{mtd['label']} is in progress (day {mtd['day_of_month']}): spent {_fmt(mtd['spent_so_far'])} so far, "
            f"{mtd['spent_share_pct']}% of the {_fmt(mtd['projected_total'])} forecast for the full month."
        )
    recent = snapshot.get("recent") or []
    if len(recent) > 1:
        lines.append("Monthly history (income / spending): " + "; ".join(
            f"{period_label(r['period'])} {_fmt(r['income'])} / {_fmt(sum(r['expenses'].values()))}" for r in recent
        ))
    fc = snapshot["forecast"]["forecast"][0]
    lines.append(
        f"Forecast for {fc['label']}: spending {_fmt(fc['predicted_expense'])} "
        f"(80% range {_fmt(fc['lower'])}–{_fmt(fc['upper'])}), trend {snapshot['forecast']['trend_direction']}."
    )
    risk = snapshot["risk"]
    lines.append(
        f"Chance of spending more than income next month: {risk['overspend_probability'] * 100:.0f}% "
        f"(risk {risk['risk_level']}); chance of saving under 10%: {risk['low_savings_probability'] * 100:.0f}%."
    )
    anomalies = snapshot["anomalies"]["anomalies"]
    if anomalies:
        lines.append("Unusual spending: " + " ".join(a.get("message", a["category"]) for a in anomalies))
    lines.append(f"Spending style: {snapshot['pattern']['archetype']}. {snapshot['pattern']['peer_comparison']}")
    if snapshot["alerts"]:
        lines.append("Alerts: " + " ".join(snapshot["alerts"]))
    for goal in snapshot.get("goals", []):
        lines.append(f"Goal '{neutralise(goal['name'], 80)}': saved {_fmt(goal['saved'])} of {_fmt(goal['target'])} by {goal['target_date']}.")
    return "\n".join(lines)


def build_messages(snapshot: dict | None, message: str, history: list | None) -> list[dict]:
    messages = [{"role": "system", "content": SYSTEM_PROMPT.format(context=snapshot_to_text(snapshot))}]
    for turn in (history or [])[-10:]:
        text = (turn.text or "").strip()[:1500]
        if text:
            messages.append({"role": "assistant" if turn.role in ("advisor", "assistant") else "user", "content": redact_pii(text)})
    messages.append({"role": "user", "content": redact_pii(message.strip())})
    return messages


# ── Offline fallback (used when the LLM is not configured or fails) ─────────

FALLBACK_REPLIES = {
    "save": "Try the 50/30/20 split: about 50% on needs, 30% on wants and 20% to savings. Set up an auto-transfer or SIP on salary day so saving happens before spending.",
    "invest": "Build a 3–6 month emergency fund first (a savings account or liquid fund). After that, long-term money usually goes into diversified, low-cost options such as index-fund SIPs, PPF or NPS, depending on your goals. I can't recommend specific funds.",
    "sip": "A SIP invests a fixed amount every month, which averages out market ups and downs. Start with an amount you can sustain, and raise it when your income grows.",
    "tax": "Under the old regime, Section 80C (EPF, PPF, ELSS, life insurance, home-loan principal) allows up to ₹1.5 lakh in deductions, and 80D covers health-insurance premiums. The new regime has lower rates but fewer deductions, so compare both each year.",
    "80c": "Section 80C allows up to ₹1.5 lakh a year in deductions (old regime) for EPF, PPF, ELSS, life-insurance premiums, tuition fees and home-loan principal.",
    "budget": "Try a zero-based budget: list your income, subtract fixed costs (rent, bills, EMIs), then give every remaining rupee a job — savings, food, travel, fun — until nothing is unassigned.",
    "debt": "Pay off the highest-interest debt first (the avalanche method), starting with credit-card balances, which often cost 36%+ a year. Always pay at least the minimum on everything else.",
    "emi": "Keep total EMIs under about 30–40% of your take-home pay. Pre-paying high-interest loans early saves the most interest.",
    "emergency": "Keep 3–6 months of essential expenses (rent, food, bills, EMIs) in an emergency fund you can reach quickly, such as a savings account, sweep FD or liquid fund.",
    "rent": "A common guideline is to keep rent under about 30% of take-home pay. If it's higher, try negotiating at renewal, sharing a flat, or moving slightly further out.",
    "food": "Food delivery adds up quickly. Planning meals for the week, cooking in batches and setting a monthly cap for delivery apps can cut food spending noticeably.",
    "credit": "Your CIBIL score depends mostly on paying on time and keeping card usage below about 30% of your limit. Avoid applying for many loans or cards in a short period.",
    "cibil": "To improve your CIBIL score, pay every EMI and card bill on time, keep credit utilisation under 30%, and keep older credit accounts open.",
    "insurance": "Get adequate health insurance (consider a family floater) and, if anyone depends on your income, term life insurance — not insurance mixed with investment.",
    "retire": "For retirement, EPF, PPF and NPS are common long-term building blocks. Starting early matters most, because compounding does the heavy lifting.",
    "subscription": "Review your UPI autopay mandates and app subscriptions once a month, and cancel anything you haven't used in the last 30 days.",
    "inflation": "Inflation in India has often been around 4–6% a year, so money in a regular savings account loses value over time. Long-term savings need to beat inflation after tax.",
    "income": "Raising your income often helps more than cutting costs: negotiate your pay each year, build skills, or add a side income — then put the increase straight into savings.",
}


def fallback_reply(message: str, snapshot: dict | None, history: list | None) -> str:
    lower = message.lower()
    used = {(t.text or "").strip() for t in (history or []) if t.role in ("advisor", "assistant")}
    for keyword, reply in FALLBACK_REPLIES.items():
        if keyword in lower and reply not in used:
            return reply

    if snapshot:
        health = snapshot["health"]
        top = max(snapshot["expenses"].items(), key=lambda kv: kv[1])
        reply = (
            f"In {snapshot['latest_label']} you saved {_fmt(snapshot['savings'])} "
            f"({health['savings_rate_pct']}% of income), and your health score is {health['score']}/100. "
            f"Your biggest category is {top[0]} at {_fmt(top[1])}. "
            "Ask me about saving, budgeting, tax (80C/80D), debt or emergency funds."
        )
        if reply not in used:
            return reply
    return (
        "The AI model is unavailable right now, but I can still help with the basics. "
        "Try asking about saving, budgeting, SIPs, tax under 80C, debt, CIBIL or emergency funds."
    )


def rule_based_summary(snapshot: dict) -> str:
    rate = snapshot["health"]["savings_rate_pct"]
    parts = []
    if snapshot["savings"] < 0:
        parts.append(f"In {snapshot['latest_label']} you spent {_fmt(-snapshot['savings'])} more than you earned.")
    else:
        parts.append(f"In {snapshot['latest_label']} you saved {_fmt(snapshot['savings'])}, a {rate}% savings rate.")
    top = max(snapshot["expenses"].items(), key=lambda kv: kv[1])
    if snapshot["total_expense"] > 0:
        parts.append(f"{top[0]} was your largest category at {top[1] / snapshot['total_expense'] * 100:.0f}% of spending.")
    fc = snapshot["forecast"]["forecast"][0]
    risk = snapshot["risk"]
    parts.append(
        f"Next month's spending is forecast at about {_fmt(fc['predicted_expense'])}, "
        f"with a {risk['overspend_probability'] * 100:.0f}% chance of going over your income."
    )
    if rate < 10:
        parts.append("Setting up an automatic transfer of 10–15% of your salary on payday would build a buffer quickly.")
    elif rate < 20:
        parts.append("Moving another 5% of income into savings would get you to the 20% benchmark.")
    else:
        parts.append("With a strong savings rate, consider putting the surplus into long-term goals such as a SIP, PPF or NPS.")
    return " ".join(parts)


SUMMARY_PROMPT = """Write a 3-sentence monthly money summary for this user, in a warm, professional tone and plain English.
Sentence 1: how the month went (savings rate, biggest category).
Sentence 2: what the forecast and risk say about next month, including the range.
Sentence 3: one specific, practical action.
Use only the numbers given. Amounts are in ₹. No bullet points, no headings.

USER DATA
{context}"""
