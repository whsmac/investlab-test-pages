"""Offline SEC Company Facts review, with optional comparison against FSDS review JSON.
No HTTP, no authentication, no database writes, no publication.
"""
import argparse
import hashlib
import html
import plistlib
from urllib.parse import urlsplit
import json
import re
from collections import defaultdict
from datetime import date
from decimal import Decimal
from pathlib import Path
from .sec_quarterly_financials_test import ISSUERS, FORMS
from .sec_fsds_evidence_audit import audit, fiscal, idx, end_from_index

METRICS={
    "revenue_usd_bn":("RevenueFromContractWithCustomerExcludingAssessedTax","SalesRevenueNet","Revenues"),
    "operating_income_usd_bn":("OperatingIncomeLoss",),
    "capex_usd_bn":("PaymentsToAcquirePropertyPlantAndEquipment",),
}
MAX_BYTES=40*1024**2

def load_json(path):
    with Path(path).open("rb") as f:
        raw=f.read(MAX_BYTES+1)
    if len(raw)>MAX_BYTES:
        raise ValueError("Input too large")
    if Path(path).suffix.lower()=='.webarchive':
        resource=plistlib.loads(raw)['WebMainResource']
        url=urlsplit(resource['WebResourceURL'])
        match=re.fullmatch(r'/api/xbrl/companyfacts/CIK(\d{10})\.json',url.path)
        if url.scheme!='https' or url.netloc!='data.sec.gov' or not match or resource.get('WebResourceMIMEType')!='application/json':
            raise ValueError('Unexpected archived source')
        content=resource['WebResourceData'].decode('utf-8')
        if content.lstrip().startswith('<'):
            wrapper=re.fullmatch(r'<html>.*?<pre[^>]*>(.*?)</pre>.*?</html>',content,re.S)
            if not wrapper:raise ValueError('Unexpected archived JSON wrapper')
            content=html.unescape(wrapper.group(1))
        payload=json.loads(content,parse_float=Decimal)
        if str(payload.get('cik','')).zfill(10)!=match.group(1):raise ValueError('Archived issuer mismatch')
    else:
        payload=json.loads(raw,parse_float=Decimal)
    return payload,hashlib.sha256(raw).hexdigest()

def collect(payload, asof, *, amazon_candidate=False):
    cik=str(payload.get("cik","")).zfill(10)
    ticker=next((t for t,(c,_) in ISSUERS.items() if c==cik),None)
    if not ticker:
        raise ValueError("Unexpected SEC issuer CIK")
    gaap=payload["facts"]["us-gaap"]
    if not isinstance(gaap,dict):
        raise ValueError("Invalid US GAAP facts")
    candidates=defaultdict(list)
    for metric,tags in METRICS.items():
        if amazon_candidate and ticker=='AMZN' and metric=='capex_usd_bn':
            tags=(*tags,'PaymentsToAcquireProductiveAssets')
        # Broader productive-assets tag is not assumed equivalent to PP&E.
        # FSDS primary-statement evidence is needed before adopting this tag.
        for tag in tags:
            for fact in gaap.get(tag,{}).get("units",{}).get("USD",[]):
                try:
                    start,end,filed=(date.fromisoformat(fact[k]) for k in ("start","end","filed"))
                    val=fact["val"]; acc=fact["accn"]
                    if type(val) not in (int,Decimal) or not Decimal(val).is_finite() or abs(val)>=10**15:
                        continue
                    if fact["form"] not in FORMS or not re.fullmatch(r"\d{10}-\d{2}-\d{6}",acc):
                        continue
                    if not start<=end<=filed<=asof or end.year<2021 or end!=end_from_index(idx(end)):
                        continue
                    days=(end-start).days+1
                    if not 70<=days<=380 or (metric=="capex_usd_bn" and val<0) or (metric=="revenue_usd_bn" and val<=0):
                        continue
                    evidence={"tag":tag,"start":start.isoformat(),"end":end.isoformat(),"filed":filed.isoformat(),
                              "accession":acc,"value_usd":str(val),"filing_url":f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc.replace('-','')}/"}
                    candidates[(metric,start,end)].append(evidence)
                except (KeyError,TypeError,ValueError):
                    continue
    def select(key, cutoff=None, tag=None):
        options=[x for x in candidates.get(key,[]) if (cutoff is None or x['filed']<=cutoff) and (tag is None or x['tag']==tag)]
        if not options:
            return None
        newest=max(x["filed"] for x in options)
        options=[x for x in options if x["filed"]==newest]
        if len({Decimal(x['value_usd']) for x in options})!=1:
            return None
        if len({x['accession'] for x in options})!=1:
            return None
        priority=METRICS[key[0]]+('PaymentsToAcquireProductiveAssets',)
        chosen=dict(min(options,key=lambda x:priority.index(x['tag'])))
        aliases=sorted({x['tag'] for x in options})
        if len(aliases)>1:chosen['equal_value_tags']=aliases
        return chosen
    rows=[]
    for end in sorted({k[2] for k in candidates}):
        fy,fq=fiscal(ticker,end)
        prev=end_from_index(idx(end)-1)
        quarter_start=date.fromordinal(prev.toordinal()+1)
        fiscal_start=date.fromordinal(end_from_index(idx(end)-fq).toordinal()+1)
        row={"ticker":ticker,"period_end":end.isoformat(),"fiscal_period":f"{fy}-Q{fq}",
             "status":"SEC_COMPANY_FACTS_REVIEW_ONLY","provenance":{}}
        for metric in METRICS:
            direct_key=(metric,quarter_start,end)
            direct=select(direct_key)
            value=None; proof=None
            if direct:
                value=Decimal(direct["value_usd"])
                proof={"mode":"direct","facts":[direct]}
            elif direct_key not in candidates and fq>1:
                current=select((metric,fiscal_start,end))
                prior=select((metric,fiscal_start,prev),current['filed'],current['tag']) if current else None
                if current and prior and current["tag"]==prior["tag"] and prior["filed"]<=current["filed"]:
                    value=Decimal(current["value_usd"])-Decimal(prior["value_usd"])
                    proof={"mode":"same_start_ytd_delta_unreconciled","facts":[current,prior]}
            if value is not None and ((metric=="revenue_usd_bn" and value<=0) or (metric=="capex_usd_bn" and value<0)):
                value=None; proof=None
            row[metric]=float(value/Decimal("1e9")) if value is not None else None
            if proof:
                if any(f['tag']=='PaymentsToAcquireProductiveAssets' for f in proof['facts']):
                    proof['definition_status']='AMZN_productive_assets_candidate_not_period_reconciled'
                row["provenance"][metric]=proof
        rev,op=row["revenue_usd_bn"],row["operating_income_usd_bn"]
        if rev is None:
            continue
        row["operating_margin_pct"]=round(op/rev*100,3) if op is not None else None
        rows.append(row)
    return ticker,rows

def compare(rows, baseline):
    # Baseline arithmetic/structure must pass independent FSDS checks.
    audit(baseline)
    index={(r["ticker"],r["period_end"]):r for r in baseline["rows"]}
    result=[]
    for row in rows:
        old=index.get((row["ticker"],row["period_end"]))
        if old is None:
            continue
        for metric in METRICS:
            a,b=row[metric],old[metric]
            if a is None or b is None:
                status="missing"
            elif Decimal(str(a))==Decimal(str(b)):
                status="match"
            else:
                status="different_requires_filing_review"
            result.append({"ticker":row["ticker"],"period_end":row["period_end"],"metric":metric,
                           "company_facts":a,"fsds":b,"status":status})
    return result

def build(paths,asof,baseline=None,*,amazon_candidate=False):
    rows=[]; manifest={}
    for p in paths:
        payload,digest=load_json(p)
        ticker,found=collect(payload,asof,amazon_candidate=amazon_candidate)
        if ticker in manifest:
            raise ValueError("Duplicate issuer input")
        manifest[ticker]={"sha256":digest,"bytes":Path(p).stat().st_size}
        rows.extend(found)
    rows.sort(key=lambda r:(r["ticker"],r["period_end"]))
    lookup={(r["ticker"],r["period_end"]):r for r in rows}
    last=idx(asof)-(end_from_index(idx(asof))>asof)
    coverage={}
    for t in ISSUERS:
        coverage[t]={}
        for n in (12,20):
            expected=[end_from_index(i).isoformat() for i in range(last-n+1,last+1)]
            coverage[t][str(n)]={}
            for metric in (*METRICS,"operating_margin_pct"):
                missing=[d for d in expected if lookup.get((t,d),{}).get(metric) is None]
                coverage[t][str(n)][metric]={"expected":n,"available":n-len(missing),"missing":missing}
    comparisons=compare(rows,baseline) if baseline is not None else []
    return {"format":"INVESTLAB_SEC_COMPANY_FACTS_REVIEW_V1","as_of":asof.isoformat(),
            "source":"SEC Company Facts (local JSON)","input_manifest":manifest,"rows":rows,
            "coverage":coverage,"comparison":comparisons,
            "filing_reconciled":False,"publication_allowed":False,"database_writes":0}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("inputs",nargs="+",type=Path)
    p.add_argument("--baseline",type=Path)
    p.add_argument("--output",type=Path,required=True)
    p.add_argument('--amazon-candidate',action='store_true',help='Review-only productive assets candidate; not approved PP&E')
    a=p.parse_args()
    if a.output.name=="sec-quarterly-financials.json" or a.output.exists():
        p.error("Use a new review filename")
    baseline=json.loads(a.baseline.read_text()) if a.baseline else None
    result=build(a.inputs,date.today(),baseline,amazon_candidate=a.amazon_candidate)
    with a.output.open("x",encoding="utf-8") as f:
        json.dump(result,f,ensure_ascii=False,allow_nan=False,indent=2)
    print("REVIEW_ONLY",len(result["rows"]),"rows;",len(result["comparison"]),"comparisons")
    return 0 if result["rows"] else 1

if __name__=="__main__":
    raise SystemExit(main())
