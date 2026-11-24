# Pilot: local Company Facts / FSDS cross-check
Read-only, no network. Existing SEC API and FSDS collectors remain intact.
## Inputs
Official per-issuer Company Facts JSON files saved by a normal browser, if available.
The user-supplied two FSDS ZIP archives from 2026q2 and 2026q3 yielded 11 company-period rows; 10 complete metric sets, SPCX CAPEX missing. Local SHA-256 and byte counts rechecked against the review manifest. This is not a filing reconciliation or verification of SEC-published hashes.
Do not commit raw downloads, contacts, portfolio data, or review output into website assets.
## Local invocation
python -m scripts.sec_companyfacts_offline_review companyfacts/*.json --baseline fsds-review.json --output companyfacts-review.json
The tool identifies issuers by CIK, rejects duplicates, uses exact quarter start/end, compares matching fiscal-year cumulative cash amounts, rejects conflicting direct facts, and reports missing metrics for completed 12/20 calendar quarters. Each selected fact retains accession, start/end, filed date, USD value, and filing URL.
The Amazon productive-assets tag is intentionally not accepted in Company Facts without primary statement evidence. FSDS may show a value while Company Facts remains null; a mismatch or missing item requires review, not forced replacement.
## Gates
- Actual official Company Facts JSON access/download has not been verified in this step. Do not repeat blocked automated requests.
- Cross-check actual overlapping values against FSDS and original filings, inspect revisions, and establish historical coverage before chart integration.
- Keep publication_allowed=false until a separate approved publishing path verifies actual evidence, preserves last validated data, and passes TEST checks.
- No database writes, PR merges, deployment or user account modifications.
