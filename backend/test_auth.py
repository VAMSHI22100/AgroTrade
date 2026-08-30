#!/usr/bin/env python
import requests
import json

BASE_URL = "http://127.0.0.1:5000"

print("=" * 60)
print("Testing AgroTrade Backend Authentication")
print("=" * 60)

# Test 1: Health check
print("\n1. Health Check:")
try:
    response = requests.get(f"{BASE_URL}/health")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
except Exception as e:
    print(f"   Error: {e}")

# Test 2: Registration
print("\n2. User Registration:")
register_data = {
    "name": "Alice Farmer",
    "email": "alice@agrotrade.com",
    "password": "AlicePass123!",
    "role": "farmer",
}
try:
    response = requests.post(f"{BASE_URL}/register", json=register_data)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
except Exception as e:
    print(f"   Error: {e}")

# Test 3: Login with correct credentials
print("\n3. Login with Correct Credentials:")
login_data = {"email": "alice@agrotrade.com", "password": "AlicePass123!"}
try:
    response = requests.post(f"{BASE_URL}/login", json=login_data)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
except Exception as e:
    print(f"   Error: {e}")

# Test 4: Login with wrong password
print("\n4. Login with Wrong Password:")
login_data_wrong = {"email": "alice@agrotrade.com", "password": "WrongPassword"}
try:
    response = requests.post(f"{BASE_URL}/login", json=login_data_wrong)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
except Exception as e:
    print(f"   Error: {e}")

# Test 5: Login with non-existent email
print("\n5. Login with Non-existent Email:")
login_data_notfound = {
    "email": "nonexistent@agrotrade.com",
    "password": "AnyPassword123!",
}
try:
    response = requests.post(f"{BASE_URL}/login", json=login_data_notfound)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
except Exception as e:
    print(f"   Error: {e}")

print("\n" + "=" * 60)
print("✓ All tests completed!")
print("=" * 60)
