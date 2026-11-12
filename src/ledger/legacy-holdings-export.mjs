// Offline-only legacy holdings export. Does not mutate source or contact a server.
import {assessPortfolioMigration} from './portfolio-migration-assessment.mjs';
export function buildLegacyHoldingsExport(holdings){
 const a=assessPortfolioMigration({holdings});
 if(a.warnings.length||a.rows.length!==holdings.length)throw Error('Export blocked: ambiguous or incomplete holdings; review source data');
 if(!a.rows.length)throw Error('Export blocked: no holdings');
 return {format:'INVESTLAB_LEGACY_HOLDINGS_JSON',version:1,holdings:a.rows.map(r=>({
  symbol:r.ticker,shares:r.quantity,avg_cost:r.averageCostUsd
 }))};
}
export function serializeLegacyHoldingsExport(holdings){
 return JSON.stringify(buildLegacyHoldingsExport(holdings),null,2);
}
