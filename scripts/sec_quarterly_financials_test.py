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
FORMS = {"10-Q", "10-K", "10-Q/A", "10-K/A"}
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
            or x.get("fp") not in ("Q1", "Q2", "Q3", "Q4", "FY") or not isinstance(x.get("fy"), int)
            or not isinstance(x.get("val"), (int, float)) or not x.get("accn")
            or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(x.get("filed", "")))
            or duration(x) < 70 or duration(x) > 380 or x["end"] < "2023-01-01"):
            continue
        clean.append(x)
    return clean

def quarterly(rows, cash_spend=False):
    """Group by actual quarter end, not SEC's filing FY/FP (which also labels comparatives).

    Prefer 70-110 day standalone XBRL facts. For 6/9/12-month cumulative
    cash-flow facts, derive the quarter only from a prior cumulative fact
    with the SAME start date and a quarter-length period difference.
    All values remain preview-only until issuer-specific filing reconciliation.
    """
    by_range = {}
    for row in rows:
        end = row["end"]
        # These five issuers report calendar-quarter-end dates; skip non-quarter
        # interim facts rather than mislabelling them as fiscal quarters.
        try:
            end_date = date.fromisoformat(end)
            if end_date.month not in (3, 6, 9, 12):
                continue
            from calendar import monthrange
            if end_date.day != monthrange(end_date.year, end_date.month)[1]:
                continue
        except ValueError:
            continue
        key = (row["start"], end)
        previous = by_range.get(key)
        if previous is None or (row["filed"], row["accn"]) > (previous["filed"], previous["accn"]):
            by_range[key] = row
    direct, cumulative = {}, {}
    for row in by_range.values():
        days = duration(row)
        if 70 <= days <= 110:
            current = direct.get(row["end"])
            if current is None or (row["filed"], row["accn"]) > (current["filed"], current["accn"]):
                direct[row["end"]] = row
        elif 140 <= days <= 380:
            # Keep revisions separate by period start/end, not by FY/FP alone.
            cumulative[(row["start"], row["end"])] = row
    answer = {}
    for end, row in direct.items():
        value = float(row["val"])
        if cash_spend and value < 0:
            continue  # Never silently flip a filing's cash-flow sign.
        answer[end] = {"end": end, "value": value,
                       "accn": row["accn"], "mode": "direct"}
    for (start, end), row in sorted(cumulative.items(), key=lambda item: item[0][1]):
        if end in answer:
            continue
        # The prior cumulative period must be approximately one fiscal quarter earlier.
        prior = [prev for (pstart, pend), prev in by_range.items()
                 if pstart == start and pend < end and 70 <=
                 (date.fromisoformat(end) - date.fromisoformat(pend)).days <= 110]
        if not prior:
            continue
        previous = max(prior, key=lambda item: item["end"])
        value = float(row["val"]) - float(previous["val"])
        if not (-1e15 < value < 1e15) or (cash_spend and value < 0):
            continue
        answer[end] = {"end": end, "value": value,
                       "accn": row["accn"], "mode": "ytd_delta"}
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
    for period_end in sorted(selections["revenue"]):
        selected = {name: data.get(period_end) for name, data in selections.items()}
        # A reporting quarter needs a consolidated revenue observation.
        revenue = selected["revenue"]
        if not revenue or revenue["value"] <= 0:
            continue
        reported = date.fromisoformat(period_end)
        quarter = (reported.month - 1)//3 + 1
        row = {"ticker": ticker, "fiscal_period": f"{reported.year}-Q{quarter}",
               "period_end": period_end, "source_url": url,
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
