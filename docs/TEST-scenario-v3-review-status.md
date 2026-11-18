# TEST online strategy storage — v3 review status

The earlier v2 proposal has a **deployment blocker**: its SQL expression uses numeric casts inside boolean expressions; PostgreSQL expression evaluation must not be relied upon to short-circuit malformed JSON values. Therefore **do not execute v2**.

A separate v3 review-only function draft uses PL/pgSQL sequential checks, validates JSON types before numeric casts, rejects unapproved nested keys, and catches malformed inputs. It ends with ROLLBACK and intentionally does not create a table or RPC.

This is a **static design review only**. No PostgreSQL instance has executed this draft. Before any TEST deployment:
1. Independently execute the validator in a disposable PostgreSQL/Supabase-compatible environment with valid, invalid, null, nested-snapshot and oversized JSON fixtures.
2. Confirm function privileges and whether untrusted callers can invoke the function.
3. Produce one integrated TEST-only migration with server-enforced atomic per-owner quota and expected-revision updates; verify concurrency.
4. Confirm TEST project identity and run a two-user RLS matrix with synthetic accounts.
5. Obtain explicit approval for any TEST schema or data writes. Do not touch production or merge Draft PR.

The current browser online-save control remains disabled. Existing local strategies and TEST Supabase data remain unchanged.
