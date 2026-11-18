// TEST-only personal storage deduplication policy.
// Actual executions, holdings, cash and cost basis belong to the ledger and its
// derived views, never to an independently writable personal portfolio snapshot.
const DERIVED=new Set(['holdings','positions','balances','cash','cashBalance','cashBalances','totalAssets','totalValue','portfolioValue','marketValue','valuation','averageCost','averageCosts','avgCost','costBasis','realizedPnl','unrealizedPnl','profitLoss','pnl','quantity','quantities','shares','tradeHistory','transactions','ledgerTransactions']);
const ALLOWED={
 portfolio:new Set(['watchlist','favoriteSymbols','trackedSymbols','displayPreferences','accountDisplay','notes']),
 scenario:new Set(['name','description','steps','assumptions','targetPrices','createdAt','updatedAt','sourceLedgerRevision','sourceSnapshotId']),
 settings:new Set(['displayPreferences','defaultCurrency','selectedAccountId','chartPreferences','theme'])
};
function plain(x){return x!==null&&typeof x==='object'&&!Array.isArray(x);}
export function reviewPersonalStorageDuplicates(kind,payload){
 if(!plain(payload)||!ALLOWED[kind])throw Error('개인 설정 유형 또는 본문 오류');
 const kept={},rejected=[];
 for(const [key,value] of Object.entries(payload)){
  if(DERIVED.has(key)){rejected.push({field:key,reason:'원장 기반 파생값 또는 거래 중복'});continue;}
  if(!ALLOWED[kind].has(key)){rejected.push({field:key,reason:'저장 목적 미확정: 중복·개인정보 검토 필요'});continue;}
  // No nested transaction or balance snapshots are silently copied into personal docs.
  if((key==='accountDisplay'||key==='displayPreferences')&&plain(value)){
   const nested=Object.keys(value).filter(k=>DERIVED.has(k));
   if(nested.length){rejected.push({field:key,reason:'설정 객체에 원장 파생값 포함: '+nested.join(', ')});continue;}
  }
  kept[key]=structuredClone(value);
 }
 return {kind,kept,rejected,needsReview:rejected.length>0,canSave:false,canDelete:false,canMigrate:false,
  note:'제거 후보를 보고할 뿐 원본 데이터는 변경하지 않습니다. 기존 로컬 데이터나 서버 원장도 삭제하지 않습니다.'};
}
