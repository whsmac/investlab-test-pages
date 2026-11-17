#!/usr/bin/env python3
"""Summarize TEST Yahoo Pages review result without deployment or DB writes."""
import argparse
import json
from pathlib import Path

def summarize(plan, prewrite):
    if plan.get("mode") != "TEST_PAGES_PUBLICATION_PLAN_ONLY":
        raise ValueError("Invalid TEST Pages plan")
    if prewrite.get("mode") != "TEST_PAGES_PREWRITE_VERIFICATION_ONLY" or prewrite.get("verified") is not True:
        raise ValueError("Prewrite verification missing")
    if (plan.get("deployment_authorized") is not False or plan.get("deployment_performed") is not False
        or prewrite.get("deployment_authorized") is not False or prewrite.get("deployment_performed") is not False
        or plan.get("database_writes") != 0 or prewrite.get("database_writes") != 0):
        raise ValueError("Unsafe publication state")
    if (plan.get("allowed_change_paths") != ["data/yahoo-public-review.json"]
        or prewrite.get("allowed_change_paths") != ["data/yahoo-public-review.json"]
        or plan.get("expected_branch_commit") != prewrite.get("branch_sha")
        or plan.get("previous_sha256") != prewrite.get("old_sha256")
        or plan.get("proposed_sha256") != prewrite.get("new_sha256")):
        raise ValueError("Publication review and prewrite do not match")
    needed=plan.get("publication_needed",plan.get("change_needed"))
    if not isinstance(needed,bool) or needed != prewrite.get("publication_needed",prewrite.get("change_needed")):
        raise ValueError("Publication-needed decision mismatch")
    return {"mode":"TEST_YAHOO_REFRESH_DECISION_ONLY",
            "status":"AWAITING_SEPARATE_APPROVAL" if needed else "NO_OBSERVATION_CHANGE",
            "publication_needed":needed,"deployment_authorized":False,
            "deployment_performed":False,"database_writes":0,
            "branch_sha":prewrite["branch_sha"],
            "proposed_sha256":prewrite["new_sha256"],
            "message":"No deployment was performed; unchanged price observations need no publication." if not needed else "Price observations changed; separate approval is required before publication."}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--plan",type=Path,required=True)
    p.add_argument("--prewrite",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    a=p.parse_args()
    result=summarize(json.loads(a.plan.read_text(encoding="utf-8")),json.loads(a.prewrite.read_text(encoding="utf-8")))
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(result,ensure_ascii=False))

if __name__=="__main__":
    main()
