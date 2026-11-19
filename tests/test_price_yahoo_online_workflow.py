import unittest
from pathlib import Path

WORKFLOW = Path(__file__).resolve().parents[1] / ".github/workflows/test-yahoo-online-readiness.yml"


class OnlineWorkflowContractTests(unittest.TestCase):
    def test_read_only_permissions_and_no_publish_actions(self):
        source = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("contents: read", source)
        self.assertIn("persist-credentials: false", source)
        self.assertNotIn("contents: write", source)
        self.assertNotIn("actions/deploy-pages", source)
        self.assertNotIn("git push", source)
        self.assertNotIn("supabase.co", source)

    def test_unpublished_live_json_still_produces_summary(self):
        source = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("continue-on-error: true", source)
        self.assertIn("steps.live.outcome != 'skipped'", source)
        self.assertIn("scripts.report_yahoo_online_readiness", source)
        self.assertIn("if: always()", source)
        self.assertIn("yahoo-online-readiness.json", source)


if __name__ == "__main__":
    unittest.main()
