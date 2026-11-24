"""One command to process locally saved SEC JSON/webarchives; no network or publishing."""
import argparse
import subprocess
import sys
from pathlib import Path

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inputs",nargs="+",type=Path)
    parser.add_argument("--output-dir",required=True,type=Path)
    args=parser.parse_args()
    root=Path(__file__).resolve().parents[1]
    target=args.output_dir.resolve()
    if target==root or root in target.parents or target.exists():
        parser.error("Choose a new output directory outside the repository")
    inputs=[str(p.resolve(strict=True)) for p in args.inputs]
    target.mkdir(parents=True,exist_ok=False)
    review=target/"extracted-review.json"
    result=subprocess.run([sys.executable,"-m","scripts.sec_companyfacts_offline_review",*inputs,"--amazon-candidate","--output",str(review)],cwd=root,check=False)
    if result.returncode:
        return result.returncode
    return subprocess.run(["node","scripts/prepare-sec-quarterly-refresh.mjs",str(review),str(target)],cwd=root,check=False).returncode

if __name__=="__main__":
    raise SystemExit(main())
