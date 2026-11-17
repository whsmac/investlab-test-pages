#!/usr/bin/env python3
"""Offline gate for future TEST Pages Yahoo JSON publication. No deployment or DB access."""
import argparse
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from scripts.export_yahoo_public_review import build_public_snapshot

EXPECTED = {"MSFT", "GOOGL", "AMZN", "META", "TSLA"}


def assess_publication(candidate, today=None):
    today = today or datetime.now(timezone(timedelta(hours=9))).date()
    public = build_public_snapshot(candidate)
    symbols = {row["ticker"] for row in public["observations"]}
    issues = []
    if symbols != EXPECTED:
        issues.append("Expected all five supported tickers")
    if public["row_count"] < 5:
        issues.append("Not enough observations")
    if public["row_count"] > 10000:
        issues.append("Too many observations")
    for ticker in EXPECTED:
        dates = [date.fromisoformat(row["trading_date"])
                 for row in public["observations"] if row["ticker"] == ticker]
        if dates and (max(dates) > today or max(dates) < today - timedelta(days=7)):
            issues.append(ticker + ": latest price outside seven-day freshness window")
    return {"mode": "PUBLICATION_PREFLIGHT_ONLY", "publish_authorized": False,
            "deployment_performed": False, "database_writes": 0,
            "candidate_rows": public["row_count"], "symbols": sorted(symbols),
            "checks_passed": not issues, "issues": sorted(issues)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    result = assess_publication(json.loads(args.candidate.read_text(encoding="utf-8-sig")))
    args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Publication preflight:", "PASS" if result["checks_passed"] else "BLOCKED",
          "rows:", result["candidate_rows"], "deployment: none")
    if not result["checks_passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
