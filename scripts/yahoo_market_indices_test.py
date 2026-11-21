#!/usr/bin/env python3
"""Read-only TEST Nasdaq-100 and S&P 500 index-level publication candidate."""
import argparse
import json
from datetime import date, timedelta
from pathlib import Path
from scripts.yahoo_price_probe_test import fetch_chart

SOURCES={"NDX":"^NDX","SPX":"^GSPC"}

def create_report(source_rows,today=None):
    today=today or date.today()
    report={"mode":"BENCHMARK_REVIEW_ONLY","source":"Yahoo Finance",
            "generated_on":today.isoformat(),"database_writes":0,"writes_performed":0,
            "symbols":SOURCES.copy(),"observations":[]}
    for key,original in SOURCES.items():
        result=source_rows[key]
        if (result.get("status")!="ok" or result.get("currency")!="USD"
            or result.get("price_basis")!="unadjusted_close"):
            raise ValueError(key+": incorrect source metadata")
        rows=result["observations"]
        if len(rows)<1100 or (today-date.fromisoformat(rows[0]["trading_date"])).days<1650:
            raise ValueError(key+": truncated five-year history")
        dates=set()
        for row in rows:
            day=date.fromisoformat(row["trading_date"])
            val=float(row["close_price"])
            if (day>today or day<today-timedelta(days=1850) or
                (today-day).days<0 or not (val>0) or val==float("inf") or
                day in dates):
                raise ValueError(key+": invalid index level")
            dates.add(day)
            report["observations"].append({
                "ticker":key,"source_symbol":original,"date":day.isoformat(),
                "close":str(row["close_price"]),"unit":"index_points",
                "currency":"USD","price_basis":"index_close"})
        if (today-max(dates)).days>7:raise ValueError(key+": stale source")
    report["observations"].sort(key=lambda r:(r["ticker"],r["date"]))
    report["row_count"]=len(report["observations"])
    return report

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    args.output.unlink(missing_ok=True)
    report=create_report({key:fetch_chart(symbol) for key,symbol in SOURCES.items()})
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    print("TEST index levels:",report["row_count"],"rows; database writes: 0")

if __name__=="__main__":main()
