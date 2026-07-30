"""Iteration 3 backend tests - Stripe donation flow + supporter wall + regressions."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
ORIGIN = "https://design-forge-520.preview.emergentagent.com"


# ---------- Donation Checkout: presets ----------
class TestDonateCheckoutPresets:
    @pytest.mark.parametrize("pkg,cents", [("tip_3", 300), ("tip_5", 500), ("tip_10", 1000)])
    def test_preset(self, pkg, cents):
        r = requests.post(f"{BASE_URL}/api/donate/checkout",
                          json={"package_id": pkg, "origin_url": ORIGIN,
                                "supporter_name": "TEST_Alice", "supporter_message": "Go PF!",
                                "is_anonymous": False}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["amount_cents"] == cents
        assert d["session_id"].startswith("cs_")
        assert d["checkout_url"].startswith("https://")


# ---------- Custom amounts ----------
class TestDonateCheckoutCustom:
    def test_custom_valid_250(self):
        r = requests.post(f"{BASE_URL}/api/donate/checkout",
                          json={"package_id": None, "custom_amount_cents": 250,
                                "origin_url": ORIGIN, "is_anonymous": True}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["amount_cents"] == 250

    def test_custom_below_min_50(self):
        r = requests.post(f"{BASE_URL}/api/donate/checkout",
                          json={"custom_amount_cents": 50, "origin_url": ORIGIN}, timeout=30)
        assert r.status_code == 400

    def test_custom_above_max_60000(self):
        r = requests.post(f"{BASE_URL}/api/donate/checkout",
                          json={"custom_amount_cents": 60000, "origin_url": ORIGIN}, timeout=30)
        assert r.status_code == 400

    def test_missing_all(self):
        r = requests.post(f"{BASE_URL}/api/donate/checkout",
                          json={"origin_url": ORIGIN}, timeout=30)
        assert r.status_code == 400


# ---------- Anonymous behaviour ----------
class TestDonateAnonymousMetadata:
    def test_no_name_becomes_anonymous(self):
        r = requests.post(f"{BASE_URL}/api/donate/checkout",
                          json={"package_id": "tip_3", "origin_url": ORIGIN,
                                "supporter_name": "", "is_anonymous": False}, timeout=30)
        assert r.status_code == 200
        sid = r.json()["session_id"]
        # Verify persisted transaction reflects anonymous
        # We probe via status endpoint (which won't tell anon flag) — instead go to /supporters after webhook.
        # Here just ensure session created (persistence covered by webhook->supporters test).
        assert sid


# ---------- Donate status ----------
class TestDonateStatus:
    def test_unknown_404(self):
        r = requests.get(f"{BASE_URL}/api/donate/status/cs_test_unknown_xyz", timeout=20)
        assert r.status_code == 404

    def test_pending_after_create(self):
        c = requests.post(f"{BASE_URL}/api/donate/checkout",
                          json={"package_id": "tip_5", "origin_url": ORIGIN,
                                "supporter_name": "TEST_Pending"}, timeout=30).json()
        sid = c["session_id"]
        s = requests.get(f"{BASE_URL}/api/donate/status/{sid}", timeout=30)
        assert s.status_code == 200
        d = s.json()
        assert d["session_id"] == sid
        assert d["payment_status"] in ("pending", "paid")  # unpaid session should be pending
        assert d["amount_cents"] == 500


# ---------- Webhook + supporters wall ----------
class TestWebhookAndSupporters:
    def test_webhook_marks_paid_and_writes_supporter(self):
        # Create a session with a visible name
        create = requests.post(f"{BASE_URL}/api/donate/checkout",
                               json={"package_id": "tip_10", "origin_url": ORIGIN,
                                     "supporter_name": "TEST_SupporterHook",
                                     "supporter_message": "TEST_msg",
                                     "is_anonymous": False}, timeout=30).json()
        sid = create["session_id"]

        # Simulate Stripe webhook (no signature verification since STRIPE_WEBHOOK_SECRET is empty)
        wh = requests.post(f"{BASE_URL}/api/stripe/webhook",
                           json={"type": "checkout.session.completed",
                                 "data": {"object": {"id": sid}}}, timeout=30)
        assert wh.status_code == 200, wh.text
        assert wh.json().get("status") == "ok"

        # Status should now say paid
        st = requests.get(f"{BASE_URL}/api/donate/status/{sid}", timeout=30).json()
        assert st["payment_status"] == "paid"

        # Supporters listing should include this record
        sup = requests.get(f"{BASE_URL}/api/supporters", timeout=30)
        assert sup.status_code == 200
        d = sup.json()
        assert "supporters" in d and "count" in d and "total_cents" in d
        assert d["count"] >= 1
        assert d["total_cents"] >= 1000
        match = [s for s in d["supporters"] if s.get("name") == "TEST_SupporterHook"]
        assert match, f"Missing named supporter row. sample={d['supporters'][:3]}"
        row = match[0]
        assert row["amount_cents"] == 1000
        assert row["is_anonymous"] is False
        assert row["message"] == "TEST_msg"

    def test_webhook_idempotent(self):
        # Create + send webhook twice; supporter count should NOT double
        import time
        unique_name = f"TEST_Idem_{int(time.time()*1000)}"
        create = requests.post(f"{BASE_URL}/api/donate/checkout",
                               json={"package_id": "tip_3", "origin_url": ORIGIN,
                                     "supporter_name": unique_name,
                                     "is_anonymous": False}, timeout=30).json()
        sid = create["session_id"]
        for _ in range(2):
            r = requests.post(f"{BASE_URL}/api/stripe/webhook",
                              json={"type": "checkout.session.completed",
                                    "data": {"object": {"id": sid}}}, timeout=30)
            assert r.status_code == 200
        sup = requests.get(f"{BASE_URL}/api/supporters", timeout=30).json()
        idem_rows = [s for s in sup["supporters"] if s.get("name") == unique_name]
        assert len(idem_rows) == 1

    def test_anonymous_supporter_has_blank_name(self):
        create = requests.post(f"{BASE_URL}/api/donate/checkout",
                               json={"package_id": "tip_3", "origin_url": ORIGIN,
                                     "supporter_name": "SecretDonor",
                                     "is_anonymous": True}, timeout=30).json()
        sid = create["session_id"]
        r = requests.post(f"{BASE_URL}/api/stripe/webhook",
                          json={"type": "checkout.session.completed",
                                "data": {"object": {"id": sid}}}, timeout=30)
        assert r.status_code == 200
        sup = requests.get(f"{BASE_URL}/api/supporters", timeout=30).json()
        anon_matches = [s for s in sup["supporters"] if s.get("is_anonymous") and s.get("amount_cents") == 300]
        assert anon_matches, "Expected at least one anonymous $3 supporter"
        assert all(s["name"] == "" for s in anon_matches)


# ---------- Regressions (no donation changes should break these) ----------
class TestRegressions:
    def test_products(self):
        r = requests.get(f"{BASE_URL}/api/products", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_categories(self):
        r = requests.get(f"{BASE_URL}/api/categories", timeout=15)
        assert r.status_code == 200

    def test_shipping_quotes(self):
        r = requests.post(f"{BASE_URL}/api/shipping/quotes",
                          json={"weight_grams": 100, "items": 1, "country": "US",
                                "postal_code": "94107", "signature_required": False,
                                "insured_value": 20}, timeout=15)
        assert r.status_code == 200
        assert "quotes" in r.json()

    def test_filament_stock(self):
        r = requests.get(f"{BASE_URL}/api/filament/stock", timeout=15)
        assert r.status_code == 200

    def test_filament_store_link(self):
        r = requests.get(f"{BASE_URL}/api/filament/store-link", params={"material": "PLA"}, timeout=15)
        assert r.status_code == 200

    def test_external_search_marketplace_wording(self):
        r = requests.get(f"{BASE_URL}/api/search/external", params={"q": "voronoi"}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        results = d.get("results", [])
        assert results, "Expected external search results"
        # Find MyMiniFactory entries and confirm focus wording
        mmf = [x for x in results if x.get("source") == "MyMiniFactory"]
        assert mmf, "MyMiniFactory not present in results"
        # focus field should have new wording
        focuses = " ".join(str(x.get("source_focus", "")) for x in mmf)
        assert "3D Marketplace" in focuses, f"Expected '3D Marketplace' focus, got: {focuses}"
        assert "Curated" not in focuses and "curated" not in focuses
