# TEST opening allocation UI integration

The TEST-only page `test-portfolio-account-allocation.html` now supports two separate actions:

1. **초기잔고 검증**: reviews account allocations and cash without accepting cost confirmations.
2. **취득원가 확인 및 원장 대조**: requires explicit account/ticker cost confirmation and ownership confirmation, prepares separate opening events, runs the offline event ledger and reconciles balances.

The sample data deliberately splits TSLA between two accounts with different verified average costs. The JSON result can be downloaded locally; neither action uploads data or calls Supabase.

## Limitations
- A user must enter account UUIDs, ownership confirmations and verified cost per account/ticker.
- The source portfolio export does not prove historical cost or account ownership.
- No browser-to-server posting, database migration, tax-lot accounting, or authenticated A/B isolation tests are implemented.
- The UI is in a Draft PR only, not the public GitHub Pages main site.
- This is not permission to run any SQL or merge.
