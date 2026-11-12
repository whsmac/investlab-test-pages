# TEST account onboarding / opening RPC — review gate

## Proposed RPCs (not installed)
1. `investlab_create_account_v1`: derive owner from `auth.uid()`, idempotent request ID, account name validation, deny anonymous and cross-owner operations.
2. `investlab_post_opening_v1`: account-scoped atomic opening of security positions and USD/KRW cash, no synthetic buy/sell, idempotent retries and full rollback.

## Blocking incompatibilities in current five-table candidate
- `investlab_ledger_events.event_type` permits **buy/sell only**, not opening.
- `investlab_ledger_legs` has `unique(event_id,asset_type)`, preventing one opening event with multiple securities or currencies.
- Historical cost basis has no suitable storage field in the current ledger legs.
- Account onboarding lacks a request ID/idempotency table and RPC.
- Existing ledger trade RPC assumes a funded account, but no safe opening/deposit flow exists.
- Opening data must not be posted as a fake trade.

These are **schema design changes**, not just missing function definitions. For safety, `sql/test-account-opening-rpc-DESIGN-DO-NOT-RUN.sql` contains only comments, no executable SQL.

## Next safe work
Design a versioned schema proposal that explicitly models immutable opening events, multiple legs, cost basis and account creation idempotency. Add offline regression tests. Only after independent review, approval and real TEST A/B/anon tests may execution be considered.

**No migration, SQL execution, data import, production change, or PR merge is authorized.**
