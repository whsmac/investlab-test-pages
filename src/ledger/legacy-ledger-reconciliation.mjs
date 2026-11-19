// Offline legacy-export vs current ledger reconciliation for ONE explicitly selected account.
// A matching row means already present; it never authorizes duplicate opening or upload.
import {previewLegacyHoldingsForAccount} from './legacy-holdings-to-portfolio-preview.mjs';
import {buildPortfolioLedgerView} from './portfolio-ledger-view-model.mjs';
const DEC=/^(0|[1-9][0-9]*)(?:\.([0-9]{1,8}))?$/;
const SCALE=100000000n;
function num(value){if(typeof value!=='string'||!DEC.test(value))throw Error('invalid quantity');const [a,b='']=value.split('.');return BigInt(a)*SCALE+BigInt(b.padEnd(8,'0'));}
function fmt(n){const neg=n<0n,m=neg?-n:n;return (neg?'-':'')+(m/SCALE).toString()+'.'+(m%SCALE).toString().padStart(8,'0');}
export function reconcileLegacyExportWithLedger({exportData,accountId,sessionUserId,accounts,committedEvents=[]}={}){
 const portfolio=buildPortfolioLedgerView({sessionUserId,accounts,committedEvents,selectedAccountId:accountId});
 // Reject duplicate source symbols before assessment can downgrade them to warnings.
 if(Array.isArray(exportData?.holdings)){
  const seen=new Set();
  for(const item of exportData.holdings){
   if(!item||typeof item!=='object'||Array.isArray(item))continue;
   const ticker=String(item.symbol??item.ticker??'').trim().toUpperCase();
   if(!ticker)continue;
   if(seen.has(ticker))throw Error('duplicate ticker in legacy export: '+ticker);
   seen.add(ticker);
  }
 }
 const legacy=previewLegacyHoldingsForAccount({exportData,accountId});
 if(legacy.status!=='PREVIEW_ONLY_NOT_UPLOADED')return Object.freeze({status:'SOURCE_REVIEW_REQUIRED',rows:[],warnings:legacy.warnings,canImport:false,canPersist:false,serverVerified:false});
 const source=new Map();
 for(const position of legacy.positions){
  if(source.has(position.ticker))throw Error('duplicate ticker in legacy export: '+position.ticker);
  source.set(position.ticker,num(position.quantity));
 }
 const ledger=new Map(portfolio.holdings.map(h=>[h.ticker,num(h.quantity)]));
 const rows=[...new Set([...source.keys(),...ledger.keys()])].sort().map(ticker=>{
  const expected=source.get(ticker)??0n,actual=ledger.get(ticker)??0n,diff=expected-actual;
  const status=source.has(ticker)&&ledger.has(ticker)?(diff===0n?'ALREADY_PRESENT':'QUANTITY_MISMATCH'):source.has(ticker)?'MISSING_IN_LEDGER':'ONLY_IN_LEDGER';
  return Object.freeze({ticker,legacyQuantity:fmt(expected),ledgerQuantity:fmt(actual),difference:fmt(diff),status});
 });
 const mismatch=rows.filter(r=>r.status!=='ALREADY_PRESENT');
 return Object.freeze({status:mismatch.length?'REVIEW_REQUIRED':'ALREADY_RECONCILED',accountId:portfolio.selectedAccountId,rows,matchedCount:rows.length-mismatch.length,mismatchCount:mismatch.length,warnings:legacy.warnings,canImport:false,canPersist:false,serverVerified:false,requiresManualAccountVerification:true});
}
