// Offline comparison of a saved review report against a freshly recomputed report.
// Imported reports are untrusted and never authorize opening, posting or persistence.
import {buildLegacyLedgerReviewReport} from './legacy-ledger-review-report.mjs';
const DEC=/^-?(?:0|[1-9]\d*)\.\d{8}$/;
const VALID=new Set(['ALREADY_PRESENT','QUANTITY_MISMATCH','MISSING_IN_LEDGER','ONLY_IN_LEDGER']);
function validate(report){
 if(!report||typeof report!=='object'||Array.isArray(report)||report.format!=='INVESTLAB_LEDGER_REVIEW_REPORT'||report.version!==1)throw Error('unsupported review report');
 if(report.approvalStatus!=='NOT_APPROVED'||report.canImport!==false||report.canPersist!==false||report.canConfirmOpening!==false||report.serverVerified!==false)throw Error('unsafe report flags');
 if(!Array.isArray(report.rows)||report.rows.length>10000)throw Error('invalid report rows');
 const rows=new Map();
 for(const r of report.rows){
  if(!r||typeof r.ticker!=='string'||!/^[A-Z0-9][A-Z0-9.^_-]{0,19}$/.test(r.ticker)||rows.has(r.ticker)||!VALID.has(r.status)||![r.legacyQuantity,r.ledgerQuantity,r.difference].every(v=>typeof v==='string'&&DEC.test(v)))throw Error('invalid or duplicate report row');
  rows.set(r.ticker,r);
 }
 return rows;
}
export function compareSavedLegacyReviewReport({savedReport,...currentInput}={}){
 const old=validate(savedReport);
 const fresh=buildLegacyLedgerReviewReport(currentInput);
 if(savedReport.accountId!==fresh.accountId)throw Error('report account mismatch');
 const now=new Map(fresh.rows.map(r=>[r.ticker,r]));
 const changes=[...new Set([...old.keys(),...now.keys()])].sort().flatMap(ticker=>{
  const before=old.get(ticker),after=now.get(ticker);
  if(before&&after&&['legacyQuantity','ledgerQuantity','difference','status'].every(k=>before[k]===after[k]))return [];
  return [{ticker,kind:!before?'NEW_SYMBOL':!after?'REMOVED_SYMBOL':'QUANTITY_OR_STATUS_CHANGED',previous:before?{legacyQuantity:before.legacyQuantity,ledgerQuantity:before.ledgerQuantity,status:before.status}:null,current:after?{legacyQuantity:after.legacyQuantity,ledgerQuantity:after.ledgerQuantity,status:after.status}:null}];
 });
 const oldNotes=[...old.values()].filter(r=>r.review!==null).length;
 return {status:changes.length?'CHANGES_REQUIRE_REVIEW':'NO_QUANTITY_CHANGES_NOT_VERIFIED',accountId:fresh.accountId,changes,changedCount:changes.length,previousNoteCount:oldNotes,currentPendingCount:fresh.summary.pendingCount,canConfirmOpening:false,canImport:false,canPersist:false,serverVerified:false};
}
