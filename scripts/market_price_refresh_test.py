#!/usr/bin/env python3
"""INVESTLAB TEST-only free-price-source probe. No Supabase access or writes."""
import argparse
import csv
import io
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path
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
    with urllib.request.urlopen(request, timeout=8) as response:
        if response.status != 200:
            raise ValueError(f"HTTP {response.status}")
        content_type = response.headers.get("Content-Type", "").lower()
        if "html" in content_type:
            raise ValueError("Source returned HTML rather than CSV")
        raw = response.read(1_000_001)
        if len(raw) > 1_000_000:
            raise ValueError("CSV exceeds 1 MB safety limit")
        decoded = raw.decode("utf-8-sig")
        if decoded.lstrip().lower().startswith(("<!doctype html", "<html")):
            raise ValueError("Source returned an HTML error page")
        return decoded

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
        if day > end:
            raise ValueError("Future-dated source observation")
        if start <= day <= end:
            key = day.isoformat()
            if key in observations and Decimal(observations[key]) != price:
                raise ValueError("Conflicting duplicate date")
            observations[key] = str(price)
    return [{"trading_date": d, "close_price": observations[d]} for d in sorted(observations)]

def save_report(report, output, today, offline=False):
    """Persist progress after every symbol so CI timeouts retain diagnostics."""
    report["symbols"]["SPCX"] = {"status": "skipped", "reason": "Public ticker and data source not verified"}
    report["quality_audit"] = audit_source_report(report, today=today)
    report["input_mode"] = "OFFLINE_FIXTURE" if offline else "LIVE_SOURCE_TRIAL"
    report["quality_audit"]["database_insert_authorized"] = False
    temporary = output.with_name(output.name + ".tmp")
    with open(temporary, "w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    os.replace(temporary, output)

def main(argv=None):
    parser = argparse.ArgumentParser(description='TEST-only price source probe; never writes to Supabase')
    parser.add_argument('--csv-dir', type=Path, help='Offline source CSV fixtures; no network requests')
    parser.add_argument('--as-of', type=date.fromisoformat, help='Fixed YYYY-MM-DD audit date (offline fixtures only)')
    parser.add_argument('--output', type=Path, default=Path(OUTPUT))
    args = parser.parse_args(argv)
    if args.as_of and not args.csv_dir:
        parser.error('--as-of requires --csv-dir to prevent backdated live probes')
    today = args.as_of or date.today()
    start = today - timedelta(days=14)
    report = {"mode": "DRY_RUN_ONLY", "source": "Stooq public CSV trial (unverified availability)",
              "generated_on": today.isoformat(), "date_from": start.isoformat(),
              "date_to": today.isoformat(), "writes_performed": 0, "symbols": {}}
    for ticker, source_symbol in SYMBOLS.items():
        try:
            if args.csv_dir:
                source_file = args.csv_dir / f'{ticker}.csv'
                content = source_file.read_text(encoding='utf-8-sig')
            else:
                content = fetch_csv(source_symbol, start, today)
            data = parse_csv(content, start, today)
            report["symbols"][ticker] = {"status": "ok" if data else "empty", "source_symbol": source_symbol,
                                         "count": len(data), "observations": data}
        except (OSError, urllib.error.URLError, TimeoutError, UnicodeError, ValueError, InvalidOperation, KeyError) as exc:
            if isinstance(exc, urllib.error.HTTPError):
                failure_kind = "HTTP_ERROR"
            elif isinstance(exc, (urllib.error.URLError, TimeoutError)):
                failure_kind = "NETWORK_ERROR"
            elif isinstance(exc, OSError):
                failure_kind = "INPUT_ERROR"
            else:
                failure_kind = "DATA_ERROR"
            report["symbols"][ticker] = {"status": "error", "source_symbol": source_symbol,
                                         "failure_kind": failure_kind,
                                         "message": f"{type(exc).__name__}: {str(exc)[:180]}"}
        save_report(report, args.output, today, offline=bool(args.csv_dir))
    save_report(report, args.output, today, offline=bool(args.csv_dir))
    print("TEST dry-run complete:", {key: value["status"] for key, value in report["symbols"].items()})
    return 0 if report["quality_audit"]["checks_passed"] else 1

if __name__ == "__main__":
    sys.exit(main())
