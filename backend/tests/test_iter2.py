"""Iteration 2 backend tests — quote engine, i18n chat, product enrichment, regressions."""
import os
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://design-forge-520.preview.emergentagent.com').rstrip('/')
TOKEN = os.environ.get('TEST_TOKEN')

HDRS = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}


@pytest.fixture(scope="module")
def product_id():
    r = requests.get(f"{BASE_URL}/api/products", timeout=30)
    assert r.status_code == 200
    products = r.json()
    assert len(products) >= 1
    return products[0]["product_id"]


# ---------- Quote config ----------
class TestQuoteConfig:
    def test_config(self):
        r = requests.get(f"{BASE_URL}/api/quote/config", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data["materials"]) == 10
        assert len(data["qualities"]) == 3
        names = {q["name"] for q in data["qualities"]}
        assert names == {"draft", "regular", "hi"}
        nozzles = {n["mm"] for n in data["nozzles"]}
        assert nozzles == {0.25, 0.4, 0.6, 0.8}
        assert data["max_colors"] == 8


# ---------- Quote engine ----------
class TestQuote:
    def test_quote_hi_pla(self, product_id):
        payload = {"product_id": product_id, "material": "PLA", "quality": "hi",
                   "nozzle_mm": 0.25, "colors": 3, "quantity": 1, "infill_pct": 30}
        r = requests.post(f"{BASE_URL}/api/quote", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["total_price"] > 0
        assert d["layer_mm"] == 0.12
        assert d["estimated_weight_grams"] > 0
        assert d["estimated_time_hours"] > 0
        for k in ("material_cost", "machine_cost", "colour_cost", "labour", "shipping"):
            assert k in d["breakdown"]

    def test_quality_scaling(self, product_id):
        base = {"product_id": product_id, "material": "PLA", "nozzle_mm": 0.4,
                "colors": 1, "quantity": 1, "infill_pct": 20}
        hi = requests.post(f"{BASE_URL}/api/quote", json={**base, "quality": "hi"}).json()
        reg = requests.post(f"{BASE_URL}/api/quote", json={**base, "quality": "regular"}).json()
        assert hi["total_price"] > reg["total_price"]

    def test_nozzle_scaling(self, product_id):
        base = {"product_id": product_id, "material": "PLA", "quality": "regular",
                "colors": 1, "quantity": 1, "infill_pct": 20}
        fine = requests.post(f"{BASE_URL}/api/quote", json={**base, "nozzle_mm": 0.25}).json()
        std = requests.post(f"{BASE_URL}/api/quote", json={**base, "nozzle_mm": 0.4}).json()
        assert fine["total_price"] > std["total_price"]

    def test_color_scaling(self, product_id):
        base = {"product_id": product_id, "material": "PLA", "quality": "regular",
                "nozzle_mm": 0.4, "quantity": 1, "infill_pct": 20}
        one = requests.post(f"{BASE_URL}/api/quote", json={**base, "colors": 1}).json()
        three = requests.post(f"{BASE_URL}/api/quote", json={**base, "colors": 3}).json()
        assert three["breakdown"]["colour_cost"] > one["breakdown"]["colour_cost"]

    def test_bulk_discount(self, product_id):
        base = {"product_id": product_id, "material": "PLA", "quality": "regular",
                "nozzle_mm": 0.4, "colors": 1, "infill_pct": 20}
        q1 = requests.post(f"{BASE_URL}/api/quote", json={**base, "quantity": 1}).json()
        q5 = requests.post(f"{BASE_URL}/api/quote", json={**base, "quantity": 5}).json()
        q10 = requests.post(f"{BASE_URL}/api/quote", json={**base, "quantity": 10}).json()
        # 5-pack unit price should be ~5% cheaper vs 1-pack (per unit)
        unit1 = q1["line_subtotal"] / 1
        unit5 = q5["line_subtotal"] / 5
        unit10 = q10["line_subtotal"] / 10
        assert unit5 < unit1 * 0.98  # ~5% off
        assert unit10 < unit5  # 10% off > 5% off

    def test_unknown_product_404(self):
        r = requests.post(f"{BASE_URL}/api/quote", json={"product_id": "prod_doesnotexist"}, timeout=30)
        assert r.status_code == 404

    def test_no_product_weight_only(self):
        r = requests.post(f"{BASE_URL}/api/quote", json={"weight_grams": 50, "material": "PLA"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["total_price"] > 0


# ---------- Product enrichment ----------
class TestProductsEnriched:
    def test_products_have_new_fields(self):
        r = requests.get(f"{BASE_URL}/api/products", timeout=30)
        assert r.status_code == 200
        products = r.json()
        assert len(products) == 9
        for p in products:
            assert "preview_shape" in p, f"{p.get('title')} missing preview_shape"
            assert "print_weight_grams" in p
            assert "recommended_colors" in p


# ---------- Chat: languages ----------
class TestChatLanguages:
    def test_supported_langs(self):
        r = requests.get(f"{BASE_URL}/api/chat/languages", timeout=30)
        assert r.status_code == 200
        codes = {l["code"] for l in r.json()["languages"]}
        expected = {"en", "es", "fr", "de", "pt", "it", "nl", "ja", "zh-CN", "ko", "ar", "hi"}
        assert codes == expected


# ---------- Chat: send + history ----------
@pytest.mark.skipif(not TOKEN, reason="No TEST_TOKEN")
class TestChatMessages:
    def test_empty_400(self):
        r = requests.post(f"{BASE_URL}/api/chat/messages", json={"text": ""}, headers=HDRS, timeout=15)
        assert r.status_code == 400

    def test_send_spanish(self):
        r = requests.post(f"{BASE_URL}/api/chat/messages",
                          json={"text": "Hola, cuando llega mi pedido?", "language": "es"},
                          headers=HDRS, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["original_language"] == "es", f"Detected: {d.get('original_language')}"
        tr = d.get("translations", {})
        # accept >= 8 of 12
        must_have_any = {"en", "ja", "fr"}
        present = set(tr.keys())
        assert len(present) >= 8, f"Only {len(present)} translations: {present}"
        assert len(must_have_any & present) >= 2, f"Missing key translations. present={present}"

    def test_send_english(self):
        r = requests.post(f"{BASE_URL}/api/chat/messages",
                          json={"text": "Hello, when will my order arrive?", "language": "en"},
                          headers=HDRS, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["original_language"] == "en"
        tr = d.get("translations", {})
        assert len(tr) >= 8

    def test_history(self):
        r = requests.get(f"{BASE_URL}/api/chat/messages", headers=HDRS, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["is_owner"] is False
        assert isinstance(d["messages"], list)
        assert len(d["messages"]) >= 1

    def test_history_since(self):
        future = datetime.now(timezone.utc).isoformat()
        r = requests.get(f"{BASE_URL}/api/chat/messages", params={"since": future}, headers=HDRS, timeout=30)
        assert r.status_code == 200
        assert r.json()["messages"] == []

    def test_rooms_forbidden(self):
        r = requests.get(f"{BASE_URL}/api/chat/rooms", headers=HDRS, timeout=15)
        assert r.status_code == 403


# ---------- Regressions ----------
class TestRegressions:
    def test_products_list(self):
        assert requests.get(f"{BASE_URL}/api/products", timeout=15).status_code == 200

    def test_search_external(self):
        r = requests.get(f"{BASE_URL}/api/search/external", params={"q": "dragon"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["results"]

    @pytest.mark.skipif(not TOKEN, reason="No TEST_TOKEN")
    def test_wishlist_toggle(self, product_id):
        r = requests.post(f"{BASE_URL}/api/wishlist/toggle", json={"product_id": product_id},
                          headers=HDRS, timeout=15)
        assert r.status_code == 200
        # Toggle again to clean
        requests.post(f"{BASE_URL}/api/wishlist/toggle", json={"product_id": product_id},
                      headers=HDRS, timeout=15)

    def test_create_order_no_file(self, product_id):
        r = requests.post(f"{BASE_URL}/api/orders",
                          data={"contact_name": "TEST_Iter2", "contact_email": "t@e.com",
                                "material": "PLA", "color": "Red", "quantity": "1",
                                "product_id": product_id}, timeout=30)
        assert r.status_code == 200
        assert "order_id" in r.json()
