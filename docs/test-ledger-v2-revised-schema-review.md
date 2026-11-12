# INVESTLAB TEST revised ledger v2 — design review only

This fresh-install schema candidate is **not** an upgrade, migration, or deployable SQL. It is not executed.

## Changes
- Five owner-scoped tables with FORCE RLS and authenticated SELECT-only grants.
- Account creation request ID unique per user; event request ID unique per user and account.
- Event types include opening, buy, sell, deposit, withdrawal, fee and reversal.
- Multiple legs per event by unique(event_id,asset_type,asset_code), allowing one opening event to hold many distinct symbols and currencies.
- Opening historical cost basis field on security legs. Symbol `USD` is a security ETF; cash `USD` is distinguished by `asset_type`.
- No client INSERT/UPDATE/DELETE and no executable RPC in this candidate.

## Remaining design problems (BLOCKED)
- Opening cost basis cannot by itself represent acquisition dates, tax lots, FX rates, realized P/L or full historic tax calculations.
- The database does not enforce cross-leg balancing or prevent negative balances; a future posting RPC must enforce invariants under account lock.
- Multi-leg unique constraint disallows repeated legs of same asset within one event; aggregate legs by asset first or design lot-level structure.
- A single account can currently have multiple opening events with distinct request IDs; require a separate one-time opening marker/invariant.
- No authenticated account creation, opening posting, deposits, reversals, or trade RPC compatible with this schema yet.
- Ownership and permission tests must use real A/B/anonymous sessions; SQL Editor is privileged.
- Existing portfolio's multi-account holdings must be explicitly mapped and reconciled before import.
- Versioned migration path, rollback, backup, concurrency, recovery and live SQL checks remain unverified.

## Next step
Design a pure offline **event/leg invariant validator** and tests covering multi-symbol opening, cash and security separation, balance underflow, duplicate requests and idempotent retries. Do not install schema without separate approval.
