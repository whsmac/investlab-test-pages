# TEST five-table ledger contract candidate — DO NOT EXECUTE

These two **new** artifacts are aligned by table names and RPC version:

- `sql/test-ledger-v1-five-table-CONTRACT-DO-NOT-RUN.sql`: five personal tables and `investlab_post_trade_v1`.
- `sql/test-ledger-v1-five-table-audit-READONLY.sql`: read-only catalog query for the same five tables and `investlab_post_trade_v1`.

The earlier SQL files are preserved unchanged. The contract alignment is **not** a security review or installation approval.

## Important restrictions
- Personal symbol and scenario tables in this candidate are read-only to authenticated users; there is no approved write/onboarding workflow.
- The ledger RPC is still **not deployable**. Account creation, initial cash/shares, deposits, reversals, currency conversion, fee/tax handling, and historical oversell controls are not implemented.
- SECURITY DEFINER function ownership, table grants, RLS policy behavior and live rollback require independent testing.
- Do not execute SQL or connect to production. The test project is `gopofxyezhwpfxbecrxd`.
- After an explicit user-approved TEST-only plan, inspect actual schema state and perform A/B/anonymous checks with disposable fixtures before enabling any write flow.

## Acceptance gates
1. Static table/RPC contract matches.
2. SQL review and rollback plan independently approved.
3. TEST-only setup explicitly approved.
4. A/B/anonymous read and write isolation verified with real authenticated sessions.
5. Atomicity, idempotency, concurrency, recovery, balances and reconciliation verified.
6. Separate explicit approval before any actual data import.

**Current status:** gate 1 is the only intended output of this change; gates 2–6 remain blocked.
