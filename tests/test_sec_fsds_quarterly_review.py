import csv
import io
import tempfile
import unittest
import zipfile
from datetime import date
from pathlib import Path
from unittest.mock import patch
from scripts.sec_fsds_quarterly_review import build_preview, zip_url, download_one

SUB = ["adsh","cik","form","period","filed","fy","fp"]
PRE = ["adsh","tag","version","stmt","inpth","plabel"]
NUM = ["adsh","tag","version","ddate","qtrs","uom","coreg","segments","value"]
REV = "RevenueFromContractWithCustomerExcludingAssessedTax"
OP = "OperatingIncomeLoss"
CAP = "PaymentsToAcquirePropertyPlantAndEquipment"
ASOF = date(2026,11,24)
B = 1_000_000_000

def submission(n,period,filed,fp,fy=2026,cik=1318605):
    return [f"{cik:010d}-26-{n:06d}",str(cik),"10-K" if fp=="FY" else "10-Q",period,filed,str(fy),fp]

def facts(sub,tag,qtrs,value,**changes):
    row = dict(zip(NUM,[sub[0],tag,"us-gaap/2026",sub[3],str(qtrs),"USD","","",str(value)]))
    row.update(changes)
    return [row[k] for k in NUM]

def make_zip(path,subs,nums,omit_segments=False,productive_label="Purchases of property and equipment"):
    pre = sorted({(r[0],r[1],r[2],"CF" if r[1] in (CAP,"PaymentsToAcquireProductiveAssets") else "IS","0",productive_label if r[1]=="PaymentsToAcquireProductiveAssets" else "") for r in nums})
    with zipfile.ZipFile(path,"w") as z:
        for name,header,rows in [("sub.txt",SUB,subs),("pre.txt",PRE,pre),("num.txt",NUM,nums)]:
            if omit_segments and name=="num.txt":
                header=[x for x in header if x!="segments"]
                rows=[r[:7]+r[8:] for r in rows]
            out=io.StringIO()
            w=csv.writer(out,delimiter="\t",lineterminator="\n")
            w.writerow(header)
            w.writerows(rows)
            z.writestr(name,out.getvalue())
    return path

class TestFSDS(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.dir=Path(self.tmp.name)

    def test_consolidated_direct_and_ytd_delta(self):
        q1=submission(1,"20260331","20260425","Q1")
        q2=submission(2,"20260630","20260725","Q2")
        a=make_zip(self.dir/"2026q2.zip",[q1],[facts(q1,REV,1,20*B),facts(q1,CAP,1,2*B)])
        b=make_zip(self.dir/"2026q3.zip",[q2],[
            facts(q2,REV,1,25*B),facts(q2,REV,2,45*B),
            facts(q2,OP,1,-B),facts(q2,CAP,2,5*B),
            facts(q2,CAP,2,9*B,segments="RegionAxis:US"),
            facts(q2,CAP,2,8*B,coreg="Other"),
            facts(q2,CAP,2,7*B,uom="EUR")])
        result=build_preview([a,b],ASOF)
        r=result["rows"][1]
        self.assertEqual((r["revenue_usd_bn"],r["capex_usd_bn"],r["operating_income_usd_bn"],r["operating_margin_pct"]),(25,3,-1,-4))
        self.assertEqual(r["provenance"]["capex_usd_bn"]["mode"],"ytd_delta_unreconciled")
        self.assertEqual(len(r["provenance"]["capex_usd_bn"]["facts"]),2)
        self.assertEqual(result["database_writes"],0)
        self.assertEqual(result["coverage"]["SPCX"]["revenue_usd_bn"],0)
        self.assertEqual(r["status"],"SEC_FSDS_REVIEW_ONLY")
        self.assertEqual(r["period_end"],"2026-06-30")

    def test_msft_fiscal_year_and_annual_delta(self):
        q3=submission(3,"20260331","20260425","Q3",cik=789019)
        annual=submission(4,"20260630","20260725","FY",cik=789019)
        a=make_zip(self.dir/"2026q2.zip",[q3],[facts(q3,REV,1,20*B),facts(q3,REV,3,60*B),facts(q3,CAP,3,12*B)])
        b=make_zip(self.dir/"2026q3.zip",[annual],[facts(annual,REV,4,90*B),facts(annual,CAP,4,18*B)])
        r=build_preview([a,b],ASOF)["rows"][-1]
        self.assertEqual((r["ticker"],r["fiscal_period"],r["revenue_usd_bn"],r["capex_usd_bn"]),("MSFT","2026-Q4",30,6))

    def test_conflicting_direct_not_replaced_with_delta(self):
        q1=submission(1,"20260331","20260425","Q1")
        q2=submission(2,"20260630","20260725","Q2")
        a=make_zip(self.dir/"2026q2.zip",[q1],[facts(q1,REV,1,20*B),facts(q1,CAP,1,B)])
        b=make_zip(self.dir/"2026q3.zip",[q2],[
            facts(q2,REV,1,25*B),facts(q2,CAP,1,B),facts(q2,CAP,1,2*B),facts(q2,CAP,2,4*B)])
        self.assertIsNone(build_preview([a,b],ASOF)["rows"][-1]["capex_usd_bn"])

    def test_missing_prior_and_non_gaap_are_not_invented(self):
        q2=submission(2,"20260630","20260725","Q2")
        p=make_zip(self.dir/"2026q3.zip",[q2],[
            facts(q2,REV,1,25*B),facts(q2,CAP,2,4*B),
            facts(q2,OP,1,3*B,version=q2[0])])
        r=build_preview([p],ASOF)["rows"][0]
        self.assertIsNone(r["capex_usd_bn"])
        self.assertIsNone(r["operating_margin_pct"])

    def test_schema_missing_segments_fails_closed(self):
        q2=submission(2,"20260630","20260725","Q2")
        p=make_zip(self.dir/"2026q3.zip",[q2],[facts(q2,REV,1,25*B)],omit_segments=True)
        with self.assertRaisesRegex(ValueError,"schema"):
            build_preview([p],ASOF)

    def test_unrelated_issuer_and_future_filings_ignored(self):
        q=submission(2,"20260930","20261130","Q3")
        other=submission(3,"20260630","20260725","Q2",cik=42)
        p=make_zip(self.dir/"2026q3.zip",[q,other],[facts(q,REV,1,25*B),facts(other,REV,1,99*B)])
        self.assertEqual(build_preview([p],ASOF)["rows"],[])

    def test_observed_amazon_productive_assets_requires_exact_primary_label(self):
        tag="PaymentsToAcquireProductiveAssets"
        amzn=submission(1,"20260630","20260731","Q2",cik=1018724)
        p=make_zip(self.dir/"2026q3.zip",[amzn],[facts(amzn,REV,1,200*B),facts(amzn,tag,1,54*B)])
        self.assertEqual(build_preview([p],ASOF)["rows"][0]["capex_usd_bn"],54)
        p=make_zip(p,[amzn],[facts(amzn,REV,1,200*B),facts(amzn,tag,1,54*B)],productive_label="Other productive assets")
        self.assertIsNone(build_preview([p],ASOF)["rows"][0]["capex_usd_bn"])
        other=submission(2,"20260630","20260731","Q2",cik=1318605)
        p=make_zip(p,[other],[facts(other,REV,1,20*B),facts(other,tag,1,3*B)])
        self.assertIsNone(build_preview([p],ASOF)["rows"][0]["capex_usd_bn"])

    def test_download_rejects_bad_quarter_or_missing_contact(self):
        with self.assertRaises(ValueError):
            zip_url("../../bad")
        with patch.dict("os.environ",{"INVESTLAB_SEC_USER_AGENT":""}):
            with self.assertRaisesRegex(ValueError,"CONTACT_INVALID"):
                download_one("2026q3",self.dir)

if __name__=="__main__":
    unittest.main()
