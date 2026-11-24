#!/usr/bin/env python3
"""Summarize SEC preview coverage without database writes or contact disclosure."""
import argparse
import json
import math
import re
from datetime import date, timedelta
from pathlib import Path

ISSUERS=("MSFT","GOOGL","AMZN","META","TSLA","SPCX")
MEASURES=("revenue_usd_bn","capex_usd_bn","operating_income_usd_bn","operating_margin_pct")
FORMAT="INVESTLAB_SEC_QUARTERLY_PREVIEW_V1"
def summarize(payload=None,today=None):
    today=today or date.today()
    output={"mode":"SEC_PRELIMINARY_COVERAGE_REVIEW_ONLY","source":"SEC Company Facts",
            "database_writes":0,"status":"missing_contact_or_source" if payload is None else "preliminary",
            "as_of":today.isoformat(),"missing_issuer_facts":[],"issuers":[]}
    if payload is None:
        output["missing_issuer_facts"]=list(ISSUERS)
        output["issuers"]=[{"ticker":ticker,"quarters":0,"covers_3y":False,"covers_5y":False,
           "earliest":None,"latest":None,"missing_measures":list(MEASURES)} for ticker in ISSUERS]
        return output
    if (payload.get("format")!=FORMAT or payload.get("source")!="SEC Company Facts" or
        payload.get("database_writes")!=0 or not isinstance(payload.get("rows"),list)):
        raise ValueError("Invalid SEC preliminary preview")
    grouped={key:[] for key in ISSUERS}
    seen=set()
    for row in payload["rows"]:
        ticker=row.get("ticker")
        end=row.get("period_end")
        if (ticker not in grouped or row.get("status")!="SEC_XBRL_PRELIMINARY"
            or not isinstance(end,str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}",end)
            or not re.fullmatch(r"\d{4}-Q[1-4]",str(row.get("fiscal_period","")))
            or not str(row.get("source_url","")).startswith("https://data.sec.gov/api/xbrl/companyfacts/CIK")
            or (ticker,end) in seen):
            raise ValueError("Invalid SEC preliminary row")
        try:
            quarter_end=date.fromisoformat(end)
        except ValueError as exc:
            raise ValueError("Invalid SEC quarter date") from exc
        if quarter_end>today or quarter_end.year<2021:
            raise ValueError("SEC preliminary quarter outside bounds")
        seen.add((ticker,end))
        for field in MEASURES:
            value=row.get(field)
            if value is not None and (isinstance(value,bool) or not isinstance(value,(int,float)) or
                                      not math.isfinite(value)):
                raise ValueError("Nonfinite SEC financial metric")
        grouped[ticker].append(row)
    for ticker in ISSUERS:
        rows=sorted(grouped[ticker],key=lambda row:row["period_end"])
        ends=[date.fromisoformat(row["period_end"]) for row in rows]
        measure_missing=[field for field in MEASURES if not any(row.get(field) is not None for row in rows)]
        window3=[t for t in ends if t>=today-timedelta(days=3*366)]
        window5=[t for t in ends if t>=today-timedelta(days=5*366)]
        info={"ticker":ticker,"quarters":len(rows),
              "covers_3y":len(window3)>=12,
              "covers_5y":len(window5)>=20,
              "earliest":ends[0].isoformat() if ends else None,
              "latest":ends[-1].isoformat() if ends else None,
              "missing_measures":measure_missing}
        output["issuers"].append(info)
        if not rows:output["missing_issuer_facts"].append(ticker)
    if any(not row["covers_3y"] or not row["covers_5y"] for row in output["issuers"]):
        output["status"]="incomplete_preliminary_coverage"
    return output

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--source",type=Path,required=True)
    ap.add_argument("--output",type=Path,default=Path("sec-pilot-coverage.json"))
    ap.add_argument("--summary",type=Path)
    args=ap.parse_args()
    src=json.loads(args.source.read_text(encoding="utf-8")) if args.source.is_file() else None
    result=summarize(src)
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    label={"missing_contact_or_source":"미설정/자료 미게시",
           "incomplete_preliminary_coverage":"부분 확보",
           "preliminary":"예비자료 확보"}[result["status"]]
    summary=["### INVESTLAB TEST SEC 분기 재무자료 준비상태",f"상태: **{label}** (공식 공시 원문 대조 전)",
             "|기업|분기|3년|5년|최초|최종|","|---|---:|---|---|---|---|"]
    for r in result["issuers"]:
        summary.append(f"|{r['ticker']}|{r['quarters']}|{'확보' if r['covers_3y'] else '미확보'}|"+
                       f"{'확보' if r['covers_5y'] else '미확보'}|{r['earliest'] or '—'}|{r['latest'] or '—'}|")
    summary.append("SPCX는 SEC 공식 XBRL 기업 매핑 확인 전까지 수집 대상이 아닙니다.")
    summary.append("SEC 연락처는 공개 사이트·로그·리포트에 출력하지 않습니다.")
    report="\n".join(summary)+"\n"
    if args.summary:
        with args.summary.open("a",encoding="utf-8") as dest:dest.write(report)
    print(report)
    return 0

if __name__=="__main__":raise SystemExit(main())
