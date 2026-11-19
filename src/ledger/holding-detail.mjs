// Offline-only account breakdown of a holding from unified ledger read model.
import {buildPortfolioLedgerView} from './portfolio-ledger-view-model.mjs';
export function buildHoldingDetail(input={},ticker){
 if(typeof ticker!=='string'||!/^[A-Z0-9][A-Z0-9.^_-]{0,19}$/.test(ticker.trim().toUpperCase()))throw Error('invalid ticker');
 const symbol=ticker.trim().toUpperCase();
 const view=buildPortfolioLedgerView(input);
 const position=view.holdings.find(h=>h.ticker===symbol);
 if(!position)throw Error('ticker is not held in selected account scope');
 const accounts=view.accounts.filter(a=>!view.selectedAccountId||a.accountId===view.selectedAccountId).flatMap(a=>a.holdings.filter(h=>h.ticker===symbol).map(h=>({accountId:a.accountId,accountName:a.name,quantityDisplay:h.quantityDisplay})));
 return Object.freeze({ticker:symbol,scope:view.selectedAccountId?'SELECTED_ACCOUNT':'ALL_ACCOUNTS',totalQuantityDisplay:position.quantityDisplay,accountCount:accounts.length,accounts,valuationAvailable:false,costBasisAvailable:false,profitLossAvailable:false,canPersist:false,serverVerified:false});
}
