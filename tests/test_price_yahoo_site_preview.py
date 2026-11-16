import json
import hashlib
import tempfile
import unittest
from pathlib import Path
from scripts.assemble_yahoo_test_site_preview import assemble_site


class YahooSitePreviewTests(unittest.TestCase):
    def setup_files(self, root):
        repo = root / "repo"
        staging = root / "staging"
        for path in ("index.html", "test-yahoo-price-review.html",
                     "src/market/load-published-yahoo-review.mjs",
                     "src/market/review-yahoo-test-browser.mjs"):
            file = repo / path
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text("TEST", encoding="utf-8")
        (repo / ".github").mkdir()
        (repo / ".github/secrets.txt").write_text("not-for-preview")
        (staging / "data").mkdir(parents=True)
        (staging / "data/yahoo-public-review.json").write_text(json.dumps({
            "mode": "REVIEW_ONLY", "database_insert_authorized": False,
            "writes_performed": 0, "row_count": 1, "observations": [{}]}))
        (staging / "manifest.json").write_text(json.dumps({
            "mode": "TEST_PAGES_STAGING_ONLY", "published": False,
            "database_writes": 0, "target_path": "data/yahoo-public-review.json",
            "sha256": hashlib.sha256((staging / "data/yahoo-public-review.json").read_bytes()).hexdigest()}))
        return repo, staging

    def test_full_site_and_data_copied_without_github_metadata(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            repo, staging = self.setup_files(root)
            result = assemble_site(repo, staging, root / "preview")
            self.assertEqual(result["row_count"], 1)
            self.assertFalse(result["published"])
            self.assertTrue((root / "preview/index.html").exists())
            self.assertTrue((root / "preview/data/yahoo-public-review.json").exists())
            self.assertFalse((root / "preview/.github").exists())

    def test_invalid_manifest_blocks_output(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            repo, staging = self.setup_files(root)
            manifest = staging / "manifest.json"
            data = json.loads(manifest.read_text())
            data["published"] = True
            manifest.write_text(json.dumps(data))
            with self.assertRaises(ValueError):
                assemble_site(repo, staging, root / "preview")
            self.assertFalse((root / "preview").exists())

    def test_modified_staged_json_is_rejected_by_checksum(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            repo, staging = self.setup_files(root)
            asset = staging / "data/yahoo-public-review.json"
            asset.write_text(asset.read_text() + " ", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Invalid staging data"):
                assemble_site(repo, staging, root / "preview")
            self.assertFalse((root / "preview").exists())

    def test_output_inside_repository_blocked(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            repo, staging = self.setup_files(root)
            with self.assertRaises(ValueError):
                assemble_site(repo, staging, repo / "preview")


if __name__ == "__main__":
    unittest.main()
