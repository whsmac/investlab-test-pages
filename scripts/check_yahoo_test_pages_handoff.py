#!/usr/bin/env python3
"""Approve a reviewed TEST Pages artifact for *manual handoff only*. Never deploy."""
import argparse
import hashlib
import json
from pathlib import Path
from datetime import date, datetime, timedelta, timezone

EXPECTED_MODE = "TEST_YAHOO_BUNDLE_READINESS_ONLY"
TARGET = "https://whsmac.github.io/investlab-test-pages/"

def assess_handoff(readiness, site: Path, expected_commit: str, today=None):
    if not isinstance(expected_commit, str) or len(expected_commit) != 40 or any(c not in "0123456789abcdef" for c in expected_commit):
        raise ValueError("Full lowercase 40-character reviewed commit SHA required")
    if readiness.get("mode") != EXPECTED_MODE or readiness.get("ready") is not True:
        raise ValueError("TEST bundle readiness must pass")
    if readiness.get("deployed") is not False or readiness.get("database_writes") != 0:
        raise ValueError("Unsafe readiness flags")
    if readiness.get("publication_target") != TARGET or readiness.get("publication_asset") != "data/yahoo-public-review.json":
        raise ValueError("Unexpected publication destination")
    if readiness.get("deployment_requires_separate_approval") is not True:
        raise ValueError("Separate deployment approval required")
    source = site / "data/yahoo-public-review.json"
    if not source.is_file():
        raise ValueError("Site JSON is missing")
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if digest != readiness.get("json_sha256"):
        raise ValueError("Site JSON differs from reviewed readiness checksum")
    from scripts.validate_yahoo_test_site_preview import validate_preview
    payload = json.loads(source.read_text(encoding="utf-8"))
    current = today or datetime.now(timezone(timedelta(hours=9))).date()
    for ticker in ("MSFT", "GOOGL", "AMZN", "META", "TSLA"):
        dates = [date.fromisoformat(row["trading_date"]) for row in payload["observations"] if row["ticker"] == ticker]
        if not dates or max(dates) > current or max(dates) < current - timedelta(days=7):
            raise ValueError("Stale or future Yahoo price for " + ticker)
    validated = validate_preview(site)
    if not validated.get("checks_passed") or validated.get("json_sha256") != digest:
        raise ValueError("Site validation failed")
    return {"mode":"TEST_PAGES_HANDOFF_ONLY","handoff_ready":True,
            "reviewed_commit_sha":expected_commit,"json_sha256":digest,
            "publication_target":TARGET,"deployment_authorized":False,
            "deployment_performed":False,"database_writes":0}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--readiness",type=Path,required=True)
    parser.add_argument("--site",type=Path,required=True)
    parser.add_argument("--reviewed-commit",required=True)
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    report=assess_handoff(json.loads(args.readiness.read_text(encoding="utf-8")),args.site,args.reviewed_commit)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False))

if __name__=="__main__":
    main()
