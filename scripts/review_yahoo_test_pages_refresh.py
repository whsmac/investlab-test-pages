#!/usr/bin/env python3
"""Audit a proposed single-file Yahoo JSON refresh against an existing TEST Pages tree.

Read-only: no git push, GitHub Pages deployment, or database access.
"""
import argparse
import hashlib
import json
from datetime import date, timedelta
from pathlib import Path

ASSET = Path("data/yahoo-public-review.json")
EXPECTED = {"MSFT", "GOOGL", "AMZN", "META", "TSLA"}

def assess_refresh(current: Path, proposed: Path, today=None):
    if not current.is_dir():
        raise ValueError("Current TEST Pages site directory missing")
    if not proposed.is_file() or proposed.is_symlink():
        raise ValueError("Proposed Yahoo JSON file missing or symlinked")
    if proposed.stat().st_size > 2_000_000:
        raise ValueError("Proposed JSON exceeds size limit")
    payload = json.loads(proposed.read_text(encoding="utf-8"))
    if (payload.get("mode") != "REVIEW_ONLY" or payload.get("source") != "Yahoo Finance"
        or payload.get("database_insert_authorized") is not False
        or payload.get("writes_performed") != 0):
        raise ValueError("Proposed JSON is not a safe read-only review")
    rows = payload.get("observations")
    if not isinstance(rows, list) or not rows or len(rows) > 10000 or payload.get("row_count") != len(rows):
        raise ValueError("Invalid observation count")
    from scripts.export_yahoo_public_review import build_public_snapshot
    normalized = build_public_snapshot(payload)
    if normalized["observations"] != sorted(rows, key=lambda row:(row["ticker"],row["trading_date"])):
        raise ValueError("Unexpected or private observation fields")
    now = today or date.today()
    tickers = {row["ticker"] for row in rows}
    if tickers != EXPECTED:
        raise ValueError("Missing or unexpected tickers")
    for ticker in EXPECTED:
        dates = [date.fromisoformat(row["trading_date"]) for row in rows if row["ticker"] == ticker]
        if not dates or max(dates) > now or max(dates) < now-timedelta(days=7):
            raise ValueError("Stale or future price: " + ticker)
    old_asset = current / ASSET
    if old_asset.is_symlink():
        raise ValueError("Current asset is symlinked")
    previous = old_asset.read_bytes() if old_asset.is_file() else None
    incoming = proposed.read_bytes()
    observations_changed = True
    if previous is not None:
        try:
            old_payload = json.loads(previous.decode("utf-8"))
            old_rows = old_payload.get("observations")
            if (old_payload.get("mode") == "REVIEW_ONLY"
                and old_payload.get("source") == "Yahoo Finance"
                and old_payload.get("database_insert_authorized") is False
                and old_payload.get("writes_performed") == 0
                and isinstance(old_rows, list)
                and old_payload.get("row_count") == len(old_rows)
                and build_public_snapshot(old_payload)["observations"] == normalized["observations"]
                and old_rows == normalized["observations"]):
                observations_changed = False
        except (ValueError, KeyError, TypeError, UnicodeError, OverflowError):
            observations_changed = True
    return {"mode":"TEST_PAGES_SINGLE_ASSET_REFRESH_REVIEW",
            "review_only":True,"deployment_authorized":False,"deployment_performed":False,
            "database_writes":0,"allowed_change_paths":[ASSET.as_posix()],
            "asset_existed":previous is not None,
            "change_needed":previous != incoming,
            "observations_changed":observations_changed,
            "publication_needed":observations_changed,
            "previous_sha256":hashlib.sha256(previous).hexdigest() if previous is not None else None,
            "proposed_sha256":hashlib.sha256(incoming).hexdigest(),
            "rows":len(rows),"tickers":sorted(tickers),
            "note":"No files are changed by this review"}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--current-site",type=Path,required=True)
    parser.add_argument("--proposed-json",type=Path,required=True)
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    report=assess_refresh(args.current_site,args.proposed_json)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False))

if __name__=="__main__":
    main()
