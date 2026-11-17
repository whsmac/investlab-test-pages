import json
import tempfile
import unittest
from pathlib import Path
from scripts.stage_yahoo_test_pages_asset import stage_asset


class StageYahooPagesAssetTests(unittest.TestCase):
    def payload(self):
        return {"mode": "REVIEW_ONLY", "source": "Yahoo Finance",
                "database_insert_authorized": False, "writes_performed": 0,
                "row_count": 1, "observations": [
                    {"ticker": "TSLA", "trading_date": "2026-11-13",
                     "close_price": "250", "currency": "USD",
                     "price_basis": "unadjusted_close"}]}

    def test_stages_correct_relative_path_without_deployment(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / "source.json"
            source.write_text(json.dumps(self.payload()), encoding="utf-8")
            result = stage_asset(source, root / "stage")
            self.assertTrue((root / "stage/data/yahoo-public-review.json").exists())
            self.assertFalse(result["published"])
            self.assertEqual(result["database_writes"], 0)

    def test_rejects_private_fields_before_writing(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / "source.json"
            candidate = self.payload()
            candidate["observations"][0]["account_id"] = "private"
            source.write_text(json.dumps(candidate), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "private"):
                stage_asset(source, root / "stage")
            self.assertFalse((root / "stage/data/yahoo-public-review.json").exists())

    def test_rejects_duplicate_price_rows(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / "source.json"
            candidate = self.payload()
            candidate["observations"].append(dict(candidate["observations"][0]))
            candidate["row_count"] = 2
            source.write_text(json.dumps(candidate), encoding="utf-8")
            with self.assertRaises(ValueError):
                stage_asset(source, root / "stage")
            self.assertFalse((root / "stage/data/yahoo-public-review.json").exists())

    def test_rejects_symlinked_source(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            actual = root / "actual.json"
            actual.write_text(json.dumps(self.payload()), encoding="utf-8")
            linked = root / "linked.json"
            linked.symlink_to(actual)
            with self.assertRaisesRegex(ValueError, "linked"):
                stage_asset(linked, root / "stage")

    def test_rejects_unauthorized_candidate(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / "source.json"
            candidate = self.payload()
            candidate["database_insert_authorized"] = True
            source.write_text(json.dumps(candidate), encoding="utf-8")
            with self.assertRaises(ValueError):
                stage_asset(source, root / "stage")
            self.assertFalse((root / "stage/data/yahoo-public-review.json").exists())


if __name__ == "__main__":
    unittest.main()
