// Export only allowlisted TEST schema diagnostics; never credentials, user IDs or raw errors.
const ALLOWED_TABLES = new Set(["companies", "market_price_observations"]);
const ALLOWED_STATUSES = new Set(["OK", "BLOCKED"]);
export function buildSafeYahooSchemaReport(diagnostic) {
  if (diagnostic?.mode !== "TEST_YAHOO_SCHEMA_DIAGNOSTIC_ONLY" ||
      diagnostic.database_writes !== 0 || !Array.isArray(diagnostic.checks)) {
    throw Error("Invalid read-only TEST diagnostic");
  }
  const seenTables = new Set();
  const checks = diagnostic.checks.map(check => {
    if (!ALLOWED_TABLES.has(check.table) || !ALLOWED_STATUSES.has(check.status)) {
      throw Error("Unexpected TEST diagnostic check");
    }
    if (seenTables.has(check.table)) throw Error("Duplicate TEST diagnostic table");
    seenTables.add(check.table);
    const out = {table:check.table,status:check.status};
    if (check.table === "companies") {
      if (Array.isArray(check.missing_tickers)) {
        out.missing_tickers = check.missing_tickers.filter(t => ["MSFT","GOOGL","AMZN","META","TSLA"].includes(t));
      }
      for (const key of ["invalid_integer_ids","duplicate_tickers","duplicate_ids","visible_rows_checked","expected_visible_rows"]) {
        if (Number.isSafeInteger(check[key]) && check[key] >= 0) out[key] = check[key];
      }
    }
    if (check.table === "market_price_observations" &&
        Number.isSafeInteger(check.sample_rows_visible) && check.sample_rows_visible >= 0) {
      out.sample_rows_visible = check.sample_rows_visible;
    }
    // Never export arbitrary backend error text, auth/session data or connection details.
    return out;
  });
  if (![...ALLOWED_TABLES].every(table => seenTables.has(table))) throw Error("Incomplete TEST diagnostic report");
  return {mode:"TEST_YAHOO_SCHEMA_SAFE_REPORT",database_writes:0,
    compatible:diagnostic.compatible === true && checks.every(x=>x.status==="OK"),checks};
}
