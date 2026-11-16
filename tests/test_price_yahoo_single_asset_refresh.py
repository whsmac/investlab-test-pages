import hashlib
import json
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch
from scripts.review_yahoo_test_pages_refresh import assess_refresh

TODAY=date(2026,11,17)
def payload(day="2026-11-16"):
    rows=[{"ticker":t,"trading_date":day,"close_price":"100","currency":"USD","price_basis":"unadjusted_close"} for t in ("MSFT","GOOGL","AMZN","META","TSLA")]
    return {"mode":"REVIEW_ONLY","source":"Yahoo Finance","database_insert_authorized":False,"writes_performed":0,"row_count":len(rows),"observations":rows}

class RefreshReviewTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.site=Path(self.tmp.name)/"site"
        self.site.mkdir()
        (self.site/"index.html").write_text("keep existing homepage")
        self.proposed=Path(self.tmp.name)/"review.json"
    def write(self,data):
        self.proposed.write_text(json.dumps(data))
    def test_single_asset_review_does_not_change_existing_site(self):
        self.write(payload())
        with patch("scripts.export_yahoo_public_review.build_public_snapshot",return_value={"observations":sorted(payload()["observations"],key=lambda r:(r["ticker"],r["trading_date"]))}):
            result=assess_refresh(self.site,self.proposed,today=TODAY)
        self.assertEqual(result["allowed_change_paths"],["data/yahoo-public-review.json"])
        self.assertFalse(result["deployment_authorized"])
        self.assertFalse(result["deployment_performed"])
        self.assertTrue(result["change_needed"])
        self.assertEqual((self.site/"index.html").read_text(),"keep existing homepage")
        self.assertFalse((self.site/"data/yahoo-public-review.json").exists())
    def test_stale_data_blocked(self):
        self.write(payload("2026-10-01"))
        with patch("scripts.export_yahoo_public_review.build_public_snapshot",return_value={"observations":sorted(payload("2026-10-01")["observations"],key=lambda r:(r["ticker"],r["trading_date"]))}):
            with self.assertRaisesRegex(ValueError,"Stale"):
                assess_refresh(self.site,self.proposed,today=TODAY)
    def test_extra_private_field_blocked(self):
        data=payload()
        data["observations"][0]["private_key"]="no"
        self.write(data)
        with patch("scripts.export_yahoo_public_review.build_public_snapshot",return_value={"observations":sorted(payload()["observations"],key=lambda r:(r["ticker"],r["trading_date"]))}):
            with self.assertRaisesRegex(ValueError,"private"):
                assess_refresh(self.site,self.proposed,today=TODAY)
    def test_oversized_file_blocked(self):
        self.proposed.write_bytes(b" " * 2_000_001)
        with self.assertRaisesRegex(ValueError,"size"):
            assess_refresh(self.site,self.proposed,today=TODAY)
    def test_existing_same_asset_is_noop(self):
        self.write(payload())
        (self.site/"data").mkdir()
        (self.site/"data/yahoo-public-review.json").write_bytes(self.proposed.read_bytes())
        with patch("scripts.export_yahoo_public_review.build_public_snapshot",return_value={"observations":sorted(payload()["observations"],key=lambda r:(r["ticker"],r["trading_date"]))}):
            result=assess_refresh(self.site,self.proposed,today=TODAY)
        self.assertFalse(result["change_needed"])
        self.assertEqual(result["previous_sha256"],result["proposed_sha256"])
if __name__=="__main__":
    unittest.main()
