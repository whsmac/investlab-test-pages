import unittest
from datetime import date
from scripts.build_gated_yahoo_public_review import build_gated_snapshot


class GatedYahooReviewTests(unittest.TestCase):
    def candidate(self, day="2026-11-13"):
        return {"mode": "REVIEW_ONLY", "source": "Yahoo Finance",
                "database_insert_authorized": False, "writes_performed": 0,
                "observations": [
                    {"ticker": ticker, "trading_date": day, "close_price": "100.25",
                     "currency": "USD", "price_basis": "unadjusted_close"}
                    for ticker in ("MSFT", "GOOGL", "AMZN", "META", "TSLA")]}

    def test_pass_produces_read_only_public_snapshot(self):
        result = build_gated_snapshot(self.candidate(), today=date(2026, 11, 16))
        self.assertEqual(result["row_count"], 5)
        self.assertFalse(result["database_insert_authorized"])
        self.assertEqual(result["writes_performed"], 0)

    def test_stale_data_cannot_produce_snapshot(self):
        with self.assertRaisesRegex(ValueError, "BLOCKED"):
            build_gated_snapshot(self.candidate("2026-10-01"), today=date(2026, 11, 16))

    def test_missing_ticker_cannot_produce_snapshot(self):
        candidate = self.candidate()
        candidate["observations"].pop()
        with self.assertRaisesRegex(ValueError, "BLOCKED"):
            build_gated_snapshot(candidate, today=date(2026, 11, 16))

    def test_invalid_basis_cannot_produce_snapshot(self):
        candidate = self.candidate()
        candidate["observations"][0]["price_basis"] = "adjusted_close"
        with self.assertRaises(ValueError):
            build_gated_snapshot(candidate, today=date(2026, 11, 16))


if __name__ == "__main__":
    unittest.main()
