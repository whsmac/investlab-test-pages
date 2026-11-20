"""Offline validation of five-menu TEST Pilot bundle; no real services needed."""
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

from scripts.validate_pilot_site_integration import (
    CORE, MENU, validate_five_year_coverage, validate_menu_pages,
)


def synthetic_public_quotes():
    first = date(2021, 11, 22)
    days = [(first + timedelta(days=n)).isoformat() for n in range(1099)]
    days.append("2026-11-19")
    rows = [{"ticker": ticker, "trading_date": day, "close_price": "100",
             "currency": "USD", "price_basis": "unadjusted_close"}
            for ticker in CORE for day in days]
    return {"row_count": len(rows), "observations": rows}


class PilotSiteIntegrationTests(unittest.TestCase):
    def test_valid_five_year_daily_prices_have_separate_issuer_coverage(self):
        result = validate_five_year_coverage(synthetic_public_quotes(), date(2026, 11, 20))
        self.assertEqual(set(result), set(CORE))
        self.assertTrue(all(entry["rows"] == 1100 for entry in result.values()))
        self.assertEqual(result["TSLA"]["first"], "2021-11-22")
        self.assertEqual(result["TSLA"]["last"], "2026-11-19")

    def test_short_history_is_not_misrepresented_as_five_years(self):
        candidate = synthetic_public_quotes()
        candidate["observations"] = [r for r in candidate["observations"]
                                      if r["ticker"] != "TSLA" or r["trading_date"] >= "2023-01-01"]
        candidate["row_count"] = len(candidate["observations"])
        with self.assertRaisesRegex(ValueError, "TSLA: insufficient"):
            validate_five_year_coverage(candidate, date(2026, 11, 20))

    def test_stale_core_close_blocks_site_integration(self):
        candidate = synthetic_public_quotes()
        for row in candidate["observations"]:
            if row["ticker"] == "META" and row["trading_date"] == "2026-11-19":
                row["trading_date"] = "2026-11-01"
        with self.assertRaisesRegex(ValueError, "META: last daily close"):
            validate_five_year_coverage(candidate, date(2026, 11, 20))

    def test_all_five_home_links_and_transitive_modules_required(self):
        with tempfile.TemporaryDirectory() as work:
            root = Path(work)
            company = ("id=\"financialTicker\" value=\"3y\" value=\"5y\" "
                       "companyPeriodStart alignCompanyPriceSeries loadPublishedYahooReview "
                       "readPublishedSecFinancials operating_income_usd_bn operating_margin_pct")
            for target in MENU.values():
                (root / target).write_text(company if target == "company-investment-analysis.html"
                                           else "<html>TEST preview</html>", encoding="utf-8")
            home = " ".join(f'<a href="./{target}">{title}</a>' for title, target in MENU.items())
            (root / "index.html").write_text(home, encoding="utf-8")
            result = validate_menu_pages(root)
            self.assertEqual(set(result), set(MENU.values()))
            (root / "data-management.html").unlink()
            with self.assertRaisesRegex(ValueError, "target is missing"):
                validate_menu_pages(root)


if __name__ == "__main__":
    unittest.main()
