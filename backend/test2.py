import requests

BASE_URL = "http://127.0.0.1:8000"

res = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "test@example.com",
    "password": "password123"
})
token = res.json()["access_token"]

res = requests.get(f"{BASE_URL}/api/expenses/get", headers={"Authorization": f"Bearer {token}"})
print("getExpenses payload:", res.json())

expenses_db = res.json()
if expenses_db:
    latest = expenses_db[0]
    payload = {
        "income": latest["income"],
        "expenses": latest["expenses"]
    }
    print("\nCalling /ml/health-score...")
    res = requests.post(f"{BASE_URL}/api/ml/health-score", json=payload, headers={"Authorization": f"Bearer {token}"})
    print(res.status_code, res.text)
    
    print("\nCalling /ml/forecast with payload...")
    res = requests.post(f"{BASE_URL}/api/ml/forecast", json=payload, headers={"Authorization": f"Bearer {token}"})
    print(res.status_code, res.text)
    
    print("\nCalling /ml/recommendations...")
    res = requests.post(f"{BASE_URL}/api/ml/recommendations", json=payload, headers={"Authorization": f"Bearer {token}"})
    print(res.status_code, res.text)
