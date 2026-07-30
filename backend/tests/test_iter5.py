"""Iteration 5 - Order tracking timeline + server-verified quote + regression sweep.

Covers:
  * POST /api/orders/checkout with pricing_mode='fixed' and pricing_mode='quote'
  * Quote mismatch rejection (>1% AND >$0.50)
  * order.user_id populated when authed
  * GET /api/orders returns orders matched by BOTH user_id AND customer_email
  * POST /api/orders/{order_id}/status timeline growth + receipts row on shipped/delivered
  * 28 carriers spot check
  * external search focus wording
  * Bulk CSV all 4 actions (create/update/archive/delete)
  * Email receipts pipeline (donation + print_order → receipts row with outcome='queued')
"""
import os
import time
import uuid
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://design-forge-520.preview.emergentagent.com"
ORIGIN = BASE_URL


# ---------- Product + Auth helpers ----------
@pytest.fixture(scope="module")
def a_product(mongo_db):
    """Pick any product that has a fixed price."""
    r = requests.get(f"{BASE_URL}/api/products", timeout=15)
    assert r.status_code == 200
    products = [p for p in r.json() if p.get("price")]
    assert products, "Need product with price"
    return products[0]


# ================================================================
# 1. Regression — 28 shipping carriers
# ================================================================
class TestShippingCarriers:
    def test_28_carriers_returned(self):
        r = requests.post(f"{BASE_URL}/api/shipping/quotes", json={
            "weight_grams": 120, "items": 1, "country": "US",
            "postal_code": "94107", "signature_required": False, "insured_value": 0,
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "quotes" in d
        assert len(d["quotes"]) == 28, f"Expected 28 carriers, got {len(d['quotes'])}"

    def test_carrier_codes_spot_check(self):
        r = requests.post(f"{BASE_URL}/api/shipping/quotes", json={
            "weight_grams": 100, "items": 1, "country": "US", "postal_code": "94107",
        }, timeout=15)
        codes = {q["carrier_code"] for q in r.json()["quotes"]}
        # Spot-check for representatives across families
        expected = {"usps_ground", "usps_priority", "ups_ground", "ups_next_air",
                    "fedex_home", "fedex_overnight", "dhl_express", "amazon_shipping",
                    "ontrac", "lasership", "purolator", "canada_post", "royal_mail",
                    "evri_uk", "japan_post", "yamato", "aramex", "bike_courier", "eco_pickup"}
        missing = expected - codes
        assert not missing, f"Missing expected carriers: {missing}"

    def test_carrier_shape(self):
        q = requests.post(f"{BASE_URL}/api/shipping/quotes", json={
            "weight_grams": 100, "items": 1, "country": "US", "postal_code": "94107",
        }, timeout=15).json()["quotes"][0]
        for k in ("carrier_code", "carrier_name", "days_min", "days_max", "price", "tracked", "carbon_g"):
            assert k in q, f"Missing key {k}"


# ================================================================
# 2. Regression — external search MyMiniFactory wording
# ================================================================
class TestExternalSearch:
    def test_voronoi_returns_18_sources(self):
        # Bump limit so all sites appear in results
        r = requests.get(f"{BASE_URL}/api/search/external",
                         params={"q": "voronoi", "limit": 60}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d.get("total_sites") == 18, f"Expected 18 SEARCH_SITES, got {d.get('total_sites')}"
        results = d.get("results", [])
        sources = {x.get("source") for x in results}
        assert len(sources) == 18, f"Expected 18 sources, got {len(sources)}"
        mmf = [x for x in results if x.get("source") == "MyMiniFactory"]
        assert mmf
        focus = " ".join(str(x.get("source_focus", "")) for x in mmf)
        assert "3D Marketplace" in focus


# ================================================================
# 3. Products archived toggle
# ================================================================
class TestProductsArchive:
    def test_default_hides_archived(self, mongo_db):
        # Insert a temporary archived product
        pid = f"prod_TESTarch_{int(time.time()*1000)}"
        mongo_db.products.insert_one({
            "product_id": pid, "title": f"TEST_archived_{pid}", "category": "decor",
            "price": 5, "material": "PLA", "archived": True,
            "print_time_hours": 1, "print_weight_grams": 30, "preview_shape": "box",
        })
        try:
            titles_default = {p["title"] for p in requests.get(f"{BASE_URL}/api/products", timeout=15).json()}
            assert f"TEST_archived_{pid}" not in titles_default

            titles_with = {p["title"] for p in requests.get(f"{BASE_URL}/api/products?include_archived=1", timeout=15).json()}
            assert f"TEST_archived_{pid}" in titles_with
        finally:
            mongo_db.products.delete_one({"product_id": pid})


# ================================================================
# 4. Server-verified quote (fixed + quote modes + mismatch rejection)
# ================================================================
class TestOrderCheckoutFixed:
    def test_fixed_uses_product_price(self, a_product, mongo_db):
        price = float(a_product["price"])
        expected_cents = int(round(price * 100))
        r = requests.post(f"{BASE_URL}/api/orders/checkout", json={
            "product_id": a_product["product_id"],
            "quote_total_cents": expected_cents,
            "shipping_price_cents": 500,
            "shipping_carrier_code": "usps_ground",
            "config": {"pricing_mode": "fixed", "quantity": 1},
            "origin_url": ORIGIN,
            "contact_email": "TEST_fixed@example.com",
        }, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["server_quote_cents"] == expected_cents
        assert d["amount_cents"] == expected_cents + 500
        assert d["session_id"].startswith("cs_")
        assert d["order_id"].startswith("ord_")

        order = mongo_db.print_orders.find_one({"order_id": d["order_id"]})
        assert order["status"] == "pending_payment"
        assert order["quote_cents"] == expected_cents

    def test_fixed_qty_2_multiplies(self, a_product):
        price = float(a_product["price"])
        expected_cents = int(round(price * 100 * 2))
        r = requests.post(f"{BASE_URL}/api/orders/checkout", json={
            "product_id": a_product["product_id"],
            "quote_total_cents": expected_cents,
            "shipping_price_cents": 0,
            "config": {"pricing_mode": "fixed", "quantity": 2},
            "origin_url": ORIGIN,
        }, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["server_quote_cents"] == expected_cents

    def test_quote_mode_recomputes(self, a_product):
        # First get server-computed quote via /api/quote to know expected
        pid = a_product["product_id"]
        # Send a dummy quote_total_cents=0 (skips comparison since falsy) — server derives it
        r = requests.post(f"{BASE_URL}/api/orders/checkout", json={
            "product_id": pid,
            "quote_total_cents": 0,           # falsy → skip client mismatch check, but zero-check applies?
            "shipping_price_cents": 0,
            "config": {"pricing_mode": "quote", "material": "PLA", "quantity": 1,
                       "quality": "regular", "nozzle_mm": 0.4, "colors": 1, "infill_pct": 20},
            "origin_url": ORIGIN,
        }, timeout=30)
        # quote_total_cents=0 is falsy so mismatch check is skipped, so should succeed
        assert r.status_code == 200, r.text
        server_cents = r.json()["server_quote_cents"]
        assert server_cents > 0

        # Now send matching quote and expect success
        r2 = requests.post(f"{BASE_URL}/api/orders/checkout", json={
            "product_id": pid,
            "quote_total_cents": server_cents,
            "shipping_price_cents": 800,
            "config": {"pricing_mode": "quote", "material": "PLA", "quantity": 1,
                       "quality": "regular", "nozzle_mm": 0.4, "colors": 1, "infill_pct": 20},
            "origin_url": ORIGIN,
        }, timeout=30)
        assert r2.status_code == 200
        assert r2.json()["amount_cents"] == server_cents + 800

    def test_quote_mismatch_rejected(self, a_product):
        # Client sends $5 for what should be much more → 400 with detail
        r = requests.post(f"{BASE_URL}/api/orders/checkout", json={
            "product_id": a_product["product_id"],
            "quote_total_cents": 500,   # $5 — deviates >1% AND >$0.50 from real
            "shipping_price_cents": 0,
            "config": {"pricing_mode": "quote", "material": "PLA", "quantity": 1,
                       "quality": "regular", "colors": 1, "infill_pct": 20},
            "origin_url": ORIGIN,
        }, timeout=30)
        assert r.status_code == 400
        assert "mismatch" in r.text.lower() or "quote" in r.text.lower()

    def test_bad_product_404(self):
        r = requests.post(f"{BASE_URL}/api/orders/checkout", json={
            "product_id": "prod_no_such",
            "quote_total_cents": 100,
            "shipping_price_cents": 0,
            "config": {"pricing_mode": "fixed"},
            "origin_url": ORIGIN,
        }, timeout=30)
        assert r.status_code == 404


class TestOrderCheckoutAuthed:
    def test_authed_sets_user_id(self, a_product, auth_headers, seeded_session, mongo_db):
        price = float(a_product["price"])
        expected_cents = int(round(price * 100))
        r = requests.post(f"{BASE_URL}/api/orders/checkout", json={
            "product_id": a_product["product_id"],
            "quote_total_cents": expected_cents,
            "shipping_price_cents": 0,
            "config": {"pricing_mode": "fixed", "quantity": 1},
            "origin_url": ORIGIN,
            "contact_email": seeded_session["email"],
        }, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        oid = r.json()["order_id"]
        order = mongo_db.print_orders.find_one({"order_id": oid})
        assert order["user_id"] == seeded_session["user_id"]


# ================================================================
# 5. GET /api/orders — auth + user_id OR customer_email match
# ================================================================
class TestListMyOrders:
    def test_orders_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/orders", timeout=15)
        assert r.status_code in (401, 403)

    def test_matches_user_id_and_customer_email(self, a_product, auth_headers, seeded_session):
        # Order A — authed → tagged with user_id
        priceA = float(a_product["price"])
        r1 = requests.post(f"{BASE_URL}/api/orders/checkout", json={
            "product_id": a_product["product_id"],
            "quote_total_cents": int(priceA * 100),
            "shipping_price_cents": 0,
            "config": {"pricing_mode": "fixed", "quantity": 1},
            "origin_url": ORIGIN,
            "contact_email": seeded_session["email"],
        }, headers=auth_headers, timeout=30)
        assert r1.status_code == 200, r1.text
        oid_authed = r1.json()["order_id"]

        # Order B — unauthed but contact_email matches → should appear via email match
        r2 = requests.post(f"{BASE_URL}/api/orders/checkout", json={
            "product_id": a_product["product_id"],
            "quote_total_cents": int(priceA * 100),
            "shipping_price_cents": 0,
            "config": {"pricing_mode": "fixed", "quantity": 1},
            "origin_url": ORIGIN,
            "contact_email": seeded_session["email"],
        }, timeout=30)
        assert r2.status_code == 200, r2.text
        oid_unauthed = r2.json()["order_id"]

        # GET /api/orders as the authed user — both should appear
        lst = requests.get(f"{BASE_URL}/api/orders", headers=auth_headers, timeout=15)
        assert lst.status_code == 200
        order_ids = {o["order_id"] for o in lst.json()}
        assert oid_authed in order_ids
        assert oid_unauthed in order_ids, "Order matched by customer_email should be visible"


# ================================================================
# 6. POST /api/orders/{order_id}/status — timeline growth + receipts
# ================================================================
@pytest.fixture(scope="class")
def a_paid_order(a_product, auth_headers, seeded_session, mongo_db):
    price = float(a_product["price"])
    r = requests.post(f"{BASE_URL}/api/orders/checkout", json={
        "product_id": a_product["product_id"],
        "quote_total_cents": int(price * 100),
        "shipping_price_cents": 0,
        "config": {"pricing_mode": "fixed", "quantity": 1},
        "origin_url": ORIGIN,
        "contact_email": seeded_session["email"],
    }, headers=auth_headers, timeout=30)
    return r.json()["order_id"]


class TestOrderStatusUpdate:
    def test_bad_status_400(self, a_paid_order, auth_headers):
        r = requests.post(f"{BASE_URL}/api/orders/{a_paid_order}/status",
                          json={"status": "banana"}, headers=auth_headers, timeout=15)
        assert r.status_code == 400

    def test_unknown_order_404(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/orders/ord_never_seen/status",
                          json={"status": "paid"}, headers=auth_headers, timeout=15)
        assert r.status_code == 404

    def test_requires_auth(self, a_paid_order):
        r = requests.post(f"{BASE_URL}/api/orders/{a_paid_order}/status",
                          json={"status": "paid"}, timeout=15)
        assert r.status_code in (401, 403)

    def test_timeline_grows_per_call(self, a_paid_order, auth_headers, mongo_db):
        for st in ("paid", "printing"):
            r = requests.post(f"{BASE_URL}/api/orders/{a_paid_order}/status",
                              json={"status": st}, headers=auth_headers, timeout=15)
            assert r.status_code == 200
            assert r.json()["status"] == st
        order = mongo_db.print_orders.find_one({"order_id": a_paid_order})
        assert order["status"] == "printing"
        tl = order.get("status_timeline") or []
        statuses = [e["status"] for e in tl]
        assert "paid" in statuses and "printing" in statuses
        assert len(tl) >= 2

    def test_shipped_inserts_receipt_queued(self, a_paid_order, auth_headers, mongo_db):
        r = requests.post(f"{BASE_URL}/api/orders/{a_paid_order}/status",
                          json={"status": "shipped", "tracking_number": "1Z_TEST_9999",
                                "carrier": "ups_ground"},
                          headers=auth_headers, timeout=15)
        assert r.status_code == 200
        # Receipt row present
        rec = mongo_db.receipts.find_one({"order_id": a_paid_order, "purpose": "print_order_status"})
        assert rec is not None, "Expected a print_order_status receipt row"
        # RESEND_API_KEY is empty → outcome should be 'queued'
        assert rec["outcome"] == "queued", f"Expected queued, got {rec['outcome']}"
        # Order should reflect tracking
        order = mongo_db.print_orders.find_one({"order_id": a_paid_order})
        assert order["tracking_number"] == "1Z_TEST_9999"

    def test_cancelled_accepted(self, a_product, auth_headers, seeded_session, mongo_db):
        # Fresh order for cancellation
        price = float(a_product["price"])
        c = requests.post(f"{BASE_URL}/api/orders/checkout", json={
            "product_id": a_product["product_id"],
            "quote_total_cents": int(price * 100),
            "shipping_price_cents": 0,
            "config": {"pricing_mode": "fixed", "quantity": 1},
            "origin_url": ORIGIN, "contact_email": seeded_session["email"],
        }, headers=auth_headers, timeout=30).json()
        oid = c["order_id"]
        r = requests.post(f"{BASE_URL}/api/orders/{oid}/status",
                          json={"status": "cancelled", "note": "TEST cancel"},
                          headers=auth_headers, timeout=15)
        assert r.status_code == 200
        order = mongo_db.print_orders.find_one({"order_id": oid})
        assert order["status"] == "cancelled"


# ================================================================
# 7. Email receipts pipeline (donation)
# ================================================================
class TestReceiptsPipeline:
    def test_donation_receipt_queued(self, mongo_db):
        create = requests.post(f"{BASE_URL}/api/donate/checkout",
                               json={"package_id": "tip_5", "origin_url": ORIGIN,
                                     "supporter_name": "TEST_ReceiptDonor",
                                     "supporter_email": "TEST_donor_receipt@example.com",
                                     "is_anonymous": False}, timeout=30).json()
        sid = create["session_id"]
        wh = requests.post(f"{BASE_URL}/api/stripe/webhook",
                           json={"type": "checkout.session.completed",
                                 "data": {"object": {"id": sid}}}, timeout=30)
        assert wh.status_code == 200
        rec = mongo_db.receipts.find_one({"session_id": sid, "purpose": "donation"})
        # RESEND_API_KEY empty → outcome should be queued (if email available) or skipped (if not).
        # We DO expect a receipts row to be inserted regardless.
        assert rec is not None, "Expected donation receipt row after webhook"
        assert rec["outcome"] in ("queued", "skipped"), f"Unexpected outcome {rec['outcome']}"

    def test_print_order_receipt_queued(self, a_product, auth_headers, seeded_session, mongo_db):
        price = float(a_product["price"])
        r = requests.post(f"{BASE_URL}/api/orders/checkout", json={
            "product_id": a_product["product_id"],
            "quote_total_cents": int(price * 100),
            "shipping_price_cents": 0,
            "config": {"pricing_mode": "fixed", "quantity": 1},
            "origin_url": ORIGIN,
            "contact_email": seeded_session["email"],
        }, headers=auth_headers, timeout=30).json()
        sid = r["session_id"]
        wh = requests.post(f"{BASE_URL}/api/stripe/webhook",
                           json={"type": "checkout.session.completed",
                                 "data": {"object": {"id": sid}}}, timeout=30)
        assert wh.status_code == 200
        # Receipt for print_order should now exist with outcome='queued'
        rec = mongo_db.receipts.find_one({"session_id": sid, "purpose": "print_order"})
        assert rec is not None, "Expected print_order receipt row after webhook"
        assert rec["outcome"] == "queued"


# ================================================================
# 8. Restock stats + notify
# ================================================================
class TestRestockStats:
    def test_stats_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/restock/stats", timeout=15)
        assert r.status_code in (401, 403)

    def test_stats_returns_material_breakdown(self, auth_headers):
        # Seed at least one subscriber
        requests.post(f"{BASE_URL}/api/restock/subscribe",
                      json={"email": f"TEST_stats_{int(time.time())}@example.com",
                            "material": "PLA", "colors": ["Blue"]}, timeout=15)
        r = requests.get(f"{BASE_URL}/api/restock/stats", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        # Should be some material aggregation structure
        assert isinstance(d, dict)
        # Must contain some indicator of per-material breakdown
        has_break = any(k in d for k in ("by_material", "materials", "PLA", "breakdown", "stats"))
        assert has_break, f"Expected per-material breakdown, got keys={list(d.keys())}"


# ================================================================
# 9. Bulk CSV — all 4 actions
# ================================================================
class TestBulkCSVAllActions:
    def test_all_actions_flow(self, auth_headers, mongo_db):
        ts = int(time.time() * 1000)
        title_a = f"TEST_ITER5_A_{ts}"
        title_b = f"TEST_ITER5_B_{ts}"

        # STEP 1: create both products
        csv1 = (
            "action,title,description,category,price,print_time_hours,print_weight_grams\n"
            f"create,{title_a},TESTdescA,decor,15.5,3,60\n"
            f"create,{title_b},TESTdescB,useful,9.0,1.5,25\n"
        )
        r = requests.post(f"{BASE_URL}/api/products/bulk",
                          files={"file": ("t.csv", csv1, "text/csv")},
                          headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["inserted"] == 2, d
        assert d["errors"] == []

        # Verify visible on /api/products
        titles = {p["title"] for p in requests.get(f"{BASE_URL}/api/products", timeout=15).json()}
        assert title_a in titles and title_b in titles

        # STEP 2: update A's price, leaving other fields alone
        csv2 = "action,title,price\n" f"update,{title_a},19.99\n"
        r = requests.post(f"{BASE_URL}/api/products/bulk",
                          files={"file": ("t.csv", csv2, "text/csv")},
                          headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["updated"] == 1, d
        prod_a = mongo_db.products.find_one({"title": title_a})
        assert prod_a["price"] == 19.99
        assert prod_a.get("description") == "TESTdescA", "Non-provided field must be preserved"

        # STEP 3: archive A
        csv3 = "action,title\n" f"archive,{title_a}\n"
        r = requests.post(f"{BASE_URL}/api/products/bulk",
                          files={"file": ("t.csv", csv3, "text/csv")},
                          headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert r.json()["archived"] == 1
        # A should be hidden from default listing
        titles_default = {p["title"] for p in requests.get(f"{BASE_URL}/api/products", timeout=15).json()}
        assert title_a not in titles_default
        titles_incl = {p["title"] for p in requests.get(f"{BASE_URL}/api/products?include_archived=1", timeout=15).json()}
        assert title_a in titles_incl

        # STEP 4: delete B
        csv4 = "action,title\n" f"delete,{title_b}\n"
        r = requests.post(f"{BASE_URL}/api/products/bulk",
                          files={"file": ("t.csv", csv4, "text/csv")},
                          headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert r.json()["deleted"] == 1

        # Cleanup A
        mongo_db.products.delete_many({"title": title_a})

    def test_template_contains_create_update_archive(self):
        r = requests.get(f"{BASE_URL}/api/products/bulk/template", timeout=15)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        body = r.text
        assert "create," in body and "update," in body and "archive," in body

    def test_bulk_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/products/bulk",
                          files={"file": ("t.csv", "action,title\ncreate,X\n", "text/csv")},
                          timeout=15)
        assert r.status_code in (401, 403)


# ================================================================
# 10. Supporter emails endpoint
# ================================================================
class TestSupporterEmails:
    def test_returns_lowercased_list(self):
        r = requests.get(f"{BASE_URL}/api/supporters/emails", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "emails" in d
        assert isinstance(d["emails"], list)
        for e in d["emails"]:
            assert e == e.lower(), f"Email not lowercased: {e}"
