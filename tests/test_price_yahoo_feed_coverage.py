import unittest
from datetime import date
from scripts.report_yahoo_feed_coverage import assess_coverage

TICKERS = ("MSFT", "GOOGL", "AMZN", "META", "TSLA")


def sample(day="2026-11-16"):
    rows = [{"ticker": t, "trading_date": day, "close_price": "100", "currency": "USD",
             "price_basis": "unadjusted_close"} for t in TICKERS]
    return {"mode": "REVIEW_ONLY", "source": "Yahoo Finance", "database_insert_authorized": False,
            "writes_performed": 0, "row_count": len(rows), "observations": rows}


class YahooCoverageTests(unittest.TestCase):
    def test_five_tickers_fresh(self):
        result = assess_coverage(sample(), today=date(2026, 11, 17))
        self.assertTrue(result["all_usable"])
        self.assertEqual([r["ticker"] for r in result["tickers"]], list(TICKERS))
        self.assertEqual(result["database_writes"], 0)
        self.assertFalse(result["published"])

    def test_stale_ticker_identified(self):
        payload = sample()
        payload["observations"][-1]["trading_date"] = "2026-11-01"
        result = assess_coverage(payload, today=date(2026, 11, 17))
        self.assertFalse(result["all_usable"])
        self.assertEqual(result["tickers"][-1]["age_days"], 16)
        self.assertFalse(result["tickers"][-1]["usable"])

    def test_future_date_rejected_as_unusable(self):
        result = assess_coverage(sample("2026-11-18"), today=date(2026, 11, 17))
        self.assertFalse(result["all_usable"])


if __name__ == "__main__":
    unittest.main()
