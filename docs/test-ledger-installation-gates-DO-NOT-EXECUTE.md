# INVESTLAB TEST personal-ledger installation gate — DO NOT EXECUTE

**Target**: TEST Supabase project `gopofxyezhwpfxbecrxd`. This is a review document, not deployment authorization.

## Confirmed static design drift
- `sql/test-ledger-v1-migration-DO-NOT-RUN.sql` creates **three** personal tables: `investlab_accounts`, `investlab_ledger_events`, `investlab_ledger_legs`.
- The catalog audit `sql/test-ledger-security-audit-JSON-READONLY.sql` expects **five** tables (also `investlab_personal_symbols` and `investlab_personal_scenarios_v2`).
- Migration proposes `investlab_post_trade_v1`; catalog audit and JS security reviewer still expect `investlab_post_trade_v0`.
- Therefore the current proposed migration and audit **must not** be treated as one deployable version. Static contract tests intentionally flag the mismatch.

## Required gates before any installation
1. Select a single versioned schema and audit contract, including all five tables or explicitly de-scope the extras consistently.
2. Review privileged SECURITY DEFINER ownership, function search_path, RLS policies, grants and anonymous RPC permissions.
3. Design authenticated account onboarding, opening balances, cash deposit/withdrawal and reversals before enabling real trading.
4. Define precision, currency, fees, taxes, historical oversell prevention, and account-level reconciliation rules.
5. Verify backup, clean rollback, and no-impact behavior on shared existing tables.
6. Obtain **explicit user approval** for the exact TEST-only migration and test fixtures; do not touch production.
7. Run separate real A/B/anonymous authenticated tests; SQL Editor privileged access is not a substitute.
8. Verify idempotency, transaction rollback, concurrency, reconciliation and restore; retain Draft PR until review.

## Smallest safe next implementation
Unify the versioned contract in a new **review-only** SQL candidate and matching read-only audit. Add static and offline tests; do not execute either script or create accounts. Preserve original draft files for traceability.

## Status
**BLOCKED** — schema and audit mismatch, missing onboarding/opening balance flows, unverified live RLS/rollback, no explicit deployment approval.
