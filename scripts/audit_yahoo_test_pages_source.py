#!/usr/bin/env python3
"""Read-only GitHub Pages source audit. Never infers source from branch presence."""
import argparse
import json
import urllib.error
import urllib.request
from pathlib import Path

URL = "https://api.github.com/repos/whsmac/investlab-test-pages/pages"
EXPECTED_URL = "https://whsmac.github.io/investlab-test-pages/"


def assess_pages_source(fetch):
    try:
        data = fetch(URL)
    except urllib.error.HTTPError as error:
        if error.code not in (401, 403, 404):
            raise
        return {"mode": "TEST_PAGES_SOURCE_READ_ONLY_AUDIT", "source_confirmed": False,
                "status": "API_ACCESS_UNAVAILABLE", "http_status": error.code,
                "deployment_performed": False, "database_writes": 0}
    if not isinstance(data, dict):
        raise ValueError("Unexpected Pages API response")
    if data.get("html_url", "").rstrip("/") != EXPECTED_URL.rstrip("/"):
        raise ValueError("Unexpected GitHub Pages URL")
    build_type = data.get("build_type")
    source = data.get("source")
    branch = source.get("branch") if isinstance(source, dict) else None
    path = source.get("path") if isinstance(source, dict) else None
    confirmed = build_type == "legacy" and branch in ("main", "gh-pages") and path in ("/", "/docs")
    return {"mode": "TEST_PAGES_SOURCE_READ_ONLY_AUDIT",
            "source_confirmed": confirmed, "status": "SOURCE_CONFIRMED" if confirmed else "SOURCE_UNCONFIRMED",
            "build_type": build_type, "branch": branch, "path": path,
            "deployment_performed": False, "database_writes": 0}


def fetch_json(url):
    if url != URL:
        raise ValueError("Only TEST Pages API URL allowed")
    request = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json",
                                                    "User-Agent": "INVESTLAB-TEST-Pages-Source-Audit"})
    with urllib.request.urlopen(request, timeout=12) as response:
        if response.geturl() != URL:
            raise ValueError("Unexpected Pages API redirect")
        return json.load(response)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        result = assess_pages_source(fetch_json)
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        result = {"mode": "TEST_PAGES_SOURCE_READ_ONLY_AUDIT", "source_confirmed": False,
                  "status": "NETWORK_UNAVAILABLE", "reason": str(error),
                  "deployment_performed": False, "database_writes": 0}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
