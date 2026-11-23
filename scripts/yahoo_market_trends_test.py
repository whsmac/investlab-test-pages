#!/usr/bin/env python3
"""Read-only Yahoo Finance TEST market trends collector; no credential or Supabase use."""
import argparse
import json
from datetime import date, timedelta
from pathlib import Path
from scripts.yahoo_price_probe_test import fetch_chart

INDICATORS=("^TNX","GC=F","CL=F")
SECTORS={
"XLK":("AAPL","MSFT","NVDA","AVGO"),
"XLF":("JPM","BAC"),"XLE":("XOM","CVX"),"XLI":("CAT","GE"),
"XLY":("AMZN","TSLA"),"XLP":("WMT","COST"),"XLV":("LLY","JNJ"),
"XLC":("META","GOOGL"),"XLU":("NEE","DUK"),"XLB":("LIN","SHW"),
"XLRE":("PLD","AMT"),
}
SYMBOLS=INDICATORS+tuple(dict.fromkeys(x for sector,stocks in SECTORS.items() for x in (sector,*stocks)))

def build_public_report(source,today=None):
 today=today or date.today()
 report={"mode":"MARKET_TRENDS_REVIEW_ONLY","source":"Yahoo Finance",
 "generated_on":today.isoformat(),"database_writes":0,"writes_performed":0,
 "observations":[],"missing_symbols":[]}
 for ticker in SYMBOLS:
  payload=source.get(ticker,{})
  if payload.get("status")!="ok" or payload.get("currency")!="USD" or payload.get("price_basis")!="unadjusted_close":
   report["missing_symbols"].append(ticker)
   continue
  cutoff=today-timedelta(days=1140 if ticker in INDICATORS else 380)
  seen=set()
  for row in payload.get("observations",[]):
   try:
    day=date.fromisoformat(row["trading_date"])
    price=float(row["close_price"])
   except (ValueError,TypeError,KeyError):
    raise ValueError(ticker+": invalid observation")
   if not (0<price<float("inf")) or day>today or day in seen:
    raise ValueError(ticker+": impossible or repeated close")
   seen.add(day)
   if day<cutoff:continue
   report["observations"].append({"ticker":ticker,"source_symbol":ticker,
      "trading_date":day.isoformat(),"close_price":str(row["close_price"]),
      "currency":"USD","price_basis":"unadjusted_close"})
  last=max(seen) if seen else None
  if not last or (today-last).days>7:
   report["missing_symbols"].append(ticker)
   report["observations"]=[r for r in report["observations"] if r["ticker"]!=ticker]
 report["observations"].sort(key=lambda r:(r["ticker"],r["trading_date"]))
 report["row_count"]=len(report["observations"])
 if not report["observations"] or report["row_count"]>20000:
  raise ValueError("No usable TEST market observations or too many rows")
 return report

def main():
 parser=argparse.ArgumentParser()
 parser.add_argument("--output",type=Path,required=True)
 args=parser.parse_args()
 args.output.unlink(missing_ok=True)
 source={}
 for i,ticker in enumerate(SYMBOLS):
  try:
   source[ticker]=fetch_chart(ticker)
   print(ticker,source[ticker]["status"],flush=True)
  except (OSError,ValueError,KeyError,TypeError) as exc:
   source[ticker]={"status":"error"}
   print(ticker,type(exc).__name__,flush=True)
 report=build_public_report(source)
 args.output.parent.mkdir(parents=True,exist_ok=True)
 args.output.write_text(json.dumps(report,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
 print("TEST market trend observations:",report["row_count"],"missing:",len(report["missing_symbols"]),flush=True)

if __name__=="__main__": main()
