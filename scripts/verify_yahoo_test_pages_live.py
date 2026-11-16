#!/usr/bin/env python3
"""Read-only verifier for the exact TEST GitHub Pages Yahoo JSON URL.

Never uploads, deploys, writes database rows, or accesses credentials.
"""
import argparse
import hashlib
import json
import urllib.error
import urllib.request
from datetime import date, datetime
from pathlib import Path

TARGET = "https://whsmac.github.io/investlab-test-pages/data/yahoo-public-review.json"
TICKERS = {"MSFT", "GOOGL", "AMZN", "META", "TSLA"}
MAX_BYTES = 2_000_000

def verify_payload(raw: bytes, expected_sha256: str | None = None, today: date | None = None):
    digest = hashlib.sha256(raw).hexdigest()
    if expected_sha256 and digest != expected_sha256.lower():
        raise ValueError("Published JSON SHA-256 does not match reviewed bundle")
    payload = json.loads(raw)
    if not isinstance(payload, dict) or payload.get("mode") != "REVIEW_ONLY" or payload.get("source") != "Yahoo Finance":
        raise ValueError("Unexpected public Yahoo JSON source or mode")
    if payload.get("database_insert_authorized") is not False or payload.get("writes_performed") != 0:
        raise ValueError("Public Yahoo JSON write safety flags invalid")
    if len(raw) > MAX_BYTES:
        raise ValueError("Public TEST Pages JSON exceeds size limit")
    rows = payload.get("observations")
    if not isinstance(rows, list) or not rows or len(rows) > 10000 or payload.get("row_count") != len(rows):
        raise ValueError("Public Yahoo JSON observation count invalid")
    from scripts.export_yahoo_public_review import build_public_snapshot
    try:
        sanitized = build_public_snapshot(payload)
    except (ValueError, TypeError, KeyError, OverflowError) as exc:
        raise ValueError("Invalid public Yahoo observations") from exc
    if sanitized["observations"] != sorted(rows, key=lambda r: (r["ticker"], r["trading_date"])):
        raise ValueError("Unexpected public Yahoo observation fields")
    if {r["ticker"] for r in rows} != TICKERS:
        raise ValueError("Incomplete public Yahoo ticker coverage")
    now = today or datetime.now().astimezone().date()
    latest = {}
    for row in rows:
        day = date.fromisoformat(row["trading_date"])
        if day > now:
            raise ValueError("Future-dated published observation")
        latest[row["ticker"]] = max(latest.get(row["ticker"], day), day)
    age = {ticker: (now - latest[ticker]).days for ticker in sorted(TICKERS)}
    return {"mode": "TEST_PAGES_LIVE_READ_ONLY_CHECK", "reachable": True,
            "published_json_sha256": digest, "checksum_matches": bool(expected_sha256),
            "rows": len(rows), "tickers": sorted(TICKERS),
            "latest_dates": {ticker: latest[ticker].isoformat() for ticker in sorted(TICKERS)},
            "age_days": age, "fresh": all(days <= 7 for days in age.values()),
            "database_writes": 0, "deployment_performed": False}

def fetch_public_json(url: str = TARGET):
    if url != TARGET:
        raise ValueError("Only the exact TEST Pages JSON URL is permitted")
    request = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "INVESTLAB-TEST-ReadOnly/1.0"})
    with urllib.request.urlopen(request, timeout=12) as response:
        if response.geturl() != TARGET:
            raise ValueError("Redirected away from exact TEST Pages JSON URL")
        content_type = response.headers.get("Content-Type", "").lower()
        if "application/json" not in content_type:
            raise ValueError("Public TEST Pages did not return JSON content type")
        raw = response.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ValueError("Public TEST Pages JSON exceeds size limit")
        return raw

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--expected-sha256", default=None)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        report = verify_payload(fetch_public_json(), expected_sha256=args.expected_sha256)
        report["url"] = TARGET
    except (ValueError, urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        report = {"mode": "TEST_PAGES_LIVE_READ_ONLY_CHECK", "reachable": False,
                  "url": TARGET, "reason": str(exc),
                  "database_writes": 0, "deployment_performed": False}
    if args.output:
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    if not report["reachable"] or not report.get("fresh"):
        raise SystemExit(1)

if __name__ == "__main__":
    main()
