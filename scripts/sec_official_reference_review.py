"""Compare SEC review rows to independently reviewed official reference amounts.
Review evidence only; does not publish or fill missing financial observations.
"""
import argparse
import json
from decimal import Decimal
from pathlib import Path

FIELDS = {"revenue":"revenue_usd_bn","operating_income":"operating_income_usd_bn","capex":"capex_usd_bn"}
ISSUERS = {"MSFT","GOOGL","AMZN","META","TSLA","SPCX"}

def compare(review, reference):
    if review.get("format")!="INVESTLAB_SEC_FSDS_REVIEW_V1" or review.get("database_writes")!=0:
        raise ValueError("Unexpected review input")
    if reference.get("format")!="INVESTLAB_SEC_MANUAL_REFERENCE_V1" or reference.get("unit")!="USD million" or reference.get("review_only") is not True:
        raise ValueError("Unexpected reference format")
    period=reference["period_end"]
    index={}
    for row in review["rows"]:
        key=(row["ticker"],row["period_end"])
        if key in index:
            raise ValueError("Duplicate review period")
        index[key]=row
    seen=set()
    results=[]
    for ref in reference["rows"]:
        ticker=ref["ticker"]
        if ticker not in ISSUERS or ticker in seen or not ref["url"].startswith("https://"):
            raise ValueError("Invalid reference issuer/source")
        seen.add(ticker)
        row=index.get((ticker,period),{})
        for metric,field in FIELDS.items():
            expected=ref[metric]
            actual=row.get(field)
            if expected is None:
                status="not_reference_verified"
            elif actual is None:
                status="missing"
            elif type(expected) is not int or type(actual) not in (int,float):
                raise ValueError("Invalid financial amount")
            elif Decimal(str(actual))*1000==Decimal(expected):
                status="match"
            else:
                status="mismatch"
            results.append({"ticker":ticker,"period_end":period,"metric":metric,"status":status,
                            "reference_usd_million":expected,"review_usd_bn":actual,"source_url":ref["url"]})
    if seen!=ISSUERS:
        raise ValueError("Reference issuer set incomplete")
    return {"status":"REVIEW_ONLY","publication_allowed":False,"database_writes":0,
            "matches":sum(r["status"]=="match" for r in results),
            "mismatches":sum(r["status"]=="mismatch" for r in results),
            "missing":sum(r["status"]=="missing" for r in results),
            "not_reference_verified":sum(r["status"]=="not_reference_verified" for r in results),"results":results}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("review",type=Path)
    p.add_argument("reference",type=Path)
    p.add_argument("--output",type=Path,required=True)
    a=p.parse_args()
    if a.output.name=="sec-quarterly-financials.json":
        p.error("Review output must not overwrite published asset")
    report=compare(json.loads(a.review.read_text()),json.loads(a.reference.read_text()))
    with a.output.open("x",encoding="utf-8") as f:
        json.dump(report,f,indent=2,allow_nan=False)
    print({k:v for k,v in report.items() if k!="results"})
    return int(bool(report["mismatches"] or report["missing"]))

if __name__=="__main__":
    raise SystemExit(main())
