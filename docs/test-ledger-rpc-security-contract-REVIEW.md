# INVESTLAB TEST — multi-user posting RPC security gates (REVIEW ONLY)

Status: design checklist and offline tests only. **No database SQL was executed.**

A single authoritative ledger must derive the owner from `auth.uid()` inside every SECURITY DEFINER RPC. Never accept client-supplied user IDs. Before creating any posting function, verify a dedicated least-privilege function owner, fixed search_path, same-transaction PUBLIC/anon EXECUTE revocation, and direct INSERT/UPDATE/DELETE revocation on event and leg tables. Account creation and opening must be authenticated and idempotent. Lock the account row before checking balances and posting an event with all legs in one transaction. Reject overdrafts, oversells, duplicate openings, request-ID reuse with different payloads, and cross-account reversal. Reversals must be immutable compensating events, not destructive edits. Historic backdated transactions need chronological validation, not just present balance checks.

The accompanying `ledger-rpc-security-contract.mjs` checks **declared design requirements**, not actual SQL or DB permissions. A passing checklist does not prove any invariant is implemented. Live verification requires two independently authenticated TEST users A/B plus anonymous requests, concurrency races, forced rollback, backup/restore and complete reconciliation. The legacy v1/v2 SQL candidates are incompatible and must not be installed as-is.

Next engineering task: implement a single reviewed, non-executable v2 RPC SQL candidate and static SQL assertions. Obtain separate user approval before any TEST database changes or real-data migration. Never touch production or merge the Draft PR.
