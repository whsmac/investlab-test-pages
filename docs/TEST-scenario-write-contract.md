# TEST scenario write contract — proposed, NOT DEPLOYED

## Proposed online write contract
- Browser must send an authenticated session, scenario UUID, expected integer revision, strategy name, hypothetical steps, and assumptions.
- Server must derive owner from `auth.uid()`; never trust a client-supplied owner ID.
- New scenario: atomically enforce a per-owner maximum of 30 rows, 100 hypothetical steps per scenario, and maximum serialized payload of 64 KiB.
- Update: atomically update only where `id`, `owner_id = auth.uid()`, and `revision = expected_revision`; increment revision in the same statement. Zero updated rows must be distinguished as not-found vs stale revision without leaking another user's row.
- Never store actual positions, cash balance, average acquisition cost, or ledger transaction snapshots in scenario JSON. Validate nested keys and values server-side even if browser validation passes.
- The existing SQL draft does **not** enforce these rules. Do not enable online save based on browser-side checks.

## Proposed TEST-only SQL design changes (review, not executable migration)
- Add `revision bigint not null default 1 check (revision >= 1)`.
- Use an authenticated RPC or tightly constrained database operation to enforce per-owner quota and optimistic concurrency **atomically**. Plain count-then-insert in a browser is race-prone.
- Validate all nested step keys and assumptions with database constraints/validated RPC; reject unknown keys and invalid values.
- Limit privileges to the operations needed by the chosen RPC approach; direct UPDATE/INSERT grants in the original draft may bypass its validation.
- Define a transaction-safe creation/update contract, conflict response, deletion behavior, and audit-safe logs.
- Plan backward compatibility and rollback before deployment.

## Explicit blockers
1. Confirm current TEST schema with approved read-only preflight.
2. Finalize server-side JSON checks, grants, revision, quotas, and conflict error contract.
3. Verify two-user isolation and concurrent-write race behavior against TEST using synthetic data only.
4. Obtain separate user approval for schema changes and TEST data writes.
5. Keep PR Draft, production untouched, online save disabled until live tests pass.
