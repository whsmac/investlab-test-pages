import copy
import json
import unittest
from pathlib import Path
from scripts.sec_official_reference_review import compare,FIELDS
REFERENCE=json.loads((Path(__file__).parent/"fixtures/sec_q2_2026_official_reference_review.json").read_text())

def sample():
    return {"format":"INVESTLAB_SEC_FSDS_REVIEW_V1","database_writes":0,"rows":[
        {"ticker":r["ticker"],"period_end":REFERENCE["period_end"],
         **{field:(r[metric]/1000 if r[metric] is not None else None) for metric,field in FIELDS.items()}}
        for r in REFERENCE["rows"]]}

class OfficialReferenceTest(unittest.TestCase):
    def test_matches_review_only(self):
        result=compare(sample(),REFERENCE)
        self.assertEqual(result["matches"],17)
        self.assertEqual(result["not_reference_verified"],1)
        self.assertFalse(result["publication_allowed"])
        self.assertEqual(result["database_writes"],0)
    def test_mismatch_and_missing(self):
        p=sample()
        p["rows"][0]["revenue_usd_bn"]+=1
        p["rows"][1]["capex_usd_bn"]=None
        result=compare(p,REFERENCE)
        self.assertEqual((result["mismatches"],result["missing"]),(1,1))
    def test_wrong_period_cannot_match(self):
        p=sample()
        for r in p["rows"]:r["period_end"]="2026-03-31"
        self.assertEqual(compare(p,REFERENCE)["matches"],0)
    def test_duplicate_and_incomplete_reference_rejected(self):
        p=sample()
        p["rows"].append(p["rows"][0])
        with self.assertRaises(ValueError):compare(p,REFERENCE)
        r=copy.deepcopy(REFERENCE)
        r["rows"].pop()
        with self.assertRaises(ValueError):compare(sample(),r)

if __name__=="__main__":unittest.main()
