// Read TEST-only company identifiers for Yahoo manifest generation.
// Requires authenticated user; never mutates the database.
const TEST_URL = "https://gopofxyezhwpfxbecrxd.supabase.co";
const REQUIRED = ["MSFT", "GOOGL", "AMZN", "META", "TSLA"];
const OPTIONAL = "SPCX";

export async function readYahooTestCompanyMap(client) {
  if (!client || client.supabaseUrl !== TEST_URL) throw new Error("TEST Supabase URL mismatch");
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data?.user?.id) throw new Error("Verified TEST login required");
  const count = await client.from("companies").select("id", {count:"exact",head:true});
  if (count.error) throw count.error;
  if (!Number.isSafeInteger(count.count) || count.count < 0 || count.count > 10000)
    throw new Error("Invalid or excessive TEST company count");
  const rows = [];
  for (let offset=0;offset<count.count;offset+=1000) {
    const end=Math.min(offset+999,count.count-1);
    const page=await client.from("companies").select("id,ticker")
      .order("id",{ascending:true}).range(offset,end);
    if (page.error) throw page.error;
    if (!Array.isArray(page.data) || page.data.length !== end-offset+1)
      throw new Error("Incomplete TEST company mapping page");
    rows.push(...page.data);
  }
  const verified=await client.from("companies").select("id",{count:"exact",head:true});
  if (verified.error || verified.count!==count.count)
    throw new Error("TEST company count changed during mapping");
  const mapping = {};
  const ids = new Set();
  for (const row of rows) {
    const ticker = String(row.ticker || "").trim().toUpperCase();
    if (!REQUIRED.includes(ticker) && ticker !== OPTIONAL) continue;
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
  const tickers = Object.hasOwn(mapping, OPTIONAL) ? [...REQUIRED, OPTIONAL] : REQUIRED;
  return Object.fromEntries(tickers.map(ticker => [ticker, mapping[ticker]]));
}
