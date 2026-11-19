// Offline end-to-end review of portfolio export -> form -> opening ledger.
import {buildLegacyHoldingsExport} from './legacy-holdings-export.mjs';
import {buildAllocationFormInputs} from './opening-allocation-form.mjs';
import {prepareOpeningLedgerHandoff} from './opening-ledger-handoff.mjs';
export function reviewOpeningFormFlow({holdings,accounts,positionRows,cashRows}={}){
 const exportData=buildLegacyHoldingsExport(holdings);
 const mapped=buildAllocationFormInputs({accounts,holdings:exportData.holdings,positionRows,cashRows});
 const review=prepareOpeningLedgerHandoff({exportData,...mapped});
 return {status:review.status,issues:review.issues,openingEvents:review.events,comparison:review.comparison??null,canPost:false,canMigrate:false,serverVerified:false,review};
}
