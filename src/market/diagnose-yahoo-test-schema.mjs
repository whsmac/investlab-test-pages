// TEST Supabase read-only schema compatibility check. No DB mutations.
const TEST_URL = "https://gopofxyezhwpfxbecrxd.supabase.co";
const REQUIRED = ["MSFT", "GOOGL", "AMZN", "META", "TSLA"];

export async function diagnoseYahooTestSchema(client) {
  if (!client || client.supabaseUrl !== TEST_URL) throw Error("TEST Supabase URL mismatch");
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data?.user?.id) throw Error("Verified TEST login required");
  const checks = [];
  const companyCount = await client.from("companies").select("id", {count:"exact",head:true});
  if (companyCount.error || !Number.isSafeInteger(companyCount.count) || companyCount.count < 0) {
    checks.push({table:"companies",status:"BLOCKED",reason:companyCount.error?.message || "Exact visible-row count unavailable"});
  } else if (companyCount.count > 10000) {
    checks.push({table:"companies",status:"BLOCKED",reason:"Visible company count exceeds diagnostic limit (10000)"});
  } else {
    const found = new Set(), ids = new Set();
    let invalidIds = 0, duplicateTickers = 0, duplicateIds = 0, fetched = 0, queryError = null;
    while (fetched < companyCount.count) {
      const end = Math.min(fetched + 1000, companyCount.count) - 1;
      const result = await client.from("companies").select("id,ticker").order("id",{ascending:true}).range(fetched,end);
      if (result.error || !Array.isArray(result.data) || result.data.length !== end-fetched+1) {
        queryError = result.error?.message || "Company pagination incomplete"; break;
      }
      for (const row of result.data) {
        const ticker = String(row.ticker || "").trim().toUpperCase();
        if (!REQUIRED.includes(ticker)) continue;
        if (found.has(ticker)) duplicateTickers++;
        found.add(ticker);
        const id = Number(row.id);
        if (!Number.isSafeInteger(id) || id <= 0) invalidIds++;
        else if (ids.has(id)) duplicateIds++;
        else ids.add(id);
      }
      fetched += result.data.length;
    }
    const verifyCount = await client.from("companies").select("id", {count:"exact",head:true});
    if (verifyCount.error || verifyCount.count !== companyCount.count) {
      queryError = verifyCount.error?.message || "Company visible-row count changed during diagnostic";
    }
    const missing = REQUIRED.filter(ticker => !found.has(ticker));
    checks.push({table:"companies",
      status:queryError || missing.length || invalidIds || duplicateTickers || duplicateIds ? "BLOCKED" : "OK",
      ...(queryError?{reason:queryError}:{}),missing_tickers:missing,
      invalid_integer_ids:invalidIds,duplicate_tickers:duplicateTickers,duplicate_ids:duplicateIds,
      visible_rows_checked:fetched,expected_visible_rows:companyCount.count,
      note:"Exact count and paginated RLS-visible rows only; underlying hidden rows not asserted"});
  }
  const prices = await client.from("market_price_observations")
    .select("id,company_id,trading_date,close_price,currency,price_basis").limit(1);
  if (prices.error) {
    checks.push({table:"market_price_observations",status:"BLOCKED",
      reason:prices.error.message || "select failed"});
  } else {
    const visible = (prices.data || []).length;
    checks.push({table:"market_price_observations",status:visible ? "OK" : "BLOCKED",
      ...(visible?{}:{reason:"No RLS-visible price sample; cannot verify usable price data"}),
      sample_rows_visible:visible,
      note:"Read-only column probe; empty RLS-visible result does not prove no underlying rows"});
  }
  return {mode:"TEST_YAHOO_SCHEMA_DIAGNOSTIC_ONLY",database_writes:0,
    compatible:checks.every(item=>item.status==="OK"),checks};
}
