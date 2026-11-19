import unittest
from pathlib import Path

class DailyReviewWorkflowContractTests(unittest.TestCase):
    def test_schedule_is_read_only_and_never_deploys(self):
        text=Path(".github/workflows/test-yahoo-daily-review.yml").read_text(encoding="utf-8")
        self.assertIn("cron: '35 23 * * 1-5'",text)
        self.assertIn("contents: read",text)
        self.assertIn("persist-credentials: false",text)
        self.assertIn("concurrency:",text)
        self.assertIn("scripts/yahoo_price_probe_test.py",text)
        self.assertIn("scripts.check_yahoo_publication_preflight",text)
        self.assertIn("scripts.build_gated_yahoo_public_review",text)
        self.assertIn("retention-days: 7",text)
        self.assertIn("ref: gh-pages",text)
        self.assertIn("vars.INVESTLAB_TEST_PAGES_SOURCE",text)
        self.assertIn("if: steps.pages_source.outputs.confirmed == 'true'",text)
        self.assertIn("scripts.review_yahoo_test_pages_refresh",text)
        self.assertIn("yahoo-pages-refresh-review.json",text)
        self.assertIn("scripts.plan_yahoo_test_pages_publication",text)
        self.assertIn("yahoo-pages-publication-plan.json",text)
        self.assertIn("scripts.verify_yahoo_test_pages_prewrite",text)
        self.assertIn("yahoo-pages-prewrite-check.json",text)
        self.assertIn("scripts.backup_yahoo_test_pages_asset",text)
        self.assertIn("investlab-test-yahoo-rollback-review",text)
        self.assertIn("scripts.summarize_yahoo_test_refresh_decision",text)
        self.assertIn("yahoo-pages-refresh-decision.json",text)
        self.assertNotIn("contents: write",text)
        self.assertNotIn("pages: write",text)
        self.assertNotIn("actions/deploy-pages",text)
        self.assertNotIn("git push",text)
        self.assertNotIn("supabase",text.lower())
    def test_failed_probe_cannot_run_candidate(self):
        text=Path(".github/workflows/test-yahoo-daily-review.yml").read_text(encoding="utf-8")
        self.assertIn("if: steps.probe.outcome == 'success'",text)
        self.assertIn("exit 1",text)
        self.assertIn('if [ "$PROBE_OUTCOME" != success ] || [ "$CANDIDATE_OUTCOME" != success ] || [ "$STAGING_OUTCOME" != success ]; then',text)
        self.assertIn('if [ "$PAGES_SOURCE_CONFIRMED" != true ]; then',text)
        self.assertIn('if [ "$COMPARISON_OUTCOME" != success ] || [ "$PLAN_OUTCOME" != success ] || [ "$PREWRITE_OUTCOME" != success ] || [ "$BACKUP_OUTCOME" != success ] || [ "$DECISION_OUTCOME" != success ]; then',text)
        self.assertIn("if: steps.candidate.outcome == 'success'",text)
        self.assertIn("COMPARISON_OUTCOME",text)

if __name__=="__main__":
    unittest.main()
