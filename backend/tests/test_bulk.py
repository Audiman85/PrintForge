"""Iteration 4 - Bulk CSV product import tests."""
import io
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://design-forge-520.preview.emergentagent.com"


class TestBulkTemplate:
    def test_template_csv(self):
        r = requests.get(f"{BASE_URL}/api/products/bulk/template", timeout=15)
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "text/csv" in ct
        body = r.text.strip().splitlines()
        # header + 2 sample rows
        assert len(body) >= 3
        header = body[0]
        for col in ("title", "description", "category", "price", "print_time_hours", "print_weight_grams"):
            assert col in header


class TestBulkImport:
    def test_unauth_401(self):
        files = {"file": ("t.csv", b"title\nfoo", "text/csv")}
        r = requests.post(f"{BASE_URL}/api/products/bulk", files=files, timeout=15)
        assert r.status_code == 401

    def test_bulk_import_ok(self, auth_headers):
        # Use the template as the CSV payload
        tmpl = requests.get(f"{BASE_URL}/api/products/bulk/template", timeout=15).text
        # Rewrite titles so we can identify them
        ts = int(time.time() * 1000)
        csv = tmpl.replace("Voronoi Vase", f"TEST_Vase_{ts}").replace("Cable Comb", f"TEST_Comb_{ts}")
        files = {"file": ("import.csv", csv.encode("utf-8"), "text/csv")}
        r = requests.post(f"{BASE_URL}/api/products/bulk", headers=auth_headers, files=files, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["inserted"] == 2, d
        assert d["errors"] == []
        assert len(d["product_ids"]) == 2

        # Verify via /api/products
        listed = requests.get(f"{BASE_URL}/api/products", timeout=15).json()
        titles = {p["title"] for p in listed}
        assert f"TEST_Vase_{ts}" in titles
        assert f"TEST_Comb_{ts}" in titles

    def test_invalid_category_row_reported(self, auth_headers):
        csv = (
            "title,description,category,price,print_time_hours,print_weight_grams\n"
            f"TEST_BadCat_{int(time.time()*1000)},desc,not_a_real_category,10,1,10\n"
            f"TEST_GoodCat_{int(time.time()*1000)},desc,decor,10,1,10\n"
        )
        files = {"file": ("bad.csv", csv.encode("utf-8"), "text/csv")}
        r = requests.post(f"{BASE_URL}/api/products/bulk", headers=auth_headers, files=files, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["inserted"] == 1
        assert len(d["errors"]) == 1
        assert d["errors"][0]["row"] == 2
        assert "not_a_real_category" in d["errors"][0]["error"]

    def test_missing_required_columns_400(self, auth_headers):
        csv = "title,description\nX,Y\n"
        files = {"file": ("mini.csv", csv.encode("utf-8"), "text/csv")}
        r = requests.post(f"{BASE_URL}/api/products/bulk", headers=auth_headers, files=files, timeout=15)
        assert r.status_code == 400

    def test_non_csv_400(self, auth_headers):
        files = {"file": ("x.txt", b"hello", "text/plain")}
        r = requests.post(f"{BASE_URL}/api/products/bulk", headers=auth_headers, files=files, timeout=15)
        assert r.status_code == 400
