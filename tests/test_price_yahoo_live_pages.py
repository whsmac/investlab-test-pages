import hashlib
import json
import unittest
from datetime import date
from unittest.mock import patch
from scripts.verify_yahoo_test_pages_live import verify_payload, fetch_public_json, TARGET

def fixture():
    rows=[{"ticker": ticker, "trading_date": "2026-11-13", "close_price": "100",
           "currency": "USD", "price_basis": "unadjusted_close"}
          for ticker in ["MSFT","GOOGL","AMZN","META","TSLA"]]
    return {"mode":"REVIEW_ONLY","source":"Yahoo Finance","database_insert_authorized":False,
            "writes_performed":0,"row_count":len(rows),"observations":rows}

def raw(data):
    return json.dumps(data).encode()

class LiveVerifierTests(unittest.TestCase):
    def test_valid_data_and_checksum(self):
        blob=raw(fixture())
        report=verify_payload(blob,hashlib.sha256(blob).hexdigest(),date(2026,11,16))
        self.assertTrue(report["fresh"])
        self.assertTrue(report["checksum_matches"])
        self.assertEqual(report["database_writes"],0)
    def test_stale_data(self):
        self.assertFalse(verify_payload(raw(fixture()),today=date(2026,12,1))["fresh"])
    def test_wrong_checksum(self):
        with self.assertRaisesRegex(ValueError,"SHA-256"):
            verify_payload(raw(fixture()),"0"*64,date(2026,11,16))
    def test_private_field(self):
        data=fixture()
        data["observations"][0]["account_id"]="secret"
        with self.assertRaisesRegex(ValueError,"Unexpected public Yahoo"):
            verify_payload(raw(data),today=date(2026,11,16))
    def test_redirect_url_is_forbidden(self):
        with self.assertRaisesRegex(ValueError,"exact TEST"):
            fetch_public_json("https://example.org/data.json")
    def test_future_date_is_forbidden(self):
        with self.assertRaisesRegex(ValueError,"Future"):
            verify_payload(raw(fixture()),today=date(2026,11,1))

if __name__=="__main__":
    unittest.main()
