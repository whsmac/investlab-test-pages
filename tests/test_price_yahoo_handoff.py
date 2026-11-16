import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from scripts.check_yahoo_test_pages_handoff import assess_handoff, TARGET

SHA="a"*40
def readiness():
    return {"mode":"TEST_YAHOO_BUNDLE_READINESS_ONLY","ready":True,
            "deployed":False,"database_writes":0,"publication_target":TARGET,
            "publication_asset":"data/yahoo-public-review.json",
            "deployment_requires_separate_approval":True}

class HandoffTests(unittest.TestCase):
    def test_wrong_target_rejected(self):
        r=readiness()
        r["publication_target"]="https://example.org/"
        with self.assertRaisesRegex(ValueError,"destination"):
            assess_handoff(r,Path("."),SHA)
    def test_no_deployment_approval_rejected(self):
        r=readiness()
        r["deployment_requires_separate_approval"]=False
        with self.assertRaisesRegex(ValueError,"approval"):
            assess_handoff(r,Path("."),SHA)
    def test_bad_sha_rejected(self):
        with self.assertRaisesRegex(ValueError,"commit SHA"):
            assess_handoff(readiness(),Path("."),"main")
    def test_checksum_mismatch_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            site=Path(tmp)
            (site/"data").mkdir()
            (site/"data/yahoo-public-review.json").write_text("test")
            r=readiness()
            r["json_sha256"]="0"*64
            with self.assertRaisesRegex(ValueError,"checksum"):
                assess_handoff(r,site,SHA)
    def test_success_still_does_not_authorize_deployment(self):
        with tempfile.TemporaryDirectory() as tmp:
            import hashlib
            site=Path(tmp)
            (site/"data").mkdir()
            data=b"test"
            (site/"data/yahoo-public-review.json").write_bytes(data)
            r=readiness()
            r["json_sha256"]=hashlib.sha256(data).hexdigest()
            with patch("scripts.validate_yahoo_test_site_preview.validate_preview",return_value={"checks_passed":True,"json_sha256":r["json_sha256"]}):
                result=assess_handoff(r,site,SHA)
            self.assertTrue(result["handoff_ready"])
            self.assertFalse(result["deployment_authorized"])
            self.assertFalse(result["deployment_performed"])
if __name__=="__main__":
    unittest.main()
