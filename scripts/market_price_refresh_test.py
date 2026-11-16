#!/usr/bin/env python3
"""INVESTLAB TEST-only free-price-source probe. No Supabase access or writes."""
import csv
import io
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
try:
    from scripts.audit_price_source_test import audit_source_report
except ModuleNotFoundError:
    from audit_price_source_test import audit_source_report

# Stooq's unofficial public CSV endpoint is used only as a trial source.
# SPCX is deliberately excluded until an independently verified market symbol exists.
SYMBOLS = {"MSFT": "msft.us", "GOOGL": "googl.us", "AMZN": "amzn.us", "META": "meta.us", "TSLA": "tsla.us"}
OUTPUT = os.environ.get("INVESTLAB_PRICE_REPORT", "price-source-probe.json")

def fetch_csv(symbol, start, end):
    url = f"https://stooq.com/q/d/l/?s={symbol}&d1={start:%Y%m%d}&d2={end:%Y%m%d}&i=d"
    request = urllib.request.Request(url, headers={"User-Agent": "INVESTLAB-TEST-DataQualityProbe/1.0", "Accept": "text/csv"})
    with urllib.request.urlopen(request, timeout=25) as response:
        if response.status != 200:
            raise ValueError(f"HTTP {response.status}")
        raw = response.read(1_000_001)
        if len(raw) > 1_000_000:
            raise ValueError("CSV exceeds 1 MB safety limit")
        return raw.decode("utf-8-sig")

def parse_csv(content, start, end):
    rows = list(csv.DictReader(io.StringIO(content)))
    if not rows or not {"Date", "Close"}.issubset(rows[0]):
        raise ValueError("Missing CSV Date/Close columns or no rows")
    observations = {}
    for row in rows:
        day = date.fromisoformat(row["Date"])
        price = Decimal(row["Close"])
        if not price.is_finite() or price <= 0:
            raise ValueError("Invalid closing price")
        if start <= day <= end:
            key = day.isoformat()
            if key in observations and observations[key] != str(price):
                raise ValueError("Conflicting duplicate date")
            observations[key] = str(price)
    return [{"trading_date": d, "close_price": observations[d]} for d in sorted(observations)]

def main():
    today = date.today()
    start = today - timedelta(days=14)
    report = {"mode": "DRY_RUN_ONLY", "source": "Stooq public CSV trial (unverified availability)",
              "generated_on": today.isoformat(), "date_from": start.isoformat(),
              "date_to": today.isoformat(), "writes_performed": 0, "symbols": {}}
    for ticker, source_symbol in SYMBOLS.items():
        try:
            data = parse_csv(fetch_csv(source_symbol, start, today), start, today)
            report["symbols"][ticker] = {"status": "ok" if data else "empty", "source_symbol": source_symbol,
                                         "count": len(data), "observations": data}
        except (urllib.error.URLError, TimeoutError, UnicodeError, ValueError, InvalidOperation, KeyError) as exc:
            report["symbols"][ticker] = {"status": "error", "source_symbol": source_symbol,
                                         "message": f"{type(exc).__name__}: {str(exc)[:180]}"}
    report["symbols"]["SPCX"] = {"status": "skipped", "reason": "Public ticker and data source not verified"}
    report["quality_audit"] = audit_source_report(report, today=today)
    with open(OUTPUT, "w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    print("TEST dry-run complete:", {key: value["status"] for key, value in report["symbols"].items()})
    return 0 if report["quality_audit"]["checks_passed"] else 1

if __name__ == "__main__":
    sys.exit(main())
