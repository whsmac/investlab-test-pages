# INVESTLAB TEST — A/B/anonymous isolation test runbook (NO EXECUTION)

Target: **TEST only**, project `gopofxyezhwpfxbecrxd`. This document does not authorize SQL execution, creation of accounts, modification of grants/RLS, or use of production data.

## Preconditions
1. Confirm the Supabase project ID in the dashboard and the test URL. Never use service-role credentials in browser tests.
2. Confirm the personal ledger schema is installed in TEST. If any table or RPC is absent, record **BLOCKED / NOT RUN**; do not install schema under this runbook.
3. Obtain separate approval for disposable test accounts A and B, disposable fixtures, and any writes needed for tests. Use only synthetic data and isolated TEST project.
4. Define an evidence reference for each run; do not record passwords, JWTs, refresh tokens, or personal financial data.

## Execution matrix
| Case | Session | Attempt | Expected | Evidence to capture |
|---|---|---|---|---|
| a_own_read | A | Read A-owned fixture | ALLOW | status, row owner masked, count |
| a_other_read | A | Read B-owned fixture | DENY | 0 rows or permission denial; no B data |
| b_own_read | B | Read B-owned fixture | ALLOW | status, row owner masked, count |
| b_other_read | B | Read A-owned fixture | DENY | 0 rows or permission denial; no A data |
| anon_read | anon | Read private fixture | DENY | 0 rows or permission denial |
| a_other_write | A | Attempt B-owned update/delete in rollback-controlled TEST | DENY | affected rows 0 or denied, B fixture unchanged |
| b_other_write | B | Attempt A-owned update/delete in rollback-controlled TEST | DENY | affected rows 0 or denied, A fixture unchanged |
| anon_rpc | anon | Attempt trade RPC without credentials | DENY | explicit permission/auth denial and no ledger change |

**Important:** A query returning zero rows proves isolation only if the target fixture was independently confirmed to exist and be readable by its owner. SQL Editor often runs with elevated permissions; it cannot substitute for A/B authenticated client sessions.

## Evidence and failure rules
- Record case ID, expected result, observed ALLOW/DENY, test method, reference to sanitized log, and notes.
- An unexpected returned row, changed foreign fixture, or successful anonymous RPC is a **FAIL**. Stop the migration review.
- If test prerequisites, target fixture, or session identity cannot be proven, mark **NOT VERIFIED**, not PASS.
- Verify the original fixture remained unchanged after write-denial tests.
- Use `test-ab-isolation-review.html` for manual results. The structured evidence template can be downloaded from the companion page.
- Manual observations are never treated as authenticated server proof by the current offline tools.

## Stop conditions
No schema installation, no production access, no real customer/portfolio data, no merge, no trade posting, and no upload until separate explicit approval and a validated rollback procedure.
