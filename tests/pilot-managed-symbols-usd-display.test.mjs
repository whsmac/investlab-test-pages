import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ledgerManagedSymbols,verifiedLedgerSymbols,compactQuoteTickers,formatCompactQuote} from '../src/ledger/pilot-managed-symbols.mjs';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const ledger={version:1,accounts:[{id:'one',name:'Synthetic A'},{id:'two',name:'Synthetic B'}],watchlist:['GOOGL','TSLA','googl'],entries:[
 {id:'1',accountId:'one',date:'2026-11-20',created:1,type:'OPEN',symbol:'TSLA',qty:2,price:100,currency:'USD'},
 {id:'2',accountId:'two',date:'2026-11-20',created:2,type:'OPEN',symbol:'TSLL',qty:1,price:10,currency:'USD'},
 {id:'3',accountId:'two',date:'2026-11-23',created:3,type:'SELL',symbol:'TSLL',qty:1,price:12,currency:'USD'}
]};
test('shared symbol projection merges categories, preserves closed trades and excludes nontrades',()=>{
 const original=JSON.stringify(ledger);
 assert.deepEqual(ledgerManagedSymbols(ledger),[{ticker:'GOOGL',categories:['관심']},{ticker:'TSLA',categories:['보유','관심','거래이력']},{ticker:'TSLL',categories:['거래이력']}]);
 assert.equal(JSON.stringify(ledger),original);
 assert.deepEqual(ledgerManagedSymbols({...ledger,watchlist:[]}).map(x=>x.ticker),['TSLA','TSLL']);
});
test('only verified active owner can supply shared symbols',()=>{
 const snapshot={userId:a,ledger};
 assert.equal(verifiedLedgerSymbols(snapshot,a,a).length,3);
 for(const [active,verified] of [[null,null],[a,b],[b,b]])assert.deepEqual(verifiedLedgerSymbols(snapshot,active,verified),[]);
 assert.deepEqual(verifiedLedgerSymbols(null,a,a),[]);
});
test('one decimal formatting is display only; quotes requested for interest and history',()=>{
 assert.equal(formatCompactQuote(7.749),'7.7');assert.equal(formatCompactQuote(49),'49.0');assert.equal(formatCompactQuote(1234.56),'1,234.6');
 for(const v of [null,undefined,NaN,0])assert.equal(formatCompactQuote(v),'—');
 assert.deepEqual(compactQuoteTickers([{ticker:'TSLA'},{ticker:'BITU'}],ledgerManagedSymbols(ledger)),['BITU','GOOGL','TSLA','TSLL']);
});
test('active modules consume one projection and legacy auto-import is disabled',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const sim=read('virtual-trade-simulator.html'),ledgerPage=read('pilot-ledger.html'),portfolio=read('my-portfolio.html'),ui=read('src/ui/pilot-ledger-ui.mjs');
 assert.match(sim,/refreshManagedSymbols\(verifiedLedgerSymbols\(onlineAccountLedger,activeSimulatorOwnerId,lastVerifiedOnlineUserId\)\)/);
 assert.match(sim,/tickers=compactQuoteTickers\(portfolioState.positions,managedSymbols\)/);
 assert.match(sim,/formatCompactQuote\(price\)/);
 assert.match(sim,/formatCompactQuote\(p\)/);
 assert.match(sim,/최근 종가 USD','평단 USD','평가금액 USD/);
 assert.match(sim,/Number\(p.quantity\)\*price/);
 assert.doesNotMatch(sim,/managedSymbols=readPortfolioSimulatorSnapshot/);
 assert.doesNotMatch(sim,/\nloadPortfolioPositions\(\);/);
 assert.match(ui,/ledgerManagedSymbols\(getDb\(\)\)/);
 assert.match(portfolio,/ledgerManagedSymbols\(data\)/);
 assert.match(ledgerPage,/id="pastSymbolList"/);
 assert.match(portfolio,/pilot-ledger\.html#watchManagement/);
});
