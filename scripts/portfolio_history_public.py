"""Public-only daily ETF and Fed H.10 FX history for Pilot; no user data."""
import csv,io,json,math,urllib.request
from datetime import date,timedelta
from pathlib import Path
ETF={"BITU","TQQQ","USD"}
FX_URL="https://fred.stlouisfed.org/graph/fredgraph.csv?id=DEXKOUS"
def parse_fx(raw,today=None):
    today=today or date.today()
    reader=csv.DictReader(io.StringIO(raw))
    if reader.fieldnames not in (["observation_date","DEXKOUS"],["DATE","DEXKOUS"]):
        raise ValueError("Unexpected FRED headers")
    rows=[]
    for r in reader:
        d=date.fromisoformat(r[reader.fieldnames[0]])
        if not today-timedelta(days=1830)<=d<=today or r["DEXKOUS"] in ("","."):
            continue
        rows.append({"ticker":"USDKRW","date":d.isoformat(),"close":float(r["DEXKOUS"])})
    return rows
def verify_history(payload,today=None):
    today=today or date.today()
    if set(payload)!={"format","source","database_writes","rows"} or payload["format"]!="PILOT_PUBLIC_HISTORY_V1" or payload["source"]!="Yahoo Finance / Federal Reserve H.10 DEXKOUS" or payload["database_writes"]!=0:
        raise ValueError("Invalid public history metadata")
    seen=set()
    rows=payload["rows"]
    if not isinstance(rows,list) or not 1<=len(rows)<=8000:raise ValueError("Invalid row count")
    for r in rows:
        if set(r)!={"ticker","date","close"} or r["ticker"] not in ETF|{"USDKRW"}:raise ValueError("Unexpected field")
        d=date.fromisoformat(r["date"])
        v=r["close"]
        key=(r["ticker"],r["date"])
        if not today-timedelta(days=1840)<=d<=today or isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) or not 0<v<100000 or key in seen:raise ValueError("Invalid history row")
        seen.add(key)
    return payload
def build_history(sources,fx_rows,today=None):
    rows=list(fx_rows)
    for ticker in sorted(ETF):
        source=sources.get(ticker,{})
        if source.get("status")!="ok" or source.get("currency")!="USD" or source.get("price_basis")!="unadjusted_close":continue
        rows.extend({"ticker":ticker,"date":r["trading_date"],"close":float(r["close_price"])} for r in source["observations"])
    return verify_history({"format":"PILOT_PUBLIC_HISTORY_V1","source":"Yahoo Finance / Federal Reserve H.10 DEXKOUS","database_writes":0,"rows":rows},today)
def write_history(sources,output):
    fx=[]
    try:
        with urllib.request.urlopen(FX_URL,timeout=12) as response:
            raw=response.read(2_000_001)
            if len(raw)>2_000_000:raise ValueError("FRED response too large")
        fx=parse_fx(raw.decode("utf-8-sig"))
    except (OSError,ValueError,KeyError) as e:
        print("FX history unavailable:",type(e).__name__)
    payload=build_history(sources,fx)
    output.write_text(json.dumps(payload,separators=(",",":"))+"\n",encoding="utf-8")
    print("PUBLIC_HISTORY_ROWS",len(payload["rows"]),"FX_ROWS",len(fx))
