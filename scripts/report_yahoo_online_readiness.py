#!/usr/bin/env python3
"""Read-only TEST Yahoo online readiness summary from existing audit reports.

This report never authorizes a deployment or treats branch presence as Pages proof.
"""
import argparse
import json
from pathlib import Path

ASSET = "data/yahoo-public-review.json"
BRANCHES = ("main", "gh-pages", "feature/test-navigation-20261112")


def summarize_online_readiness(branch_audit, live_check):
    if branch_audit.get("mode") != "TEST_PAGES_BRANCH_READ_ONLY_AUDIT":
        raise ValueError("Invalid branch audit")
    if live_check.get("mode") != "TEST_PAGES_LIVE_READ_ONLY_CHECK":
        raise ValueError("Invalid live check")
    if branch_audit.get("database_writes") != 0 or branch_audit.get("deployment_performed") is not False:
        raise ValueError("Unsafe branch audit")
    if live_check.get("database_writes") != 0 or live_check.get("deployment_performed") is not False:
        raise ValueError("Unsafe live check")
    branches = branch_audit.get("branches")
    if not isinstance(branches, dict) or not all(
        isinstance(branches.get(branch), dict)
        and isinstance(branches[branch].get("asset_present"), bool)
        for branch in BRANCHES
    ):
        raise ValueError("Incomplete branch audit")
    reachable = live_check.get("reachable")
    if not isinstance(reachable, bool):
        raise ValueError("Invalid live availability")
    fresh = live_check.get("fresh") is True if reachable else False
    error_kind = live_check.get("error_kind") if not reachable else None
    if error_kind is not None and error_kind not in ("NOT_PUBLISHED", "HTTP_ERROR", "NETWORK_ERROR", "INVALID_CONTENT"):
        raise ValueError("Invalid live error classification")
    status = ("ONLINE_FRESH" if reachable and fresh else
              "ONLINE_STALE" if reachable else
              "NOT_PUBLISHED" if error_kind == "NOT_PUBLISHED" else
              "LIVE_CHECK_FAILED" if error_kind in ("HTTP_ERROR", "NETWORK_ERROR", "INVALID_CONTENT") else
              "NOT_ONLINE")
    return {
        "mode": "TEST_YAHOO_ONLINE_READINESS_ONLY",
        "status": status,
        "online_ready": status == "ONLINE_FRESH",
        "asset": ASSET,
        "branch_asset_present": {branch: branches[branch]["asset_present"] for branch in BRANCHES},
        "pages_source_confirmed": branch_audit.get("pages_source_confirmed") is True,
        "live_reachable": reachable,
        "live_error_kind": error_kind,
        "live_fresh": fresh,
        "next_action": ("VERIFY_BROWSER_READ_ONLY" if status == "ONLINE_FRESH"
                        else "REVIEW_FRESHNESS_NO_PUBLISH" if reachable
                        else "INVESTIGATE_LIVE_CHECK_NO_PUBLISH" if status == "LIVE_CHECK_FAILED"
                        else "REVIEW_PAGES_SOURCE_AND_PUBLICATION_SEPARATELY"),
        "deployment_authorized": False,
        "deployment_performed": False,
        "database_writes": 0,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--branch-audit", type=Path, required=True)
    parser.add_argument("--live-check", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = summarize_online_readiness(
        json.loads(args.branch_audit.read_text(encoding="utf-8")),
        json.loads(args.live_check.read_text(encoding="utf-8")),
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
