// INVESTLAB TEST: read-only, complete Supabase price snapshot for offline reconciliation.
// Caller must explicitly download the result; no writes or service-role keys.
const TEST_URL = "https://gopofxyezhwpfxbecrxd.supabase.co";
export async function readTestPriceSnapshot(client, { pageSize = 1000, maxRows = 100000 } = {}) {
  if (!client || client.supabaseUrl !== TEST_URL) throw new Error("TEST Supabase URL mismatch");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error("Invalid pageSize");
  if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > 100000) throw new Error("Invalid maxRows");
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data?.user?.id) throw new Error("Verified TEST login required");
  const companies = await client.from("companies").select("id,ticker").order("id");
  if (companies.error) throw companies.error;
  const symbols = new Map((companies.data || []).map(row => [String(row.id), row.ticker]));
  const observations = [];
  let offset = 0;
  let exhausted = false;
  while (offset < maxRows) {
    const limit = Math.min(pageSize, maxRows - offset);
    const result = await client.from("market_price_observations")
      .select("id,company_id,trading_date,close_price,currency,price_basis")
      .order("id", { ascending: true }).range(offset, offset + limit - 1);
    if (result.error) throw result.error;
    const rows = result.data || [];
    for (const row of rows) {
      const ticker = symbols.get(String(row.company_id));
      if (!ticker) throw new Error("Unknown company_id in price observations");
      observations.push({ ticker, trading_date: row.trading_date,
        close_price: String(row.close_price), currency: row.currency, price_basis: row.price_basis });
    }
    offset += rows.length;
    if (rows.length < limit) { exhausted = true; break; }
  }
  // Reaching maxRows is ambiguous: a further row may exist. Do not claim completeness.
  return { mode: "READ_ONLY_SNAPSHOT", source: "INVESTLAB TEST Supabase",
    coverage: { complete: exhausted, rows: observations.length, capped: !exhausted },
    observations };
}
