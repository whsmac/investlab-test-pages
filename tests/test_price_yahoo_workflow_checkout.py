"""TEST Yahoo workflows must never silently run production/default-branch code."""
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BRANCH = "feature/test-navigation-20261112"


class YahooWorkflowCheckoutTests(unittest.TestCase):
    def test_daily_review_uses_pinned_test_checkout(self):
        workflow = (ROOT / ".github/workflows/test-yahoo-daily-review.yml").read_text(encoding="utf-8")
        self.assertIn("ref: " + BRANCH, workflow)
        self.assertIn("persist-credentials: false", workflow)
        self.assertIn("contents: read", workflow)
        self.assertIn("NO DEPLOY", workflow)
        self.assertNotIn("actions/deploy-pages", workflow)
        self.assertNotIn("git push", workflow)

    def test_manual_bundle_review_uses_pinned_test_checkout(self):
        workflow = (ROOT / ".github/workflows/test-yahoo-pages-manual.yml").read_text(encoding="utf-8")
        self.assertIn("ref: " + BRANCH, workflow)
        self.assertIn("persist-credentials: false", workflow)
        self.assertIn("contents: read", workflow)
        self.assertNotIn("actions/deploy-pages", workflow)


if __name__ == "__main__":
    unittest.main()
