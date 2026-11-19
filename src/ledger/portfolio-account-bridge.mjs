// Explicit, offline-only bridge: portfolio snapshot -> account opening review.
// Never assigns an account, cost basis, or cash amount automatically.
import {readPortfolioSimulatorSnapshot} from '../simulator/portfolio-snapshot.mjs';
import {buildLegacyHoldingsExport} from './legacy-holdings-export.mjs';
import {prepareOpeningLedgerHandoff} from './opening-ledger-handoff.mjs';
const CASH='USD-CASH';
const SYMBOL=/^[A-Z0-9][A-Z0-9.-]{0,14}$/;
const DEC=/^(0|[1-9]\d*)(?:\.\d{1,8})?$/;
function decimal(value){
 const str=String(value);
 if(!DEC.test(str))throw Error('invalid precision or amount in portfolio');
 return str;
}
export function preparePortfolioAccountBridge({storage,accounts=[],allocations=[],cash=[],costConfirmations=[]}={}){
 if(!storage||typeof storage.getItem!=='function')throw Error('portfolio storage required');
 let holdings;
 try{holdings=JSON.parse(storage.getItem('investlab_holdings')||'[]')}catch{throw Error('invalid portfolio JSON')}
 if(!Array.isArray(holdings)||!holdings.length)throw Error('no portfolio holdings');
 const securities=holdings.filter(row=>String(row?.symbol??'').trim().toUpperCase()!==CASH);
 if(!securities.length)throw Error('no security positions');
 for(const row of securities){
  const ticker=String(row?.symbol??'').trim().toUpperCase();
  if(!SYMBOL.test(ticker)||!DEC.test(String(row.shares))||!DEC.test(String(row.avg_cost))||Number(row.shares)<=0)throw Error('invalid source holding; manual review required');
 }
 const snapshot=readPortfolioSimulatorSnapshot(storage);
 const exportData=buildLegacyHoldingsExport(snapshot.positions.map(p=>({symbol:p.ticker,shares:decimal(p.quantity),avg_cost:decimal(p.averageCost)})));
 const handoff=prepareOpeningLedgerHandoff({exportData,accounts,allocations,cash,costConfirmations});
 return {source:'SAME_ORIGIN_PORTFOLIO_READ_ONLY',symbolCount:snapshot.symbols.length,securityCount:snapshot.positions.length,sourceUsdCash:snapshot.usdCash,sourceCashNote:'USD-CASH is informational only; per-account cash must be explicitly confirmed',exportData,handoff,serverVerified:false,canMigrate:false,canPost:false,canUpload:false};
}
