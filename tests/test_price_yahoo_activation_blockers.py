"""Fail-closed TEST Yahoo activation status and workflow wiring."""
import unittest
from pathlib import Path
from scripts.report_yahoo_test_activation_blockers import summarize

ROOT = Path(__file__).resolve().parents[1]


class ActivationBlockerTests(unittest.TestCase):
    def setUp(self):
        self.source = {"mode": "TEST_PAGES_SOURCE_READ_ONLY_AUDIT",
                       "source_confirmed": False, "status": "API_ACCESS_UNAVAILABLE",
                       "deployment_performed": False, "database_writes": 0}
        self.online = {"mode": "TEST_YAHOO_ONLINE_READINESS_ONLY",
                       "status": "NOT_PUBLISHED", "deployment_authorized": False,
                       "deployment_performed": False, "database_writes": 0}

    def test_actual_observed_404_conditions_block_activation(self):
        result = summarize(self.source, self.online)
        self.assertFalse(result["online_price_feed_ready"])
        self.assertEqual([x["code"] for x in result["blockers"]],
                         ["PAGES_SOURCE_UNCONFIRMED", "PUBLIC_PRICE_FEED_NOT_FRESH"])
        self.assertFalse(result["deployment_authorized"])
        self.assertEqual(result["database_writes"], 0)

    def test_main_branch_source_is_not_assumed_gh_pages(self):
        self.source.update(source_confirmed=True, status="SOURCE_CONFIRMED",
                           build_type="legacy", branch="main", path="/")
        result = summarize(self.source, self.online)
        self.assertEqual(result["blockers"][0]["code"],
                         "PAGES_SOURCE_NOT_EXPECTED_GH_PAGES_ROOT")

    def test_fresh_feed_and_confirmed_source_ready_only_for_online_feed(self):
        self.source.update(source_confirmed=True, status="SOURCE_CONFIRMED",
                           build_type="legacy", branch="gh-pages", path="/")
        self.online["status"] = "ONLINE_FRESH"
        result = summarize(self.source, self.online)
        self.assertTrue(result["online_price_feed_ready"])
        self.assertFalse(result["scheduled_review_active"])
        self.assertFalse(result["deployment_authorized"])

    def test_invalid_evidence_rejected(self):
        self.online["deployment_authorized"] = True
        with self.assertRaises(ValueError):
            summarize(self.source, self.online)

    def test_registered_ci_emits_blocker_artifact(self):
        workflow = (ROOT / ".github/workflows/test-offline-ledger.yml").read_text(encoding="utf-8")
        self.assertIn("scripts.report_yahoo_test_activation_blockers", workflow)
        self.assertIn("pages-activation-blockers.json", workflow)


if __name__ == "__main__":
    unittest.main()
