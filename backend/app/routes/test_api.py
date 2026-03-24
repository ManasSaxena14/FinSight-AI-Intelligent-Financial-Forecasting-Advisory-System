"""
FinSight AI -- Phase 7: API Route Testing
=========================================
Verifies that all API routes (ML & Expenses) are functional
using FastAPI's TestClient.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Common payload for testing
payload = {
    "user_id": "test_user_1",
    "month": "Jan",
    "income": 60000,
    "expenses": {
        "Food": 8000,
        "Travel": 3000,
        "Rent": 18000,
        "Shopping": 7000,
        "Bills": 2500,
        "Entertainment": 4000
    }
}

ml_payload = {
    "income": 60000,
    "expenses": payload["expenses"],
    "previous_expenses": {
        "Food": 8000,
        "Travel": 3000,
        "Rent": 10000, # 18000 is an 80% spike
        "Shopping": 7000,
        "Bills": 2500,
        "Entertainment": 4000
    }
}

def run_tests():
    from fastapi.testclient import TestClient
    from app.main import app
    
    with TestClient(app) as client:
        print("====================================")
        print("Testing ML Routes")
        print("====================================")
        
        # 1. /api/ml/predict
        res = client.post("/api/ml/predict", json=ml_payload)
        print(f"POST /api/ml/predict -> {res.status_code}")
        print(res.json(), "\n")
        assert res.status_code == 200

        # ... (other ml routes skipped here, but will just add them below)
        # 2. /api/ml/forecast
        forecast_payload = {**ml_payload, "months": 3}
        res = client.post("/api/ml/forecast", json=forecast_payload)
        print(f"POST /api/ml/forecast -> {res.status_code}")
        assert res.status_code == 200

        # 3. /api/ml/health-score
        res = client.post("/api/ml/health-score", json=ml_payload)
        print(f"POST /api/ml/health-score -> {res.status_code}")
        assert res.status_code == 200

        # 4. /api/ml/recommendations 
        res = client.post("/api/ml/recommendations", json=ml_payload)
        print(f"POST /api/ml/recommendations -> {res.status_code}")
        assert res.status_code == 200

        print("====================================")
        print("Testing Expense Routes (via MongoDB)")
        print("====================================")

        # 5. /api/expenses/add
        res = client.post("/api/expenses/add", json=payload)
        print(f"POST /api/expenses/add -> {res.status_code}")
        print(res.json(), "\n")
        assert res.status_code == 200

        # 6. /api/expenses/get
        res = client.get("/api/expenses/get?user_id=test_user_1")
        print(f"GET /api/expenses/get?user_id=test_user_1 -> {res.status_code}")
        print(f"Found {len(res.json())} DB records")
        assert res.status_code == 200

        print("ALL API TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
