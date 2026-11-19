#!/usr/bin/env python3
"""Report TEST Yahoo feed coverage from reviewed public JSON; no publishing or writes."""
import argparse
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from scripts.export_yahoo_public_review import build_public_snapshot

TICKERS = ("MSFT", "GOOGL", "AMZN", "META", "TSLA")


def assess_coverage(snapshot, today=None):
    clean = build_public_snapshot(snapshot)
    today = today or datetime.now(timezone(timedelta(hours=9))).date()
    latest = {}
    for row in clean["observations"]:
        ticker = row["ticker"]
        day = date.fromisoformat(row["trading_date"])
        latest[ticker] = max(latest.get(ticker, day), day)
    coverage = []
    for ticker in (*TICKERS, *(("SPCX",) if "SPCX" in latest else ())):
        day = latest.get(ticker)
        age = (today - day).days if day else None
        coverage.append({"ticker": ticker, "latest_trading_date": day.isoformat() if day else None,
                         "age_days": age, "usable": age is not None and 0 <= age <= 7})
    return {"mode": "TEST_YAHOO_COVERAGE_REVIEW_ONLY", "as_of_kst": today.isoformat(),
            "source": "Yahoo Finance", "rows": clean["row_count"],
            "tickers": coverage, "all_usable": all(row["usable"] for row in coverage),
            "published": False, "database_writes": 0}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = assess_coverage(json.loads(args.source.read_text(encoding="utf-8-sig")))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    if not report["all_usable"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
