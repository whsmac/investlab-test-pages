import unittest
from datetime import date, timedelta
from scripts.yahoo_market_indices_test import create_report

TODAY=date(2026,11,22)
def fake_rows(value):
    dates=[TODAY-timedelta(days=1700-i*1700//1149) for i in range(1150)]
    rows=[{"trading_date":day.isoformat(),"close_price":str(value+i)} for i,day in enumerate(dates)]
    return {"status":"ok","currency":"USD","price_basis":"unadjusted_close","observations":rows}

class MarketBenchmarkReportTests(unittest.TestCase):
    def test_builds_only_verified_index_levels(self):
        result=create_report({"NDX":fake_rows(20000),"SPX":fake_rows(6000)},today=TODAY)
        self.assertEqual(result["row_count"],2300)
        self.assertEqual({x["ticker"] for x in result["observations"]},{"NDX","SPX"})
        self.assertTrue(all(x["unit"]=="index_points" for x in result["observations"]))
        self.assertEqual(result["database_writes"],0)
    def test_missing_source_is_rejected(self):
        data=fake_rows(100)
        data["currency"]="EUR"
        with self.assertRaises(ValueError):
            create_report({"NDX":data,"SPX":fake_rows(6000)},today=TODAY)
    def test_stale_index_is_not_published(self):
        stale=fake_rows(100)
        for row in stale["observations"]:
            row["trading_date"]=(date.fromisoformat(row["trading_date"])-timedelta(days=20)).isoformat()
        with self.assertRaises(ValueError):
            create_report({"NDX":stale,"SPX":fake_rows(6000)},today=TODAY)

if __name__=="__main__":unittest.main()
