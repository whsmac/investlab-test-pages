# INVESTLAB TEST price-source verification

This pipeline is **not** an automatic market-data updater. It has no Supabase
write path and never modifies the production repository or database.

## Offline verification (no credentials, no network)
From the repository root:

```bash
python -m unittest discover -s tests -p 'test_price*.py' -v
node --test tests/test-price-snapshot.mjs
```

The Python tests cover CSV validation, source quality, and reconciliation.
The Node tests mock Supabase pagination and verify the TEST URL guard.

## Source connectivity probe (network required)
Run from the repository root:

```bash
python scripts/market_price_refresh_test.py
```

This fetches only the five configured public-source tickers and produces
`price-source-probe.json`. It does not call Supabase. Nonzero exit status
means a source request or quality check failed; inspect the report for details.

**Do not treat a successful source request as price-basis verification.**
The Stooq CSV trial does not independently establish split/dividend adjustment,
currency, corporate-action policy, or permission to republish data.

## Browser reconciliation
1. Open `shared-data.html` and sign in to the TEST Supabase project.
2. Open `test-price-reconciliation.html`.
3. Select the generated `price-source-probe.json` and run comparison.
4. Review missing, matching, and conflicting observations.
5. Download the read-only comparison report if needed.

Even a report with zero conflicts **does not authorize insertion**. Supabase
RLS may hide rows from the authenticated user, and a read-only snapshot is
not a transactionally consistent database export.

## Activation gates for a future updater
- Verify that the source provides the intended USD closing-price series.
- Determine whether it is adjusted or unadjusted, and match stored `price_basis`.
- Check redistribution/API terms and availability for each ticker.
- Validate all TEST RLS/owner constraints and idempotent insert behavior.
- Confirm no conflict with stored data and prove rollback in TEST.
- Obtain explicit authorization before changing TEST Supabase data.
- Keep SPCX excluded until its ticker and authoritative source are confirmed.

GitHub Actions workflow is intentionally manual-only. GitHub may require the
workflow definition to exist on the default branch before the Dispatch button
is available; do not merge or move it to production just to enable execution.
