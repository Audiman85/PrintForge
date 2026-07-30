"""Shared fixtures - seeds an Emergent-style auth session directly in Mongo."""
import os
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://design-forge-520.preview.emergentagent.com"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def mongo_db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(scope="session")
def seeded_session(mongo_db):
    ts = int(time.time() * 1000)
    user_id = f"test-user-{ts}"
    session_token = f"test_session_{ts}"
    email = f"test.user.{ts}@example.com"
    mongo_db.users.insert_one({
        "user_id": user_id,
        "email": email,
        "name": "Test User",
        "picture": "https://via.placeholder.com/150",
        "created_at": datetime.now(timezone.utc),
    })
    mongo_db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    })
    yield {"user_id": user_id, "session_token": session_token, "email": email}
    # cleanup
    mongo_db.users.delete_one({"user_id": user_id})
    mongo_db.user_sessions.delete_one({"session_token": session_token})


@pytest.fixture(scope="session")
def auth_headers(seeded_session):
    return {"Authorization": f"Bearer {seeded_session['session_token']}"}
