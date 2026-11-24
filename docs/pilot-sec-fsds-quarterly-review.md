# SEC Financial Statement Data Sets — TEST review only

Official source: https://www.sec.gov/dera/data/financial-statement-data-sets.html
Schema: https://www.sec.gov/files/financial-statement-data-sets.pdf

2026 Q3 (62.13 MB) is the first single-archive smoke test. The archive quarter is the filing submission quarter, NOT the fiscal results quarter. The smoke test cannot establish five-year coverage. In particular Q3 financial reports often arrive in the Q4 archive.

## Implementation
- Stream the official tab-separated SUB, PRE and NUM tables directly inside the ZIP; never unpack arbitrary file paths.
- Reuse the six existing CIKs. Restrict to 10-Q/K and amendments, current reporting period, standard US GAAP USD amounts and matching primary statement. Exclude dimensional and co-registrant observations.
- Preserve both filing accession and source archive for each metric. Direct 1-quarter facts preferred; only subtract adjacent same-fiscal-year YTD periods using the same tag when direct facts are absent. YTD deltas are unreconciled until the original filings are checked.
- Refuse conflicts in latest same-duration facts; do not infer unavailable values or pre-listing SpaceX results. Missing metrics remain null. Microsoft fiscal year labels differ from calendar quarters.
- CAPEX means cash payments to acquire PP&E, not lease-inclusive or all investment outlays. Margin = operating income / revenue.
- Review output is deliberately a separate format (INVESTLAB_SEC_FSDS_REVIEW_V1) from the existing API asset. No UI, database, site publisher, or existing data changes.

## Execution
The one-off same-repository PR opening workflow attempts one official ZIP GET using the existing private SEC identification secret only after offline tests pass. No retry/redirect, no secret logging, no original ZIP upload, no deploy. If access is restricted, stop; do not rerun repeatedly. A successful run saves only the extracted review JSON as a temporary CI artifact. A manually obtained official ZIP can also be read locally without a network request or contact.

Offline tests: python -m unittest discover -s tests -p 'test_sec*.py' -v

Example review (local official files, not user portfolio files):
python -m scripts.sec_fsds_quarterly_review 2026q2.zip 2026q3.zip --output fsds-review.json

## Remaining publication gates
1. Real archive accessibility and schema validation.
2. Audit sample metrics against original 10-Q/K, including CAPEX definitions, amendments and overlapping facts; flag unsupported issuer tags.
3. Build local/cache-based five-year coverage by actual period and metric; include enough archive quarters for reporting lag and previous YTD. Missing coverage must remain visible. No guessing.
4. Validate review schema independently and integrate as a separate source with filing URLs in the TEST chart. Never overwrite existing API/DB data. Keep last validated snapshot when any download fails.
5. Only then implement quarterly refresh and deploy validated public data to TEST Pages. No PR merge or Supabase writes.
