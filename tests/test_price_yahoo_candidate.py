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

    def test_accepts_five_year_history_for_pilot_chart(self):
        report = self.fixture()
        for ticker in ("MSFT", "GOOGL", "AMZN", "META", "TSLA"):
            report["symbols"][ticker]["observations"].insert(
                0, {"trading_date": "2021-11-20", "close_price": "95.5"})
            report["symbols"][ticker]["count"] = 2
        result = build_candidate(report, date(2026, 11, 20))
        self.assertEqual(len(result["observations"]), 10)
        self.assertEqual(result["observations"][0]["trading_date"], "2021-11-20")
        self.assertEqual(result["writes_performed"], 0)

    def test_five_year_live_collection_must_not_silently_shrink_to_one_month(self):
        report = self.fixture()
        report["requested_range"] = "5y"
        with self.assertRaisesRegex(ValueError, "five-year source truncated"):
            build_candidate(report, date(2026, 11, 20))

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
