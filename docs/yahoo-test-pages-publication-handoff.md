# Yahoo TEST Pages publication handoff (NO DEPLOY)

Target site: https://whsmac.github.io/investlab-test-pages/
Target JSON: `data/yahoo-public-review.json`

## Verified source
The `TEST offline ledger checks` workflow produces:
- `investlab-test-yahoo-publication-preflight`: freshness/coverage gate.
- `investlab-test-yahoo-pages-staging`: SHA-256 checked JSON and manifest.
- `investlab-test-yahoo-complete-site-preview`: complete offline TEST site.
- `investlab-test-yahoo-site-readiness`: explicit ready/not-ready, source JSON SHA-256 and no-deploy status.

These are downloadable Actions artifacts, **not** public website URLs. Artifacts expire after seven days. The site must not be described as live until a real browser fetch confirms its content.

## Publication decision gate
1. Require successful CI and `ready: true` from the same workflow run.
2. Require the source run's head SHA to match the reviewed TEST feature commit.
3. Check the staged JSON checksum against the readiness report `json_sha256`.
4. Confirm that only the TEST Pages repository is the destination; never change the production dashboard or either Supabase schema/data.
5. Confirm which branch/folder currently serves GitHub Pages **before** planning publication. A feature branch commit does not itself update the published site.
6. Obtain separate explicit approval before any deployment or publishing branch modification.
7. After approved publication, fetch the actual public JSON URL, verify content type, ticker coverage, freshness, checksum, and chart rendering. Do not call it real-time quotes.

## Automation constraint
The existing TEST workflow is triggered by PR and manual events; it does **not** provide a reliable daily refresh on the public Pages site. A scheduled workflow on GitHub Actions runs from the default branch and still requires a separate authorized publishing path. Do not claim automatic online updates are complete.

## Scope
This is a publication handoff only: no API credentials, no service-role key, no database writes, no PR merge, no production deployment, and no Pages publication.

## Live website verification (read-only; run only after authorized publication)
```sh
python -m scripts.verify_yahoo_test_pages_live --expected-sha256 SHA256_FROM_APPROVED_READINESS_REPORT --output yahoo-live-check.json
```
The command only requests the exact public JSON URL, refuses redirects to other origins, limits download size, checks content type, all five tickers, no private observation fields, source flags, freshness (seven calendar days), and reviewed SHA-256. It exits nonzero if missing/stale/invalid. The report contains no portfolio data. Run offline unit tests before publication with:
```sh
python -m unittest tests.test_price_yahoo_live_pages -v
```
This verifier does not publish the website or establish a recurring schedule.
