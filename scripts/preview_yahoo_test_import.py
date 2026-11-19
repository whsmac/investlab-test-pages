#!/usr/bin/env python3
"""Produce a TEST-only, non-executable import preview from a verified comparison.

No database client, credentials, network access, or write statements.
"""
import argparse
import json
from pathlib import Path

ALLOWED = {"MSFT", "GOOGL", "AMZN", "META", "TSLA"}


def build_preview(comparison):
    if comparison.get("mode") != "YAHOO_TEST_READ_ONLY_COMPARISON":
        raise ValueError("Unexpected comparison mode")
    if comparison.get("writes_performed") != 0 or comparison.get("database_insert_authorized") is not False:
        raise ValueError("Comparison is not read-only")
    if comparison.get("snapshot_scope") != "authenticated_RLS_visible_rows_only":
        raise ValueError("Unknown snapshot scope")
    missing = comparison.get("missing")
    same = comparison.get("same")
    conflicts = comparison.get("conflicts")
    counts = comparison.get("counts")
    if not all(isinstance(rows, list) for rows in (missing, same, conflicts)):
        raise ValueError("Missing comparison sections")
    if not isinstance(counts, dict) or any(counts.get(k) != len(rows) for k, rows in
                                             (("missing", missing), ("same", same), ("conflicts", conflicts))):
        raise ValueError("Comparison count mismatch")
    seen = set()
    candidates = []
    from datetime import date
    from decimal import Decimal
    for row in missing + same:
        ticker = row.get("ticker")
        if ticker not in ALLOWED:
            raise ValueError("Unapproved ticker")
        day = date.fromisoformat(row["trading_date"]).isoformat()
        value = Decimal(str(row["close_price"]))
        if not value.is_finite() or value <= 0:
            raise ValueError("Invalid closing price")
        if row.get("currency") != "USD" or row.get("price_basis") != "unadjusted_close":
            raise ValueError("Currency or price basis mismatch")
        k = (ticker, day)
        if k in seen:
            raise ValueError("Duplicate candidate")
        seen.add(k)
        if row in missing:
            candidates.append({"ticker": ticker, "trading_date": day,
                               "close_price": str(value), "currency": "USD",
                               "price_basis": "unadjusted_close"})
    blockers = list(comparison.get("blocking_reasons", []))
    blockers.extend(["TEST write permission and RLS not verified",
                     "User has not approved any TEST database write",
                     "RLS-visible snapshot cannot prove global absence of rows"])
    if conflicts:
        blockers.append("Existing observations conflict with Yahoo")
    return {"mode": "NON_EXECUTABLE_IMPORT_PREVIEW", "writes_performed": 0,
            "database_insert_authorized": False, "candidate_count": len(candidates),
            "duplicate_count": len(same), "conflict_count": len(conflicts),
            "candidates": candidates, "blocking_reasons": blockers,
            "notice": "Review only. No SQL, API mutation, or automatic import."}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--comparison", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("yahoo-import-preview.json"))
    args = parser.parse_args()
    result = build_preview(json.loads(args.comparison.read_text(encoding="utf-8-sig")))
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("TEST import preview:", result["candidate_count"], "new,",
          result["duplicate_count"], "already stored,",
          result["conflict_count"], "conflicts; no writes")


if __name__ == "__main__":
    main()
