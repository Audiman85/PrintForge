"""Iteration 4 - Stripe print-order checkout tests. SUPERSEDED by test_iter5.py
which covers the iter5 server-verified quote contract. Kept for archive."""
import os
import pytest
import requests

pytestmark = pytest.mark.skip(reason="Superseded by test_iter5.py after iter5 introduced server-verified quote — see /app/backend/tests/test_iter5.py")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://design-forge-520.preview.emergentagent.com"
ORIGIN = "https://design-forge-520.preview.emergentagent.com"


@pytest.fixture(scope="module")
def a_product():
    r = requests.get(f"{BASE_URL}/api/products", timeout=15)
    assert r.status_code == 200
    products = r.json()
    assert products, "Need at least one product in DB for order tests"
    return products[0]


class TestOrdersCheckout:
    def test_checkout_success(self, a_product, mongo_db):
        payload = {
            "product_id": a_product["product_id"],
            "quote_total_cents": 2400,
            "shipping_price_cents": 800,
            "shipping_carrier_code": "usps_ground",
            "shipping_country": "US",
            "shipping_postal": "94107",
            "config": {"material": "PLA", "quantity": 1, "quality": "regular"},
            "origin_url": ORIGIN,
            "contact_email": "TEST_buyer@example.com",
            "contact_name": "TEST Buyer",
        }
        r = requests.post(f"{BASE_URL}/api/orders/checkout", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["amount_cents"] == 3200
        assert d["session_id"].startswith("cs_")
        assert d["checkout_url"].startswith("https://")
        assert d["order_id"].startswith("ord_")

        # Verify DB rows
        tx = mongo_db.payment_transactions.find_one({"session_id": d["session_id"]})
        assert tx is not None
        assert tx["purpose"] == "print_order"
        assert tx["amount_cents"] == 3200
        assert tx["payment_status"] == "pending"

        order = mongo_db.print_orders.find_one({"order_id": d["order_id"]})
        assert order is not None
        assert order["status"] == "pending_payment"
        assert order["total_cents"] == 3200
        assert order["product_id"] == a_product["product_id"]

    def test_bad_product_404(self):
        r = requests.post(f"{BASE_URL}/api/orders/checkout", json={
            "product_id": "prod_does_not_exist_xyz",
            "quote_total_cents": 2400,
            "shipping_price_cents": 800,
            "config": {}, "origin_url": ORIGIN,
        }, timeout=30)
        assert r.status_code == 404

    def test_zero_quote_400(self, a_product):
        r = requests.post(f"{BASE_URL}/api/orders/checkout", json={
            "product_id": a_product["product_id"],
            "quote_total_cents": 0,
            "shipping_price_cents": 500,
            "config": {}, "origin_url": ORIGIN,
        }, timeout=30)
        assert r.status_code == 400

    def test_negative_quote_400(self, a_product):
        r = requests.post(f"{BASE_URL}/api/orders/checkout", json={
            "product_id": a_product["product_id"],
            "quote_total_cents": -100,
            "shipping_price_cents": 500,
            "config": {}, "origin_url": ORIGIN,
        }, timeout=30)
        assert r.status_code == 400


class TestOrderStatus:
    def test_pending_after_create(self, a_product):
        c = requests.post(f"{BASE_URL}/api/orders/checkout", json={
            "product_id": a_product["product_id"],
            "quote_total_cents": 1500,
            "shipping_price_cents": 500,
            "config": {"material": "PLA", "quantity": 1},
            "origin_url": ORIGIN,
        }, timeout=30).json()
        sid = c["session_id"]
        s = requests.get(f"{BASE_URL}/api/orders/status/{sid}", timeout=30)
        assert s.status_code == 200
        d = s.json()
        assert d["session_id"] == sid
        assert d["payment_status"] in ("pending", "paid")
        assert d["amount_cents"] == 2000
        assert d["order_id"] == c["order_id"]

    def test_unknown_404(self):
        r = requests.get(f"{BASE_URL}/api/orders/status/cs_test_bogus_zzz", timeout=15)
        assert r.status_code == 404

    def test_webhook_flips_print_order_to_paid(self, a_product, mongo_db):
        # Regression: webhook still handles both donation and print_order
        c = requests.post(f"{BASE_URL}/api/orders/checkout", json={
            "product_id": a_product["product_id"],
            "quote_total_cents": 1000,
            "shipping_price_cents": 500,
            "config": {}, "origin_url": ORIGIN,
        }, timeout=30).json()
        sid = c["session_id"]
        oid = c["order_id"]
        wh = requests.post(f"{BASE_URL}/api/stripe/webhook", json={
            "type": "checkout.session.completed",
            "data": {"object": {"id": sid}},
        }, timeout=30)
        assert wh.status_code == 200
        # Idempotent: second call should not error either
        wh2 = requests.post(f"{BASE_URL}/api/stripe/webhook", json={
            "type": "checkout.session.completed",
            "data": {"object": {"id": sid}},
        }, timeout=30)
        assert wh2.status_code == 200

        tx = mongo_db.payment_transactions.find_one({"session_id": sid})
        assert tx["payment_status"] == "paid"
        order = mongo_db.print_orders.find_one({"order_id": oid})
        assert order["status"] == "paid"

        # Status endpoint reflects paid state
        st = requests.get(f"{BASE_URL}/api/orders/status/{sid}", timeout=30).json()
        assert st["payment_status"] == "paid"
        assert st["order"] is not None
        assert st["order"]["status"] == "paid"
