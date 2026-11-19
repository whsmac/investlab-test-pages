#!/usr/bin/env python3
"""Report whether the TEST Yahoo static-site bundle is actually ready; never deploy."""
import argparse
import json
from pathlib import Path
from scripts.validate_yahoo_test_site_preview import validate_preview

def assess_bundle(site: Path):
    if not site.is_dir():
        return {"mode":"TEST_YAHOO_BUNDLE_READINESS_ONLY","ready":False,"deployed":False,
                "database_writes":0,"reason":"Complete TEST site bundle was not created"}
    try:
        details=validate_preview(site)
    except (ValueError, OSError, KeyError, TypeError, json.JSONDecodeError) as error:
        return {"mode":"TEST_YAHOO_BUNDLE_READINESS_ONLY","ready":False,"deployed":False,
                "database_writes":0,"reason":str(error)}
    return {"mode":"TEST_YAHOO_BUNDLE_READINESS_ONLY","ready":True,"deployed":False,
            "publication_target":"https://whsmac.github.io/investlab-test-pages/",
            "publication_asset":"data/yahoo-public-review.json",
            "deployment_requires_separate_approval":True,
            "database_writes":0,"rows":details["rows"],"tickers":details["tickers"],
            "json_sha256":details["json_sha256"],
            "reason":"Offline TEST bundle validated; no online publication performed"}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--site",type=Path,required=True)
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    report=assess_bundle(args.site)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False))
if __name__=="__main__":
    main()
