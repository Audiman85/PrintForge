# Iteration 6 — shipping trim + tools gating regression
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://design-forge-520.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

EXPECTED_CARRIERS = {
    "usps_ground", "usps_priority", "usps_priority_exp",
    "ups_ground", "ups_2nd_air", "ups_next_air",
    "fedex_home", "fedex_2day", "fedex_overnight",
    "dhl_ecommerce", "dhl_express", "eco_pickup",
}

FORBIDDEN = {
    "ontrac", "lasership", "purolator", "canada_post", "royal_mail",
    "evri", "japan_post", "yamato", "aramex", "amazon",
    "local_courier", "bike_courier", "usps_first_intl",
    "ups_3day", "ups_worldwide", "fedex_intl_econ",
}


class TestShippingTrim:
    def test_get_carriers_exactly_12_and_correct(self):
        r = requests.get(f"{API}/shipping/carriers", timeout=15)
        assert r.status_code == 200
        codes = {c["code"] for c in r.json()["carriers"]}
        assert codes == EXPECTED_CARRIERS, f"Mismatch: got {codes}"
        assert not (codes & FORBIDDEN)

    def test_post_quotes_returns_exactly_12(self):
        r = requests.post(f"{API}/shipping/quotes",
                          json={"weight_grams": 250, "items": 1, "country": "US", "postal_code": "90210"},
                          timeout=15)
        assert r.status_code == 200
        data = r.json()
        codes = {q["carrier_code"] for q in data["quotes"]}
        assert len(data["quotes"]) == 12
        assert codes == EXPECTED_CARRIERS
        # Each quote has price + days
        for q in data["quotes"]:
            assert "price" in q and "days_min" in q and "days_max" in q and "carrier_name" in q

    def test_no_forbidden_carriers_in_quotes(self):
        r = requests.post(f"{API}/shipping/quotes",
                          json={"weight_grams": 100, "country": "US", "postal_code": "10001"},
                          timeout=15)
        codes = {q["carrier_code"] for q in r.json()["quotes"]}
        assert not (codes & FORBIDDEN)


class TestToolsGatingBackend:
    """Backend doesn't gate /tools (SPA route). But shipping/other regression should still pass."""

    def test_products_default_hides_archived(self):
        r = requests.get(f"{API}/products", timeout=15)
        assert r.status_code == 200
        items = r.json() if isinstance(r.json(), list) else r.json().get("products", [])
        for p in items:
            assert not p.get("archived"), f"archived leaked: {p.get('id')}"

    def test_supporters_emails_endpoint(self):
        r = requests.get(f"{API}/supporters/emails", timeout=15)
        assert r.status_code == 200
        emails = r.json().get("emails", [])
        for e in emails:
            assert e == e.lower()


# Orders regression is covered comprehensively in test_iter5.py (mismatch, bad product, timeline, etc.)
