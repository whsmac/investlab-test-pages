# TEST scenario storage proposal — review only

Status: **NOT APPLIED**. The SQL file is a design proposal, not an executable migration in CI. Do not run against production or TEST without explicit approval.

## Data boundaries
- `test_user_scenarios`: authenticated owner ID, strategy name, hypothetical steps, scenario assumptions, optional ledger revision reference, timestamps.
- Ledger-derived holdings, actual cash, cost basis, transaction history, and valuation must remain in the ledger/read-only projection. They are **not** stored in scenario documents.
- Existing browser localStorage strategies remain untouched. No automatic migration, deletion, overwrite, or upload.
- A strategy with the same name can exist for different users; within one user, names are unique.

## Required verification before any deployment
1. Confirm Supabase TEST project and current schema/role grants; check table name conflicts.
2. Confirm two independent TEST users: each can CRUD own scenarios and cannot read/write/delete another user's rows, including attempted owner_id substitution.
3. Confirm anonymous access is denied; verify service-role is never used in the browser.
4. Validate nested hypothetical steps, tickers, prices, quantities, assumption key allowlist, payload size, max scenarios per owner, and optimistic concurrency. The draft SQL does **not** fully enforce these.
5. Confirm rollback and backup strategy; test transaction failure and restore on TEST only.
6. Add explicit user approval before any SQL execution, remote write, or migration.
7. Only after successful checks enable online UI with authenticated Supabase session and clear local-vs-online labeling.

## Design caveats
The SQL uses a distinct `test_` table name as a safeguard, but that alone is not a security boundary. RLS is necessary, and TEST integration tests are still required. Owner ID must be assigned/checked from authenticated session. A future API should enforce size, schema, concurrency, and account/ledger reference consistency. 
