"""End-to-end offline regression for TEST Pages JSON refresh without any publishing."""
import hashlib
import json
import tempfile
import unittest
from datetime import date
from pathlib import Path
from scripts.review_yahoo_test_pages_refresh import assess_refresh
from scripts.plan_yahoo_test_pages_publication import build_plan
from scripts.verify_yahoo_test_pages_prewrite import verify_prewrite
from scripts.backup_yahoo_test_pages_asset import make_backup

BRANCH_SHA="a"*40
DAY=date(2026,11,17)
TICKERS=("MSFT","GOOGL","AMZN","META","TSLA")

def candidate():
    observations=[{"ticker":ticker,"trading_date":"2026-11-16","close_price":"100",
                   "currency":"USD","price_basis":"unadjusted_close"} for ticker in sorted(TICKERS)]
    return {"mode":"REVIEW_ONLY","source":"Yahoo Finance",
            "database_insert_authorized":False,"writes_performed":0,
            "row_count":len(observations),"observations":observations}

class OfflineRefreshIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.site=self.root/"gh-pages"
        (self.site/"data").mkdir(parents=True)
        (self.site/"index.html").write_text("EXISTING SITE")
        self.old=self.site/"data/yahoo-public-review.json"
        self.new=self.root/"new.json"
        self.new.write_text(json.dumps(candidate()))
    def test_first_asset_review_plan_verify_and_backup(self):
        review=assess_refresh(self.site,self.new,today=DAY)
        plan=build_plan(review,BRANCH_SHA)
        checked=verify_prewrite(plan,BRANCH_SHA,self.site,self.new)
        backup=make_backup(plan,self.site,self.root/"rollback")
        self.assertTrue(checked["verified"])
        self.assertTrue(checked["change_needed"])
        self.assertFalse(backup["previous_asset_existed"])
        self.assertFalse(self.old.exists())
        self.assertEqual((self.site/"index.html").read_text(),"EXISTING SITE")
        self.assertFalse(plan["deployment_authorized"])
    def test_existing_asset_preserved_and_rollback_checksum_matches(self):
        previous=b'{"mode":"REVIEW_ONLY","legacy":"old"}'
        self.old.write_bytes(previous)
        review=assess_refresh(self.site,self.new,today=DAY)
        plan=build_plan(review,BRANCH_SHA)
        verify_prewrite(plan,BRANCH_SHA,self.site,self.new)
        backup=make_backup(plan,self.site,self.root/"rollback")
        self.assertEqual(backup["previous_sha256"],hashlib.sha256(previous).hexdigest())
        self.assertEqual((self.root/"rollback/previous-yahoo-public-review.json").read_bytes(),previous)
        self.assertEqual(self.old.read_bytes(),previous)
    def test_moved_branch_and_modified_asset_fail_without_writes(self):
        previous=b"original"
        self.old.write_bytes(previous)
        plan=build_plan(assess_refresh(self.site,self.new,today=DAY),BRANCH_SHA)
        with self.assertRaisesRegex(ValueError,"Branch moved"):
            verify_prewrite(plan,"b"*40,self.site,self.new)
        self.old.write_bytes(b"changed")
        with self.assertRaisesRegex(ValueError,"changed since review"):
            verify_prewrite(plan,BRANCH_SHA,self.site,self.new)
        self.assertFalse((self.root/"rollback").exists())

if __name__=="__main__":
    unittest.main()
