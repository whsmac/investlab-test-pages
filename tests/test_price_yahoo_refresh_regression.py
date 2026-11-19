import json
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

from scripts.review_yahoo_test_pages_refresh import assess_refresh

TICKERS = ("AMZN", "GOOGL", "META", "MSFT", "TSLA")


def payload(day):
    rows = [{"ticker": ticker, "trading_date": day.isoformat(),
             "close_price": "100", "currency": "USD",
             "price_basis": "unadjusted_close"} for ticker in TICKERS]
    return {"mode": "REVIEW_ONLY", "source": "Yahoo Finance",
            "database_insert_authorized": False, "writes_performed": 0,
            "row_count": len(rows), "observations": rows}


class RefreshRegressionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.site = Path(self.temp.name) / "site"
        (self.site / "data").mkdir(parents=True)
        self.old = self.site / "data/yahoo-public-review.json"
        self.proposed = Path(self.temp.name) / "proposed.json"
        self.today = date(2026, 11, 17)

    def write(self, old, new):
        self.old.write_text(json.dumps(old), encoding="utf-8")
        self.proposed.write_text(json.dumps(new), encoding="utf-8")

    def test_older_trading_day_rejected(self):
        self.write(payload(self.today - timedelta(days=1)),
                   payload(self.today - timedelta(days=2)))
        with self.assertRaisesRegex(ValueError, "Price history regression"):
            assess_refresh(self.site, self.proposed, today=self.today)

    def test_one_ticker_rollback_rejected(self):
        old = payload(self.today - timedelta(days=2))
        new = payload(self.today - timedelta(days=1))
        old["observations"][0]["trading_date"] = self.today.isoformat()
        with self.assertRaisesRegex(ValueError, "Price history regression"):
            self.write(old, new)
            assess_refresh(self.site, self.proposed, today=self.today)

    def test_forward_trading_day_is_reviewable_without_deployment(self):
        self.write(payload(self.today - timedelta(days=2)),
                   payload(self.today - timedelta(days=1)))
        result = assess_refresh(self.site, self.proposed, today=self.today)
        self.assertTrue(result["publication_needed"])
        self.assertFalse(result["deployment_authorized"])
        self.assertFalse(result["deployment_performed"])
        self.assertEqual(result["database_writes"], 0)

    def test_same_trading_day_is_reviewable(self):
        self.write(payload(self.today - timedelta(days=1)),
                   payload(self.today - timedelta(days=1)))
        result = assess_refresh(self.site, self.proposed, today=self.today)
        self.assertFalse(result["publication_needed"])


if __name__ == "__main__":
    unittest.main()
