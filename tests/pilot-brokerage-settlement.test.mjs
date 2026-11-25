import test from 'node:test';
import assert from 'node:assert/strict';
import {projectLedger} from '../src/ledger/pilot-portfolio-projection.mjs';
import {validateLedger} from '../src/ledger/pilot-ledger-validation.mjs';
import {portfolioHistory,indexRows} from '../src/ledger/pilot-portfolio-history.mjs';
const mk=(id,date,type,fields,postCash,postQty)=>({id,accountId:'a',date,type,currency:'USD',created:Number(id),...fields,brokerage:{format:'STATEMENT_V1',page:1,seq:Number(id),postCash,...(postQty===undefined?{}:{postQty})}});
const entries=[
 mk('1','2025-01-02','LINK_IN',{amount:105},{USD:105}),
 mk('2','2025-01-02','BUY',{symbol:'AAA',qty:1,price:100,settlementAmount:105},{USD:0},1),
 mk('3','2025-01-03','DIVIDEND',{amount:2},{USD:2}),
 mk('4','2025-01-03','LINK_OUT',{amount:2},{USD:0}),
 mk('5','2025-01-03','TAX',{amount:1},{USD:-1}),
 mk('6','2025-01-03','LINK_IN',{amount:1},{USD:0}),
 mk('7','2025-01-04','SELL',{symbol:'AAA',qty:1,price:120,settlementAmount:119},{USD:119},0),
 mk('8','2025-01-04','TAX_REFUND',{amount:0.5},{USD:119.5}),
 mk('9','2025-01-04','FX',{amount:10,toCurrency:'KRW',toAmount:14000},{USD:109.5,KRW:14000})
];
const db={version:1,accounts:[{id:'a',name:'Synthetic'}],entries};
test('actual settlement, taxes, linked cash and temporary negative cash reconcile',()=>{
 assert.equal(validateLedger(db),true);
 const p=projectLedger(db);
 assert.deepEqual(p.cash,{USD:109.5,KRW:14000});assert.equal(p.realizedUsd,14);assert.equal(p.holdings.length,0);
 assert.equal(projectLedger({...db,entries:entries.slice(0,2)}).holdings[0].averageCost,105);
});
test('manual input remains strict; altered statement proof or final negative fails',()=>{
 assert.throws(()=>validateLedger({...db,entries:[{id:'x',accountId:'a',date:'2025-01-02',type:'BUY',currency:'USD',qty:1,price:100,symbol:'AAA'}]}));
 const copy=structuredClone(db);copy.entries[1].settlementAmount=104;assert.throws(()=>validateLedger(copy),/현금잔고 불일치/);
 assert.throws(()=>validateLedger({...db,entries:entries.slice(0,5)}),/최종 현금잔고/);
 const wrong=structuredClone(db);wrong.entries[1].brokerage.postQty=2;assert.throws(()=>validateLedger(wrong),/수량 불일치/);
});
test('linked flows count only at brokerage boundary; dividend and tax are not external capital',()=>{
 const market=indexRows([{ticker:'AAA',date:'2025-01-02',close:100,as_traded_close:100,split_factor:1},{ticker:'AAA',date:'2025-01-03',close:100,as_traded_close:100,split_factor:1},{ticker:'USDKRW',date:'2025-01-04',close:1400}]);
 const r=portfolioHistory(db,'2025-01-02','2025-01-04',market,'ALL','USD');
 assert.equal(r[1].flow,-1);assert.equal(r[1].total,100);assert.equal(r[1].index,101);
 assert.equal(r[2].flow,0);assert.equal(r[2].total,119.5);
});
