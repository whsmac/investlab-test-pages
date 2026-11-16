#!/usr/bin/env python3
"""Read-only pre-write verification for a reviewed TEST Pages single-file update.

No GitHub writes, no deployment, no database access.
"""
import argparse
import hashlib
import json
from pathlib import Path
from scripts.plan_yahoo_test_pages_publication import ASSET, BRANCH, REPO

def verify_prewrite(plan, current_branch_sha, current_site: Path, proposed_json: Path):
    if plan.get("mode") != "TEST_PAGES_PUBLICATION_PLAN_ONLY" or plan.get("repository") != REPO or plan.get("target_branch") != BRANCH:
        raise ValueError("Unexpected TEST Pages plan target")
    if plan.get("allowed_change_paths") != [ASSET]:
        raise ValueError("Multiple file changes not allowed")
    if plan.get("deployment_authorized") is not False or plan.get("deployment_performed") is not False or plan.get("database_writes") != 0 or plan.get("requires_explicit_deployment_approval") is not True:
        raise ValueError("Unsafe publication plan")
    if current_branch_sha != plan.get("expected_branch_commit"):
        raise ValueError("Branch moved since publication review")
    target = current_site / ASSET
    if target.is_symlink() or proposed_json.is_symlink() or not proposed_json.is_file():
        raise ValueError("Missing or symlinked Yahoo asset")
    if target.exists() and not target.is_file():
        raise ValueError("Existing Yahoo asset is not a regular file")
    old = target.read_bytes() if target.exists() else None
    proposed = proposed_json.read_bytes()
    old_sha = hashlib.sha256(old).hexdigest() if old is not None else None
    new_sha = hashlib.sha256(proposed).hexdigest()
    if old_sha != plan.get("previous_sha256"):
        raise ValueError("Existing Yahoo JSON changed since review")
    if new_sha != plan.get("proposed_sha256"):
        raise ValueError("Proposed Yahoo JSON changed since review")
    if (old != proposed) is not plan.get("change_needed"):
        raise ValueError("Change-needed flag inconsistent")
    return {"mode":"TEST_PAGES_PREWRITE_VERIFICATION_ONLY",
            "verified":True,"change_needed":old != proposed,
            "branch_sha":current_branch_sha,"old_sha256":old_sha,
            "new_sha256":new_sha,"allowed_change_paths":[ASSET],
            "deployment_authorized":False,"deployment_performed":False,"database_writes":0}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--plan",type=Path,required=True)
    parser.add_argument("--current-branch-sha",required=True)
    parser.add_argument("--current-site",type=Path,required=True)
    parser.add_argument("--proposed-json",type=Path,required=True)
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    result=verify_prewrite(json.loads(args.plan.read_text(encoding="utf-8")),
                           args.current_branch_sha,args.current_site,args.proposed_json)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(result,ensure_ascii=False))

if __name__=="__main__":
    main()
