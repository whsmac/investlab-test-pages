#!/usr/bin/env python3
"""Validate offline TEST site preview assets; no network, deployment or DB access."""
import argparse
from datetime import date
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


def check_transitive_modules(site: Path, entry: str):
    """Reject missing or out-of-bundle dependencies imported by TEST ES modules."""
    visited = set()
    pending = [Path(entry)]
    while pending:
        relative = pending.pop()
        if relative in visited:
            continue
        visited.add(relative)
        source = site / relative
        if not source.is_file():
            raise ValueError("Missing local module: " + relative.as_posix())
        if source.suffix not in {".html", ".js", ".mjs"}:
            continue
        for specifier in re.findall(r"""from\s+["'](\.{1,2}/[^"']+)["']""", source.read_text(encoding="utf-8")):
            target = (source.parent / specifier).resolve()
            try:
                target_relative = target.relative_to(site.resolve())
            except ValueError as error:
                raise ValueError("Module import escapes TEST site: " + specifier) from error
            if not target.is_file():
                raise ValueError("Broken transitive module import: " + relative.as_posix() + " -> " + specifier)
            pending.append(target_relative)
    return len(visited)


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
        if relative.as_posix() in {"data/yahoo-public-review.json", "data/market-index-benchmarks.json", "data/market-trends-public-review.json"}:
            continue
        if not public_asset(relative):
            raise ValueError("Unexpected non-public preview file: " + relative.as_posix())
    optional_sec = site / "data/sec-quarterly-financials.json"
    if optional_sec.exists():
        if optional_sec.is_symlink() or optional_sec.stat().st_size > 1_000_000:
            raise ValueError("Unsafe TEST SEC financial asset")
        sec_data = json.loads(optional_sec.read_text(encoding="utf-8"))
        rows = sec_data.get("rows", [])
        if (sec_data.get("format") != "INVESTLAB_SEC_QUARTERLY_PREVIEW_V1"
            or sec_data.get("source") != "SEC Company Facts"
            or sec_data.get("database_writes") != 0 or not isinstance(rows, list)
            or not rows or len(rows) > 300):
            raise ValueError("Invalid TEST SEC quarterly financial preview")
        for row in rows:
            if (row.get("ticker") not in {"MSFT", "GOOGL", "AMZN", "META", "TSLA", "SPCX"}
                or row.get("status") != "SEC_XBRL_PRELIMINARY"
                or not re.fullmatch(r"\d{4}-Q[1-4]", row.get("fiscal_period", ""))
                or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", row.get("period_end", ""))
                or not str(row.get("source_url", "")).startswith("https://data.sec.gov/api/xbrl/companyfacts/")):
                raise ValueError("Invalid TEST SEC quarterly financial row")
    optional_market = site / "data/market-index-benchmarks.json"
    if optional_market.exists():
        if optional_market.is_symlink() or optional_market.stat().st_size > 1_000_000:
            raise ValueError("Unsafe benchmark file")
        market = json.loads(optional_market.read_text(encoding="utf-8"))
        rows = market.get("observations")
        if (market.get("mode") != "BENCHMARK_REVIEW_ONLY" or
            market.get("source") != "Yahoo Finance" or
            market.get("database_writes") != 0 or market.get("writes_performed") != 0 or
            not isinstance(rows,list) or market.get("row_count") != len(rows) or
            not 40 <= len(rows) <= 6000):
            raise ValueError("Invalid benchmark metadata")
        seen = set()
        coverage = {"NDX": [], "SPX": []}
        for row in rows:
            ticker = row.get("ticker")
            day = row.get("date")
            try:
                price = float(row.get("close"))
                valid_date = date.fromisoformat(day).isoformat() == day
            except (TypeError,ValueError):
                raise ValueError("Invalid benchmark date or level")
            if (ticker not in coverage or row.get("source_symbol") != {"NDX":"^NDX","SPX":"^GSPC"}[ticker] or
                row.get("unit") != "index_points" or row.get("currency") != "USD" or
                row.get("price_basis") != "index_close" or not valid_date or
                not (0 < price < float("inf")) or (ticker,day) in seen):
                raise ValueError("Invalid benchmark observation")
            seen.add((ticker,day))
            coverage[ticker].append(day)
        if any(len(days)<20 for days in coverage.values()):
            raise ValueError("Incomplete benchmark coverage")
    optional_trends = site / "data/market-trends-public-review.json"
    if optional_trends.exists():
        if optional_trends.is_symlink() or optional_trends.stat().st_size > 2_000_000:
            raise ValueError("Unsafe market trends file")
        trends = json.loads(optional_trends.read_text(encoding="utf-8"))
        rows = trends.get("observations")
        if (trends.get("mode") != "MARKET_TRENDS_REVIEW_ONLY"
            or trends.get("source") != "Yahoo Finance"
            or trends.get("database_writes") != 0 or trends.get("writes_performed") != 0
            or not isinstance(rows,list) or not 1 <= len(rows) <= 20000
            or trends.get("row_count") != len(rows)):
            raise ValueError("Invalid market trends metadata")
        from math import isfinite
        from scripts.yahoo_market_trends_test import SYMBOLS
        seen=set()
        for row in rows:
            sym=row.get("ticker")
            day=row.get("trading_date")
            try:
                close=float(row.get("close_price"))
                if date.fromisoformat(day).isoformat()!=day:raise ValueError("Not ISO")
            except (TypeError,ValueError):
                raise ValueError("Invalid trends close or date")
            if (sym not in SYMBOLS or row.get("source_symbol") != sym
                or row.get("currency") != "USD" or row.get("price_basis") != "unadjusted_close"
                or not isfinite(close) or close <= 0 or (sym,day) in seen):
                raise ValueError("Invalid market trends observation")
            seen.add((sym,day))
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
    if not EXPECTED.issubset(tickers) or tickers - EXPECTED - {"SPCX"}:
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
    if not (site / "market-trends.html").is_file():
        raise ValueError("Pilot market-trends.html missing")
    if 'href="./market-trends.html"' not in (site / "index.html").read_text(encoding="utf-8"):
        raise ValueError("Market Trends home navigation missing")
    checked_modules = check_transitive_modules(site, "test-my-portfolio-ledger.html") + check_transitive_modules(site, "test-yahoo-price-review.html")
    checked_modules += check_transitive_modules(site, "market-trends.html")
    # The live Pilot company chart imports an additional alignment module.
    # Validate its full import chain before publishing the TEST site.
    if (site / "company-investment-analysis.html").is_file():
        checked_modules += check_transitive_modules(site, "company-investment-analysis.html")
    loader = (site / "src/market/load-published-yahoo-review.mjs").read_text(encoding="utf-8")
    if "./data/yahoo-public-review.json" not in loader:
        raise ValueError("Published JSON path does not match preview asset")
    return {"mode": "TEST_SITE_STATIC_VALIDATION", "checks_passed": True,
            "published": False, "database_writes": 0,
            "rows": data["row_count"], "tickers": sorted(tickers),
            "json_sha256": hashlib.sha256((site / "data/yahoo-public-review.json").read_bytes()).hexdigest(),
            "local_module_imports_checked": checked_modules}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(validate_preview(args.site), ensure_ascii=False))


if __name__ == "__main__":
    main()
