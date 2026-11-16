#!/usr/bin/env python3
"""Generate a review-only single-file TEST Pages publication plan.

Never writes to gh-pages or the filesystem except an explicitly requested report.
"""
import argparse
import json
from pathlib import Path

ASSET = "data/yahoo-public-review.json"
BRANCH = "gh-pages"
REPO = "whsmac/investlab-test-pages"

def build_plan(review, branch_sha):
    if not isinstance(review, dict) or review.get("mode") != "TEST_PAGES_SINGLE_ASSET_REFRESH_REVIEW":
        raise ValueError("Missing trusted single-asset review")
    if review.get("review_only") is not True or review.get("deployment_authorized") is not False or review.get("deployment_performed") is not False or review.get("database_writes") != 0:
        raise ValueError("Unsafe refresh review")
    if review.get("allowed_change_paths") != [ASSET]:
        raise ValueError("More than one file would change")
    new_sha = review.get("proposed_sha256")
    old_sha = review.get("previous_sha256")
    if not isinstance(new_sha, str) or len(new_sha) != 64 or any(c not in "0123456789abcdef" for c in new_sha):
        raise ValueError("Invalid proposed SHA256")
    if old_sha is not None and (not isinstance(old_sha, str) or len(old_sha) != 64 or any(c not in "0123456789abcdef" for c in old_sha)):
        raise ValueError("Invalid previous SHA256")
    if not isinstance(branch_sha, str) or len(branch_sha) != 40 or any(c not in "0123456789abcdef" for c in branch_sha):
        raise ValueError("Full reviewed gh-pages commit SHA required")
    if review.get("change_needed") is not (old_sha != new_sha):
        raise ValueError("Change flag does not match SHA256 values")
    return {"mode":"TEST_PAGES_PUBLICATION_PLAN_ONLY","repository":REPO,
            "target_branch":BRANCH,"expected_branch_commit":branch_sha,
            "allowed_change_paths":[ASSET],"change_needed":review["change_needed"],
            "previous_sha256":old_sha,"proposed_sha256":new_sha,
            "precondition":"Recheck branch commit SHA and previous file SHA256 immediately before any future write",
            "requires_explicit_deployment_approval":True,"deployment_authorized":False,
            "deployment_performed":False,"database_writes":0}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--review",type=Path,required=True)
    parser.add_argument("--branch-sha",required=True)
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    report=build_plan(json.loads(args.review.read_text(encoding="utf-8")),args.branch_sha)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False))

if __name__=="__main__":
    main()
