#!/usr/bin/env python3
"""Create a local-only rollback package for a reviewed TEST Pages JSON refresh.

Reads existing gh-pages JSON, writes a CI artifact backup, never deploys.
"""
import argparse
import hashlib
import json
from pathlib import Path
from scripts.plan_yahoo_test_pages_publication import ASSET

def make_backup(plan, current_site: Path, output: Path):
    if (plan.get("mode") != "TEST_PAGES_PUBLICATION_PLAN_ONLY"
        or plan.get("deployment_authorized") is not False
        or plan.get("deployment_performed") is not False
        or plan.get("database_writes") != 0
        or plan.get("allowed_change_paths") != [ASSET]):
        raise ValueError("Unsafe publication plan")
    target=current_site / ASSET
    if target.is_symlink() or (target.exists() and not target.is_file()):
        raise ValueError("Invalid existing asset")
    original=target.read_bytes() if target.exists() else None
    digest=hashlib.sha256(original).hexdigest() if original is not None else None
    if digest != plan.get("previous_sha256"):
        raise ValueError("Existing JSON checksum changed since review")
    if original is not None and len(original)>2_000_000:
        raise ValueError("Existing JSON too large for backup")
    output.mkdir(parents=True,exist_ok=True)
    backup=output / "previous-yahoo-public-review.json"
    if original is not None:
        backup.write_bytes(original)
    else:
        backup.unlink(missing_ok=True)
    manifest={"mode":"TEST_PAGES_ROLLBACK_ARTIFACT_ONLY",
              "target_path":ASSET,"expected_branch_commit":plan.get("expected_branch_commit"),
              "previous_asset_existed":original is not None,"previous_sha256":digest,
              "proposed_sha256":plan.get("proposed_sha256"),
              "restore_action":"Restore previous file if it existed; otherwise remove new file",
              "backup_filename":backup.name if original is not None else None,
              "deployment_performed":False,"database_writes":0}
    (output / "rollback-manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    return manifest

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--plan",type=Path,required=True)
    p.add_argument("--current-site",type=Path,required=True)
    p.add_argument("--output-dir",type=Path,required=True)
    a=p.parse_args()
    print(json.dumps(make_backup(json.loads(a.plan.read_text(encoding="utf-8")),a.current_site,a.output_dir),ensure_ascii=False))

if __name__=="__main__":
    main()
