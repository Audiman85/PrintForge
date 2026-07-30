"""Iter11: Verify /api/admin/analytics tz-naive datetime bug fix."""
import os
import time
import requests
import pytest
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://design-forge-520.preview.emergentagent.com").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="module")
def mongo_db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(scope="module")
def auth_session(mongo_db):
    ts = int(time.time() * 1000)
    user_id = f"test-user-iter11-{ts}"
    token = f"test_session_iter11_{ts}"
    mongo_db.users.insert_one({
        "user_id": user_id,
        "email": f"test.user.iter11.{ts}@example.com",
        "name": "Iter11 Analytics Test",
        "picture": "https://via.placeholder.com/150",
        "created_at": datetime.now(timezone.utc),
    })
    mongo_db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    })
    yield {"user_id": user_id, "token": token}
    mongo_db.users.delete_one({"user_id": user_id})
    mongo_db.user_sessions.delete_one({"session_token": token})


@pytest.fixture(scope="module")
def tz_naive_donation(mongo_db):
    """Seed a payment_transactions row with a tz-NAIVE updated_at within the 30-day window."""
    naive_dt = datetime.utcnow() - timedelta(days=2)  # tz-naive on purpose
    doc_id = f"iter11-txn-{int(time.time()*1000)}"
    mongo_db.payment_transactions.insert_one({
        "transaction_id": doc_id,
        "purpose": "donation",
        "payment_status": "paid",
        "amount_cents": 1234,
        "updated_at": naive_dt,  # tz-naive — this is the bug repro
    })
    yield doc_id
    mongo_db.payment_transactions.delete_one({"transaction_id": doc_id})


REQUIRED_KEYS = {
    "window_days", "orders_paid_count", "orders_paid_cents",
    "donations_count", "donations_cents", "top_donors", "restock_top",
    "new_signups", "new_designs", "new_design_stars", "generated_at",
}


def test_analytics_unauthed_returns_401():
    r = requests.get(f"{BASE_URL}/api/admin/analytics")
    assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text[:200]}"


def test_analytics_authed_returns_200_with_tz_naive_row(auth_session, tz_naive_donation):
    headers = {"Authorization": f"Bearer {auth_session['token']}"}
    r = requests.get(f"{BASE_URL}/api/admin/analytics", headers=headers)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:500]}"
    data = r.json()
    missing = REQUIRED_KEYS - set(data.keys())
    assert not missing, f"Missing keys in response: {missing}"
    assert data["window_days"] == 30
    # Our tz-naive seeded row should be counted
    assert data["donations_count"] >= 1
    assert data["donations_cents"] >= 1234


def test_analytics_window_7(auth_session):
    headers = {"Authorization": f"Bearer {auth_session['token']}"}
    r = requests.get(f"{BASE_URL}/api/admin/analytics?days=7", headers=headers)
    assert r.status_code == 200, r.text[:300]
    assert r.json()["window_days"] == 7


def test_analytics_window_90(auth_session):
    headers = {"Authorization": f"Bearer {auth_session['token']}"}
    r = requests.get(f"{BASE_URL}/api/admin/analytics?days=90", headers=headers)
    assert r.status_code == 200, r.text[:300]
    assert r.json()["window_days"] == 90
