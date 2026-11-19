"""Ensure daily Yahoo review produces the manual Pages bundle input, never a deployment."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DAILY = ROOT / ".github/workflows/test-yahoo-daily-review.yml"
MANUAL = ROOT / ".github/workflows/test-yahoo-pages-manual.yml"


class DailyStagingTests(unittest.TestCase):
    def test_daily_produces_exact_manual_bundle_input(self):
        daily = DAILY.read_text(encoding="utf-8")
        manual = MANUAL.read_text(encoding="utf-8")
        self.assertIn("scripts.stage_yahoo_test_pages_asset --source yahoo-public-review.json --directory yahoo-staged", daily)
        self.assertIn("name: investlab-test-yahoo-pages-staging", daily)
        self.assertIn("path: yahoo-staged/", daily)
        self.assertIn("name: investlab-test-yahoo-pages-staging", manual)
        self.assertIn("path: ./yahoo-staged", manual)
        self.assertIn("STAGING_OUTCOME: ${{ steps.staging.outcome }}", daily)
        self.assertIn('"$STAGING_OUTCOME" != success', daily)

    def test_no_write_credentials_or_deploy(self):
        daily = DAILY.read_text(encoding="utf-8")
        self.assertIn("contents: read", daily)
        self.assertIn("persist-credentials: false", daily)
        self.assertNotIn("contents: write", daily)
        self.assertNotIn("actions/deploy-pages", daily)
        self.assertNotIn("git push", daily)


if __name__ == "__main__":
    unittest.main()
