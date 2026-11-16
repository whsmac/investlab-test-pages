import unittest
from scripts.compare_yahoo_test_snapshot import compare


class YahooSnapshotComparisonTests(unittest.TestCase):
    def candidate(self):
        return {"mode": "REVIEW_ONLY", "database_insert_authorized": False,
                "writes_performed": 0, "observations": [
                    {"ticker": "TSLA", "trading_date": "2026-11-13", "close_price": "250.50",
                     "currency": "USD", "price_basis": "unadjusted_close"}]}

    def snapshot(self, price="250.5", basis="unadjusted_close"):
        return {"mode": "READ_ONLY_SNAPSHOT",
                "coverage": {"complete": True, "scope": "authenticated_RLS_visible_rows_only"},
                "observations": [{"ticker": "TSLA", "trading_date": "2026-11-13",
                                  "close_price": price, "currency": "USD", "price_basis": basis}]}

    def test_same_decimal_price(self):
        result = compare(self.candidate(), self.snapshot())
        self.assertEqual(result["counts"], {"missing": 0, "same": 1, "conflicts": 0})
        self.assertFalse(result["database_insert_authorized"])

    def test_missing_row(self):
        snapshot = self.snapshot()
        snapshot["observations"] = []
        result = compare(self.candidate(), snapshot)
        self.assertEqual(result["counts"]["missing"], 1)
        self.assertFalse(result["database_insert_authorized"])

    def test_price_conflict(self):
        result = compare(self.candidate(), self.snapshot("251"))
        self.assertEqual(result["conflicts"][0]["reason"], "close_price_mismatch")

    def test_price_basis_conflict(self):
        result = compare(self.candidate(), self.snapshot(basis="adjusted_close"))
        self.assertEqual(result["conflicts"][0]["reason"], "currency_or_basis_mismatch")

    def test_partial_snapshot_rejected(self):
        snapshot = self.snapshot()
        snapshot["coverage"]["complete"] = False
        with self.assertRaises(ValueError):
            compare(self.candidate(), snapshot)


if __name__ == "__main__":
    unittest.main()
