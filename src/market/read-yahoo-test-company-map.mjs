// Read TEST-only company identifiers for Yahoo manifest generation.
// Requires authenticated user; never mutates the database.
const TEST_URL = "https://gopofxyezhwpfxbecrxd.supabase.co";
const REQUIRED = ["MSFT", "GOOGL", "AMZN", "META", "TSLA"];

export async function readYahooTestCompanyMap(client) {
  if (!client || client.supabaseUrl !== TEST_URL) throw new Error("TEST Supabase URL mismatch");
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data?.user?.id) throw new Error("Verified TEST login required");
  const result = await client.from("companies").select("id,ticker").order("id");
  if (result.error) throw result.error;
  if (!Array.isArray(result.data)) throw new Error("Missing company rows");
  const mapping = {};
  const ids = new Set();
  for (const row of result.data) {
    const ticker = String(row.ticker || "").trim().toUpperCase();
    if (!REQUIRED.includes(ticker)) continue;
    const id = Number(row.id);
    if (!Number.isSafeInteger(id) || id <= 0 || ids.has(id) || Object.hasOwn(mapping, ticker)) {
      throw new Error("Invalid or duplicate TEST company mapping");
    }
    mapping[ticker] = id;
    ids.add(id);
  }
  for (const ticker of REQUIRED) {
    if (!Object.hasOwn(mapping, ticker)) throw new Error("Missing TEST company: " + ticker);
  }
  return Object.fromEntries(REQUIRED.map(ticker => [ticker, mapping[ticker]]));
}
