import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {validateLedger} from '../src/ledger/pilot-ledger-validation.mjs';
import {projectLedger} from '../src/ledger/pilot-portfolio-projection.mjs';
import {resolveVerifiedPilotLedger,stablePilotLedger} from '../src/ledger/pilot-ledger-readonly-consistency.mjs';
import {buildPortfolioAllocation} from '../src/ui/pilot-portfolio-allocation.mjs';
import {simulateTrades} from '../src/simulator/virtual-trade-engine.mjs';
import {projectServerAudit,cloudFingerprint} from '../src/sync/pilot-cross-device-audit.mjs';
import {mayAutoApplyTestLedger} from '../src/simulator/test-ledger-session-safety.mjs';
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222', revision='2026-11-24T05:00:00Z';
const entries=[
 {accountId:'a',type:'DEPOSIT',amount:1000,currency:'USD'},
 {accountId:'a',type:'OPEN',symbol:'TSLA',qty:10,price:100,currency:'USD'},
 {accountId:'a',type:'BUY',symbol:'TSLA',qty:5,price:160,currency:'USD'},
 {accountId:'a',type:'SELL',symbol:'TSLA',qty:3,price:200,currency:'USD'},
 {accountId:'a',type:'DIVIDEND',amount:20,currency:'USD'},
 {accountId:'b',type:'OPEN',symbol:'TSLA',qty:8,price:200,currency:'USD'},
 {accountId:'b',type:'DEPOSIT',amount:260000,currency:'KRW'},
 {accountId:'b',type:'FX',amount:130000,currency:'KRW',toAmount:100,toCurrency:'USD'},
 {accountId:'b',type:'BUY',symbol:'TQQQ',qty:2,price:40,currency:'USD'},
 {accountId:'b',type:'WITHDRAW',amount:10,currency:'USD'}
].map((e,i)=>({...e,id:'e'+i,date:'2026-11-23',created:i+1}));
const ledger={version:1,accounts:[{id:'a',name:'Synthetic A'},{id:'b',name:'Synthetic B'}],entries};
const remote={payload:ledger,updated_at:revision};
const prices=new Map([['TSLA',{close:250,currency:'USD'}],['TQQQ',{close:50,currency:'USD'}]]);
const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
const start=html.indexOf('function getOnlineAccountOpening(){'),end=html.indexOf('function updateOnlineLedgerApplyPrompt(',start);
assert.ok(start>=0&&end>start);
const factory=new Function('onlineAccountLedger','lastVerifiedOnlineUserId','byId','projectLedger',html.slice(start,end)+';return getOnlineAccountOpening();');
function opening(payload,selection,owner=A,verified=A){
 const nodes={pilotLedgerAccount:{value:selection},onlineLedgerPreviewStatus:{textContent:''}};
 return factory({ledger:payload,userId:owner,updatedAt:revision},verified,id=>nodes[id],projectLedger);
}
function choose(options={}){return resolveVerifiedPilotLedger({userId:A,remote,localOwnerId:A,localRaw:JSON.stringify(ledger),baselineRaw:JSON.stringify({payload:stablePilotLedger(ledger),revision}),...options});}
test('one chronological ledger feeds portfolio allocation and actual simulator opening function consistently',()=>{
 const before=JSON.stringify(ledger);assert.equal(validateLedger(ledger),true);
 const result=choose();assert.equal(result.source,'SERVER');
 const expected={ALL:{qty:20,avg:152,cash:830,krw:130000,total:6030},a:{qty:12,avg:120,cash:820,krw:0,total:3820},b:{qty:8,avg:200,cash:10,krw:130000,total:2210}};
 for(const [id,e] of Object.entries(expected)){
  const view=projectLedger(result.payload,id),position=view.holdings.find(h=>h.symbol==='TSLA');
  assert.equal(position.qty,e.qty);assert.equal(position.averageCost,e.avg);assert.equal(view.cash.USD,e.cash);assert.equal(view.cash.KRW,e.krw);
  const allocation=buildPortfolioAllocation({data:result.payload,prices,fx:1300,selected:id,displayCurrency:'USD'});
  assert.equal(allocation.complete,true);assert.equal(allocation.total,e.total);
  const open=opening(result.payload,id);assert.equal(open.cash,e.cash);assert.deepEqual(open.positions,view.holdings.map(h=>({ticker:h.symbol,quantity:h.qty,averageCost:h.averageCost})));
 }
 assert.equal(projectLedger(ledger).realizedUsd,240);
 assert.equal(JSON.stringify(ledger),before);
});
test('virtual sale and purchase use selected account cash and shares without altering real ledger',()=>{
 const before=JSON.stringify(ledger),o=opening(ledger,'a');
 const p={cash:o.cash,positions:Object.fromEntries(o.positions.map(x=>[x.ticker,{quantity:x.quantity,averageCost:x.averageCost}]))};
 const result=simulateTrades(p,[{side:'sell',ticker:'TSLA',quantity:2,price:250},{side:'buy',ticker:'TQQQ',quantity:4,price:50}]);
 assert.equal(result.final.cash,1120);assert.equal(result.final.positions.TSLA.quantity,10);assert.equal(result.final.positions.TQQQ.quantity,4);assert.equal(result.final.realizedPnL,260);
 assert.throws(()=>simulateTrades(p,[{side:'sell',ticker:'TSLA',quantity:13,price:250}]),/insufficient shares/);
 assert.throws(()=>simulateTrades(p,[{side:'buy',ticker:'TSLA',quantity:4,price:250}]),/insufficient cash/);
 assert.equal(JSON.stringify(ledger),before);assert.equal(opening(ledger,'b').cash,10);
});
test('pending edits and stale revision show same resolver decisions; foreign owner never enters simulator',async()=>{
 const changed=structuredClone(ledger);changed.entries.push({id:'pending',accountId:'a',type:'DEPOSIT',amount:50,currency:'USD',date:'2026-11-24',created:99});
 const pending=choose({localRaw:JSON.stringify(changed)});assert.equal(pending.source,'LOCAL_PENDING');assert.equal(opening(pending.payload,'ALL').cash,880);
 const stale=choose({localRaw:JSON.stringify(changed),remote:{...remote,updated_at:'2026-11-24T06:00:00Z'}});assert.equal(stale.source,'SERVER_WITH_LOCAL_DIFFERENCE');assert.equal(opening(stale.payload,'ALL').cash,830);
 assert.equal(choose({localRaw:JSON.stringify(changed),localOwnerId:B}).source,'SERVER');
 assert.equal(opening(ledger,'ALL',A,B),null);
 assert.equal(mayAutoApplyTestLedger({firstRead:true,positions:opening(ledger,'ALL').positions,hasDraft:true}),false);
 const args={ownerId:A,remote,strategies:[],localOwnerId:A,baselineRaw:null};
 const one=projectServerAudit({...args,localRaw:JSON.stringify(ledger)}),two=projectServerAudit({...args,localRaw:JSON.stringify(changed)});
 assert.equal(one.warning,false);assert.equal(two.warning,true);
 assert.equal(await cloudFingerprint(one.fingerprintInput,webcrypto),await cloudFingerprint(two.fingerprintInput,webcrypto));
});
test('missing quote or FX withholds total allocation rather than partial numbers',()=>{
 for(const [quotes,fx] of [[new Map([['TSLA',prices.get('TSLA')]]),1300],[prices,null]]){
  const result=buildPortfolioAllocation({data:ledger,prices:quotes,fx,selected:'ALL',displayCurrency:'USD'});
  assert.equal(result.complete,false);assert.equal(result.total,null);
 }
});
