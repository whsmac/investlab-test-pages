// Browser-side, read-only TEST Yahoo review; no SQL, mutations, or service-role keys.
const ALLOWED = ["MSFT", "GOOGL", "AMZN", "META", "TSLA", "SPCX"];
export function reviewYahooCandidate(candidate, snapshot, companyMap) {
  if (candidate?.mode !== "REVIEW_ONLY" || candidate.database_insert_authorized !== false ||
      candidate.writes_performed !== 0 || candidate.source !== "Yahoo Finance") throw Error("Yahoo 검증 파일이 아닙니다.");
  if (snapshot?.mode !== "READ_ONLY_SNAPSHOT" || snapshot.coverage?.complete !== true ||
      snapshot.coverage?.scope !== "authenticated_RLS_visible_rows_only") throw Error("TEST DB 조회 범위가 불완전합니다.");
  if (!Array.isArray(candidate.observations) || !Array.isArray(snapshot.observations)) throw Error("주가 목록이 없습니다.");
  if (candidate.observations.length > 10000) throw Error("허용된 관측값 개수를 초과했습니다.");
  const map = new Map();
  for (const row of snapshot.observations) {
    const k = row.ticker + "|" + row.trading_date;
    if (map.has(k)) throw Error("DB 관측값 중복: " + k);
    map.set(k, row);
  }
  const seen = new Set(), missing = [], conflicts = [];
  let same = 0;
  for (const row of candidate.observations) {
    if (!ALLOWED.includes(row.ticker) || !Number.isSafeInteger(companyMap[row.ticker]) ||
        companyMap[row.ticker] <= 0) throw Error("등록되지 않은 TEST 기업 ID");
    const day = String(row.trading_date);
    if(row.ticker==="SPCX" && day<"2026-06-12")throw Error("SPCX 상장 전 데이터 차단");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || new Date(day).toISOString().slice(0,10) !== day) throw Error("잘못된 거래일");
    const price = Number(row.close_price);
    if (!Number.isFinite(price) || price <= 0 || row.currency !== "USD" ||
        row.price_basis !== "unadjusted_close") throw Error("가격·통화·종가 기준 오류");
    const k = row.ticker + "|" + day;
    if (seen.has(k)) throw Error("수집 관측값 중복: " + k);
    seen.add(k);
    const stored = map.get(k);
    if (!stored) missing.push({company_id:companyMap[row.ticker],trading_date:day,
      close_price:String(row.close_price),currency:"USD",price_basis:"unadjusted_close"});
    else if (stored.currency !== row.currency || stored.price_basis !== row.price_basis ||
             Number(stored.close_price) !== price) conflicts.push({ticker:row.ticker,day,source:row,stored});
    else same++;
  }
  return {mode:"TEST_YAHOO_BROWSER_REVIEW_ONLY",database_insert_authorized:false,
    writes_performed:0,snapshot_scope:snapshot.coverage.scope,
    counts:{missing:missing.length,same,conflicts:conflicts.length},
    candidates:missing,conflicts:conflicts.slice(0,100),
    blocking_reasons:["TEST DB 쓰기 승인 없음","RLS 조회 범위는 DB 전체 범위와 다를 수 있음",
      "Yahoo 비공식 API 이용조건 검토 필요",...(conflicts.length?["기존 주가와 충돌 발생"]:[])]};
}
