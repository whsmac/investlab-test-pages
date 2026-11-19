import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from scripts.backup_yahoo_test_pages_asset import make_backup
SHA="a"*40
def plan(previous):
    return {"mode":"TEST_PAGES_PUBLICATION_PLAN_ONLY","deployment_authorized":False,
            "deployment_performed":False,"database_writes":0,
            "allowed_change_paths":["data/yahoo-public-review.json"],
            "expected_branch_commit":SHA,"previous_sha256":previous,
            "proposed_sha256":"b"*64}
class BackupTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.site=self.root/"site"
        (self.site/"data").mkdir(parents=True)
        self.target=self.site/"data/yahoo-public-review.json"
        self.output=self.root/"backup"
    def test_existing_asset_saved_without_modifying_site(self):
        data=b'{"old":"price"}'
        self.target.write_bytes(data)
        result=make_backup(plan(hashlib.sha256(data).hexdigest()),self.site,self.output)
        self.assertTrue(result["previous_asset_existed"])
        self.assertEqual((self.output/"previous-yahoo-public-review.json").read_bytes(),data)
        self.assertEqual(self.target.read_bytes(),data)
        self.assertFalse(result["deployment_performed"])
    def test_missing_asset_records_remove_on_rollback(self):
        result=make_backup(plan(None),self.site,self.output)
        self.assertFalse(result["previous_asset_existed"])
        self.assertIsNone(result["backup_filename"])
        self.assertFalse((self.output/"previous-yahoo-public-review.json").exists())
    def test_changed_asset_blocks_backup(self):
        self.target.write_bytes(b"unexpected")
        with self.assertRaisesRegex(ValueError,"checksum"):
            make_backup(plan(hashlib.sha256(b"old").hexdigest()),self.site,self.output)
    def test_reject_unauthorized_plan(self):
        p=plan(None)
        p["deployment_authorized"]=True
        with self.assertRaisesRegex(ValueError,"Unsafe"):
            make_backup(p,self.site,self.output)
    def test_manifest_contains_restoration_instructions(self):
        result=make_backup(plan(None),self.site,self.output)
        stored=json.loads((self.output/"rollback-manifest.json").read_text())
        self.assertEqual(stored["restore_action"],result["restore_action"])
        self.assertEqual(stored["target_path"],"data/yahoo-public-review.json")
if __name__=="__main__":
    unittest.main()
