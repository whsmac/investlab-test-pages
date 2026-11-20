import unittest
from datetime import datetime, timezone
from scripts.export_yahoo_public_review import build_public_snapshot


class PublicYahooExportTests(unittest.TestCase):
    def candidate(self):
        return {"mode": "REVIEW_ONLY", "source": "Yahoo Finance",
                "database_insert_authorized": False, "writes_performed": 0,
                "observations": [{"ticker": "TSLA", "trading_date": "2026-11-13",
                                  "close_price": "250.50", "currency": "USD",
                                  "price_basis": "unadjusted_close"}]}

    def test_public_snapshot_no_private_data(self):
        c = self.candidate()
        c["private_user_token"] = "never-export"
        result = build_public_snapshot(c, datetime(2026, 11, 16, tzinfo=timezone.utc))
        self.assertEqual(result["row_count"], 1)
        self.assertNotIn("private_user_token", str(result))
        self.assertEqual(result["writes_performed"], 0)
        self.assertFalse(result["database_insert_authorized"])

    def test_duplicate_rejected(self):
        c = self.candidate()
        c["observations"].append(dict(c["observations"][0]))
        with self.assertRaises(ValueError):
            build_public_snapshot(c)

    def test_unapproved_symbol_rejected(self):
        c = self.candidate()
        c["observations"][0]["ticker"] = "UNLISTED_FAKE"
        with self.assertRaises(ValueError):
            build_public_snapshot(c)

    def test_adjusted_close_rejected(self):
        c = self.candidate()
        c["observations"][0]["price_basis"] = "adjusted_close"
        with self.assertRaises(ValueError):
            build_public_snapshot(c)


if __name__ == "__main__":
    unittest.main()
