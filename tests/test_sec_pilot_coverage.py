import unittest
from datetime import date
from scripts.sec_pilot_coverage import summarize

TODAY=date(2026,11,24)
CIKS={"MSFT":"0000789019","GOOGL":"0001652044","AMZN":"0001018724","META":"0001326801","TSLA":"0001318605","SPCX":"0001181412"}

def example():
    rows=[]
    for ticker,cik in CIKS.items():
        for year in range(2021,2027):
            for quarter,month,day in [(1,3,31),(2,6,30),(3,9,30),(4,12,31)]:
                if year==2026 and quarter==4:continue
                rows.append({"ticker":ticker,"period_end":f"{year}-{month:02d}-{day:02d}",
                 "fiscal_period":f"{year}-Q{quarter}",
                 "status":"SEC_XBRL_PRELIMINARY",
                 "source_url":f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json",
                 "revenue_usd_bn":20,"capex_usd_bn":2,
                 "operating_income_usd_bn":4,"operating_margin_pct":20})
    return {"format":"INVESTLAB_SEC_QUARTERLY_PREVIEW_V1",
            "source":"SEC Company Facts","database_writes":0,"rows":rows}

class SECFinanceCoverageTests(unittest.TestCase):
    def test_missing_contact_does_not_claim_live_financials(self):
        report=summarize(None,today=TODAY)
        self.assertEqual(report["status"],"missing_contact_or_source")
        self.assertEqual(len(report["missing_issuer_facts"]),6)
        self.assertTrue(all(row["quarters"]==0 and not row["covers_3y"]
                            for row in report["issuers"]))

    def test_3_year_and_5_year_quarters_are_explicit(self):
        report=summarize(example(),today=TODAY)
        self.assertEqual(report["status"],"preliminary")
        self.assertTrue(all(r["covers_3y"] and r["covers_5y"] for r in report["issuers"]))
        self.assertEqual(report["database_writes"],0)
        self.assertIn("SPCX",[r["ticker"] for r in report["issuers"]])

    def test_incomplete_company_is_reported_not_imputed(self):
        data=example()
        data["rows"]=[row for row in data["rows"] if row["ticker"]!="META"]
        report=summarize(data,today=TODAY)
        self.assertEqual(report["status"],"incomplete_preliminary_coverage")
        self.assertIn("META",report["missing_issuer_facts"])

    def test_rejects_unsafe_private_or_fabricated_data(self):
        data=example()
        data["database_writes"]=1
        with self.assertRaisesRegex(ValueError,"Invalid SEC preliminary preview"):
            summarize(data,today=TODAY)
        data=example()
        data["rows"].append(dict(data["rows"][0]))
        with self.assertRaisesRegex(ValueError,"Invalid SEC preliminary row"):
            summarize(data,today=TODAY)
        data=example()
        data["rows"][0]["revenue_usd_bn"]=float("nan")
        with self.assertRaisesRegex(ValueError,"Nonfinite"):
            summarize(data,today=TODAY)

if __name__=="__main__":unittest.main()
