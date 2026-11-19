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

    def test_daily_review_requires_api_source_and_explicit_setting(self):
        workflow = (ROOT / ".github/workflows/test-yahoo-daily-review.yml").read_text(encoding="utf-8")
        self.assertIn("python -m scripts.audit_yahoo_test_pages_source", workflow)
        self.assertIn('audit.get("source_confirmed") is True', workflow)
        self.assertIn('audit.get("branch") == "gh-pages"', workflow)
        self.assertIn('os.environ.get("CONFIRMED_PAGES_SOURCE") == "gh-pages"', workflow)
        self.assertIn("yahoo-pages-source-audit.json", workflow)

    def test_manual_bundle_review_uses_pinned_test_checkout(self):
        workflow = (ROOT / ".github/workflows/test-yahoo-pages-manual.yml").read_text(encoding="utf-8")
        self.assertIn("ref: " + BRANCH, workflow)
        self.assertIn("persist-credentials: false", workflow)
        self.assertIn("contents: read", workflow)
        self.assertNotIn("actions/deploy-pages", workflow)

    def test_manual_bundle_runs_first_publication_review_without_deploy(self):
        workflow = (ROOT / ".github/workflows/test-yahoo-pages-manual.yml").read_text(encoding="utf-8")
        self.assertIn("python -m scripts.audit_yahoo_test_pages_source", workflow)
        self.assertIn("python -m scripts.report_yahoo_online_readiness", workflow)
        self.assertIn("python -m scripts.report_yahoo_first_publication_gate", workflow)
        self.assertIn("investlab-test-yahoo-first-publication-review", workflow)
        self.assertIn("contents: read", workflow)
        self.assertNotIn("actions/deploy-pages", workflow)
        self.assertNotIn("git push", workflow)

    def test_manual_bundle_requires_sha_pinned_fresh_handoff(self):
        workflow = (ROOT / ".github/workflows/test-yahoo-pages-manual.yml").read_text(encoding="utf-8")
        self.assertIn("python -m scripts.check_yahoo_test_pages_handoff", workflow)
        self.assertIn('REVIEWED_SHA="$(git rev-parse HEAD)"', workflow)
        self.assertIn('--reviewed-commit "$REVIEWED_SHA"', workflow)
        self.assertIn("investlab-test-yahoo-manual-handoff", workflow)
        self.assertIn("NO DEPLOY", workflow)


if __name__ == "__main__":
    unittest.main()
