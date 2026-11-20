#!/usr/bin/env python3
"""Create a browser-ready, public-safe Yahoo price snapshot for future static hosting.

Does not deploy, commit, access Supabase, or write outside --output.
"""
import argparse
import json
from datetime import datetime, timezone, date
from decimal import Decimal
from pathlib import Path

ALLOWED = {"MSFT", "GOOGL", "AMZN", "META", "TSLA", "SPCX"}


def build_public_snapshot(candidate, now=None):
    if (candidate.get("mode") != "REVIEW_ONLY"
            or candidate.get("source") != "Yahoo Finance"
            or candidate.get("database_insert_authorized") is not False
            or candidate.get("writes_performed") != 0):
        raise ValueError("Only validated Yahoo review candidates are accepted")
    rows = candidate.get("observations")
    if not isinstance(rows, list) or len(rows) > 10000:
        raise ValueError("Invalid observations")
    seen = set()
    result = []
    for row in rows:
        ticker = row.get("ticker")
        if ticker not in ALLOWED:
            raise ValueError("Unapproved ticker")
        day = date.fromisoformat(row["trading_date"]).isoformat()
        price = Decimal(str(row["close_price"]))
        if not price.is_finite() or price <= 0:
            raise ValueError("Invalid close")
        if row.get("currency") != "USD" or row.get("price_basis") != "unadjusted_close":
            raise ValueError("Invalid currency or price basis")
        if ticker == "SPCX" and day < "2026-06-12":
            raise ValueError("SPCX price predates its listing")
        key = (ticker, day)
        if key in seen:
            raise ValueError("Duplicate observation")
        seen.add(key)
        result.append({"ticker": ticker, "trading_date": day,
                       "close_price": str(price), "currency": "USD",
                       "price_basis": "unadjusted_close"})
    result.sort(key=lambda r: (r["ticker"], r["trading_date"]))
    generated = (now or datetime.now(timezone.utc)).isoformat()
    return {"mode": "REVIEW_ONLY", "source": "Yahoo Finance",
            "database_insert_authorized": False, "writes_performed": 0,
            "published_at": generated, "row_count": len(result),
            "observations": result,
            "notice": "Public price observations only; no user, portfolio or Supabase data. Not live quotes."}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    payload = build_public_snapshot(json.loads(args.candidate.read_text(encoding="utf-8-sig")))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print("Static Yahoo review:", payload["row_count"], "rows; DB writes: 0; deployment: none")


if __name__ == "__main__":
    main()
