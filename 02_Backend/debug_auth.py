import urllib.request
import urllib.error
import json
from jose import jwt
from datetime import datetime, timedelta

SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
ALGORITHM = "HS256"
API_URL = "http://localhost:8000"

def create_token(scope):
    to_encode = {
        "sub": "hugo@vesotel.com",
        "scope": scope,
        "exp": datetime.utcnow() + timedelta(minutes=15)
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def check_access(token, name):
    print(f"\n--- Testing {name} Token ---")
    req = urllib.request.Request(f"{API_URL}/users/me")
    req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as response:
            print(f"Status: {response.status}")
            print(f"Response: {response.read().decode()}")
    except urllib.error.HTTPError as e:
        print(f"Error: {e.code} {e.reason}")

# 1. Test Pending Token (Should fail)
pending_token = create_token("2fa_pending")
check_access(pending_token, "2FA Pending")

# 2. Test Full Token (Should succeed)
full_token = create_token("full")
check_access(full_token, "Full Access")
