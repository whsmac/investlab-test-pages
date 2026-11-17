import unittest
from scripts.report_yahoo_online_readiness import summarize_online_readiness


def branch_audit(present=False):
    return {
        "mode": "TEST_PAGES_BRANCH_READ_ONLY_AUDIT",
        "branches": {name: {"exists": True, "asset_present": present} for name in
                     ("main", "gh-pages", "feature/test-navigation-20261112")},
        "pages_source_confirmed": False,
        "database_writes": 0, "deployment_performed": False,
    }


def live_check(reachable=False, fresh=False):
    return {"mode": "TEST_PAGES_LIVE_READ_ONLY_CHECK",
            "reachable": reachable, "fresh": fresh,
            "database_writes": 0, "deployment_performed": False}


class OnlineReadinessTests(unittest.TestCase):
    def test_missing_online_asset_is_not_ready(self):
        result = summarize_online_readiness(branch_audit(), live_check())
        self.assertEqual(result["status"], "NOT_ONLINE")
        self.assertFalse(result["online_ready"])
        self.assertFalse(result["deployment_authorized"])

    def test_branch_asset_does_not_prove_live_publication(self):
        result = summarize_online_readiness(branch_audit(True), live_check())
        self.assertFalse(result["online_ready"])

    def test_stale_live_asset_is_not_ready(self):
        result = summarize_online_readiness(branch_audit(), live_check(True, False))
        self.assertEqual(result["status"], "ONLINE_STALE")
        self.assertFalse(result["online_ready"])

    def test_fresh_live_asset_is_ready_for_read_only_browser_check(self):
        result = summarize_online_readiness(branch_audit(), live_check(True, True))
        self.assertEqual(result["status"], "ONLINE_FRESH")
        self.assertEqual(result["next_action"], "VERIFY_BROWSER_READ_ONLY")
        self.assertFalse(result["deployment_performed"])

    def test_unsafe_report_rejected(self):
        report = live_check()
        report["database_writes"] = 1
        with self.assertRaisesRegex(ValueError, "Unsafe"):
            summarize_online_readiness(branch_audit(), report)

    def test_incomplete_branch_report_rejected(self):
        report = branch_audit()
        del report["branches"]["gh-pages"]
        with self.assertRaisesRegex(ValueError, "Incomplete"):
            summarize_online_readiness(report, live_check())


if __name__ == "__main__":
    unittest.main()
