import json
import plistlib
import tempfile
import unittest
from pathlib import Path
from datetime import date
from scripts.sec_companyfacts_offline_review import collect,load_json

REV="RevenueFromContractWithCustomerExcludingAssessedTax"
CAP="PaymentsToAcquireProductiveAssets"
ASOF=date(2026,11,24)
def fact(start,end,value,filed,acc="0001318605-26-000001"):
    return {"start":start,"end":end,"val":value,"filed":filed,"form":"10-Q","accn":acc}
def payload(cik,tags):
    return {"cik":cik,"facts":{"us-gaap":{k:{"units":{"USD":v}} for k,v in tags.items()}}}

class WebarchiveTest(unittest.TestCase):
    def test_safari_html_wrapper_and_cik(self):
        p=payload(1318605,{})
        with tempfile.TemporaryDirectory() as tmp:
            f=Path(tmp)/"TSLA.webarchive"
            r={"WebMainResource":{"WebResourceURL":"https://data.sec.gov/api/xbrl/companyfacts/CIK0001318605.json?x=1",
              "WebResourceMIMEType":"application/json","WebResourceData":("<html><body><pre>"+json.dumps(p)+"</pre></body></html>").encode()}}
            f.write_bytes(plistlib.dumps(r,fmt=plistlib.FMT_BINARY))
            self.assertEqual(load_json(f)[0],p)
            r["WebMainResource"]["WebResourceURL"]="https://data.sec.gov/api/xbrl/companyfacts/CIK0000789019.json"
            f.write_bytes(plistlib.dumps(r))
            with self.assertRaises(ValueError):load_json(f)
    def test_same_accession_equal_alias_and_conflicting_alias(self):
        a=fact("2026-07-01","2026-09-30",28000000000,"2026-10-22")
        p=payload(1318605,{REV:[a],"Revenues":[dict(a)]})
        row=collect(p,ASOF)[1][-1]
        self.assertEqual(row["revenue_usd_bn"],28)
        self.assertEqual(len(row["provenance"]["revenue_usd_bn"]["facts"][0]["equal_value_tags"]),2)
        p["facts"]["us-gaap"]["Revenues"]["units"]["USD"][0]["val"]=29000000000
        self.assertEqual(collect(p,ASOF)[1],[])
    def test_prior_comparative_after_current_filing_does_not_block_delta(self):
        p=payload(1318605,{REV:[
            fact("2025-01-01","2025-09-30",70000000000,"2025-10-23"),
            fact("2025-01-01","2025-12-31",95000000000,"2026-01-29"),
            fact("2025-01-01","2025-09-30",71000000000,"2026-10-22")]})
        self.assertEqual(collect(p,ASOF)[1][-1]["revenue_usd_bn"],25)
    def test_amazon_candidate_requires_opt_in_and_keeps_warning(self):
        a=fact("2026-04-01","2026-06-30",200000000000,"2026-07-31")
        c=dict(a,val=54000000000)
        p=payload(1018724,{REV:[a],CAP:[c]})
        self.assertIsNone(collect(p,ASOF)[1][-1]["capex_usd_bn"])
        row=collect(p,ASOF,amazon_candidate=True)[1][-1]
        self.assertEqual(row["capex_usd_bn"],54)
        self.assertIn("not_period_reconciled",row["provenance"]["capex_usd_bn"]["definition_status"])
        p["cik"]=1318605
        self.assertIsNone(collect(p,ASOF,amazon_candidate=True)[1][-1]["capex_usd_bn"])

if __name__=="__main__":unittest.main()
