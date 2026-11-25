"""Convert provider split-adjusted closes to contemporaneous share basis.
Only public market data; no ledger, account or holding data.
"""
from decimal import Decimal
from datetime import datetime, timezone, date

def extract_split_history(result):
    events=result.get("events",{})
    if not isinstance(events,dict): raise ValueError("Malformed events")
    splits=events.get("splits",{})
    if not isinstance(splits,dict): raise ValueError("Malformed splits")
    out={}
    for event in splits.values():
        d=datetime.fromtimestamp(event["date"],timezone.utc).date().isoformat()
        num,den=Decimal(str(event["numerator"])),Decimal(str(event["denominator"]))
        if not num.is_finite() or not den.is_finite() or num<=0 or den<=0 or d in out:
            raise ValueError("Invalid or duplicated split")
        if event.get("splitRatio"):
            a,b=event["splitRatio"].split(":")
            if Decimal(a)/Decimal(b)!=num/den: raise ValueError("Conflicting split ratio")
        out[d]={"date":d,"numerator":str(num),"denominator":str(den)}
    return [out[d] for d in sorted(out)]

def apply_split_basis(observations,splits):
    result=[]
    for row in observations:
        day=date.fromisoformat(row["trading_date"])
        factor=Decimal(1)
        for event in splits:
            # Split effective date uses new shares; only earlier closes need undoing.
            if date.fromisoformat(event["date"])>day:
                factor*=Decimal(event["numerator"])/Decimal(event["denominator"])
        adjusted=Decimal(str(row["close_price"]))
        raw=adjusted*factor
        if not raw.is_finite() or not Decimal(0)<raw<Decimal("1000000"):
            raise ValueError("Invalid reconstructed close")
        result.append({**row,"as_traded_close":str(raw),"split_factor":str(factor)})
    return result
