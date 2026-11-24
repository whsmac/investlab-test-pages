import unittest
from datetime import date
from scripts.portfolio_etf_quotes_test import ETF_SYMBOLS,build_snapshot,verify_snapshot
from scripts.validate_yahoo_test_site_preview import validate_preview

TODAY=date(2026,11,24)
def source():
    result={}
    for ticker,close in [("BITU","5.36"),("TQQQ","65.40"),("USD","60.20")]:
        result[ticker]={"status":"ok","currency":"USD","price_basis":"unadjusted_close",
            "count":2,"observations":[{"trading_date":"2026-11-20","close_price":"10"},
                                         {"trading_date":"2026-11-23","close_price":close}]}
    return result

class ETFQuoteTests(unittest.TestCase):
    def test_three_etfs_are_all_present_and_usd_is_a_tradable_security(self):
        self.assertEqual(ETF_SYMBOLS,("BITU","TQQQ","USD"))
        payload=build_snapshot(source(),today=TODAY)
        self.assertEqual(payload["quote_count"],3)
        self.assertEqual({r["ticker"] for r in payload["quotes"]},set(ETF_SYMBOLS))
        self.assertEqual(next(x["close_price"] for x in payload["quotes"] if x["ticker"]=="USD"),"60.20")
        self.assertFalse(any("user" in str(x).lower() for x in payload["quotes"]))

    def test_missing_etf_fail_closed_and_never_publish_partial_quote(self):
        sample=source()
        sample["USD"]["status"]="error"
        with self.assertRaisesRegex(ValueError,"USD"):
            build_snapshot(sample,today=TODAY)
        sample=source()
        del sample["TQQQ"]
        with self.assertRaisesRegex(ValueError,"TQQQ"):
            build_snapshot(sample,today=TODAY)

    def test_stale_future_and_tampered_quotes_fail(self):
        for day in ("2026-10-01","2026-11-25"):
            sample=source()
            for row in sample["BITU"]["observations"]:
                row["trading_date"]=day
            with self.assertRaisesRegex(ValueError,"date|stale|future"):
                build_snapshot(sample,today=TODAY)
        sample=build_snapshot(source(),today=TODAY)
        sample["quotes"][0]["close_price"]="NaN"
        with self.assertRaisesRegex(ValueError,"Invalid ETF close"):
            verify_snapshot(sample,today=TODAY)

    def test_reject_private_account_fields_and_bad_price_basis(self):
        payload=build_snapshot(source(),today=TODAY)
        payload["quotes"][0]["user_id"]="secret"
        with self.assertRaisesRegex(ValueError,"Invalid or private"):
            verify_snapshot(payload,today=TODAY)
        payload=build_snapshot(source(),today=TODAY)
        payload["quotes"][0]["price_basis"]="adjusted_close"
        with self.assertRaisesRegex(ValueError,"Invalid or private"):
            verify_snapshot(payload,today=TODAY)

    def test_reject_future_or_missing_generation_metadata(self):
        payload=build_snapshot(source(),today=TODAY)
        payload["generated_on"]="2026-11-23"
        with self.assertRaisesRegex(ValueError,"Stale ETF snapshot"):
            verify_snapshot(payload,today=TODAY)
        payload=build_snapshot(source(),today=TODAY)
        payload["private_note"]="my real holdings"
        with self.assertRaisesRegex(ValueError,"Invalid read-only ETF snapshot"):
            verify_snapshot(payload,today=TODAY)

if __name__=="__main__":unittest.main()
