# TEST personal ledger: account onboarding and opening balance plan

**Offline design only. No SQL execution or database writes.**

## Dependency sequence
1. **Account ownership**: user must explicitly map each account UUID to its owner and display name. Never infer ownership from ticker or account name.
2. **Opening snapshot**: per account, verify each ticker's shares and USD average cost; record USD/KRW cash separately. Ticker `USD` is an ETF and **not** the cash balance.
3. **Historical basis**: opening cost basis and original trade dates need separate confirmation for eventual tax reporting. A zero cost basis is flagged.
4. **Server onboarding RPC**: not implemented. Need a separate authenticated RPC that derives owner from `auth.uid()`, checks account name and idempotency, and forbids cross-user ownership.
5. **Opening posting RPC**: not implemented. Must be atomic, idempotent, and account-scoped. Opening entries are **not** buys/sells and must not go through `investlab_post_trade_v1`.
6. **Cash management**: USD/KRW deposit/withdrawal, fees, FX and reversals require distinct event rules. Do not fake a deposit as a buy/sell.
7. **Server validation**: verify A/B/anonymous isolation, rollback, duplicate requests, balance reconciliation and recovery using disposable TEST fixtures after separate approval.

## Existing offline building blocks
- `opening-draft-transfer.mjs`: strict JSON import/export for account-scoped positions and cash.
- `opening-snapshot-preview.mjs`: precision and duplicate checks.
- `opening-account-plan.mjs`: explicit account registry, ownership confirmation, account-to-opening-row consistency and warnings.

## Remaining blockers
The new five-table SQL contract has no onboarding, opening-balance, or cash management RPCs. Therefore the personal ledger is **not deployable**. No SQL execution or TEST DB modifications are authorized by this document.
