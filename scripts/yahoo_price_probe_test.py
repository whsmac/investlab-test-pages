#!/usr/bin/env python3
"""TEST-only Yahoo daily close collection, up to five years; no database access."""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

CORE_SYMBOLS = ("MSFT", "GOOGL", "AMZN", "META", "TSLA")
SYMBOLS = CORE_SYMBOLS + ("SPCX",)
OUTPUT = Path(os.environ.get("INVESTLAB_YAHOO_REPORT", "yahoo-price-probe.json"))


def parse_chart(payload, ticker):
    chart = payload.get("chart")
    if not isinstance(chart, dict) or chart.get("error"):
        raise ValueError("Yahoo chart error")
    results = chart.get("result")
    if not isinstance(results, list) or len(results) != 1:
        raise ValueError("Missing chart result")
    result = results[0]
    if result.get("meta", {}).get("symbol", "").upper() != ticker:
        raise ValueError("Unexpected ticker")
    currency = result.get("meta", {}).get("currency")
    if currency != "USD":
        raise ValueError("Unexpected or missing USD currency")
    timestamps = result.get("timestamp", [])
    quotes = result.get("indicators", {}).get("quote", [])
    closes = quotes[0].get("close", []) if quotes else []
    if len(timestamps) != len(closes):
        raise ValueError("Timestamp/close length mismatch")
    observations = {}
    for stamp, close in zip(timestamps, closes):
        if close is None:
            continue
        from decimal import Decimal
        price = Decimal(str(close))
        if not price.is_finite() or price <= 0:
            raise ValueError("Invalid close")
        day = datetime.fromtimestamp(stamp, timezone.utc).date().isoformat()
        if day in observations and observations[day] != str(price):
            raise ValueError("Conflicting duplicate trading date")
        observations[day] = str(price)
    if not observations:
        raise ValueError("No valid closes")
    return {"status": "ok", "currency": currency, "price_basis": "unadjusted_close",
            "count": len(observations), "first_date": min(observations), "latest_date": max(observations),
            "observations": [{"trading_date": day, "close_price": observations[day]}
                             for day in sorted(observations)]}


def fetch_chart(ticker):
    url = "https://query1.finance.yahoo.com/v8/finance/chart/" + urllib.parse.quote(ticker)
    # Pull five years once daily for long-horizon (3y/5y) Pilot charts.
    # Yahoo quote.close is split-adjusted but not dividend-adjusted; this
    # pipeline never treats it as a tick-by-tick/live price.
    url += "?interval=1d&range=5y"
    request = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; INVESTLAB-TEST/1.0)",
        "Accept": "application/json"})
    # Retry only transient gateway failures; never retry Yahoo rate-limit (429).
    for attempt in range(2):
        try:
            with urllib.request.urlopen(request, timeout=8) as response:
                if response.status != 200:
                    raise ValueError("Non-200 response")
                data = response.read(1_000_001)
                if len(data) > 1_000_000:
                    raise ValueError("Response exceeds 1 MB")
            break
        except urllib.error.HTTPError as exc:
            if exc.code not in (502, 503, 504) or attempt:
                raise
            time.sleep(2)
    return parse_chart(json.loads(data.decode("utf-8")), ticker)


def save(report):
    tmp = OUTPUT.with_name(OUTPUT.name + ".tmp")
    tmp.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, OUTPUT)


def main():
    report = {"mode": "LIVE_SOURCE_TRIAL", "source": "Yahoo Finance unofficial chart endpoint",
              "generated_on": date.today().isoformat(), "requested_range": "5y", "writes_performed": 0,
              "database_insert_authorized": False, "symbols": {}}
    save(report)
    for ticker in SYMBOLS:
        try:
            report["symbols"][ticker] = fetch_chart(ticker)
        except (OSError, ValueError, KeyError, TypeError, urllib.error.URLError) as exc:
            report["symbols"][ticker] = {"status": "error", "failure_kind": type(exc).__name__,
                                          "message": str(exc)[:180]}
        save(report)
        print(ticker, report["symbols"][ticker]["status"], flush=True)
    # Optional sixth ticker failure must not halt the five required companies.
    return 0 if all(report["symbols"][t]["status"] == "ok" for t in CORE_SYMBOLS) else 1


if __name__ == "__main__":
    sys.exit(main())
