// TEST Supabase read-only schema compatibility check. No DB mutations.
const TEST_URL = "https://gopofxyezhwpfxbecrxd.supabase.co";
const REQUIRED = ["MSFT", "GOOGL", "AMZN", "META", "TSLA"];

export async function diagnoseYahooTestSchema(client) {
  if (!client || client.supabaseUrl !== TEST_URL) throw Error("TEST Supabase URL mismatch");
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data?.user?.id) throw Error("Verified TEST login required");
  const checks = [];
  const companies = await client.from("companies").select("id,ticker").limit(100);
  if (companies.error) {
    checks.push({table:"companies",status:"BLOCKED",reason:companies.error.message || "select failed"});
  } else {
    const found = new Set();
    let invalidIds = 0;
    for (const row of companies.data || []) {
      const ticker = String(row.ticker || "").trim().toUpperCase();
      if (!REQUIRED.includes(ticker)) continue;
      found.add(ticker);
      if (!Number.isSafeInteger(Number(row.id)) || Number(row.id) <= 0) invalidIds++;
    }
    const missing = REQUIRED.filter(ticker => !found.has(ticker));
    checks.push({table:"companies",status:missing.length || invalidIds ? "BLOCKED" : "OK",
      missing_tickers:missing,invalid_integer_ids:invalidIds,
      note:"Limited to first 100 RLS-visible rows"});
  }
  const prices = await client.from("market_price_observations")
    .select("id,company_id,trading_date,close_price,currency,price_basis").limit(1);
  if (prices.error) {
    checks.push({table:"market_price_observations",status:"BLOCKED",
      reason:prices.error.message || "select failed"});
  } else {
    checks.push({table:"market_price_observations",status:"OK",
      sample_rows_visible:(prices.data || []).length,
      note:"Read-only column probe; empty RLS-visible result does not prove no underlying rows"});
  }
  return {mode:"TEST_YAHOO_SCHEMA_DIAGNOSTIC_ONLY",database_writes:0,
    compatible:checks.every(item=>item.status==="OK"),checks};
}
