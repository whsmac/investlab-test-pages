#!/usr/bin/env python3
"""Prepare a TEST-only market price insert manifest; never execute database writes.

This is a data contract for a future explicitly approved TEST writer. No SQL,
Supabase client, credentials, or network operations are present.
"""
import argparse
import json
from datetime import date
from decimal import Decimal
from pathlib import Path

TEST_PROJECT = "gopofxyezhwpfxbecrxd"
ALLOWED = {"MSFT", "GOOGL", "AMZN", "META", "TSLA"}


def build_manifest(preview, company_map):
    if preview.get("mode") != "NON_EXECUTABLE_IMPORT_PREVIEW":
        raise ValueError("Invalid preview mode")
    if preview.get("database_insert_authorized") is not False or preview.get("writes_performed") != 0:
        raise ValueError("Preview must be read-only")
    candidates = preview.get("candidates")
    if not isinstance(candidates, list) or preview.get("candidate_count") != len(candidates):
        raise ValueError("Candidate count mismatch")
    if preview.get("conflict_count") != 0:
        raise ValueError("Unresolved source/database conflicts")
    if not isinstance(company_map, dict) or not all(t in company_map for t in ALLOWED):
        raise ValueError("Explicit TEST company mapping required")
    if any(not isinstance(company_map[t], int) or isinstance(company_map[t], bool)
           or company_map[t] <= 0 for t in ALLOWED):
        raise ValueError("Invalid company id")
    if len(set(company_map[t] for t in ALLOWED)) != len(ALLOWED):
        raise ValueError("Duplicate company id")
    rows = []
    seen = set()
    for candidate in candidates:
        ticker = candidate.get("ticker")
        if ticker not in ALLOWED:
            raise ValueError("Unapproved ticker")
        day = date.fromisoformat(candidate["trading_date"]).isoformat()
        close = Decimal(str(candidate["close_price"]))
        if not close.is_finite() or close <= 0:
            raise ValueError("Invalid close")
        if candidate.get("currency") != "USD" or candidate.get("price_basis") != "unadjusted_close":
            raise ValueError("Currency or basis mismatch")
        key = (ticker, day)
        if key in seen:
            raise ValueError("Duplicate row")
        seen.add(key)
        rows.append({"company_id": company_map[ticker], "trading_date": day,
                     "close_price": str(close), "currency": "USD",
                     "price_basis": "unadjusted_close"})
    rows.sort(key=lambda row: (row["company_id"], row["trading_date"]))
    return {"mode": "TEST_INSERT_MANIFEST_NOT_EXECUTABLE",
            "test_project_id": TEST_PROJECT, "target_table": "market_price_observations",
            "database_insert_authorized": False, "writes_performed": 0,
            "requires_explicit_user_approval": True,
            "requires_authenticated_test_rls_check": True,
            "requires_fresh_snapshot_and_conflict_recheck": True,
            "requires_source_usage_terms_review": True,
            "row_count": len(rows), "rows": rows,
            "notice": "Manifest only. No database changes or import permission."}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", type=Path, required=True)
    parser.add_argument("--company-map", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("yahoo-test-insert-manifest.json"))
    args = parser.parse_args()
    manifest = build_manifest(json.loads(args.preview.read_text(encoding="utf-8-sig")),
                              json.loads(args.company_map.read_text(encoding="utf-8-sig")))
    args.output.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("TEST manifest:", manifest["row_count"], "rows, writes:", manifest["writes_performed"])


if __name__ == "__main__":
    main()
