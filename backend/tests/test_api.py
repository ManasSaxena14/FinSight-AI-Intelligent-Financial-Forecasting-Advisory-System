import asyncio
from datetime import date, datetime, timedelta

from app.ml.common import current_period, shift_period
from app.routes.premium import assess_goal
from app.services.ledger import migrate_legacy_records

MONTHLY = {"Food": 8000, "Travel": 3000, "Rent": 18000, "Shopping": 4000, "Bills": 2500, "Entertainment": 2000}


def add_month(client, period, income=70000, expenses=None):
    res = client.post("/api/expenses/add", json={"period": period, "income": income, "expenses": expenses or MONTHLY})
    assert res.status_code == 200, res.text
    return res.json()


def test_same_month_different_years_do_not_merge(client):
    this_month = current_period()
    last_year = shift_period(this_month, -12)
    add_month(client, last_year)
    add_month(client, this_month)
    records = client.get("/api/expenses/get").json()
    assert [r["period"] for r in records] == [this_month, last_year]
    assert records[0]["month"] == records[1]["month"]


def test_month_and_year_form_still_works(client):
    last = shift_period(current_period(), -1)
    year, month_index = int(last[:4]), int(last[5:])
    month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month_index - 1]
    res = client.post("/api/expenses/add", json={"month": month, "year": year, "income": 50000, "expenses": MONTHLY})
    assert res.status_code == 200
    assert res.json()["period"] == last


def test_future_month_rejected(client):
    res = client.post("/api/expenses/add", json={"period": shift_period(current_period(), 1), "income": 1, "expenses": MONTHLY})
    assert res.status_code == 422


def test_transactions_drive_monthly_totals(client):
    today = date.today().isoformat()
    r1 = client.post("/api/transactions", json={"date": today, "type": "income", "amount": 60000})
    r2 = client.post("/api/transactions", json={"date": today, "type": "expense", "category": "Food", "amount": 450, "merchant": "Swiggy"})
    assert r2.status_code == 200, r2.text
    month = r2.json()["month"]
    assert month["income"] == 60000 and month["expenses"]["Food"] == 450 and month["savings"] == 59550

    txs = client.get("/api/transactions", params={"period": current_period()}).json()
    assert len(txs) == 2
    deleted = client.delete(f"/api/transactions/{r2.json()['transaction']['id']}").json()
    assert deleted["month"]["expenses"]["Food"] == 0
    client.delete(f"/api/transactions/{r1.json()['transaction']['id']}")
    assert client.get("/api/expenses/get").json() == []  # empty month is removed


def test_expense_needs_valid_category(client):
    res = client.post("/api/transactions", json={"date": date.today().isoformat(), "type": "expense", "category": "Crypto", "amount": 10})
    assert res.status_code == 422


def test_insights_from_server_history(client):
    for i in range(5, 0, -1):
        add_month(client, shift_period(current_period(), -i))
    res = client.get("/api/ml/insights", params={"months": 3})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["history_months"] == 5
    assert len(body["forecast"]["forecast"]) == 3
    assert body["risk"]["risk_level"] == "low"


def test_insights_404_without_data(client):
    assert client.get("/api/ml/insights").status_code == 404


def test_chat_falls_back_when_llm_unavailable(client):
    add_month(client, current_period())
    res = client.post("/api/premium/chat", json={"message": "How do I use 80C?"})
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "fallback"
    assert "80C" in body["reply"]
    assert "401k" not in body["reply"]


def test_chat_stream_sends_fallback_events(client):
    with client.stream("POST", "/api/premium/chat/stream", json={"message": "tips to save"}) as res:
        assert res.headers["content-type"].startswith("text/event-stream")
        body = "".join(res.iter_text())
    assert '"type": "token"' in body and '"source": "fallback"' in body


def test_summary_rule_based_fallback(client):
    add_month(client, current_period())
    res = client.post("/api/premium/summary", json={"message": "summary"})
    assert res.json()["source"] == "fallback"
    assert "saved" in res.json()["reply"]


# ── Goals ────────────────────────────────────────────────────────────────────

def future(days):
    return (date.today() + timedelta(days=days)).isoformat()


def test_goal_on_track_depends_on_capacity():
    on = assess_goal(60000, 0, future(365), capacity_left=10000)
    off = assess_goal(60000, 0, future(60), capacity_left=10000)
    assert on["is_on_track"] and not off["is_on_track"]
    assert "₹" in off["track_reason"]


def test_goal_without_data_is_not_on_track():
    assert assess_goal(1000, 0, future(400), capacity_left=None)["is_on_track"] is False


def test_goals_compete_for_capacity_by_deadline(client):
    add_month(client, current_period())  # saves 32,500/month
    client.post("/api/premium/goals", json={"name": "Later", "target_amount": 200000, "target_date": future(300)})
    client.post("/api/premium/goals", json={"name": "Sooner", "target_amount": 60000, "target_date": future(61)})
    goals = {g["name"]: g for g in client.get("/api/premium/goals").json()}
    assert goals["Sooner"]["is_on_track"] is True      # ~30k/month fits
    assert goals["Later"]["is_on_track"] is False      # ~20k/month doesn't fit in what's left


def test_contribution_limited_to_available_savings(client):
    add_month(client, current_period(), income=10000, expenses={"Food": 4000})
    goal = client.post("/api/premium/goals", json={"name": "Trip", "target_amount": 50000, "target_date": future(200)}).json()
    assert client.put(f"/api/premium/goals/{goal['id']}/contribute", json={"amount": 5000}).status_code == 200
    second = client.put(f"/api/premium/goals/{goal['id']}/contribute", json={"amount": 2000})
    assert second.status_code == 400  # only 1,000 left unallocated


# ── Legacy migration ─────────────────────────────────────────────────────────

def test_legacy_records_are_migrated(fake_db):
    written = datetime(2026, 2, 10)
    fake_db["expenses"].docs.append({
        "_id": "legacy-1", "user_id": "user-1", "month": "Dec", "income": 80000,
        "expenses": {"Food": 9000}, "total_expense": 9000, "savings": 71000,
        "created_at": written, "updated_at": written,
        "entries": [
            {"income": 50000, "expenses": {"Food": 5000}, "added_at": written},
            {"income": 30000, "expenses": {"Food": 4000}, "added_at": written},
        ],
    })
    assert asyncio.run(migrate_legacy_records(fake_db)) == 1
    record = fake_db["expenses"].docs[0]
    assert record["period"] == "2025-12" and record["_id"] == "legacy-1"
    assert record["income"] == 80000 and record["expenses"]["Food"] == 9000
    assert len(fake_db["transactions"].docs) == 4
    # Idempotent
    assert asyncio.run(migrate_legacy_records(fake_db)) == 0
    assert len(fake_db["transactions"].docs) == 4


def test_smart_savings_ignores_half_logged_current_month(client):
    import calendar
    today = date.today()
    if today.day >= calendar.monthrange(today.year, today.month)[1] - 1:
        return  # near month end the current month counts as complete
    for i in range(4, 0, -1):
        add_month(client, shift_period(current_period(), -i), expenses=dict(MONTHLY, Shopping=15000))
    client.post("/api/transactions", json={"date": today.isoformat(), "type": "income", "amount": 70000})
    client.post("/api/transactions", json={"date": today.isoformat(), "type": "expense", "category": "Food", "amount": 300})
    body = client.get("/api/premium/smart-savings").json()
    from app.ml.common import period_label
    assert period_label(shift_period(current_period(), -1)) in body["summary"]
    assert any(t["category"] == "Shopping" for t in body["tips"])
