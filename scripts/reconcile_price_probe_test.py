#!/usr/bin/env python3
"""Compare INVESTLAB TEST price probe with a read-only JSON export of stored rows.

No network calls, database credentials, or writes. Report is a proposed import plan.
Input snapshot JSON: [{"ticker":"MSFT","trading_date":"2026-11-13","close_price":"123.45"},...]
Or {"observations":[...]}.
"""
import argparse
import json
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

def price(value):
    try:
        number = Decimal(str(value))
    except (InvalidOperation, TypeError) as exc:
        raise ValueError("Invalid price") from exc
    if not number.is_finite() or number <= 0:
        raise ValueError("Non-positive or non-finite price")
    return number

def key(ticker, day):
    ticker = str(ticker).strip().upper()
    if not ticker or len(ticker) > 16 or not ticker.replace(".", "").replace("-", "").isalnum():
        raise ValueError("Invalid ticker")
    date.fromisoformat(str(day))
    return ticker, str(day)

def reconcile(probe, snapshot):
    if probe.get("mode") != "DRY_RUN_ONLY" or probe.get("writes_performed") != 0:
        raise ValueError("Only dry-run source reports are accepted")
    stored = snapshot.get("observations", []) if isinstance(snapshot, dict) else snapshot
    if not isinstance(stored, list):
        raise ValueError("Snapshot must be a JSON array")
    index = {}
    for row in stored:
        k = key(row["ticker"], row["trading_date"])
        p = price(row["close_price"])
        if k in index and index[k] != p:
            raise ValueError("Conflicting duplicate stored observation")
        index[k] = p
    plan = {"mode": "READ_ONLY_RECONCILIATION", "writes_performed": 0,
            "missing": [], "same": [], "conflicts": [], "skipped": [], "counts": {}}
    for ticker, result in probe.get("symbols", {}).items():
        if result.get("status") != "ok":
            plan["skipped"].append({"ticker": ticker, "reason": result.get("status", "unknown")})
            continue
        seen = {}
        for row in result.get("observations", []):
            k = key(ticker, row["trading_date"])
            p = price(row["close_price"])
            if k in seen and seen[k] != p:
                raise ValueError("Conflicting duplicate source observation")
            seen[k] = p
        for k, p in sorted(seen.items()):
            item = {"ticker": k[0], "trading_date": k[1], "source_close_price": str(p)}
            if k not in index:
                plan["missing"].append(item)
            elif index[k] == p:
                plan["same"].append(item)
            else:
                plan["conflicts"].append({**item, "stored_close_price": str(index[k])})
    plan["counts"] = {name: len(plan[name]) for name in ("missing", "same", "conflicts", "skipped")}
    # Partial snapshots can misclassify existing rows as missing. Never authorize
    # writes from an offline comparison without verified source provenance.
    coverage = snapshot.get("coverage") if isinstance(snapshot, dict) else None
    verified_snapshot = isinstance(coverage, dict) and coverage.get("complete") is True
    plan["snapshot_complete_claimed"] = verified_snapshot
    plan["source_price_basis_verified"] = False
    plan["currency_verified"] = False
    plan["safe_to_propose_insert"] = False
    plan["blocking_reasons"] = []
    if not verified_snapshot:
        plan["blocking_reasons"].append("Snapshot completeness is unverified")
    if plan["counts"]["conflicts"]:
        plan["blocking_reasons"].append("Conflicting stored closing prices")
    plan["blocking_reasons"].extend([
        "External source adjustment basis not verified against stored price_basis",
        "External source currency not verified against stored currency",
        "TEST ownership/RLS and write authorization not verified",
    ])
    plan["notice"] = "Comparison is informational only. No insert, update, or overwrite is authorized."
    return plan

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--probe", required=True, type=Path)
    parser.add_argument("--snapshot", required=True, type=Path)
    parser.add_argument("--output", default="price-reconciliation-plan.json", type=Path)
    args = parser.parse_args()
    result = reconcile(json.loads(args.probe.read_text(encoding="utf-8-sig")),
                       json.loads(args.snapshot.read_text(encoding="utf-8-sig")))
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Read-only comparison:", result["counts"], "safe_to_propose_insert:", result["safe_to_propose_insert"])

if __name__ == "__main__":
    main()
