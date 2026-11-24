"""Offline SEC Company Facts extraction contract: never opens an internet connection."""
import contextlib
import io
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import sec_quarterly_financials_test as sec

def fact(start, end, value, fp="Q1", form="10-Q", accn="000000-26-000001", filed="2026-08-01"):
    return {"start": start, "end": end, "val": value, "fp": fp,
            "fy": 2026, "form": form, "accn": accn, "filed": filed}

def sample_facts(cik="0001318605"):
    return {"cik": int(cik), "facts": {"us-gaap": {
      "RevenueFromContractWithCustomerExcludingAssessedTax": {
        "units": {"USD": [
          fact("2025-01-01","2025-03-31",20000000000),
          fact("2025-04-01","2025-06-30",25000000000,"Q2"),
          fact("2025-10-01","2025-12-31",32000000000,"FY","10-K"),
        ]}},
      "OperatingIncomeLoss": {"units": {"USD": [
          fact("2025-01-01","2025-03-31",3000000000),
          fact("2025-04-01","2025-06-30",5000000000,"Q2"),
          fact("2025-10-01","2025-12-31",6400000000,"FY","10-K"),
      ]}},
      "PaymentsToAcquirePropertyPlantAndEquipment": {"units": {"USD": [
          fact("2025-01-01","2025-03-31",1100000000),
          fact("2025-01-01","2025-06-30",3000000000,"Q2"),
          fact("2025-01-01","2025-12-31",9000000000,"FY","10-K"),
      ]}},
    }}}

class FakeResponse:
    status = 200
    def __init__(self,payload):self.payload=json.dumps(payload).encode()
    def __enter__(self):return self
    def __exit__(self,*_):return False
    def read(self,_):return self.payload

class SecQuarterlyTests(unittest.TestCase):
    def test_five_sec_issuers_and_no_unverified_spcx_facts(self):
        self.assertEqual(set(sec.ISSUERS),{"MSFT","GOOGL","AMZN","META","TSLA"})
        self.assertNotIn("SPCX",sec.ISSUERS)

    def test_quarterly_cash_capex_is_derived_from_matching_ytd_only(self):
        rows = sec.extract(sample_facts(),"PaymentsToAcquirePropertyPlantAndEquipment")
        extracted=sec.quarterly(rows,cash_spend=True)
        self.assertAlmostEqual(extracted["2025-03-31"]["value"],1.1e9)
        self.assertAlmostEqual(extracted["2025-06-30"]["value"],1.9e9)
        self.assertNotIn("2025-12-31",extracted,
          "No Q3 matching cumulative fact: do not guess Q4 capex from FY")

    def test_unmatched_negative_capex_and_bad_xbrl_facts_are_not_guessed(self):
        rows=[fact("2025-07-01","2025-09-30",-1000,"Q3"),
              fact("2025-10-01","2025-12-31",100,"FY","8-K"),
              fact("2025-01-01","2025-03-31",500)]
        self.assertEqual(sec.quarterly(rows,cash_spend=True)["2025-03-31"]["value"],500)
        self.assertNotIn("2025-09-30",sec.quarterly(rows,cash_spend=True))

    def test_microsoft_fiscal_year_quarter_mapping_is_not_calendar_mapping(self):
        self.assertEqual(sec.reporting_fiscal_period("MSFT","2025-09-30"),"2026-Q1")
        self.assertEqual(sec.reporting_fiscal_period("MSFT","2025-12-31"),"2026-Q2")
        self.assertEqual(sec.reporting_fiscal_period("MSFT","2026-06-30"),"2026-Q4")
        self.assertEqual(sec.reporting_fiscal_period("TSLA","2025-09-30"),"2025-Q3")

    def test_single_issuer_preview_matches_dates_and_does_not_invent_missing_capex(self):
        data=sample_facts()
        with patch.object(sec.urllib.request,"urlopen",return_value=FakeResponse(data)) as opened:
            result=sec.collect_company("TSLA","0001318605",
               "RevenueFromContractWithCustomerExcludingAssessedTax","INVESTLAB TEST contact@example.org")
        self.assertEqual([row["period_end"] for row in result],
                         ["2025-03-31","2025-06-30","2025-12-31"])
        self.assertAlmostEqual(result[0]["revenue_usd_bn"],20)
        self.assertAlmostEqual(result[1]["capex_usd_bn"],1.9)
        self.assertIsNone(result[2]["capex_usd_bn"])
        self.assertAlmostEqual(result[1]["operating_margin_pct"],20)
        self.assertTrue(all(r["status"]=="SEC_XBRL_PRELIMINARY" for r in result))
        self.assertEqual(opened.call_count,1)
        request=opened.call_args.args[0]
        self.assertEqual(request.get_header("User-agent"),"INVESTLAB TEST contact@example.org")

    def test_cik_mismatch_is_rejected_without_fabricating_facts(self):
        with patch.object(sec.urllib.request,"urlopen",
                          return_value=FakeResponse(sample_facts("0000000001"))):
            with self.assertRaisesRegex(ValueError,"SEC CIK mismatch"):
                sec.collect_company("TSLA","0001318605",
                    "RevenueFromContractWithCustomerExcludingAssessedTax",
                    "INVESTLAB TEST contact@example.org")

    def test_no_real_contact_prevents_any_external_sec_request(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch.dict(os.environ,{"INVESTLAB_SEC_USER_AGENT":""}), \
                 patch("sys.argv",["sec_quarterly_financials_test.py",
                       "--output",str(Path(tmp)/"out.json")]), \
                 patch.object(sec.urllib.request,"urlopen") as opened, \
                 contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit):
                    sec.main()
                opened.assert_not_called()
            self.assertFalse((Path(tmp)/"out.json").exists())

if __name__=="__main__":unittest.main()
