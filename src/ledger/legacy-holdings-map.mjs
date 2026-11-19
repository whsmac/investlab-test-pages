// Read-only, explicit account mapping of legacy holdings into opening snapshot inputs.
import {assessPortfolioMigration} from './portfolio-migration-assessment.mjs';
import {buildOpeningSnapshot} from './opening-snapshot-preview.mjs';
export function mapLegacyHoldingsToOpening({holdings,accountId}){
 const assessment=assessPortfolioMigration({holdings});
 if(assessment.warnings.length) return {status:'REVIEW_REQUIRED',positions:[],warnings:assessment.warnings,recognizedCount:assessment.recognizedCount};
 if(!assessment.rows.length)return {status:'NO_ROWS',positions:[],warnings:['No recognizable holdings'],recognizedCount:0};
 const positions=assessment.rows.map(r=>({accountId,ticker:r.ticker,quantity:r.quantity,averageCostUsd:r.averageCostUsd}));
 // Validate all rows together. Never partially import a legacy holding set.
 buildOpeningSnapshot({positions});
 return {status:'PREVIEW_ONLY_NOT_UPLOADED',positions,warnings:['All legacy rows mapped to ONE explicitly selected account; confirm ownership and cost basis before any import.'],recognizedCount:positions.length};
}
