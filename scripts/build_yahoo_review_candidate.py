#!/usr/bin/env python3
"""Convert verified Yahoo TEST probe into a review-only price candidate; never import."""
import argparse
import json
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path

SYMBOLS = ("MSFT", "GOOGL", "AMZN", "META", "TSLA")


def build_candidate(report, today=None):
    today = today or date.today()
    result = {"mode": "REVIEW_ONLY", "source": "Yahoo Finance",
              "database_insert_authorized": False, "writes_performed": 0,
              "generated_on": today.isoformat(), "symbols": {}, "observations": []}
    if report.get("source") != "Yahoo Finance unofficial chart endpoint" or report.get("writes_performed") != 0:
        raise ValueError("Not a valid read-only Yahoo source report")
    for ticker in SYMBOLS:
        source = report.get("symbols", {}).get(ticker, {})
        if source.get("status") != "ok" or source.get("currency") != "USD" or source.get("price_basis") != "unadjusted_close":
            raise ValueError(f"{ticker}: missing/invalid source metadata")
        rows = source.get("observations")
        if not isinstance(rows, list) or not rows or len(rows) != source.get("count"):
            raise ValueError(f"{ticker}: invalid row count")
        dates = set()
        for row in rows:
            day = date.fromisoformat(row["trading_date"])
            price = Decimal(str(row["close_price"]))
            if not price.is_finite() or price <= 0 or day > today or day < today - timedelta(days=45):
                raise ValueError(f"{ticker}: invalid date or close")
            if day in dates:
                raise ValueError(f"{ticker}: duplicate trading date")
            dates.add(day)
            result["observations"].append({"ticker": ticker, "trading_date": day.isoformat(),
                                           "close_price": str(price), "currency": "USD",
                                           "price_basis": "unadjusted_close"})
        result["symbols"][ticker] = {"count": len(rows), "latest_date": max(dates).isoformat()}
    # Optional sixth company: do not fail the existing five if its source is unavailable.
    optional = report.get("symbols", {}).get("SPCX", {})
    if optional.get("status") == "ok" and optional.get("currency") == "USD" and optional.get("price_basis") == "unadjusted_close":
        dates = set()
        for row in optional.get("observations", []):
            day = date.fromisoformat(row["trading_date"])
            price = Decimal(str(row["close_price"]))
            if day < date(2026, 6, 12) or day > today or day < today - timedelta(days=45) or not price.is_finite() or price <= 0 or day in dates:
                raise ValueError("SPCX: invalid or duplicate public trading day")
            dates.add(day)
            result["observations"].append({"ticker":"SPCX","trading_date":day.isoformat(),
                                            "close_price":str(price),"currency":"USD","price_basis":"unadjusted_close"})
        if dates:
            result["symbols"]["SPCX"]={"count":len(dates),"latest_date":max(dates).isoformat()}
    result["observations"].sort(key=lambda x: (x["ticker"], x["trading_date"]))
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=Path("yahoo-price-probe.json"))
    parser.add_argument("--output", type=Path, default=Path("yahoo-price-review-candidate.json"))
    args = parser.parse_args()
    candidate = build_candidate(json.loads(args.input.read_text(encoding="utf-8")))
    args.output.write_text(json.dumps(candidate, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Yahoo review-only candidate:", len(candidate["observations"]), "rows; DB writes: 0")


if __name__ == "__main__":
    main()
