import hashlib
import tempfile
import unittest
from pathlib import Path
from scripts.verify_yahoo_test_pages_prewrite import verify_prewrite

SHA="a"*40
def plan(old,new,change=True):
    return {"mode":"TEST_PAGES_PUBLICATION_PLAN_ONLY","repository":"whsmac/investlab-test-pages",
            "target_branch":"gh-pages","allowed_change_paths":["data/yahoo-public-review.json"],
            "expected_branch_commit":SHA,"previous_sha256":old,"proposed_sha256":new,
            "change_needed":change,"requires_explicit_deployment_approval":True,
            "deployment_authorized":False,"deployment_performed":False,"database_writes":0}

class PrewriteTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.site=Path(self.tmp.name)/"site"
        (self.site/"data").mkdir(parents=True)
        self.old=self.site/"data/yahoo-public-review.json"
        self.old.write_bytes(b"old")
        self.new=Path(self.tmp.name)/"new.json"
        self.new.write_bytes(b"new")
        self.plan=plan(hashlib.sha256(b"old").hexdigest(),hashlib.sha256(b"new").hexdigest())
    def test_verified_but_never_authorizes_write(self):
        result=verify_prewrite(self.plan,SHA,self.site,self.new)
        self.assertTrue(result["verified"])
        self.assertFalse(result["deployment_authorized"])
        self.assertEqual(self.old.read_bytes(),b"old")
    def test_moved_branch_rejected(self):
        with self.assertRaisesRegex(ValueError,"Branch moved"):
            verify_prewrite(self.plan,"b"*40,self.site,self.new)
    def test_changed_existing_json_rejected(self):
        self.old.write_bytes(b"changed")
        with self.assertRaisesRegex(ValueError,"Existing Yahoo"):
            verify_prewrite(self.plan,SHA,self.site,self.new)
    def test_changed_proposed_json_rejected(self):
        self.new.write_bytes(b"changed")
        with self.assertRaisesRegex(ValueError,"Proposed Yahoo"):
            verify_prewrite(self.plan,SHA,self.site,self.new)
    def test_unauthorized_deployment_flag_rejected(self):
        self.plan["deployment_authorized"]=True
        with self.assertRaisesRegex(ValueError,"Unsafe"):
            verify_prewrite(self.plan,SHA,self.site,self.new)
    def test_nonboolean_change_flag_rejected(self):
        self.plan["change_needed"]=1
        with self.assertRaisesRegex(ValueError,"Change-needed"):
            verify_prewrite(self.plan,SHA,self.site,self.new)

    def test_metadata_only_change_does_not_request_publication(self):
        self.plan["publication_needed"]=False
        result=verify_prewrite(self.plan,SHA,self.site,self.new)
        self.assertTrue(result["change_needed"])
        self.assertFalse(result["publication_needed"])
        self.assertEqual(self.old.read_bytes(),b"old")

    def test_noop_when_files_identical(self):
        self.new.write_bytes(b"old")
        same=hashlib.sha256(b"old").hexdigest()
        result=verify_prewrite(plan(same,same,False),SHA,self.site,self.new)
        self.assertFalse(result["change_needed"])
if __name__=="__main__":
    unittest.main()
