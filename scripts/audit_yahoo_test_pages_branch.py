#!/usr/bin/env python3
"""Read-only audit of TEST GitHub Pages candidate branch, never publish."""
import argparse
import json
import urllib.error
import urllib.request

API = "https://api.github.com/repos/whsmac/investlab-test-pages"
EXPECTED = "data/yahoo-public-review.json"
BRANCHES = ("main", "gh-pages", "feature/test-navigation-20261112")

def audit(fetch_json):
    repository = fetch_json(API)
    if repository.get("full_name") != "whsmac/investlab-test-pages":
        raise ValueError("Unexpected repository")
    branch_names = {item["name"] for item in fetch_json(API + "/branches?per_page=100")}
    result = {}
    for branch in BRANCHES:
        if branch not in branch_names:
            result[branch] = {"exists": False, "asset_present": False}
            continue
        encoded = urllib.parse.quote(branch, safe="")
        # Contents API returns 404 when the reviewed asset is absent.
        try:
            item = fetch_json(API + "/contents/" + EXPECTED + "?ref=" + encoded)
            present = item.get("type") == "file" and item.get("path") == EXPECTED
        except urllib.error.HTTPError as exc:
            if exc.code != 404:
                raise
            present = False
        result[branch] = {"exists": True, "asset_present": present}
    return {"mode": "TEST_PAGES_BRANCH_READ_ONLY_AUDIT",
            "repository": repository["full_name"],
            "default_branch": repository.get("default_branch"),
            "branches": result, "pages_source_confirmed": False,
            "note": "Branch file presence does not prove GitHub Pages publishing source",
            "database_writes": 0, "deployment_performed": False}

def fetch_json(url):
    if not (url == API or url.startswith(API + "/branches?") or url.startswith(API + "/contents/" + EXPECTED + "?ref=")):
        raise ValueError("Unapproved GitHub API URL")
    request = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json",
                                                   "User-Agent": "INVESTLAB-TEST-Branch-Audit"})
    with urllib.request.urlopen(request, timeout=12) as response:
        if not response.geturl().startswith(API):
            raise ValueError("GitHub API redirected outside expected repository")
        return json.load(response)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output")
    args = parser.parse_args()
    result = audit(fetch_json)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as stream:
            json.dump(result, stream, ensure_ascii=False, indent=2)
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
