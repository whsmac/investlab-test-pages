"""Keep live Pages evidence separate from offline ledger test execution."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class LiveAuditCIContract(unittest.TestCase):
    def test_existing_ci_has_independent_nonblocking_live_audit(self):
        workflow = (ROOT / ".github/workflows/test-offline-ledger.yml").read_text(encoding="utf-8")
        self.assertIn("yahoo-pages-live-source-audit:", workflow)
        self.assertIn("continue-on-error: true", workflow)
        self.assertIn("python -m scripts.audit_yahoo_test_pages_source", workflow)
        self.assertIn("python -m scripts.verify_yahoo_test_pages_live", workflow)
        self.assertIn("investlab-test-pages-live-source-evidence", workflow)
        self.assertIn("persist-credentials: false", workflow)


if __name__ == "__main__":
    unittest.main()
