import unittest
from scripts.preview_yahoo_test_import import build_preview


class YahooImportPreviewTests(unittest.TestCase):
    def row(self):
        return {"ticker": "TSLA", "trading_date": "2026-11-13", "close_price": "250.50",
                "currency": "USD", "price_basis": "unadjusted_close"}

    def comparison(self):
        return {"mode": "YAHOO_TEST_READ_ONLY_COMPARISON",
                "writes_performed": 0, "database_insert_authorized": False,
                "snapshot_scope": "authenticated_RLS_visible_rows_only",
                "missing": [self.row()], "same": [], "conflicts": [],
                "counts": {"missing": 1, "same": 0, "conflicts": 0},
                "blocking_reasons": []}

    def test_new_row_is_review_only(self):
        preview = build_preview(self.comparison())
        self.assertEqual(preview["candidate_count"], 1)
        self.assertFalse(preview["database_insert_authorized"])
        self.assertEqual(preview["writes_performed"], 0)

    def test_existing_row_not_reimported(self):
        comparison = self.comparison()
        comparison["same"] = comparison["missing"]
        comparison["missing"] = []
        comparison["counts"] = {"missing": 0, "same": 1, "conflicts": 0}
        preview = build_preview(comparison)
        self.assertEqual(preview["candidate_count"], 0)
        self.assertEqual(preview["duplicate_count"], 1)

    def test_count_mismatch_rejected(self):
        comparison = self.comparison()
        comparison["counts"]["missing"] = 2
        with self.assertRaises(ValueError):
            build_preview(comparison)

    def test_duplicate_candidate_rejected(self):
        comparison = self.comparison()
        comparison["missing"].append(dict(self.row()))
        comparison["counts"]["missing"] = 2
        with self.assertRaises(ValueError):
            build_preview(comparison)

    def test_wrong_price_basis_rejected(self):
        comparison = self.comparison()
        comparison["missing"][0]["price_basis"] = "adjusted_close"
        with self.assertRaises(ValueError):
            build_preview(comparison)


if __name__ == "__main__":
    unittest.main()
