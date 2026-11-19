#!/usr/bin/env python3
"""Offline-only decision gate for the first TEST Yahoo publication. Never publishes."""
import argparse
import json
from pathlib import Path

TARGET = "https://whsmac.github.io/investlab-test-pages/"
ASSET = "data/yahoo-public-review.json"


def assess_first_publication(source, handoff, online):
    if (source.get("mode") != "TEST_PAGES_SOURCE_READ_ONLY_AUDIT"
            or source.get("deployment_performed") is not False
            or source.get("database_writes") != 0):
        raise ValueError("Invalid Pages source evidence")
    if (handoff.get("mode") != "TEST_PAGES_HANDOFF_ONLY"
            or handoff.get("deployment_authorized") is not False
            or handoff.get("deployment_performed") is not False
            or handoff.get("database_writes") != 0
            or handoff.get("publication_target") != TARGET):
        raise ValueError("Invalid handoff evidence")
    if (online.get("mode") != "TEST_YAHOO_ONLINE_READINESS_ONLY"
            or online.get("deployment_authorized") is not False
            or online.get("deployment_performed") is not False
            or online.get("database_writes") != 0):
        raise ValueError("Invalid online readiness evidence")
    source_ok = (source.get("source_confirmed") is True
                 and source.get("build_type") == "legacy"
                 and source.get("branch") == "gh-pages"
                 and source.get("path") == "/")
    handoff_ok = (handoff.get("handoff_ready") is True
                  and isinstance(handoff.get("reviewed_commit_sha"), str)
                  and len(handoff["reviewed_commit_sha"]) == 40
                  and all(ch in "0123456789abcdef" for ch in handoff["reviewed_commit_sha"])
                  and isinstance(handoff.get("json_sha256"), str)
                  and len(handoff["json_sha256"]) == 64
                  and all(ch in "0123456789abcdef" for ch in handoff["json_sha256"]))
    online_ok = (online.get("pages_source_confirmed") is True
                 and online.get("pages_source_branch") == "gh-pages"
                 and online.get("status") == "NOT_PUBLISHED")
    issues = []
    if not source_ok:
        issues.append("PAGES_SOURCE_NOT_CONFIRMED_AS_GH_PAGES_ROOT")
    if not handoff_ok:
        issues.append("HANDOFF_NOT_READY")
    if not online_ok:
        issues.append("FIRST_PUBLICATION_LIVE_STATE_NOT_CONFIRMED")
    return {"mode": "TEST_YAHOO_FIRST_PUBLICATION_REVIEW_ONLY",
            "review_ready": not issues, "issues": issues,
            "publication_target": TARGET, "publication_asset": ASSET,
            "deployment_requires_separate_approval": True,
            "deployment_authorized": False, "deployment_performed": False,
            "database_writes": 0}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pages-source", type=Path, required=True)
    parser.add_argument("--handoff", type=Path, required=True)
    parser.add_argument("--online-readiness", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = assess_first_publication(
        json.loads(args.pages_source.read_text(encoding="utf-8")),
        json.loads(args.handoff.read_text(encoding="utf-8")),
        json.loads(args.online_readiness.read_text(encoding="utf-8")))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
