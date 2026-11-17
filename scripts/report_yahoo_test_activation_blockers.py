#!/usr/bin/env python3
"""Explain verified TEST online-price activation blockers without enabling publication."""
import argparse
import json
from pathlib import Path


def summarize(source, online):
    if (source.get("mode") != "TEST_PAGES_SOURCE_READ_ONLY_AUDIT"
            or source.get("deployment_performed") is not False
            or source.get("database_writes") != 0):
        raise ValueError("Unsafe or invalid Pages source evidence")
    if (online.get("mode") != "TEST_YAHOO_ONLINE_READINESS_ONLY"
            or online.get("deployment_authorized") is not False
            or online.get("deployment_performed") is not False
            or online.get("database_writes") != 0):
        raise ValueError("Unsafe or invalid online evidence")
    issues = []
    if source.get("source_confirmed") is not True:
        issues.append({"code": "PAGES_SOURCE_UNCONFIRMED",
                       "evidence": source.get("status", "UNKNOWN"),
                       "next_step": "Verify GitHub Pages source using authorized repository settings; do not infer from gh-pages branch."})
    elif not (source.get("build_type") == "legacy"
              and source.get("branch") == "gh-pages"
              and source.get("path") == "/"):
        issues.append({"code": "PAGES_SOURCE_NOT_EXPECTED_GH_PAGES_ROOT",
                       "evidence": {"build_type": source.get("build_type"),
                                    "branch": source.get("branch"), "path": source.get("path")},
                       "next_step": "Reconcile actual Pages source with reviewed single-file publication plan."})
    status = online.get("status")
    if status != "ONLINE_FRESH":
        issues.append({"code": "PUBLIC_PRICE_FEED_NOT_FRESH",
                       "evidence": status,
                       "next_step": "Review validated Yahoo artifact and obtain separate approval before TEST publication."})
    return {"mode": "TEST_YAHOO_ACTIVATION_BLOCKERS_READ_ONLY",
            "online_price_feed_ready": not issues,
            "blockers": issues,
            "scheduled_review_active": False,
            "scheduled_review_active_basis": "Not verified; workflow is defined on feature branch only",
            "activation_requires_separate_approval": True,
            "deployment_authorized": False,
            "deployment_performed": False, "database_writes": 0}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pages-source", type=Path, required=True)
    parser.add_argument("--online-readiness", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = summarize(json.loads(args.pages_source.read_text(encoding="utf-8")),
                       json.loads(args.online_readiness.read_text(encoding="utf-8")))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
