import unittest
from datetime import date
from scripts.build_yahoo_review_candidate import build_candidate


class YahooCandidateTests(unittest.TestCase):
    def fixture(self):
        symbols = {}
        for ticker in ("MSFT", "GOOGL", "AMZN", "META", "TSLA"):
            symbols[ticker] = {"status": "ok", "currency": "USD",
                               "price_basis": "unadjusted_close", "count": 1,
                               "observations": [{"trading_date": "2026-11-13", "close_price": "123.45"}]}
        return {"source": "Yahoo Finance unofficial chart endpoint",
                "writes_performed": 0, "symbols": symbols}

    def test_review_candidate_never_authorizes_writes(self):
        result = build_candidate(self.fixture(), date(2026, 11, 16))
        self.assertEqual(len(result["observations"]), 5)
        self.assertFalse(result["database_insert_authorized"])
        self.assertEqual(result["writes_performed"], 0)

    def test_reject_mixed_currency(self):
        report = self.fixture()
        report["symbols"]["TSLA"]["currency"] = "KRW"
        with self.assertRaises(ValueError):
            build_candidate(report, date(2026, 11, 16))

    def test_reject_duplicate_dates(self):
        report = self.fixture()
        row = report["symbols"]["TSLA"]["observations"][0]
        report["symbols"]["TSLA"]["observations"].append(dict(row))
        report["symbols"]["TSLA"]["count"] = 2
        with self.assertRaises(ValueError):
            build_candidate(report, date(2026, 11, 16))


if __name__ == "__main__":
    unittest.main()
