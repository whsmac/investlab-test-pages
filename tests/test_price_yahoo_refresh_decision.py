import unittest
from scripts.summarize_yahoo_test_refresh_decision import summarize
SHA="a"*40
OLD="b"*64
NEW="c"*64
def pair(needed=True):
    old=OLD if needed else NEW
    plan={"mode":"TEST_PAGES_PUBLICATION_PLAN_ONLY","deployment_authorized":False,
          "deployment_performed":False,"database_writes":0,
          "allowed_change_paths":["data/yahoo-public-review.json"],
          "expected_branch_commit":SHA,"previous_sha256":old,
          "proposed_sha256":NEW,"change_needed":needed,"publication_needed":needed}
    checked={"mode":"TEST_PAGES_PREWRITE_VERIFICATION_ONLY","verified":True,
             "deployment_authorized":False,"deployment_performed":False,"database_writes":0,
             "allowed_change_paths":["data/yahoo-public-review.json"],
             "branch_sha":SHA,"old_sha256":old,"new_sha256":NEW,
             "change_needed":needed,"publication_needed":needed}
    return plan,checked
class DecisionTests(unittest.TestCase):
    def test_unchanged_observations_are_noop(self):
        plan,checked=pair(False)
        result=summarize(plan,checked)
        self.assertEqual(result["status"],"NO_OBSERVATION_CHANGE")
        self.assertFalse(result["publication_needed"])
    def test_changed_observations_require_approval(self):
        plan,checked=pair(True)
        result=summarize(plan,checked)
        self.assertEqual(result["status"],"AWAITING_SEPARATE_APPROVAL")
        self.assertFalse(result["deployment_authorized"])
    def test_branch_mismatch_rejected(self):
        plan,checked=pair()
        checked["branch_sha"]="d"*40
        with self.assertRaisesRegex(ValueError,"do not match"):
            summarize(plan,checked)
    def test_hash_mismatch_rejected(self):
        plan,checked=pair()
        checked["new_sha256"]="d"*64
        with self.assertRaisesRegex(ValueError,"do not match"):
            summarize(plan,checked)
    def test_metadata_only_change_needs_no_publication(self):
        plan,checked=pair(True)
        plan["publication_needed"]=False
        checked["publication_needed"]=False
        result=summarize(plan,checked)
        self.assertFalse(result["publication_needed"])
        self.assertEqual(result["status"],"NO_OBSERVATION_CHANGE")

    def test_mismatched_change_flag_rejected(self):
        plan,checked=pair(True)
        checked["change_needed"]=False
        with self.assertRaisesRegex(ValueError,"Change-needed"):
            summarize(plan,checked)

    def test_false_change_flag_with_different_hashes_rejected(self):
        plan,checked=pair(True)
        plan["change_needed"]=False
        checked["change_needed"]=False
        with self.assertRaisesRegex(ValueError,"Change-needed"):
            summarize(plan,checked)

    def test_unsafe_deployment_rejected(self):
        plan,checked=pair()
        checked["deployment_performed"]=True
        with self.assertRaisesRegex(ValueError,"Unsafe"):
            summarize(plan,checked)
    def test_inconsistent_decision_rejected(self):
        plan,checked=pair()
        checked["publication_needed"]=False
        with self.assertRaisesRegex(ValueError,"mismatch"):
            summarize(plan,checked)
if __name__=="__main__":
    unittest.main()
