import {projectLedger} from './pilot-portfolio-projection.mjs';
import {validateLedger} from './pilot-ledger-validation.mjs';
const normalize=value=>typeof value==='string'?value.trim().toUpperCase():'';
const valid=value=>/^[A-Z][A-Z0-9.-]{0,15}$/.test(value);
// Only derive from a verified user's supplied ledger. No storage, no writes.
export function ledgerManagedSymbols(ledger){
 if(!ledger)return [];
 validateLedger(ledger);
 const result=new Map();
 function add(raw,category){
  const ticker=normalize(raw);if(!valid(ticker))return;
  if(!result.has(ticker))result.set(ticker,new Set());
  result.get(ticker).add(category);
 }
 for(const h of projectLedger(ledger,'ALL').holdings)add(h.symbol,'보유');
 for(const t of Array.isArray(ledger.watchlist)?ledger.watchlist:[])add(t,'관심');
 for(const e of ledger.entries)if(['OPEN','BUY','SELL'].includes(e.type))add(e.symbol,'거래이력');
 return [...result].sort(([a],[b])=>a.localeCompare(b)).map(([ticker,categories])=>({ticker,categories:[...categories]}));
}
export function verifiedLedgerSymbols(snapshot,activeOwner,verifiedOwner){
 if(!activeOwner||activeOwner!==verifiedOwner||snapshot?.userId!==activeOwner)return [];
 return ledgerManagedSymbols(snapshot.ledger);
}
export function compactQuoteTickers(positions,managed){
 return [...new Set([...positions.map(p=>p.ticker),...managed.map(m=>m.ticker)].map(normalize).filter(valid))].sort();
}
export function formatCompactQuote(value){
 return typeof value==='number'&&Number.isFinite(value)&&value>0?value.toLocaleString('ko-KR',{minimumFractionDigits:1,maximumFractionDigits:1}):'—';
}
