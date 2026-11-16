import json
import tempfile
import unittest
from pathlib import Path
from scripts.report_yahoo_test_bundle_readiness import assess_bundle

class BundleReadinessTests(unittest.TestCase):
    def test_missing_bundle_is_explicitly_not_ready(self):
        with tempfile.TemporaryDirectory() as directory:
            result=assess_bundle(Path(directory)/"missing")
            self.assertFalse(result["ready"])
            self.assertFalse(result["deployed"])
            self.assertEqual(result["database_writes"],0)

    def test_incomplete_bundle_is_not_ready(self):
        with tempfile.TemporaryDirectory() as directory:
            result=assess_bundle(Path(directory))
            self.assertFalse(result["ready"])
            self.assertIn("Missing",result["reason"])
            self.assertEqual(result["mode"],"TEST_YAHOO_BUNDLE_READINESS_ONLY")

if __name__=="__main__":
    unittest.main()
