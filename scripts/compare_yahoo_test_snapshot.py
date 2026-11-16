#!/usr/bin/env python3
"""Compare Yahoo review candidate with a TEST RLS-visible snapshot, without writes."""
import argparse
import json
from decimal import Decimal
from pathlib import Path

from scripts.reconcile_price_probe_test import key, price


def compare(candidate, snapshot):
    if candidate.get("mode") != "REVIEW_ONLY" or candidate.get("database_insert_authorized") is not False or candidate.get("writes_performed") != 0:
        raise ValueError("Untrusted candidate")
    if snapshot.get("mode") != "READ_ONLY_SNAPSHOT":
        raise ValueError("Authenticated read-only snapshot required")
    coverage = snapshot.get("coverage", {})
    if coverage.get("complete") is not True or coverage.get("scope") != "authenticated_RLS_visible_rows_only":
        raise ValueError("Incomplete or unscoped snapshot")
    stored = {}
    for row in snapshot.get("observations", []):
        k = key(row["ticker"], row["trading_date"])
        if k in stored:
            raise ValueError("Duplicate stored key")
        stored[k] = row
    output = {"mode": "YAHOO_TEST_READ_ONLY_COMPARISON", "writes_performed": 0,
              "database_insert_authorized": False, "snapshot_scope": coverage["scope"],
              "missing": [], "same": [], "conflicts": [], "counts": {}}
    seen = set()
    for row in candidate.get("observations", []):
        k = key(row["ticker"], row["trading_date"])
        if k in seen:
            raise ValueError("Duplicate source key")
        seen.add(k)
        source_price = price(row["close_price"])
        if row.get("currency") != "USD" or row.get("price_basis") != "unadjusted_close":
            raise ValueError("Unsupported Yahoo candidate basis/currency")
        existing = stored.get(k)
        if existing is None:
            output["missing"].append(row)
        elif existing.get("currency") != row["currency"] or existing.get("price_basis") != row["price_basis"]:
            output["conflicts"].append({"source": row, "stored": existing, "reason": "currency_or_basis_mismatch"})
        elif price(existing["close_price"]) != source_price:
            output["conflicts"].append({"source": row, "stored": existing, "reason": "close_price_mismatch"})
        else:
            output["same"].append(row)
    output["counts"] = {k: len(output[k]) for k in ("missing", "same", "conflicts")}
    output["blocking_reasons"] = [
        "RLS-visible rows do not establish full database coverage",
        "Yahoo unofficial endpoint availability and permitted reuse require review",
        "No TEST write authorization or database change approval",
    ]
    if output["conflicts"]:
        output["blocking_reasons"].append("Conflicting stored data must be reviewed")
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", required=True, type=Path)
    parser.add_argument("--snapshot", required=True, type=Path)
    parser.add_argument("--output", type=Path, default=Path("yahoo-test-comparison.json"))
    args = parser.parse_args()
    result = compare(json.loads(args.candidate.read_text(encoding="utf-8-sig")),
                     json.loads(args.snapshot.read_text(encoding="utf-8-sig")))
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Yahoo TEST comparison (no writes):", result["counts"])


if __name__ == "__main__":
    main()
