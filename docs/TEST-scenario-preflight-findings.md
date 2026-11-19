# TEST online scenario storage — preflight findings and decision gate

Status: **DESIGN ONLY; no TEST Supabase SQL executed**. The existing proposed migration is not approved for execution.

## Findings in current proposal

| Item | Finding | Required action |
|---|---|---|
| Owner-only RLS | SELECT/INSERT/UPDATE/DELETE policies exist in draft | Verify with two actual non-admin TEST identities and JWTs |
| Existing table conflicts | `CREATE TABLE IF NOT EXISTS` can mask a pre-existing incompatible table | Run read-only catalog checks and compare columns, constraints and grants before any migration |
| Nested JSON validation | Current SQL checks JSON top-level type/length but does not enforce ticker, quantity, price, step keys or total byte size | Design DB-side validation (function/constraint or validated RPC) and test invalid direct PostgREST writes |
| Assumption key allowlist | Current SQL excludes only selected keys; other unapproved fields could be stored | Enforce allowlist at DB/API boundary, not only in browser |
| Per-owner record cap | No DB limit for number of saved strategies | Specify limit and atomic enforcement if required |
| Write concurrency | `updated_at` has no trigger and no conditional version checking | Design explicit revision/ETag-like optimistic concurrency; do not rely on timestamp alone |
| Grants and policy coexistence | Existing policies and grants unknown until live read-only check | Confirm schema state; never infer from offline unit tests |
| Rollback | Draft creates objects but has no tested reversal/backup plan | Document restore and rollback, test on disposable TEST setup before adoption |
| Naming | `test_user_scenarios` is a TEST-only proposed table | Do not assume name prefix alone prevents production deployment |
| Data boundaries | Actual positions/cash/average cost excluded by intent | Reject nested snapshot keys and validate direct DB writes before enabling online save |

## Recommended execution sequence
1. Confirm TEST project identity through Supabase console, not by guessing from SQL output.
2. Inspect `READONLY-test-scenario-preflight.sql` and execute SELECT-only queries **only after explicit user approval for TEST access**.
3. Reconcile findings; revise proposal and test nested payload validation, conflict semantics, permissions, rollback.
4. Request a separate explicit approval for TEST schema changes and synthetic TEST data writes.
5. Verify two-user isolation and denied writes. Keep online UI disabled until all gates pass.

No existing user records, legacy browser strategies, or production systems are changed by this review.
