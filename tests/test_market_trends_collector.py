import unittest
from datetime import date,timedelta
from scripts.yahoo_market_trends_test import build_public_report

TODAY=date(2026,11,23)
def make_fixture(n=260):
 return {"status":"ok","currency":"USD","price_basis":"unadjusted_close",
  "observations":[{"trading_date":(TODAY-timedelta(days=n-i)).isoformat(),"close_price":str(100+i)} for i in range(n)]}
class MarketTrendsCollectorTests(unittest.TestCase):
 def test_public_market_report_has_no_db_writes(self):
  report=build_public_report({"XLK":make_fixture(),"^TNX":make_fixture()},today=TODAY)
  self.assertEqual(report["database_writes"],0)
  self.assertEqual(report["writes_performed"],0)
  self.assertEqual({r["ticker"] for r in report["observations"]},{"XLK","^TNX"})
  self.assertEqual(report["row_count"],520)
  self.assertIn("GC=F",report["missing_symbols"])
 def test_fails_missing_all_sources(self):
  with self.assertRaises(ValueError):
   build_public_report({},today=TODAY)
 def test_malformed_quote_cannot_be_published(self):
  x=make_fixture()
  x["observations"][0]["close_price"]="-1"
  with self.assertRaises(ValueError):
   build_public_report({"XLK":x},today=TODAY)
if __name__=="__main__": unittest.main()
