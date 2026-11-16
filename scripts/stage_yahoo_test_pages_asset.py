#!/usr/bin/env python3
"""Stage an approved TEST Pages data asset without publishing or deploying."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

TARGET = Path("data/yahoo-public-review.json")


def stage_asset(source: Path, directory: Path):
    payload = json.loads(source.read_text(encoding="utf-8"))
    if (payload.get("mode") != "REVIEW_ONLY"
            or payload.get("source") != "Yahoo Finance"
            or payload.get("database_insert_authorized") is not False
            or payload.get("writes_performed") != 0
            or not isinstance(payload.get("observations"), list)
            or payload.get("row_count") != len(payload["observations"])
            or not payload["observations"]):
        raise ValueError("Rejected invalid Yahoo review asset")
    destination = directory / TARGET
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
    manifest = {"mode": "TEST_PAGES_STAGING_ONLY",
                "target_path": TARGET.as_posix(), "row_count": payload["row_count"],
                "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
                "published": False, "database_writes": 0,
                "instructions": "Review staged data and approve any separate TEST Pages publication action."}
    (directory / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--directory", type=Path, required=True)
    args = parser.parse_args()
    result = stage_asset(args.source, args.directory)
    print("TEST Pages staging:", result["row_count"], "rows; deployed: false")


if __name__ == "__main__":
    main()
