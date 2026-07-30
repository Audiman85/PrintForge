"""Iter9 tests: community wishlist star endpoints + admin analytics."""
import os
import time
import uuid
from datetime import datetime, timezone

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://design-forge-520.preview.emergentagent.com"


# ---------------------- helpers ----------------------
@pytest.fixture(scope="module")
def seeded_design(mongo_db, seeded_session):
    """Insert a fake public design row so we can star it without touching S3."""
    design_id = f"dsn_test_{uuid.uuid4().hex[:8]}"
    mongo_db.designs.insert_one({
        "design_id": design_id,
        "user_id": seeded_session["user_id"],
        "title": "TEST_star_design",
        "description": "",
        "tags": [],
        "is_public": True,
        "storage_path": "TEST/none.stl",
        "original_filename": "none.stl",
        "file_size": 0,
        "preview_path": None,
        "likes": 0,
        "downloads": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    yield design_id
    mongo_db.designs.delete_one({"design_id": design_id})
    mongo_db.design_stars.delete_many({"design_id": design_id})


# ---------------------- STAR API ----------------------
class TestStarAPI:
    def test_unauthed_star_returns_401(self, seeded_design):
        r = requests.post(f"{BASE_URL}/api/designs/{seeded_design}/star")
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"

    def test_star_missing_design_returns_404(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/designs/dsn_does_not_exist/star", headers=auth_headers)
        assert r.status_code == 404

    def test_star_idempotent(self, auth_headers, seeded_design, mongo_db, seeded_session):
        r1 = requests.post(f"{BASE_URL}/api/designs/{seeded_design}/star", headers=auth_headers)
        assert r1.status_code == 200
        assert r1.json().get("starred") is True
        r2 = requests.post(f"{BASE_URL}/api/designs/{seeded_design}/star", headers=auth_headers)
        assert r2.status_code == 200
        count = mongo_db.design_stars.count_documents({
            "user_id": seeded_session["user_id"], "design_id": seeded_design
        })
        assert count == 1, f"expected 1 star row (idempotent), got {count}"

    def test_my_starred_list(self, auth_headers, seeded_design):
        r = requests.get(f"{BASE_URL}/api/community/starred", headers=auth_headers)
        assert r.status_code == 200
        ids = r.json().get("ids", [])
        assert seeded_design in ids

    def test_community_top_public(self, seeded_design):
        r = requests.get(f"{BASE_URL}/api/community/top?limit=10")
        assert r.status_code == 200
        designs = r.json().get("designs", [])
        # Our seeded design should appear because we starred it
        found = next((d for d in designs if d.get("design_id") == seeded_design), None)
        assert found is not None, f"seeded design not in top list: {designs}"
        assert "stars" in found
        assert isinstance(found["stars"], int)
        assert found["stars"] >= 1

    def test_unstar_removes(self, auth_headers, seeded_design, mongo_db, seeded_session):
        r = requests.delete(f"{BASE_URL}/api/designs/{seeded_design}/star", headers=auth_headers)
        assert r.status_code == 200
        assert r.json().get("starred") is False
        count = mongo_db.design_stars.count_documents({
            "user_id": seeded_session["user_id"], "design_id": seeded_design
        })
        assert count == 0

    def test_unauthed_starred_list_401(self):
        r = requests.get(f"{BASE_URL}/api/community/starred")
        assert r.status_code in (401, 403)

    def test_designs_starred_no_longer_shadowed(self):
        """/api/designs/starred used to shadow /api/designs/{id}; now it should 404 (design not found)."""
        r = requests.get(f"{BASE_URL}/api/designs/starred")
        assert r.status_code == 404


# ---------------------- ANALYTICS ----------------------
class TestAdminAnalytics:
    REQUIRED_KEYS = {
        "orders_paid_count", "orders_paid_cents", "donations_count", "donations_cents",
        "top_donors", "restock_top", "new_signups", "new_designs", "new_design_stars",
        "window_days", "generated_at",
    }

    def test_unauthed_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/admin/analytics")
        assert r.status_code in (401, 403)

    def test_default_days_30(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/analytics", headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        missing = self.REQUIRED_KEYS - set(data.keys())
        assert not missing, f"missing keys: {missing}"
        assert data["window_days"] == 30
        # Non-negative integers
        for k in ("orders_paid_count", "orders_paid_cents", "donations_count",
                  "donations_cents", "new_signups", "new_designs", "new_design_stars"):
            assert isinstance(data[k], int), f"{k} not int"
            assert data[k] >= 0, f"{k} negative"
        assert isinstance(data["top_donors"], list)
        assert isinstance(data["restock_top"], list)

    def test_days_7(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/analytics?days=7", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["window_days"] == 7

    def test_days_90(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/analytics?days=90", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["window_days"] == 90

    def test_invalid_days_rejected(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/analytics?days=0", headers=auth_headers)
        assert r.status_code in (400, 422)
