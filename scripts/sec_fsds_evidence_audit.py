"""Independent structural/arithmetic review. Does not certify official filing accuracy."""
import argparse
import calendar
import json
import math
import re
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from .sec_quarterly_financials_test import ISSUERS

FIELDS = {"revenue_usd_bn":{"RevenueFromContractWithCustomerExcludingAssessedTax","SalesRevenueNet","Revenues"},
          "operating_income_usd_bn":{"OperatingIncomeLoss"},
          "capex_usd_bn":{"PaymentsToAcquirePropertyPlantAndEquipment"}}
METRICS = (*FIELDS,"operating_margin_pct")
BASE="https://www.sec.gov/files/dera/data/financial-statement-data-sets/"

def need(condition,message):
    if not condition:
        raise ValueError(message)

def end_from_index(index):
    y,q=divmod(index,4)
    month=(q+1)*3
    return date(y,month,calendar.monthrange(y,month)[1])

def idx(d):
    return d.year*4+(d.month-1)//3

def fiscal(t,d):
    return (d.year+int(d.month>=7),(d.month-7)%12//3+1) if t=="MSFT" else (d.year,(d.month-1)//3+1)

def number(v):
    need(type(v) in (float,int) and math.isfinite(v),"Invalid metric")
    return Decimal(str(v))

def audit(payload):
    need(payload.get("format")=="INVESTLAB_SEC_FSDS_REVIEW_V1" and
         payload.get("status")=="review_only_not_filing_reconciled" and
         payload.get("source")=="SEC Financial Statement Data Sets" and
         payload.get("database_writes")==0,"Unexpected source or review status")
    asof=date.fromisoformat(payload["as_of"])
    need(asof<=date.today(),"Future review date")
    archives=payload["archives"]
    manifest=payload["archive_manifest"]
    need(isinstance(archives,list) and archives and len(archives)==len(set(archives)) and set(archives)==set(manifest),"Archive manifest mismatch")
    for a in archives:
        need(re.fullmatch(r"20(?:2[1-9]|[3-9]\d)q[1-4]",a),"Invalid archive quarter")
        m=manifest[a]
        need(re.fullmatch(r"[0-9a-f]{64}",m["sha256"]) and type(m["bytes"]) is int and 0<m["bytes"]<=250*1024**2,"Invalid archive evidence")
    rows={}
    need(isinstance(payload["rows"],list),"Invalid rows")
    for row in payload["rows"]:
        t=row["ticker"]; d=date.fromisoformat(row["period_end"])
        need(t in ISSUERS and d==end_from_index(idx(d)) and d<=asof and d.year>=2021,"Invalid issuer or period")
        key=(t,d)
        need(key not in rows and row["status"]=="SEC_FSDS_REVIEW_ONLY","Duplicate or unapproved row")
        fy,fq=fiscal(t,d)
        need(row["fiscal_period"]==f"{fy}-Q{fq}","Fiscal period mismatch")
        proof=row["provenance"]
        need(set(proof)<=set(FIELDS),"Unexpected provenance")
        for field,tags in FIELDS.items():
            value=row[field]
            if value is None:
                need(field not in proof,"Missing metric has evidence")
                continue
            val=number(value)
            ev=proof[field]; mode=ev["mode"]; facts=ev["facts"]
            need(mode in ("direct","ytd_delta_unreconciled"),"Unexpected derivation")
            need(len(facts)==(1 if mode=="direct" else 2),"Wrong fact count")
            amounts=[]
            for i,f in enumerate(facts):
                target=d if i==0 else end_from_index(idx(d)-1)
                need(f["period_end"]==target.isoformat(),"Fact date mismatch")
                expected=1 if mode=="direct" else fq-i
                need(f["qtrs"]==expected and expected>=1,"Fact duration mismatch")
                need(f["tag"] in tags and f["tag"]==facts[0]["tag"],"Inconsistent fact tag")
                filed=date.fromisoformat(f["filed"])
                need(target<=filed<=asof,"Invalid filing date")
                need(f["archive_url"] in {BASE+a+".zip" for a in archives},"Unknown archive")
                acc=f["accession"]
                need(re.fullmatch(r"\d{10}-\d{2}-\d{6}",acc),"Invalid accession")
                need(f["filing_url"]==f"https://www.sec.gov/Archives/edgar/data/{int(ISSUERS[t][0])}/{acc.replace('-','')}/","Filing URL mismatch")
                a=Decimal(f["value_usd"])
                need(a.is_finite() and abs(a)<Decimal("1e15"),"Invalid source amount")
                amounts.append(a)
            if mode=="ytd_delta_unreconciled":
                need(fq>1 and fiscal(t,end_from_index(idx(d)-1))==(fy,fq-1),"Cross-fiscal-year difference")
                need(facts[1]["filed"]<=facts[0]["filed"],"Later prior filing")
            exact=(amounts[0]-(amounts[1] if len(amounts)==2 else 0))/Decimal("1e9")
            need(abs(val-exact)<=max(Decimal("1e-12"),abs(exact)*Decimal("1e-15")),"Source arithmetic mismatch")
            need(field!="revenue_usd_bn" or val>0,"Nonpositive revenue")
            need(field!="capex_usd_bn" or val>=0,"Negative CAPEX")
        rev=row["revenue_usd_bn"]; op=row["operating_income_usd_bn"]; margin=row["operating_margin_pct"]
        need(rev is not None,"Missing required revenue")
        if op is None:
            need(margin is None,"Margin without operating income")
        else:
            need(abs(number(margin)-number(op)/number(rev)*100)<=Decimal("0.00051"),"Margin mismatch")
        rows[key]=row
    # Only completed calendar quarters, not submission archive dates.
    last=idx(asof)
    if end_from_index(last)>asof:last-=1
    report={}
    for ticker in ISSUERS:
        report[ticker]={}
        for n in (12,20):
            expected=[end_from_index(i) for i in range(last-n+1,last+1)]
            report[ticker][str(n)]={}
            for metric in METRICS:
                missing=[d.isoformat() for d in expected if rows.get((ticker,d),{}).get(metric) is None]
                report[ticker][str(n)][metric]={"expected":n,"available":n-len(missing),"missing":missing}
    return {"status":"structural_arithmetic_review_only","filing_reconciled":False,"publication_allowed":False,
            "archive_hashes_verified_against_sec":False,"as_of":asof.isoformat(),"rows":len(rows),"coverage":report,"database_writes":0}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("input",type=Path)
    p.add_argument("--output",required=True,type=Path)
    a=p.parse_args()
    if a.output.name=="sec-quarterly-financials.json":
        p.error("Review output must not replace an existing site asset")
    result=audit(json.loads(a.input.read_text(encoding="utf-8")))
    with a.output.open("x",encoding="utf-8") as f:
        json.dump(result,f,ensure_ascii=False,indent=2,allow_nan=False)
    print("STRUCTURAL_REVIEW_OK; PUBLICATION_NOT_ALLOWED")

if __name__=="__main__":
    main()
