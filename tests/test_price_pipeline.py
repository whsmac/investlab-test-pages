import unittest
from datetime import date
from scripts.market_price_refresh_test import parse_csv
from scripts.reconcile_price_probe_test import reconcile

class PricePipelineTests(unittest.TestCase):
    def test_parse_valid_and_sorted(self):
        raw = "Date,Close\n2026-11-13,102.50\n2026-11-12,100.00\n"
        self.assertEqual(parse_csv(raw, date(2026, 11, 12), date(2026, 11, 13)),
                         [{"trading_date": "2026-11-12", "close_price": "100.00"},
                          {"trading_date": "2026-11-13", "close_price": "102.50"}])

    def test_reject_invalid_price(self):
        with self.assertRaises(ValueError):
            parse_csv("Date,Close\n2026-11-12,-1\n", date(2026, 11, 1), date(2026, 11, 13))

    def test_reject_conflicting_source_duplicates(self):
        with self.assertRaises(ValueError):
            parse_csv("Date,Close\n2026-11-12,1\n2026-11-12,2\n",
                      date(2026, 11, 1), date(2026, 11, 13))

    def test_missing_same_and_conflict(self):
        probe = {"mode": "DRY_RUN_ONLY", "writes_performed": 0, "symbols": {
            "MSFT": {"status": "ok", "observations": [
                {"trading_date": "2026-11-11", "close_price": "100"},
                {"trading_date": "2026-11-12", "close_price": "110"},
                {"trading_date": "2026-11-13", "close_price": "120"}]},
            "SPCX": {"status": "skipped"}}}
        stored = [{"ticker": "MSFT", "trading_date": "2026-11-11", "close_price": "100.0"},
                  {"ticker": "MSFT", "trading_date": "2026-11-12", "close_price": "111"}]
        result = reconcile(probe, stored)
        self.assertEqual(result["counts"], {"missing": 1, "same": 1, "conflicts": 1, "skipped": 1})
        self.assertFalse(result["safe_to_propose_insert"])
        self.assertEqual(result["writes_performed"], 0)

    def test_reject_non_dry_run_report(self):
        with self.assertRaises(ValueError):
            reconcile({"mode": "WRITE", "writes_performed": 1, "symbols": {}}, [])

if __name__ == "__main__":
    unittest.main()
