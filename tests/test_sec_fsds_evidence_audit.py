import copy
import hashlib
import tempfile
import unittest
from pathlib import Path
from datetime import date
from scripts.sec_fsds_quarterly_review import build_preview
from scripts.sec_fsds_evidence_audit import audit
from test_sec_fsds_quarterly_review import make_zip,submission,facts,REV,OP,CAP,B,ASOF

class EvidenceAuditTests(unittest.TestCase):
    def setUp(self):
        tmp=tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.dir=Path(tmp.name)
        q1=submission(1,"20260331","20260425","Q1")
        q2=submission(2,"20260630","20260725","Q2")
        self.a=make_zip(self.dir/"2026q2.zip",[q1],[facts(q1,REV,1,20*B),facts(q1,CAP,1,2*B)])
        self.b=make_zip(self.dir/"2026q3.zip",[q2],[facts(q2,REV,1,25*B),facts(q2,CAP,2,5*B),facts(q2,OP,1,-B)])
        self.payload=build_preview([self.a,self.b],ASOF)

    def test_hash_and_exact_coverage(self):
        self.assertEqual(self.payload["archive_manifest"]["2026q2"]["sha256"],hashlib.sha256(self.a.read_bytes()).hexdigest())
        result=audit(self.payload,today=ASOF)
        self.assertFalse(result["publication_allowed"])
        self.assertFalse(result["filing_reconciled"])
        self.assertFalse(result["archive_hashes_verified_against_sec"])
        cov=result["coverage"]["TSLA"]["20"]
        self.assertEqual(cov["revenue_usd_bn"]["available"],2)
        self.assertEqual(cov["operating_income_usd_bn"]["available"],1)
        self.assertIn("2026-09-30",cov["capex_usd_bn"]["missing"])
        self.assertNotIn("2026-12-31",cov["capex_usd_bn"]["missing"])
        self.assertEqual(len(result["coverage"]["SPCX"]["12"]["revenue_usd_bn"]["missing"]),12)

    def test_tampered_amount_and_margin_rejected(self):
        for field in ("revenue_usd_bn","capex_usd_bn","operating_margin_pct"):
            p=copy.deepcopy(self.payload)
            p["rows"][-1][field]+=1
            with self.assertRaises(ValueError):
                audit(p,today=ASOF)

    def test_wrong_source_and_duration_rejected(self):
        for field,value in [("filing_url","https://example.org/"),("qtrs",4),("archive_url","https://example.org/2026q3.zip"),("value_usd","NaN")]:
            p=copy.deepcopy(self.payload)
            p["rows"][-1]["provenance"]["capex_usd_bn"]["facts"][0][field]=value
            with self.assertRaises(ValueError):
                audit(p,today=ASOF)

    def test_duplicate_rows_rejected(self):
        p=copy.deepcopy(self.payload)
        p["rows"].append(p["rows"][0])
        with self.assertRaises(ValueError):
            audit(p,today=ASOF)

    def test_manifest_required(self):
        p=copy.deepcopy(self.payload)
        p["archive_manifest"].pop("2026q3")
        with self.assertRaises(ValueError):
            audit(p,today=ASOF)

if __name__=="__main__":
    unittest.main()
