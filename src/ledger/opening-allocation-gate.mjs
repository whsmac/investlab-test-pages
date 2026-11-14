import {summarizeAllocationQuantities} from './opening-allocation-quantities.mjs';
// Offline-only gate: prevent incomplete allocation from reaching reconciliation.
export function checkOpeningAllocationGate({holdings,allocations}={}){
 const summary=summarizeAllocationQuantities({holdings,positionRows:allocations});
 const blocked=summary.rows.filter(row=>row.status!=='수량 일치');
 return {allowed:blocked.length===0&&summary.rows.length>0,blocked,summary,canPost:false,canMigrate:false,serverVerified:false};
}
