#!/usr/bin/env python3
"""One-step TEST Yahoo publication candidate gate; NEVER deploys or changes DB."""
import argparse
import json
from datetime import date
from pathlib import Path
from scripts.check_yahoo_publication_preflight import assess_publication
from scripts.export_yahoo_public_review import build_public_snapshot


def build_gated_snapshot(candidate, today=None):
    report = assess_publication(candidate, today=today)
    if not report["checks_passed"]:
        raise ValueError("Yahoo publication preflight BLOCKED: " + "; ".join(report["issues"]))
    return build_public_snapshot(candidate)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    # Delete stale output first so a failed gate cannot leave an older file in CI artifacts.
    args.output.unlink(missing_ok=True)
    candidate = json.loads(args.candidate.read_text(encoding="utf-8-sig"))
    payload = build_gated_snapshot(candidate)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Gated Yahoo review:", payload["row_count"], "rows; deployment: none; DB writes: 0")


if __name__ == "__main__":
    main()
