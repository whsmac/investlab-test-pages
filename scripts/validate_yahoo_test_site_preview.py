#!/usr/bin/env python3
"""Validate offline TEST site preview assets; no network, deployment or DB access."""
import argparse
import hashlib
import json
import re
from pathlib import Path

REQUIRED = (
    "index.html",
    "test-yahoo-price-review.html",
    "test-my-portfolio-ledger.html",
    "src/market/yahoo-latest-prices.mjs",
    "src/ledger/yahoo-portfolio-price-fill.mjs",
    "src/market/load-published-yahoo-review.mjs",
    "src/market/yahoo-review-chart-series.mjs",
    "src/market/yahoo-chart-freshness.mjs",
    "src/market/read-yahoo-test-company-map.mjs",
    "src/market/read-test-price-snapshot.mjs",
    "src/market/review-yahoo-test-browser.mjs",
    "data/yahoo-public-review.json",
)
EXPECTED = {"MSFT", "GOOGL", "AMZN", "META", "TSLA"}


def validate_preview(site: Path):
    missing = [name for name in REQUIRED if not (site / name).is_file()]
    if missing:
        raise ValueError("Missing preview files: " + ", ".join(missing))
    if (site / ".git").exists() or (site / ".github").exists():
        raise ValueError("Git metadata or workflows must not be in the preview")
    from scripts.assemble_yahoo_test_site_preview import public_asset
    for candidate in site.rglob("*"):
        if not candidate.is_file():
            continue
        relative = candidate.relative_to(site)
        if relative.as_posix() == "data/yahoo-public-review.json":
            continue
        if not public_asset(relative):
            raise ValueError("Unexpected non-public preview file: " + relative.as_posix())
    data = json.loads((site / "data/yahoo-public-review.json").read_text(encoding="utf-8"))
    if (data.get("mode") != "REVIEW_ONLY" or data.get("source") != "Yahoo Finance"
            or data.get("database_insert_authorized") is not False
            or data.get("writes_performed") != 0
            or not isinstance(data.get("observations"), list)
            or data.get("row_count") != len(data["observations"])
            or not data["observations"]):
        raise ValueError("Invalid published-review data")
    from scripts.export_yahoo_public_review import build_public_snapshot
    try:
        sanitized = build_public_snapshot(data)
    except (ValueError, KeyError, TypeError, OverflowError) as error:
        raise ValueError("Invalid public Yahoo observations") from error
    if sanitized["observations"] != sorted(data["observations"], key=lambda row: (row["ticker"], row["trading_date"])):
        raise ValueError("Public Yahoo observations contain unexpected or unsanitized fields")
    tickers = {row.get("ticker") for row in data["observations"]}
    if tickers != EXPECTED:
        raise ValueError("Unexpected ticker coverage: " + str(sorted(tickers)))
    html = (site / "test-yahoo-price-review.html").read_text(encoding="utf-8")
    if "loadPublishedYahooReview({origin:location.href})" not in html:
        raise ValueError("Browser published JSON loader is not wired")
    if 'id="preview"' not in html or "void autoLoadYahooReview()" not in html or "renderReviewCharts(" not in html:
        raise ValueError("Yahoo chart preview or startup auto-loading is not wired")
    if 'id="freshness"' not in html or "assessYahooChartFreshness(snapshot)" not in html:
        raise ValueError("Yahoo data freshness warning is not wired")
    if "reviewYahooCandidate(candidate,snapshot,companyMap)" not in html:
        raise ValueError("Browser read-only review is not wired")
    for import_path in re.findall(r'from\s+["\'](\./[^"\']+)["\']', html):
        target = site / import_path.removeprefix("./")
        if not target.is_file():
            raise ValueError("Broken local module import: " + import_path)
    portfolio = (site / "test-my-portfolio-ledger.html").read_text(encoding="utf-8")
    for marker in ('id="yahoo-price-fill"', "loadPublishedYahooReview({origin:location.href})",
                   "previewYahooPortfolioPriceFill(snapshot,view.holdings,prices)",
                   "el('portfolio-price-calc').click()"):
        if marker not in portfolio:
            raise ValueError("TEST portfolio Yahoo integration missing: " + marker)
    for import_path in re.findall(r'from\s+["\'](\./[^"\']+)["\']', portfolio):
        target = site / import_path.removeprefix("./")
        if not target.is_file():
            raise ValueError("Broken TEST portfolio module import: " + import_path)
    loader = (site / "src/market/load-published-yahoo-review.mjs").read_text(encoding="utf-8")
    if "./data/yahoo-public-review.json" not in loader:
        raise ValueError("Published JSON path does not match preview asset")
    return {"mode": "TEST_SITE_STATIC_VALIDATION", "checks_passed": True,
            "published": False, "database_writes": 0,
            "rows": data["row_count"], "tickers": sorted(tickers),
            "json_sha256": hashlib.sha256((site / "data/yahoo-public-review.json").read_bytes()).hexdigest(),
            "local_module_imports_checked": len(re.findall(r'from\s+["\'](\./[^"\']+)["\']', html))}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(validate_preview(args.site), ensure_ascii=False))


if __name__ == "__main__":
    main()
