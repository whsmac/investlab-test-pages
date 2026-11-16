import unittest
from scripts.plan_yahoo_test_pages_publication import build_plan
BRANCH_SHA="a"*40
NEW="b"*64
OLD="c"*64
def review():
    return {"mode":"TEST_PAGES_SINGLE_ASSET_REFRESH_REVIEW",
            "review_only":True,"deployment_authorized":False,"deployment_performed":False,
            "database_writes":0,"allowed_change_paths":["data/yahoo-public-review.json"],
            "change_needed":True,"previous_sha256":OLD,"proposed_sha256":NEW}

class PublicationPlanTests(unittest.TestCase):
    def test_plan_is_pinned_and_never_authorizes_deployment(self):
        plan=build_plan(review(),BRANCH_SHA)
        self.assertEqual(plan["target_branch"],"gh-pages")
        self.assertEqual(plan["expected_branch_commit"],BRANCH_SHA)
        self.assertEqual(plan["allowed_change_paths"],["data/yahoo-public-review.json"])
        self.assertFalse(plan["deployment_authorized"])
        self.assertTrue(plan["requires_explicit_deployment_approval"])
    def test_multi_file_plan_blocked(self):
        data=review()
        data["allowed_change_paths"].append("index.html")
        with self.assertRaisesRegex(ValueError,"More than one"):
            build_plan(data,BRANCH_SHA)
    def test_invalid_branch_sha_blocked(self):
        with self.assertRaisesRegex(ValueError,"branch commit"):
            build_plan(review(),"gh-pages")
    def test_inconsistent_change_flag_blocked(self):
        data=review()
        data["change_needed"]=False
        with self.assertRaisesRegex(ValueError,"Change flag"):
            build_plan(data,BRANCH_SHA)
    def test_unchanged_json_yields_noop(self):
        data=review()
        data["previous_sha256"]=NEW
        data["change_needed"]=False
        self.assertFalse(build_plan(data,BRANCH_SHA)["change_needed"])
if __name__=="__main__":
    unittest.main()
