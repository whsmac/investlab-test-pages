import unittest
from scripts.build_yahoo_test_insert_manifest import build_manifest, TEST_PROJECT


class YahooTestManifestTests(unittest.TestCase):
    def mapping(self):
        return {"MSFT": 1, "GOOGL": 2, "AMZN": 3, "META": 4, "TSLA": 5}

    def preview(self):
        return {"mode": "NON_EXECUTABLE_IMPORT_PREVIEW",
                "database_insert_authorized": False, "writes_performed": 0,
                "candidate_count": 1, "conflict_count": 0,
                "candidates": [{"ticker": "TSLA", "trading_date": "2026-11-13",
                                "close_price": "250.50", "currency": "USD",
                                "price_basis": "unadjusted_close"}]}

    def test_manifest_is_non_executable(self):
        result = build_manifest(self.preview(), self.mapping())
        self.assertEqual(result["test_project_id"], TEST_PROJECT)
        self.assertEqual(result["row_count"], 1)
        self.assertFalse(result["database_insert_authorized"])
        self.assertTrue(result["requires_explicit_user_approval"])
        self.assertEqual(result["writes_performed"], 0)

    def test_conflicts_block_manifest(self):
        preview = self.preview()
        preview["conflict_count"] = 1
        with self.assertRaises(ValueError):
            build_manifest(preview, self.mapping())

    def test_duplicate_company_id_rejected(self):
        mapping = self.mapping()
        mapping["TSLA"] = 1
        with self.assertRaises(ValueError):
            build_manifest(self.preview(), mapping)

    def test_missing_company_mapping_rejected(self):
        mapping = self.mapping()
        del mapping["TSLA"]
        with self.assertRaises(ValueError):
            build_manifest(self.preview(), mapping)

    def test_invalid_basis_rejected(self):
        preview = self.preview()
        preview["candidates"][0]["price_basis"] = "adjusted_close"
        with self.assertRaises(ValueError):
            build_manifest(preview, self.mapping())


if __name__ == "__main__":
    unittest.main()
