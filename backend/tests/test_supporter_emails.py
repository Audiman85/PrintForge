"""Iteration 4 - Supporter emails endpoint (for Community supporter badge)."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://design-forge-520.preview.emergentagent.com"
ORIGIN = "https://design-forge-520.preview.emergentagent.com"


class TestSupporterEmails:
    def test_shape(self):
        r = requests.get(f"{BASE_URL}/api/supporters/emails", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "emails" in d
        assert isinstance(d["emails"], list)
        for e in d["emails"]:
            assert e == e.lower()

    def test_seeded_email_via_webhook(self, mongo_db):
        """Create donation checkout, promote via webhook, then directly seed an email onto the supporter row
        (webhook uses stripe.retrieve which returns no email for a synthetic session), then verify listing."""
        create = requests.post(f"{BASE_URL}/api/donate/checkout", json={
            "package_id": "tip_3", "origin_url": ORIGIN,
            "supporter_name": "TEST_EmailSup", "is_anonymous": False,
        }, timeout=30).json()
        sid = create["session_id"]
        wh = requests.post(f"{BASE_URL}/api/stripe/webhook", json={
            "type": "checkout.session.completed",
            "data": {"object": {"id": sid}},
        }, timeout=30)
        assert wh.status_code == 200
        # Patch email onto supporter row (Stripe test API returns no customer email for us)
        seeded_email = f"test_supporter_{int(time.time()*1000)}@example.com"
        upd = mongo_db.supporters.update_one({"session_id": sid}, {"$set": {"email": seeded_email}})
        assert upd.matched_count == 1

        # Now supporter_emails should include it (lowercased)
        r = requests.get(f"{BASE_URL}/api/supporters/emails", timeout=15)
        assert r.status_code == 200
        emails = r.json()["emails"]
        assert seeded_email.lower() in emails
