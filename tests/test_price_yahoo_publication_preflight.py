import unittest
from datetime import date, timedelta
from scripts.check_yahoo_publication_preflight import assess_publication


class YahooPublicationPreflightTests(unittest.TestCase):
    def candidate(self, day=None):
        day = day or date(2026, 11, 13)
        return {"mode": "REVIEW_ONLY", "source": "Yahoo Finance",
                "database_insert_authorized": False, "writes_performed": 0,
                "observations": [
                    {"ticker": ticker, "trading_date": day.isoformat(), "close_price": "100.25",
                     "currency": "USD", "price_basis": "unadjusted_close"}
                    for ticker in ("MSFT", "GOOGL", "AMZN", "META", "TSLA")]}

    def test_five_symbols_fresh_pass_without_authorizing_publication(self):
        report = assess_publication(self.candidate(), date(2026, 11, 16))
        self.assertTrue(report["checks_passed"])
        self.assertFalse(report["publish_authorized"])
        self.assertFalse(report["deployment_performed"])
        self.assertEqual(report["database_writes"], 0)

    def test_stale_prices_blocked(self):
        report = assess_publication(self.candidate(date(2026, 10, 1)), date(2026, 11, 16))
        self.assertFalse(report["checks_passed"])

    def test_missing_symbol_blocked(self):
        candidate = self.candidate()
        candidate["observations"].pop()
        self.assertFalse(assess_publication(candidate, date(2026, 11, 16))["checks_passed"])

    def test_future_prices_blocked(self):
        candidate = self.candidate(date(2026, 11, 20))
        self.assertFalse(assess_publication(candidate, date(2026, 11, 16))["checks_passed"])


if __name__ == "__main__":
    unittest.main()
