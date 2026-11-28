import {tradeSettlement,tradeExecutionPrice} from '../ledger/pilot-brokerage-settlement.mjs';
import {verifyActualOpening} from './strategy-tracker-actual-start.mjs';
const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
export function strategyExecutionRows(s,ledger){
 if(!s.actualOrigin)return [];
 if(s.status!=='closed')verifyActualOpening(s,ledger);
 const entries=new Map(ledger.entries.map(e=>[e.id,e]));
 return s.actualOrigin.entryIds.map(id=>{
  const e=entries.get(id);
  if(!e||e.accountId!==s.accountId||!['BUY','SELL'].includes(e.type))throw Error('최초 거래 기록 미확인');
  // Only explicit execution-time fields may be used; created is a record timestamp.
  const at=typeof e.executedAt==='string'&&Number.isFinite(Date.parse(e.executedAt))&&/T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/.test(e.executedAt)?e.executedAt:null;
  return {id,date:e.date,executedAt:at,type:e.type,symbol:e.symbol,quantity:Number(e.qty),price:tradeExecutionPrice(e),settlement:tradeSettlement(e)};
 }).sort((a,b)=>a.date.localeCompare(b.date)||(a.executedAt&&b.executedAt?a.executedAt.localeCompare(b.executedAt):0)||(a.type===b.type?0:a.type==='SELL'?-1:1));
}
export function executionBases(rows){
 const m=new Map();for(const r of rows){const old=m.get(r.symbol)||{symbol:r.symbol,type:r.type,quantity:0,gross:0,settlement:0};old.quantity+=r.quantity;old.gross+=r.quantity*r.price;old.settlement+=r.settlement;m.set(r.symbol,old)}
 return [...m.values()].map(a=>({...a,price:a.gross/a.quantity}));
}
export function comparisonSymbolRows(s,bases,quotes){
 const current=new Map(s.assets.filter(a=>a.kind==='stock').map(a=>[a.symbol,a.quantity]));
 const symbols=[...new Set([...bases.map(b=>b.symbol),...current.keys()])];
 return symbols.map(symbol=>{const b=bases.find(x=>x.symbol===symbol),q=quotes.get(symbol),price=q?.date>=s.actualOrigin.date&&valid(q.price)?q.price:null,held=current.get(symbol)||0;
 return {symbol,reference: b?.type==='SELL',initialQuantity:b?.quantity??null,initialPrice:b?.price??null,initialSettlement:b?.settlement??null,quantity:held,price,changePct:price!==null&&valid(b?.price)?(price/b.price-1)*100:null,holdValue:b?.type==='SELL'&&price!==null?b.quantity*price:null,value:price!==null?held*price:held===0?0:null,quote:q};});
}
export function comparisonChartRows(history,current,comparison,origin,{currentLabel='현재',bases=[]}={}){
 const points=history.map(r=>({...r,rawDifferenceUsd:Number.isFinite(r.holdUsd)&&Number.isFinite(r.valueUsd)?r.valueUsd-r.holdUsd:null}));
 if(current&&comparison)points.push({date:currentLabel,valueUsd:comparison.convertedUsd,holdUsd:comparison.holdUsd,benchmarkUsd:comparison.benchmarkUsd,relativeUsd:comparison.relativeUsd,rawDifferenceUsd:comparison.rawDifferenceUsd,quantity:current.quantity});
 // At execution, actual acquired gross market value excludes purchase fees.
 // Do not make the strategy and HOLD artificially start at the same value.
 if(origin&&bases.some(b=>b.type==='BUY')){const valueUsd=bases.filter(b=>b.type==='BUY').reduce((n,b)=>n+b.gross,0)+origin.remainingCash;points.unshift({date:'실제 체결',valueUsd,holdUsd:origin.saleGross,benchmarkUsd:origin.saleGross+origin.extraCash,relativeUsd:valueUsd-origin.saleGross-origin.extraCash,rawDifferenceUsd:valueUsd-origin.saleGross})}
 return points;
}
export function originalPricePoint(bases,prices,date){const row={date};for(const b of bases){const p=prices.get(b.symbol);row[b.symbol]=valid(p)&&valid(b.price)?(p/b.price-1)*100:null}return row;}
