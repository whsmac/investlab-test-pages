import json
import tempfile
import unittest
from pathlib import Path
from scripts.validate_yahoo_test_site_preview import validate_preview


class TestYahooPreviewValidation(unittest.TestCase):
    def prepare(self, root):
        for path in (
            "index.html", "test-yahoo-price-review.html",
            "src/market/load-published-yahoo-review.mjs",
            "src/market/read-yahoo-test-company-map.mjs",
            "src/market/read-test-price-snapshot.mjs",
            "src/market/review-yahoo-test-browser.mjs",
        ):
            file = root / path
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text("test", encoding="utf-8")
        (root / "test-yahoo-price-review.html").write_text(
            'import {a} from "./src/market/load-published-yahoo-review.mjs"; '
            'loadPublishedYahooReview({origin:location.href}); '
            'reviewYahooCandidate(candidate,snapshot,companyMap);', encoding="utf-8")
        (root / "src/market/load-published-yahoo-review.mjs").write_text(
            'const path="./data/yahoo-public-review.json";', encoding="utf-8")
        asset = root / "data/yahoo-public-review.json"
        asset.parent.mkdir()
        asset.write_text(json.dumps({
            "mode": "REVIEW_ONLY", "source": "Yahoo Finance",
            "database_insert_authorized": False, "writes_performed": 0,
            "row_count": 5, "observations": [
                {"ticker": t} for t in ("MSFT", "GOOGL", "AMZN", "META", "TSLA")]}))
        return asset

    def test_complete_preview_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            self.assertTrue(validate_preview(root)["checks_passed"])

    def test_missing_module_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            (root / "src/market/load-published-yahoo-review.mjs").unlink()
            with self.assertRaisesRegex(ValueError, "Missing"):
                validate_preview(root)

    def test_missing_ticker_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            asset = self.prepare(root)
            data = json.loads(asset.read_text())
            data["observations"].pop()
            data["row_count"] = 4
            asset.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError, "ticker coverage"):
                validate_preview(root)

    def test_broken_import_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            page = root / "test-yahoo-price-review.html"
            page.write_text(page.read_text() + ' import {x} from "./src/market/missing.mjs";')
            with self.assertRaisesRegex(ValueError, "Broken local module"):
                validate_preview(root)

    def test_private_files_in_preview_are_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            (root / ".env").write_text("PRIVATE=1")
            with self.assertRaisesRegex(ValueError, "non-public"):
                validate_preview(root)

    def test_backend_script_in_preview_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.prepare(root)
            (root / "scripts").mkdir()
            (root / "scripts/internal.py").write_text("secret")
            with self.assertRaisesRegex(ValueError, "non-public"):
                validate_preview(root)


if __name__ == "__main__":
    unittest.main()
