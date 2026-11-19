import unittest
from scripts.report_yahoo_first_publication_gate import assess_first_publication, TARGET


def evidence():
    source = {"mode": "TEST_PAGES_SOURCE_READ_ONLY_AUDIT", "source_confirmed": True,
              "build_type": "legacy", "branch": "gh-pages", "path": "/",
              "deployment_performed": False, "database_writes": 0}
    handoff = {"mode": "TEST_PAGES_HANDOFF_ONLY", "handoff_ready": True,
               "reviewed_commit_sha": "a"*40, "json_sha256": "b"*64,
               "publication_target": TARGET, "deployment_authorized": False,
               "deployment_performed": False, "database_writes": 0}
    online = {"mode": "TEST_YAHOO_ONLINE_READINESS_ONLY", "status": "NOT_PUBLISHED",
              "pages_source_confirmed": True, "pages_source_branch": "gh-pages",
              "deployment_authorized": False, "deployment_performed": False,
              "database_writes": 0}
    return source, handoff, online


class FirstPublicationGateTests(unittest.TestCase):
    def test_review_ready_never_authorizes_deploy(self):
        result = assess_first_publication(*evidence())
        self.assertTrue(result["review_ready"])
        self.assertFalse(result["deployment_authorized"])
        self.assertFalse(result["deployment_performed"])

    def test_source_unconfirmed_blocks_review(self):
        source, handoff, online = evidence()
        source["source_confirmed"] = False
        self.assertFalse(assess_first_publication(source, handoff, online)["review_ready"])

    def test_wrong_pages_folder_blocks_review(self):
        source, handoff, online = evidence()
        source["path"] = "/docs"
        self.assertFalse(assess_first_publication(source, handoff, online)["review_ready"])

    def test_stale_online_state_blocks_first_publication(self):
        source, handoff, online = evidence()
        online["status"] = "ONLINE_STALE"
        self.assertFalse(assess_first_publication(source, handoff, online)["review_ready"])

    def test_missing_handoff_blocks_review(self):
        source, handoff, online = evidence()
        handoff["handoff_ready"] = False
        self.assertFalse(assess_first_publication(source, handoff, online)["review_ready"])

    def test_unsafe_evidence_rejected(self):
        source, handoff, online = evidence()
        handoff["database_writes"] = 1
        with self.assertRaisesRegex(ValueError, "Invalid handoff"):
            assess_first_publication(source, handoff, online)


if __name__ == "__main__":
    unittest.main()
