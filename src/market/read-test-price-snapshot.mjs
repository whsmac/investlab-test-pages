// INVESTLAB TEST: authenticated, read-only price snapshot with exact count check.
// Complete means all rows visible to the current RLS user, not necessarily all DB rows.
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
  const countResult = await client.from("market_price_observations")
    .select("id", { count: "exact", head: true });
  if (countResult.error) throw countResult.error;
  if (!Number.isSafeInteger(countResult.count) || countResult.count < 0) {
    throw new Error("Exact visible-row count unavailable");
  }
  const expected = countResult.count;
  if (expected > maxRows) throw new Error("Visible price rows exceed maxRows; refuse partial snapshot");
  const observations = [];
  const seenIds = new Set();
  let offset = 0;
  while (offset < expected) {
    const limit = Math.min(pageSize, expected - offset);
    const result = await client.from("market_price_observations")
      .select("id,company_id,trading_date,close_price,currency,price_basis")
      .order("id", { ascending: true }).range(offset, offset + limit - 1);
    if (result.error) throw result.error;
    const rows = result.data || [];
    if (rows.length !== limit) throw new Error("Price snapshot changed during paging or was truncated");
    for (const row of rows) {
      if (row.id == null || seenIds.has(String(row.id))) throw new Error("Duplicate or missing observation id");
      seenIds.add(String(row.id));
      const ticker = symbols.get(String(row.company_id));
      if (!ticker) throw new Error("Unknown company_id in price observations");
      observations.push({ ticker, trading_date: row.trading_date,
        close_price: String(row.close_price), currency: row.currency, price_basis: row.price_basis });
    }
    offset += rows.length;
  }
  const verify = await client.from("market_price_observations")
    .select("id", { count: "exact", head: true });
  if (verify.error || verify.count !== expected) throw new Error("Visible price row count changed during snapshot");
  return { mode: "READ_ONLY_SNAPSHOT", source: "INVESTLAB TEST Supabase",
    coverage: { complete: true, scope: "authenticated_RLS_visible_rows_only",
      rows: observations.length, expected, capped: false,
      note: "Count and pagination do not prove that RLS exposes every underlying database row." },
    observations };
}
