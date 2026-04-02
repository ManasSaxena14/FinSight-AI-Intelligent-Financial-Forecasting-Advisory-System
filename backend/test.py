import requests

BASE_URL = "http://127.0.0.1:8000"

# 1. Register a test user
print("Registering...")
res = requests.post(f"{BASE_URL}/api/auth/register", json={
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
})
print(res.status_code, res.text)

# 2. Login
print("Logging in...")
res = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "test@example.com",
    "password": "password123"
})
print(res.status_code, res.text)
if res.status_code == 200:
    token = res.json()["access_token"]
    
    # 3. Add expense
    print("Adding expense...")
    res = requests.post(f"{BASE_URL}/api/expenses/add", json={
        "month": "Jan",
        "income": 5000,
        "expenses": {
            "Food": 500,
            "Travel": 200,
            "Rent": 1500,
            "Shopping": 300,
            "Bills": 400,
            "Entertainment": 100
        }
    }, headers={"Authorization": f"Bearer {token}"})
    print(res.status_code, res.text)
