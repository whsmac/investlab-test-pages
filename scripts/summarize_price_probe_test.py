#!/usr/bin/env python3
"""Render a safe GitHub Actions summary from a TEST dry-run report. No writes."""
import json
import os
from pathlib import Path

ALLOWED = ("MSFT", "GOOGL", "AMZN", "META", "TSLA", "SPCX")

def render(report):
    lines = ["### Free price source by ticker", "",
             "| Ticker | Collection | Rows | Latest day | Quality issues |",
             "|---|---|---:|---|---|"]
    symbols = report.get("symbols", {})
    audit = report.get("quality_audit", {})
    audited = audit.get("symbols", {})
    for ticker in ALLOWED:
        source = symbols.get(ticker, {})
        quality = audited.get(ticker, {})
        if not isinstance(source, dict):
            source = {}
        if not isinstance(quality, dict):
            quality = {}
        status = source.get("status", "missing")
        count = source.get("count", 0)
        latest = quality.get("latest_date") or "-"
        issues = ", ".join(quality.get("issues", [])) or "-"
        # Keep summary cells one line and avoid arbitrary untrusted Markdown.
        safe = lambda value: str(value).replace("|", "/").replace("\\n", " ")[:100]
        lines.append(f"| {ticker} | {safe(status)} | {safe(count)} | {safe(latest)} | {safe(issues)} |")
    lines.extend(["", f"**Source audit passed:** {audit.get('checks_passed') is True}",
                  "**Database writes:** none",
                  "**Import authorized:** no — price basis, currency and RLS are unverified."])
    return "\\n".join(lines) + "\\n"

def main():
    report_path = Path(os.environ.get("INVESTLAB_PRICE_REPORT", "price-source-probe.json"))
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary_path:
        raise SystemExit("GITHUB_STEP_SUMMARY is required")
    try:
        report = json.loads(report_path.read_text(encoding="utf-8"))
        summary = render(report)
    except (OSError, ValueError, TypeError) as exc:
        summary = "### Free price source by ticker\\n\\nNo valid report: " + type(exc).__name__ + "\\n"
    with open(summary_path, "a", encoding="utf-8") as handle:
        handle.write(summary)

if __name__ == "__main__":
    main()
