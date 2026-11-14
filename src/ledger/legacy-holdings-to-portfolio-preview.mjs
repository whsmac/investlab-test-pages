// Read-only bridge: legacy holdings export -> opening REVIEW, never committed ledger.
import {mapLegacyHoldingsToOpening} from './legacy-holdings-map.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
export function previewLegacyHoldingsForAccount({exportData,accountId}={}){
 if(!exportData||typeof exportData!=='object'||Array.isArray(exportData))throw Error('invalid export');
 if(exportData.format!=='INVESTLAB_LEGACY_HOLDINGS_JSON'||exportData.version!==1)throw Error('unsupported legacy export');
 if(typeof accountId!=='string'||!UUID.test(accountId))throw Error('invalid selected account');
 if(!Array.isArray(exportData.holdings)||exportData.holdings.length>10000)throw Error('invalid holdings');
 const mapped=mapLegacyHoldingsToOpening({holdings:exportData.holdings,accountId:accountId.toLowerCase()});
 return Object.freeze({status:mapped.status,positions:mapped.positions,warnings:mapped.warnings,recognizedCount:mapped.recognizedCount,canCommit:false,canPersist:false,serverVerified:false,requiresAccountOwnershipConfirmation:true,requiresOpeningReview:true});
}
