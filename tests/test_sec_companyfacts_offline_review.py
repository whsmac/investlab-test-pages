import copy
import json
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch
from scripts.sec_companyfacts_offline_review import collect,build,compare

ASOF=date(2025,11,24)
REV="RevenueFromContractWithCustomerExcludingAssessedTax"
OP="OperatingIncomeLoss"
CAP="PaymentsToAcquirePropertyPlantAndEquipment"
B=10**9

def fact(start,end,val,filed="2025-07-25",n=1):
    return {"start":start,"end":end,"val":val,"filed":filed,"form":"10-Q","accn":f"0001318605-25-{n:06d}"}

def payload(cik=1318605):
    return {"cik":cik,"facts":{"us-gaap":{
        REV:{"units":{"USD":[fact("2025-01-01","2025-03-31",20*B,"2025-04-25"),fact("2025-04-01","2025-06-30",25*B)]}},
        OP:{"units":{"USD":[fact("2025-04-01","2025-06-30",-B)]}},
        CAP:{"units":{"USD":[fact("2025-01-01","2025-03-31",2*B,"2025-04-25"),fact("2025-01-01","2025-06-30",5*B)]}}
    }}}

class OfflineFactsTests(unittest.TestCase):
    def test_same_start_delta_and_margin(self):
        t,rows=collect(payload(),ASOF)
        self.assertEqual(t,"TSLA")
        self.assertEqual((rows[-1]["revenue_usd_bn"],rows[-1]["capex_usd_bn"],rows[-1]["operating_margin_pct"]),(25,3,-4))
        self.assertEqual(rows[-1]["provenance"]["capex_usd_bn"]["mode"],"same_start_ytd_delta_unreconciled")

    def test_conflicts_not_filled(self):
        p=payload()
        p["facts"]["us-gaap"][CAP]["units"]["USD"] += [
            fact("2025-04-01","2025-06-30",3*B),fact("2025-04-01","2025-06-30",4*B)]
        self.assertIsNone(collect(p,ASOF)[1][-1]["capex_usd_bn"])

    def test_wrong_start_or_future_filing_not_used(self):
        p=payload()
        p["facts"]["us-gaap"][CAP]["units"]["USD"]=[
            fact("2025-01-02","2025-06-30",5*B),
            fact("2025-01-01","2025-03-31",2*B,"2025-04-25"),
            fact("2025-04-01","2025-06-30",3*B,"2025-12-01")]
        self.assertIsNone(collect(p,ASOF)[1][-1]["capex_usd_bn"])

    def test_msft_fiscal_period(self):
        p=payload(789019)
        self.assertEqual(collect(p,ASOF)[1][-1]["fiscal_period"],"2025-Q4")

    def test_unknown_cik_rejected(self):
        with self.assertRaises(ValueError):
            collect(payload(42),ASOF)

    def test_coverage_manifest_and_duplicate(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/"facts.json"
            path.write_text(json.dumps(payload()))
            result=build([path],ASOF)
            self.assertFalse(result["publication_allowed"])
            self.assertEqual(result["coverage"]["TSLA"]["20"]["revenue_usd_bn"]["available"],2)
            self.assertEqual(result["coverage"]["SPCX"]["12"]["revenue_usd_bn"]["available"],0)
            self.assertEqual(len(result["input_manifest"]["TSLA"]["sha256"]),64)
            with self.assertRaises(ValueError):
                build([path,path],ASOF)

    def test_crosscheck_statuses(self):
        rows=collect(payload(),ASOF)[1]
        baseline={"rows":[copy.deepcopy(rows[-1])]}
        baseline["rows"][0]["capex_usd_bn"]=4
        baseline["rows"][0]["operating_income_usd_bn"]=None
        with patch("scripts.sec_companyfacts_offline_review.audit") as gate:
            result=compare(rows,baseline)
            gate.assert_called_once_with(baseline)
        self.assertEqual([r["status"] for r in result],["match","missing","different_requires_filing_review"])

if __name__=="__main__":
    unittest.main()
