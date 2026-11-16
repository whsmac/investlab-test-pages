import unittest
import urllib.error
from scripts.audit_yahoo_test_pages_branch import audit, API, EXPECTED, fetch_json

class BranchAuditTests(unittest.TestCase):
    def test_missing_public_asset_is_reported_without_claiming_pages_source(self):
        def fake(url):
            if url == API:
                return {"full_name":"whsmac/investlab-test-pages","default_branch":"main"}
            if "/branches?" in url:
                return [{"name":"main"},{"name":"gh-pages"},{"name":"feature/test-navigation-20261112"}]
            if "ref=gh-pages" in url:
                raise urllib.error.HTTPError(url,404,"Not Found",None,None)
            return {"type":"file","path":EXPECTED}
        report=audit(fake)
        self.assertFalse(report["branches"]["gh-pages"]["asset_present"])
        self.assertTrue(report["branches"]["main"]["asset_present"])
        self.assertFalse(report["pages_source_confirmed"])
        self.assertFalse(report["deployment_performed"])
    def test_unexpected_repository_rejected(self):
        with self.assertRaisesRegex(ValueError,"Unexpected repository"):
            audit(lambda url: {"full_name":"another/repo"})
    def test_unapproved_api_url_rejected(self):
        with self.assertRaisesRegex(ValueError,"Unapproved"):
            fetch_json("https://example.com")
if __name__=="__main__":
    unittest.main()
