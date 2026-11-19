// INVESTLAB TEST: authenticated, read-only historical prices for shared charts.
// No writes, external API keys, or production project access.
const TEST_URL = "https://gopofxyezhwpfxbecrxd.supabase.co";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export async function readSharedPriceSeries(client, { ticker, from, to, pageSize = 1000, maxRows = 20000 } = {}) {
  if (!client || typeof client.from !== "function") throw new Error("Supabase client required");
  if (client.supabaseUrl !== TEST_URL) throw new Error("TEST Supabase URL mismatch");
  const symbol = String(ticker || "").trim().toUpperCase();
  if (!/^[A-Z0-9.^-]{1,16}$/.test(symbol)) throw new Error("Invalid ticker");
  if ((from && !ISO_DATE.test(from)) || (to && !ISO_DATE.test(to)) || (from && to && from > to)) throw new Error("Invalid date range");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000 || !Number.isInteger(maxRows) || maxRows < 1 || maxRows > 20000) throw new Error("Invalid paging limits");
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data?.user?.id) throw new Error("Verified TEST login required");
  const companyResult = await client.from("companies").select("id,ticker").eq("ticker", symbol).limit(1);
  if (companyResult.error) throw companyResult.error;
  const company = companyResult.data?.[0];
  if (!company) return { ticker: symbol, points: [], truncated: false };
  const points = [];
  let offset = 0;
  while (offset < maxRows) {
    const count = Math.min(pageSize, maxRows - offset);
    let query = client.from("market_price_observations")
      .select("trading_date,close_price,currency,price_basis")
      .eq("company_id", company.id)
      .eq("price_basis", "raw")
      .eq("currency", "USD")
      .order("trading_date", { ascending: true })
      .range(offset, offset + count - 1);
    if (from) query = query.gte("trading_date", from);
    if (to) query = query.lte("trading_date", to);
    const result = await query;
    if (result.error) throw result.error;
    const rows = result.data || [];
    for (const row of rows) {
      const close = Number(row.close_price);
      if (ISO_DATE.test(row.trading_date) && Number.isFinite(close) && close > 0) {
        points.push({ date: row.trading_date, close, currency: row.currency, basis: row.price_basis });
      }
    }
    offset += rows.length;
    if (rows.length < count) return { ticker: symbol, points, truncated: false };
  }
  return { ticker: symbol, points, truncated: true };
}
