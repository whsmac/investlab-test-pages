// Read-only legacy cost basis suggestion. Match ticker AND quantity; never infer account provenance.
export function matchLegacyCosts(rows,exportData){
 if(!Array.isArray(rows)||!exportData||exportData.format!=='INVESTLAB_LEGACY_HOLDINGS_JSON'||exportData.version!==1||!Array.isArray(exportData.holdings))throw Error('지원하지 않는 기존 보유종목 파일');
 const seen=new Set(),lookup=new Map();
 for(const h of exportData.holdings){
  if(!h||typeof h.symbol!=='string'||!/^[A-Z0-9][A-Z0-9.^_-]{0,19}$/.test(h.symbol)||seen.has(h.symbol)||!/^\d+(?:\.\d{1,8})?$/.test(String(h.shares))||!Number.isFinite(Number(h.avg_cost))||Number(h.avg_cost)<0)throw Error('기존 보유종목 파일의 종목·수량·단가 오류');
  seen.add(h.symbol);lookup.set(h.symbol,h);
 }
 return rows.map(row=>{
  const match=lookup.get(row.ticker);
  const exact=match&&Number(match.shares)===Number(row.quantity);
  return {ticker:row.ticker,quantity:row.quantity,suggestedCost:exact?Number(match.avg_cost):null,status:exact?'QUANTITY_MATCH_REVIEW_REQUIRED':match?'QUANTITY_MISMATCH':'NOT_FOUND'};
 });
}
