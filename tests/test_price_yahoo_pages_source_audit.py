import io
import unittest
import urllib.error
from scripts.audit_yahoo_test_pages_source import assess_pages_source, URL, EXPECTED_URL


class PagesSourceAuditTests(unittest.TestCase):
    def test_legacy_branch_source_can_be_confirmed(self):
        result = assess_pages_source(lambda url: {"html_url": EXPECTED_URL,
            "build_type": "legacy", "source": {"branch": "gh-pages", "path": "/"}})
        self.assertTrue(result["source_confirmed"])
        self.assertEqual(result["branch"], "gh-pages")
        self.assertFalse(result["deployment_performed"])

    def test_workflow_build_does_not_infer_branch_source(self):
        result = assess_pages_source(lambda url: {"html_url": EXPECTED_URL,
            "build_type": "workflow", "source": {"branch": "gh-pages", "path": "/"}})
        self.assertFalse(result["source_confirmed"])

    def test_api_forbidden_does_not_claim_source(self):
        def denied(url):
            raise urllib.error.HTTPError(URL, 403, "Forbidden", {}, io.BytesIO())
        result = assess_pages_source(denied)
        self.assertEqual(result["status"], "API_ACCESS_UNAVAILABLE")
        self.assertFalse(result["source_confirmed"])

    def test_unexpected_pages_url_rejected(self):
        with self.assertRaises(ValueError):
            assess_pages_source(lambda url: {"html_url": "https://example.com/",
                "build_type": "legacy", "source": {"branch": "gh-pages", "path": "/"}})


if __name__ == "__main__":
    unittest.main()
