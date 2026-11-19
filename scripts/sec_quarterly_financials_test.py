#!/usr/bin/env python3
"""Read-only official SEC XBRL quarterly preview. Never writes to Supabase.
Requires INVESTLAB_SEC_USER_AGENT with a real contact address; do not commit it.
Quarterly CAPEX is only shown for matching PP&E cash purchases (direct or YTD delta).
"""
import json
import os
import re
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

ISSUERS = {
    "MSFT": ("0000789019", "RevenueFromContractWithCustomerExcludingAssessedTax"),
    "GOOGL": ("0001652044", "RevenueFromContractWithCustomerExcludingAssessedTax"),
    "AMZN": ("0001018724", "SalesRevenueNet"),
    "META": ("0001326801", "RevenueFromContractWithCustomerExcludingAssessedTax"),
    "TSLA": ("0001318605", "RevenueFromContractWithCustomerExcludingAssessedTax"),
}
METRICS = {
    "revenue": "revenue_usd_bn",
    "operating": "operating_income_usd_bn",
    "capex": "capex_usd_bn",
}
DAY = 86400
FORMS = {"10-Q", "10-K", "10-Q/A", "10-K/A"}
PERIODS = ("Q1", "Q2", "Q3", "Q4")
CAPEX_TAG = "PaymentsToAcquirePropertyPlantAndEquipment"

def duration(row):
    try:
        return (date.fromisoformat(row["end"]) - date.fromisoformat(row["start"])).days + 1
    except (KeyError, ValueError, TypeError):
        return -1

def extract(facts, tag):
    values = (facts.get("facts") or {}).get("us-gaap", {}).get(tag, {}).get("units", {}).get("USD", [])
    clean = []
    for x in values:
        if (not isinstance(x, dict) or x.get("form") not in FORMS
            or x.get("fp") not in (*PERIODS, "FY") or not isinstance(x.get("fy"), int)
            or not isinstance(x.get("val"), (int, float)) or not x.get("accn")
            or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(x.get("filed", "")))
            or duration(x) < 70 or duration(x) > 380 or x["end"] < "2023-01-01"):
            continue
        clean.append(x)
    return clean

def newest(rows):
    return max(rows, key=lambda x: (x["filed"], x["accn"]))

def quarterly(rows, cash_spend=False):
    """Prefer directly stated 3-month facts, otherwise matching fiscal YTD deltas."""
    direct, cumul = {}, {}
    for x in rows:
        fiscal = x["fy"]
        fp = "Q4" if x["fp"] == "FY" else x["fp"]
        key = (fiscal, fp)
        days = duration(x)
        if 70 <= days <= 110 and x["fp"] != "FY":
            if key not in direct or (x["filed"], x["accn"]) > (direct[key]["filed"], direct[key]["accn"]):
                direct[key] = x
        if x["fp"] == "FY" and days < 320:
            continue
        if key not in cumul or (x["filed"], x["accn"]) > (cumul[key]["filed"], cumul[key]["accn"]):
            cumul[key] = x
    answer = {}
    for key, item in direct.items():
        v = float(item["val"])
        if not cash_spend or v >= 0:
            answer[key] = {"end": item["end"], "value": abs(v) if cash_spend else v,
                           "accn": item["accn"], "mode": "direct"}
    for key, item in cumul.items():
        if key in answer:
            continue
        fiscal, fp = key
        idx = PERIODS.index(fp)
        if idx == 0:
            if not (70 <= duration(item) <= 110):
                continue
            value = float(item["val"])
        else:
            previous = cumul.get((fiscal, PERIODS[idx-1]))
            if (not previous or previous.get("start") != item.get("start")
                or previous["end"] >= item["end"] or duration(item) < 140):
                continue
            value = float(item["val"]) - float(previous["val"])
        if not (-1e15 < value < 1e15) or (not cash_spend and value < 0):
            continue
        answer[key] = {"end": item["end"], "value": abs(value) if cash_spend else value,
                       "accn": item["accn"], "mode": "ytd_delta" if idx else "ytd_q1"}
    return answer

def collect_company(ticker, cik, revenue_tag, user_agent):
    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
    req = urllib.request.Request(url, headers={"User-Agent": user_agent, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=22) as response:
        raw = response.read(16_000_001)
        if len(raw) > 16_000_000 or response.status != 200:
            raise ValueError("SEC response size/status rejected")
    facts = json.loads(raw)
    if str(facts.get("cik", "")).zfill(10) != cik:
        raise ValueError("SEC CIK mismatch")
    selections = {
        "revenue": quarterly(extract(facts, revenue_tag)),
        "operating": quarterly(extract(facts, "OperatingIncomeLoss")),
        "capex": quarterly(extract(facts, CAPEX_TAG), cash_spend=True),
    }
    result = []
    for period in sorted(set().union(*(set(s) for s in selections.values()))):
        fy, fp = period
        selected = {name: data.get(period) for name, data in selections.items()}
        # A reporting quarter needs a consolidated revenue observation.
        revenue = selected["revenue"]
        if not revenue or revenue["value"] <= 0:
            continue
        row = {"ticker": ticker, "fiscal_period": f"{fy}-{fp}",
               "period_end": revenue["end"], "source_url": url,
               "status": "SEC_XBRL_PRELIMINARY"}
        for metric, key in METRICS.items():
            value = selected[metric]
            # Prevent accidentally mixing different quarter-end reporting dates.
            row[key] = round(value["value"]/1_000_000_000, 6) if value and value["end"] == revenue["end"] else None
        op, rev = row["operating_income_usd_bn"], row["revenue_usd_bn"]
        row["operating_margin_pct"] = round(op/rev*100, 3) if op is not None and rev else None
        row["capex_definition"] = ("SEC us-gaap cash PP&E purchases (direct or matching fiscal YTD delta); "
                                    "issuer-specific comparability not yet approved")
        result.append(row)
    return result[-24:]

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("sec-quarterly-financials.json"))
    args = parser.parse_args()
    agent = os.getenv("INVESTLAB_SEC_USER_AGENT", "").strip()
    if not agent or not re.search(r"[^\s@]+@[^\s@]+\.[^\s@]+", agent):
        raise SystemExit("SEC contact User-Agent not configured: no requests or financial data published")
    result = {"format": "INVESTLAB_SEC_QUARTERLY_PREVIEW_V1", "source": "SEC Company Facts",
              "generated_at": datetime.now(timezone.utc).isoformat(), "rows": [], "errors": {},
              "status": "preliminary_not_filing_reconciled", "database_writes": 0}
    for ticker, (cik, tag) in ISSUERS.items():
        try:
            rows = collect_company(ticker, cik, tag, agent)
            if not rows:
                raise ValueError("No comparable quarterly revenue found")
            result["rows"].extend(rows)
        except (OSError, ValueError, KeyError, TypeError) as exc:
            result["errors"][ticker] = (type(exc).__name__ + ": " + str(exc))[:140]
    result["rows"].sort(key=lambda r: (r["ticker"], r["period_end"]))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("SEC preliminary rows:", len(result["rows"]), "issuers:", len(ISSUERS), "errors:", len(result["errors"]))
    # Partial issuer coverage is visible; an entirely empty file is not published.
    return 0 if result["rows"] else 1

if __name__ == "__main__":
    raise SystemExit(main())
