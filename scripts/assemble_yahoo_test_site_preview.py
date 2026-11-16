#!/usr/bin/env python3
"""Assemble full TEST website preview from a staged Yahoo asset, without deploying."""
import argparse
import json
import shutil
from pathlib import Path

EXCLUDE = {".git", ".github", "node_modules", "__pycache__", ".venv", "site",
           "yahoo-staged", "yahoo-test-pages-staging", "yahoo-site-preview"}
REQUIRED = ("index.html", "test-yahoo-price-review.html",
            "src/market/load-published-yahoo-review.mjs",
            "src/market/review-yahoo-test-browser.mjs")


def assemble_site(repo: Path, staging: Path, output: Path):
    if output.resolve() == repo.resolve() or repo.resolve() in output.resolve().parents:
        raise ValueError("Preview output must be outside the repository")
    manifest = json.loads((staging / "manifest.json").read_text(encoding="utf-8"))
    source = staging / "data/yahoo-public-review.json"
    payload = json.loads(source.read_text(encoding="utf-8"))
    if (manifest.get("mode") != "TEST_PAGES_STAGING_ONLY"
            or manifest.get("published") is not False
            or manifest.get("database_writes") != 0
            or manifest.get("target_path") != "data/yahoo-public-review.json"
            or payload.get("mode") != "REVIEW_ONLY"
            or payload.get("database_insert_authorized") is not False
            or payload.get("writes_performed") != 0
            or payload.get("row_count") != len(payload.get("observations", []))
            or payload.get("row_count", 0) < 1):
        raise ValueError("Invalid staging data")
    for relative in REQUIRED:
        if not (repo / relative).is_file():
            raise ValueError("Missing TEST site file: " + relative)
    if output.exists():
        shutil.rmtree(output)
    shutil.copytree(repo, output, ignore=shutil.ignore_patterns(*EXCLUDE))
    destination = output / "data/yahoo-public-review.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
    for relative in REQUIRED:
        if not (output / relative).is_file():
            raise ValueError("Preview bundle incomplete: " + relative)
    return {"mode": "TEST_SITE_PREVIEW_ONLY", "published": False,
            "database_writes": 0, "row_count": payload["row_count"],
            "asset": "data/yahoo-public-review.json"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, default=Path("."))
    parser.add_argument("--staging", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = assemble_site(args.repo, args.staging, args.output)
    print("TEST full-site preview:", result["row_count"], "rows; deployed: false")


if __name__ == "__main__":
    main()
