"""Conservative source quality gate for INVESTLAB TEST (no DB writes)."""
from datetime import date
from decimal import Decimal, InvalidOperation

SUPPORTED = frozenset({"MSFT", "GOOGL", "AMZN", "META", "TSLA"})

def audit_source_report(report, *, today=None, max_age_days=7):
    today = today or date.today()
    issues = []
    summary = {}
    if report.get("mode") != "DRY_RUN_ONLY" or report.get("writes_performed") != 0:
        issues.append("Not a read-only source report")
    if report.get("source") != "Stooq public CSV trial (unverified availability)":
        issues.append("Unexpected source identity")
    try:
        generated = date.fromisoformat(report["generated_on"])
        if generated > today or (today - generated).days > max_age_days:
            issues.append("Source report is stale or future-dated")
    except (ValueError, KeyError, TypeError):
        issues.append("Invalid report generation date")
    try:
        window_start = date.fromisoformat(report["date_from"])
        window_end = date.fromisoformat(report["date_to"])
        if window_start > window_end or window_end > today or (today - window_end).days > max_age_days:
            issues.append("Invalid or stale requested source window")
    except (ValueError, KeyError, TypeError):
        window_start = window_end = None
        issues.append("Invalid source window dates")
    symbols = report.get("symbols", {})
    if not isinstance(symbols, dict):
        symbols = {}
        issues.append("Invalid symbols object")
    unexpected = set(symbols) - SUPPORTED - {"SPCX"}
    if unexpected:
        issues.append("Unexpected ticker(s): " + ", ".join(sorted(unexpected)))
    for ticker in sorted(SUPPORTED):
        item = symbols.get(ticker, {})
        problems = []
        if not isinstance(item, dict):
            item = {}
            problems.append("Invalid ticker report")
        if item.get("status") != "ok":
            problems.append("No successful data")
        observations = item.get("observations", [])
        if not isinstance(observations, list) or not observations:
            problems.append("No observations")
            observations = []
        days = set()
        last = None
        for row in observations:
            try:
                if not isinstance(row, dict):
                    raise ValueError("Observation must be an object")
                day = date.fromisoformat(row["trading_date"])
                amount = Decimal(str(row["close_price"]))
                if not amount.is_finite() or amount <= 0:
                    raise ValueError("Invalid close")
                if day in days:
                    problems.append("Duplicate trading date")
                days.add(day)
                last = max(last, day) if last else day
                if day > today:
                    problems.append("Future trading date")
                if window_start is not None and not (window_start <= day <= window_end):
                    problems.append("Observation outside requested source window")
            except (ValueError, KeyError, TypeError, InvalidOperation):
                problems.append("Invalid observation")
        if item.get("count") != len(observations):
            problems.append("Observation count mismatch")
        if last is not None and (today - last).days > max_age_days:
            problems.append("Latest close is stale")
        summary[ticker] = {"latest_date": last.isoformat() if last else None,
                           "count": len(observations), "issues": sorted(set(problems)),
                           "source_price_basis_verified": False, "currency_verified": False}
        if problems:
            issues.append(f"{ticker}: " + ", ".join(sorted(set(problems))))
    spcx = symbols.get("SPCX")
    if not isinstance(spcx, dict) or spcx.get("status") != "skipped":
        issues.append("SPCX must remain excluded pending symbol verification")
    return {"mode": "SOURCE_QUALITY_AUDIT", "writes_performed": 0,
            "checks_passed": not issues, "issues": issues, "symbols": summary,
            "database_insert_authorized": False,
            "blocking_reasons": ["Unverified adjusted/unadjusted close semantics",
                                 "Unverified currency and corporate actions",
                                 "No TEST DB ownership/RLS write verification"]}
