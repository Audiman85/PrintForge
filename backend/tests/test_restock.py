"""Iteration 4 - Restock alert subscribe / list / notify tests."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://design-forge-520.preview.emergentagent.com"


class TestRestockSubscribe:
    def test_subscribe_valid(self):
        r = requests.post(f"{BASE_URL}/api/restock/subscribe", json={
            "email": f"TEST_restock_{int(time.time()*1000)}@example.com",
            "material": "PLA",
            "colors": ["red", "blue"],
        }, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert "id" in d
        assert d["material"] == "PLA"
        assert d["colors"] == ["red", "blue"]

    def test_invalid_email(self):
        r = requests.post(f"{BASE_URL}/api/restock/subscribe", json={
            "email": "not-an-email",
            "material": "PLA",
        }, timeout=15)
        assert r.status_code == 400

    def test_missing_material(self):
        r = requests.post(f"{BASE_URL}/api/restock/subscribe", json={
            "email": "TEST_missing@example.com",
            "material": "",
        }, timeout=15)
        assert r.status_code == 400

    def test_idempotent_upsert(self, mongo_db):
        email = f"TEST_idem_{int(time.time()*1000)}@example.com"
        r1 = requests.post(f"{BASE_URL}/api/restock/subscribe", json={
            "email": email, "material": "PETG", "colors": ["red"],
        }, timeout=15)
        assert r1.status_code == 200
        # Resubscribe with different colours -> update
        r2 = requests.post(f"{BASE_URL}/api/restock/subscribe", json={
            "email": email, "material": "PETG", "colors": ["green", "black"],
        }, timeout=15)
        assert r2.status_code == 200

        count = mongo_db.restock_subscriptions.count_documents({"email": email.lower(), "material": "PETG"})
        assert count == 1
        doc = mongo_db.restock_subscriptions.find_one({"email": email.lower(), "material": "PETG"})
        assert set(doc["colors"]) == {"green", "black"}
        assert doc["status"] == "active"


class TestRestockSubscriptionsList:
    def test_unauth_401(self):
        r = requests.get(f"{BASE_URL}/api/restock/subscriptions", timeout=15)
        assert r.status_code == 401

    def test_auth_returns_list(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/restock/subscriptions", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "subscriptions" in d
        assert "count" in d
        assert "email_provider_configured" in d
        # RESEND_API_KEY not set in preview
        assert d["email_provider_configured"] is False


class TestRestockNotify:
    def test_unauth_401(self):
        r = requests.post(f"{BASE_URL}/api/restock/notify", json={"material": "PLA", "colors": ["red"]}, timeout=15)
        assert r.status_code == 401

    def test_notify_matches_and_queues(self, auth_headers, mongo_db):
        # Seed a fresh subscription
        email = f"TEST_notify_{int(time.time()*1000)}@example.com"
        requests.post(f"{BASE_URL}/api/restock/subscribe", json={
            "email": email, "material": "TPU", "colors": ["orange"],
        }, timeout=15)
        # Notify for TPU orange
        r = requests.post(
            f"{BASE_URL}/api/restock/notify",
            headers=auth_headers,
            json={"material": "TPU", "colors": ["orange"], "note": "TEST_note"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["matched"] >= 1
        assert d["email_provider_configured"] is False
        assert d["queued"] >= 1
        assert d["sent"] == 0

        # notification row inserted
        notif = mongo_db.restock_notifications.find_one({"email": email.lower(), "material": "TPU"})
        assert notif is not None
        assert notif["outcome"] == "queued"

        # last_notified_at updated
        sub = mongo_db.restock_subscriptions.find_one({"email": email.lower(), "material": "TPU"})
        assert sub["last_notified_at"] is not None

    def test_notify_empty_colours_matches_any(self, auth_headers):
        # A subscriber who asked for "any" (empty colours list) should always match
        email = f"TEST_any_{int(time.time()*1000)}@example.com"
        requests.post(f"{BASE_URL}/api/restock/subscribe", json={
            "email": email, "material": "ABS", "colors": [],
        }, timeout=15)
        r = requests.post(
            f"{BASE_URL}/api/restock/notify",
            headers=auth_headers,
            json={"material": "ABS", "colors": ["silver"]},
            timeout=20,
        )
        assert r.status_code == 200
        assert r.json()["matched"] >= 1
