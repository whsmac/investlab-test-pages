#!/usr/bin/env python3
"""Daily PUBLIC ETF closing-price snapshot for TEST Pilot holdings valuation.

Only BITU / TQQQ / USD ETF market data, no portfolio, user, positions, credentials,
Supabase calls or database writes. Fail closed: never publish partial/stale data.
"""
import argparse
import json
import math
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path
from scripts.yahoo_price_probe_test import fetch_chart

ETF_SYMBOLS=("BITU","TQQQ","USD")
FORMAT="PILOT_ETF_CLOSING_QUOTES_V1"

def verify_snapshot(payload,today=None):
    today=today or date.today()
    if (not isinstance(payload,dict)
        or set(payload)!={"mode","source","generated_on","database_writes","writes_performed","quote_count","quotes"}
        or payload.get("mode")!=FORMAT or payload.get("source")!="Yahoo Finance"
        or payload.get("database_writes")!=0 or payload.get("writes_performed")!=0):
        raise ValueError("Invalid read-only ETF snapshot metadata")
    if date.fromisoformat(payload.get("generated_on","")).isoformat()!=payload["generated_on"]:
        raise ValueError("Invalid ETF snapshot creation date")
    if payload["generated_on"]!=today.isoformat():
        raise ValueError("Stale ETF snapshot publication date")
    quotes=payload.get("quotes")
    if (not isinstance(quotes,list) or len(quotes)!=len(ETF_SYMBOLS)
        or payload.get("quote_count")!=len(quotes)
        or {q.get("ticker") for q in quotes if isinstance(q,dict)}!=set(ETF_SYMBOLS)):
        raise ValueError("Missing, duplicated or unapproved ETF ticker")
    for row in quotes:
        if (set(row)!={"ticker","trading_date","close_price","currency","price_basis"}
            or row["currency"]!="USD" or row["price_basis"]!="unadjusted_close"):
            raise ValueError("Invalid or private ETF quote field")
        day=date.fromisoformat(row["trading_date"])
        if day.isoformat()!=row["trading_date"] or not 0<=(today-day).days<=7:
            raise ValueError("ETF quote stale, future or date invalid")
        try: close=Decimal(str(row["close_price"]))
        except InvalidOperation as exc: raise ValueError("Invalid ETF close") from exc
        if not close.is_finite() or close<=0 or close>Decimal("100000"):
            raise ValueError("Invalid ETF close")
    return payload

def build_snapshot(source,today=None):
    today=today or date.today()
    quotes=[]
    for ticker in ETF_SYMBOLS:
        item=source.get(ticker,{})
        if (item.get("status")!="ok" or item.get("currency")!="USD"
            or item.get("price_basis")!="unadjusted_close"):
            raise ValueError(ticker+": verified USD daily close unavailable")
        observations=item.get("observations")
        if not isinstance(observations,list) or not observations:
            raise ValueError(ticker+": missing observations")
        latest=max(observations,key=lambda row:row["trading_date"])
        quotes.append({"ticker":ticker,"trading_date":latest["trading_date"],
                       "close_price":str(latest["close_price"]),"currency":"USD",
                       "price_basis":"unadjusted_close"})
    result={"mode":FORMAT,"source":"Yahoo Finance","generated_on":today.isoformat(),
            "database_writes":0,"writes_performed":0,"quote_count":len(quotes),
            "quotes":quotes}
    return verify_snapshot(result,today=today)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    args.output.unlink(missing_ok=True)
    sources={}
    for ticker in ETF_SYMBOLS:
        try:
            sources[ticker]=fetch_chart(ticker)
            print("ETF",ticker,"source verified")
        except (OSError,ValueError,KeyError,TypeError) as exc:
            sources[ticker]={"status":"error"}
            print("ETF",ticker,"not available:",type(exc).__name__)
    snapshot=build_snapshot(sources)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(snapshot,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    print("TEST public ETF close: 3/3 verified; DB writes: 0; no positions or user data")

if __name__=="__main__":
    main()
