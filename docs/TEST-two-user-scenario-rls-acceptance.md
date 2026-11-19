# TEST user-isolation acceptance matrix (NOT EXECUTED)

**Scope:** proposed `public.test_user_scenarios` only. The table is not installed. Never use production users or production Supabase. No service-role credentials in a browser. SQL deployment and live writes require separate explicit user approval.

## Preconditions
- TEST project ID independently confirmed, schema backup/rollback reviewed.
- SQL proposal reviewed and approved; table and policies installed on TEST only after approval.
- Two distinct non-admin TEST identities A and B, with separate authenticated JWT sessions.
- Each identity has one synthetic scenario row, created only after approval. No real investment records.
- Negative cases use a distinct JWT; do not impersonate via a client-controlled `owner_id`.

| Case | Identity | Operation | Expected |
|---|---|---|---|
| 01 | anonymous | SELECT | No scenario rows; table access denied |
| 02 | A | INSERT own owner_id | Success |
| 03 | B | INSERT own owner_id | Success |
| 04 | A | SELECT own | A row visible |
| 05 | B | SELECT own | B row visible |
| 06 | A | SELECT B row by ID | No rows |
| 07 | B | SELECT A row by ID | No rows |
| 08 | A | INSERT owner_id=B | Rejected by RLS |
| 09 | A | UPDATE A row owner_id=B | Rejected by RLS |
| 10 | A | UPDATE B row | No rows changed |
| 11 | A | DELETE B row | No rows changed |
| 12 | B | UPDATE A row | No rows changed |
| 13 | B | DELETE A row | No rows changed |
| 14 | A | UPDATE own row | Success |
| 15 | B | DELETE own synthetic row | Success |
| 16 | A | same strategy name as B | Allowed, per-owner uniqueness |
| 17 | A | duplicate own strategy name | Unique constraint rejection |
| 18 | A | anonymous/expired JWT | No access |
| 19 | A | payload includes ledger-derived snapshots | Rejected by schema/API validation |
| 20 | A | oversized/invalid nested steps | Rejected by API/DB validation (not yet implemented) |

## Evidence and stop conditions
- Record request role, sanitized response status, row count, and before/after IDs. Never record JWT, access tokens, passwords, real holdings, or personally identifying data.
- Verify that an UPDATE/DELETE returning zero rows does not silently count as success.
- Stop immediately on any cross-user read/write/delete, unexpected anonymous access, or permission escalation.
- No production deploy, PR merge, real user migration, or automatic online-save activation.
- Roll back synthetic rows and (only with explicit approval) schema changes after tests.
- This checklist is a plan, **not proof of live RLS isolation**.
