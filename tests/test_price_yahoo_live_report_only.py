"""Diagnostic mode must not silently relax the default strict live verifier."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class LiveReportOnlyTests(unittest.TestCase):
    def test_strict_mode_preserved_and_report_only_explicit(self):
        source = (ROOT / "scripts/verify_yahoo_test_pages_live.py").read_text(encoding="utf-8")
        self.assertIn('parser.add_argument("--report-only", action="store_true"', source)
        self.assertIn("and not args.report_only:", source)

    def test_audit_workflows_request_report_only(self):
        for name in ("test-offline-ledger.yml", "test-yahoo-pages-source-live-audit.yml",
                     "test-yahoo-pages-manual.yml"):
            source = (ROOT / ".github/workflows" / name).read_text(encoding="utf-8")
            self.assertIn("scripts.verify_yahoo_test_pages_live --report-only --output", source)


if __name__ == "__main__":
    unittest.main()
