# INVESTLAB TEST: A/B/anonymous security integration gates (REVIEW ONLY)

**Do not execute against TEST Supabase without separate approval.** Never run against production. Existing TEST schema and function installation are not verified.

## Prerequisites
1. Independently verify TEST project identity and the exact schema/function versions using the read-only catalog preflight.
2. Two **distinct, real authenticated test users** (A and B) and an anonymous client; two test accounts owned separately.
3. Use each user's genuine Supabase JWT, not an admin/service-role key, and do not impersonate claims via arbitrary SQL session variables.
4. Record the database state before testing; use disposable TEST accounts and an approved rollback/cleanup plan. The function writes ledger events and legs.
5. Verify `extensions.digest(bytea,text)`, `payload_hash` schema, RLS/FORCE RLS, function owner and direct table write grants.

## Required independent live assertions
| ID | Acting identity | Action | Required result |
|---|---|---|---|
| A1 | A | Read own account, events, legs | Only A's records |
| A2 | A | Read B's account, events, legs | No B records |
| B1 | B | Read own account, events, legs | Only B's records |
| B2 | B | Read A's account, events, legs | No A records |
| N1 | anonymous | Read private tables | Denied or no private rows |
| N2 | anonymous | Execute opening RPC | Denied |
| A3 | A | Call opening RPC on B's account | Denied, zero writes |
| B3 | B | Call opening RPC on A's account | Denied, zero writes |
| A4 | A | Post opening to A's account once | Exactly one event, expected legs |
| A5 | A | Replay same request and same payload | Same event ID, no extra legs |
| A6 | A | Replay same request ID with changed quantity | Rejected, no extra writes |
| A7 | A | Different request ID, same account opening | Rejected, no extra writes |
| A8 | A | Duplicate asset rows / invalid cost / malformed hash | Rejected, zero writes |
| A9 | A | Concurrent opening requests for same account | At most one opening event |
| A10 | A | Direct INSERT/UPDATE/DELETE on ledger tables | Denied |
| R1 | authorized operator | Verify failed transactions leave no partial event/legs | No partial writes |

## Evidence requirements
For each case capture: test identity (A/B/anon, **not JWT**), timestamp, TEST project ref, SQL/function version, expected/observed status, event/leg count before and after, and redacted error. Never record credentials. A passing static Node test or catalog check does **not** count as a live assertion.

**Release gate:** no installation/migration/production deployment without separate user approval and recorded live evidence for every applicable case.
