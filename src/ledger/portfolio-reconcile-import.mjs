// Read-only bridge from existing portfolio export into reconciliation input.
import {buildLegacyHoldingsExport} from './legacy-holdings-export.mjs';
import {buildOpeningSnapshot} from './opening-snapshot-preview.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function importPortfolioExportForReconciliation(text,accountId){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>1048576)throw Error('invalid or oversized export');
 if(typeof accountId!=='string'||!UUID.test(accountId))throw Error('explicit account UUID required');
 let obj;try{obj=JSON.parse(text)}catch{throw Error('invalid export JSON')}
 if(!obj||obj.format!=='INVESTLAB_LEGACY_HOLDINGS_JSON'||obj.version!==1||!Array.isArray(obj.holdings))throw Error('unsupported export format');
 if(obj.holdings.length>10000)throw Error('too many holdings');
 const verified=buildLegacyHoldingsExport(obj.holdings);
 const positions=verified.holdings.map(h=>({accountId:accountId.toLowerCase(),ticker:h.symbol,quantity:h.shares,averageCostUsd:h.avg_cost}));
 buildOpeningSnapshot({positions,cash:[]});
 return {positions,cash:[],events:[],source:'INVESTLAB_LEGACY_HOLDINGS_JSON',status:'PORTFOLIO_LOADED_LEDGER_AND_CASH_REQUIRED',serverVerified:false,canUpload:false};
}
