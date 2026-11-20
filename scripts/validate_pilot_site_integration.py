#!/usr/bin/env python3
"""Read-only TEST Pilot full-site integration gate: never deploys or touches Supabase."""
import argparse
import json
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from scripts.validate_yahoo_test_site_preview import check_transitive_modules, validate_preview

MENU = {
    "My Portfolio": "my-portfolio.html",
    "Virtual Trade Simulator": "virtual-trade-simulator.html",
    "Company Investment Analysis": "company-investment-analysis.html",
    "Unified Ledger": "pilot-ledger.html",
    "Data Management": "data-management.html",
}
CORE = ("MSFT", "GOOGL", "AMZN", "META", "TSLA")
OPTIONAL = "SPCX"
MIN_DAILY_OBSERVATIONS = 1100
MIN_HISTORY_SPAN_DAYS = 1650


def validate_menu_pages(site: Path):
    home = (site / "index.html").read_text(encoding="utf-8")
    checks = {}
    for title, path in MENU.items():
        if not re.search(r'href=["\']\./' + re.escape(path) + r'["\']', home):
            raise ValueError("Pilot homepage missing menu link: " + title)
        if not (site / path).is_file():
            raise ValueError("Pilot menu target is missing: " + path)
        checks[path] = check_transitive_modules(site, path)
    company = (site / MENU["Company Investment Analysis"]).read_text(encoding="utf-8")
    for marker in ("id=\"financialTicker\"", 'value="3y"', 'value="5y"',
                   "companyPeriodStart", "alignCompanyPriceSeries",
                   "loadPublishedYahooReview", "readPublishedSecFinancials",
                   "operating_income_usd_bn", "operating_margin_pct"):
        if marker not in company:
            raise ValueError("Pilot company price/financial integration is missing: " + marker)
    return checks


def validate_five_year_coverage(payload, today=None):
    if not isinstance(payload, dict) or payload.get("row_count") != len(payload.get("observations", [])):
        raise ValueError("Five-year TEST quote file is incomplete")
    today = today or datetime.now(timezone(timedelta(hours=9))).date()
    dates = {ticker: [] for ticker in (*CORE, OPTIONAL)}
    for item in payload["observations"]:
        ticker = item.get("ticker")
        if ticker not in dates:
            raise ValueError("Unapproved TEST quote ticker")
        dates[ticker].append(date.fromisoformat(item["trading_date"]))
    summary = {}
    for ticker in CORE:
        days = dates[ticker]
        if len(days) < MIN_DAILY_OBSERVATIONS:
            raise ValueError(ticker + ": insufficient five-year daily rows")
        first, last = min(days), max(days)
        if (today - first).days < MIN_HISTORY_SPAN_DAYS:
            raise ValueError(ticker + ": five-year history window was truncated")
        if not 0 <= (today - last).days <= 7:
            raise ValueError(ticker + ": last daily close is stale or future-dated")
        summary[ticker] = {"rows": len(days), "first": first.isoformat(), "last": last.isoformat()}
    if dates[OPTIONAL]:
        summary[OPTIONAL] = {"rows": len(dates[OPTIONAL]),
                             "first": min(dates[OPTIONAL]).isoformat(),
                             "last": max(dates[OPTIONAL]).isoformat()}
    return summary


def validate_pilot_site(site: Path, today=None):
    preview = validate_preview(site)
    pages = validate_menu_pages(site)
    public = json.loads((site / "data/yahoo-public-review.json").read_text(encoding="utf-8"))
    coverage = validate_five_year_coverage(public, today=today)
    return {"mode": "TEST_PILOT_FIVE_MENU_READ_ONLY_PREVIEW",
            "checks_passed": True, "deployment_performed": False, "database_writes": 0,
            "five_menu_module_checks": pages, "price_rows": public["row_count"],
            "quote_coverage": coverage, "site_sha256": preview["json_sha256"]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", required=True, type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    report = validate_pilot_site(args.site)
    if args.report:
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    print("TEST Pilot site integration PASS; publication: none; Supabase writes: 0")


if __name__ == "__main__":
    main()
